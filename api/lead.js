import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, name, email, businessName, businessType, notes } = req.body || {};

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let conversationId = null;
    if (sessionId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('session_id', sessionId)
        .single();
      conversationId = conv ? conv.id : null;
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        conversation_id: conversationId,
        name: name || null,
        email,
        business_name: businessName || null,
        business_type: businessType || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) throw error;

    // Email notification via Resend — only fires once RESEND_API_KEY is set
    if (process.env.RESEND_API_KEY && process.env.LEAD_NOTIFICATION_EMAIL) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'Cooper <cooper@cooper-ai.co.za>',
            to: process.env.LEAD_NOTIFICATION_EMAIL,
            subject: `New CooperAI lead: ${name || email}`,
            text: [
              'New lead from the CooperAI site:',
              '',
              `Name: ${name || '-'}`,
              `Email: ${email}`,
              `Business: ${businessName || '-'}`,
              `Type: ${businessType || '-'}`,
              `Notes: ${notes || '-'}`
            ].join('\n')
          })
        });
      } catch (emailErr) {
        // Don't fail the lead save just because the email notification failed
        console.error('Resend notification error:', emailErr);
      }
    }

    return res.status(200).json({ success: true, leadId: lead.id });
  } catch (err) {
    console.error('Lead handler error:', err);
    return res.status(500).json({ error: 'Something went wrong saving your details' });
  }
}
