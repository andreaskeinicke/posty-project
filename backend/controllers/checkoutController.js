const stripeService = require('../services/stripeService');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Create a Stripe checkout session
 * POST /api/checkout/create-session
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { domainName, domainPrice } = req.body;
    const userId = req.userId; // From auth middleware
    const user = req.user;

    // Validation
    if (!domainName) {
      return res.status(400).json({
        success: false,
        error: 'Domain name is required'
      });
    }

    // Get questionnaire session if available (from request or find latest)
    let sessionId = req.body.sessionId;
    if (!sessionId) {
      // Find the most recent session for this user
      const { data: sessions } = await supabaseAdmin
        .from('questionnaire_sessions')
        .select('session_id')
        .eq('user_id', userId)
        .order('last_activity', { ascending: false })
        .limit(1);

      sessionId = sessions?.[0]?.session_id || null;
    }

    console.log(`🛒 Creating checkout session for ${user.email} - ${domainName}`);

    // Create Stripe checkout session
    const checkoutSession = await stripeService.createCheckoutSession({
      userId,
      userEmail: user.email,
      domainName,
      domainPrice: domainPrice || 0,
      sessionId
    });

    // Update questionnaire session with selected domain
    if (sessionId) {
      await supabaseAdmin
        .from('questionnaire_sessions')
        .update({
          selected_domain: domainName,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId);
    }

    res.json({
      success: true,
      sessionId: checkoutSession.sessionId,
      url: checkoutSession.url
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      message: error.message
    });
  }
};

/**
 * Get checkout session details
 * GET /api/checkout/session/:sessionId
 */
exports.getCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripeService.getCheckoutSession(sessionId);

    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total,
        metadata: session.metadata
      }
    });

  } catch (error) {
    console.error('Get checkout session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve checkout session',
      message: error.message
    });
  }
};

/**
 * Handle successful checkout
 * GET /api/checkout/success
 */
exports.checkoutSuccess = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // Retrieve session details
    const session = await stripeService.getCheckoutSession(session_id);

    res.json({
      success: true,
      message: 'Checkout completed successfully',
      session: {
        id: session.id,
        status: session.status,
        customerEmail: session.customer_email,
        metadata: session.metadata
      }
    });

  } catch (error) {
    console.error('Checkout success error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process checkout success',
      message: error.message
    });
  }
};

/**
 * Handle Stripe webhooks
 * POST /api/checkout/webhook
 */
exports.handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    // Construct event from webhook payload
    const event = stripeService.constructWebhookEvent(req.body, signature);

    console.log(`🔔 Webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
};

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(session) {
  const { metadata, customer, subscription, amount_total } = session;
  const { userId, domainName, questionnaireSessionId, domainPurchaseRequired } = metadata;

  console.log(`✅ Checkout completed for user ${userId} - ${domainName}`);

  try {
    // Update user with Stripe customer ID
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: customer })
      .eq('id', userId);

    // Mark questionnaire session as converted
    if (questionnaireSessionId) {
      await supabaseAdmin
        .from('questionnaire_sessions')
        .update({
          converted: true,
          completed_at: new Date().toISOString()
        })
        .eq('session_id', questionnaireSessionId);
    }

    // Create transaction record
    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'subscription_payment',
        amount: amount_total / 100, // Convert cents to dollars
        currency: 'USD',
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent
      });

    // If domain purchase required, create domain record (pending status)
    if (domainPurchaseRequired === 'true') {
      await supabaseAdmin
        .from('domains')
        .insert({
          user_id: userId,
          domain_name: domainName,
          status: 'pending_purchase', // Will be updated after Cloudflare purchase
          registered_at: null,
          expires_at: null
        });

      console.log(`📝 Domain ${domainName} marked for purchase`);

      // TODO: Trigger domain purchase via Cloudflare API
      // This will be implemented in the next phase
    }

  } catch (error) {
    console.error('Error processing checkout completion:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription) {
  const { customer, id: subscriptionId, status, current_period_end, metadata } = subscription;
  const { userId, domainName } = metadata;

  console.log(`📋 Subscription created: ${subscriptionId} for user ${userId}`);

  try {
    // Find the domain for this subscription
    const { data: domains } = await supabaseAdmin
      .from('domains')
      .select('id')
      .eq('user_id', userId)
      .eq('domain_name', domainName)
      .order('created_at', { ascending: false })
      .limit(1);

    const domainId = domains?.[0]?.id || null;

    // Create subscription record
    await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        domain_id: domainId,
        stripe_subscription_id: subscriptionId,
        status,
        plan_type: 'basic',
        current_period_end: new Date(current_period_end * 1000).toISOString()
      });

  } catch (error) {
    console.error('Error creating subscription record:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription) {
  const { id: subscriptionId, status, current_period_end, cancel_at_period_end } = subscription;

  console.log(`🔄 Subscription updated: ${subscriptionId} - status: ${status}`);

  try {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status,
        current_period_end: new Date(current_period_end * 1000).toISOString(),
        cancel_at_period_end
      })
      .eq('stripe_subscription_id', subscriptionId);

  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription) {
  const { id: subscriptionId } = subscription;

  console.log(`❌ Subscription deleted: ${subscriptionId}`);

  try {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscriptionId);

  } catch (error) {
    console.error('Error marking subscription as cancelled:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice) {
  const { customer, subscription, amount_paid } = invoice;

  console.log(`💰 Payment succeeded: $${amount_paid / 100} for subscription ${subscription}`);

  try {
    // Record transaction
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, domain_id')
      .eq('stripe_subscription_id', subscription)
      .single();

    if (subscriptions) {
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: subscriptions.user_id,
          domain_id: subscriptions.domain_id,
          type: 'subscription_payment',
          amount: amount_paid / 100,
          currency: 'USD',
          status: 'completed',
          stripe_charge_id: invoice.charge
        });
    }

  } catch (error) {
    console.error('Error recording payment:', error);
    // Don't throw - payment already succeeded
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice) {
  const { subscription } = invoice;

  console.log(`⚠️  Payment failed for subscription ${subscription}`);

  try {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subscription);

    // TODO: Send email notification to user

  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}
