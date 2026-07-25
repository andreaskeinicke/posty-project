const { supabaseAdmin } = require('../config/supabase');

/**
 * Case logging for the concierge learning loop (docs/CONCIERGE_DIRECTION.md).
 * Every recommendation run is a case: what we knew, what we generated, what we
 * showed, and (closed later by the checkout webhook) what was chosen/bought.
 * Fire-and-forget: logging must never break or slow the user flow.
 */
class CaseLogService {
  async logCase({ promptVersion, profile, generated, shown, pitch, pick, userId }) {
    try {
      const { data, error } = await supabaseAdmin
        .from('recommendation_cases')
        .insert({
          prompt_version: promptVersion,
          profile,
          generated,
          shown,
          pitch: pitch || null,
          pick: pick || null,
          user_id: userId || null
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.warn('Case logging failed (non-fatal):', error.message);
      return null;
    }
  }

  async recordSelection(caseId, domainName, stripeSessionId) {
    if (!caseId) return;
    try {
      await supabaseAdmin
        .from('recommendation_cases')
        .update({
          selected_domain: domainName,
          stripe_session_id: stripeSessionId || null,
          selected_at: new Date().toISOString()
        })
        .eq('id', caseId);
    } catch (error) {
      console.warn('Case selection update failed (non-fatal):', error.message);
    }
  }

  async recordPurchase(caseId, domainName) {
    if (!caseId) return;
    try {
      await supabaseAdmin
        .from('recommendation_cases')
        .update({
          purchased_domain: domainName,
          purchased_at: new Date().toISOString()
        })
        .eq('id', caseId);
    } catch (error) {
      console.warn('Case purchase update failed (non-fatal):', error.message);
    }
  }
}

module.exports = new CaseLogService();
