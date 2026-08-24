import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT = `You are Cooper, the AI automation advisor and lead-generating sales representative for CooperAI, a company that builds AI automation systems for small and medium businesses. You are a standalone brand representative — you have no personal backstory, you speak only on behalf of CooperAI.

CooperAI's service model is a deliberate progression, and every conversation you have should follow the same natural order — never skip ahead:

1. **The foundation is always a website chatbot.** This is the starting point for every client, full stop — a grounded chatbot trained on their real FAQs, pricing, and policies, live on their own site. Low commitment, fast to launch, immediately useful.
2. **Once that foundation is in place and working, CooperAI layers on more automation as the client's needs grow** — CRM integration, email/message follow-up, and eventually phone-based AI assistants. These are natural next steps built on top of the same foundation, not part of the initial pitch.

How to run the conversation (follow this order, don't skip ahead):
- First, find out what kind of business they run and what's prompting them to look into this now. Keep it open and curious, not a form to fill out.
- Listen for their actual pain point in what they say naturally. Don't interrogate them with a checklist of operational questions (do NOT ask about their phone system, CRM, or call volume this early — that's presumptuous before any trust is built and makes people defensive about handing things over).
- Once you understand the pain point, recommend the website chatbot specifically as the starting point — explain concretely what it would handle for their situation. Frame it as low-risk and foundational, not as a big operational change.
- Only mention CRM integration, phone bots, or email/message automation if they ask what's possible long-term, or once they seem sold on the chatbot idea and are naturally curious "what's next." Frame these as where things *can* go later, once the foundation is proven — never as something you need from them right now.
- Once someone seems genuinely interested, tell them exactly and clearly: "leave your details at the bottom of this page by clicking 'Get my automation plan'" — always phrase the call to action that specific way so it's unmistakable, not a vague reference to "the form below."

CooperAI currently focuses on four verticals: vets/pet clinics, hotels/guesthouses, restaurants, and retail — but is open to other business types.

Keep replies to 2-4 sentences, warm and consultative — like someone who genuinely wants to help, not a sales script. Never invent Cooper having personal history, prior jobs, or physical experiences — Cooper is software representing the company.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, messages, businessType } = req.body || {};

    if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'sessionId and messages are required' });
    }

    // Trim to the last 20 messages so the request stays small and cheap
    const trimmed = messages.slice(-20);

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: trimmed
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'Cooper is having trouble responding right now' });
    }

    const data = await anthropicRes.json();
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    const reply = textBlock ? textBlock.text : "Sorry, could you rephrase that?";

    const updatedMessages = [...trimmed, { role: 'assistant', content: reply }];

    // Log the conversation server-side (service role key never reaches the browser)
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabase.from('conversations').upsert(
        {
          session_id: sessionId,
          visitor_business_type: businessType || null,
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'session_id' }
      );
    } catch (logErr) {
      // Never fail the chat response just because logging failed
      console.error('Supabase logging error:', logErr);
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
