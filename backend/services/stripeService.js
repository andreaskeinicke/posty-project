const Stripe = require('stripe');

class StripeService {
  constructor() {
    // Validate Stripe API key exists
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_your_stripe_secret_key_here') {
      console.warn('⚠️  Stripe secret key not configured. Checkout will not work.');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      console.log('✅ Stripe service initialized');
    }
  }

  /**
   * Create a checkout session for domain purchase + subscription
   * @param {Object} params - Checkout parameters
   * @param {string} params.userId - User UUID
   * @param {string} params.userEmail - User email
   * @param {string} params.domainName - Selected domain name
   * @param {number} params.domainPrice - Domain registration price (one-time)
   * @param {string} params.sessionId - Questionnaire session ID
   * @returns {Object} Checkout session with URL
   */
  async createCheckoutSession({ userId, userEmail, domainName, domainPrice, sessionId }) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please add your Stripe API keys to .env');
    }

    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId || priceId === 'price_xxxxxxxxxxxxx') {
      throw new Error('Stripe price ID not configured. Please add STRIPE_PRICE_ID to .env');
    }

    try {
      // Line items for the checkout
      const lineItems = [
        {
          // Posty subscription ($5/month)
          price: priceId,
          quantity: 1
        }
      ];

      // Add domain registration as one-time payment if price provided
      if (domainPrice && domainPrice > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Domain Registration: ${domainName}`,
              description: `One-time registration fee for ${domainName}`,
              metadata: {
                domain: domainName,
                type: 'domain_registration'
              }
            },
            unit_amount: Math.round(domainPrice * 100) // Convert dollars to cents
          },
          quantity: 1
        });
      }

      // Create Stripe checkout session
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: lineItems,
        customer_email: userEmail,
        client_reference_id: userId,

        // Success and cancel URLs
        success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/checkout/canceled`,

        // Metadata for webhook processing
        metadata: {
          userId,
          domainName,
          domainPrice: domainPrice?.toString() || '0',
          questionnaireSessionId: sessionId,
          domainPurchaseRequired: domainPrice > 0 ? 'true' : 'false'
        },

        // Allow promotion codes
        allow_promotion_codes: true,

        // Subscription data
        subscription_data: {
          metadata: {
            userId,
            domainName
          }
        }
      });

      return {
        sessionId: session.id,
        url: session.url,
        success: true
      };
    } catch (error) {
      console.error('Stripe checkout session creation error:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Retrieve a checkout session by ID
   * @param {string} sessionId - Stripe session ID
   * @returns {Object} Session details
   */
  async getCheckoutSession(sessionId) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      console.error('Error retrieving checkout session:', error);
      throw new Error(`Failed to retrieve session: ${error.message}`);
    }
  }

  /**
   * Create a Stripe customer
   * @param {Object} params - Customer parameters
   * @param {string} params.email - Customer email
   * @param {string} params.name - Customer name
   * @param {string} params.userId - User UUID
   * @returns {Object} Stripe customer
   */
  async createCustomer({ email, name, userId }) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId
        }
      });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  /**
   * Construct webhook event from request
   * @param {string} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Object} Stripe event
   */
  constructWebhookEvent(payload, signature) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET === 'whsec_your_webhook_secret_here') {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return event;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error(`Webhook verification failed: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Object} Canceled subscription
   */
  async cancelSubscription(subscriptionId) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new StripeService();
