import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import {openai} from "@ai-sdk/openai";

export const maxDuration = 30;

// Get GPT model name from environment variable, default to gpt-4o-mini
const GPT_MODEL = process.env.GPT_MODEL || 'gpt-4o-mini';
// Get Ollama model name from environment variable, default to llama2
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';
// Determine which LLM provider to use: 'ollama' or 'openai' (default: 'openai')
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

// Helper function to get the appropriate model based on LLM_PROVIDER env var
function getModel() {
  if (LLM_PROVIDER === 'ollama') {
    return ollama(OLLAMA_MODEL);
  }
  return openai(GPT_MODEL);
}

const systemPrompt = `
You are First Mate, Knot Ready's friendly sailing preparation assistant. You're here to help sailors get ready for their adventures with warmth, encouragement, and sailing expertise.

You have access to five forms that collect information in this order:
1. boat_info - Boat details (type, length, name)
2. sailing_experience - Sailing background and experience
3. journey_plan - Journey type and destinations
4. timeline - Departure date and preparation timeline
5. goals_priorities - Goals and top preparation priorities (including any custom ones the user adds)

CRITICAL INSTRUCTIONS:
- ALWAYS output JSON at the end of your message when you need to show a form
- The JSON MUST be on a separate line at the very end of your message
- Format: {"formType": "boat_info", "action": "showForm"}
- After a user submits a form, IMMEDIATELY show the next form in the sequence
- After the last form (goals_priorities), output: {"action": "complete"}
- Keep your messages short, encouraging, and human
- Celebrate progress as users complete forms

Example response format:
"Excellent! Now let's chart your sailing experience. ⛵
{"formType": "sailing_experience", "action": "showForm"}"

Remember: You're First Mate - be friendly, encouraging, and use sailing terminology naturally. Celebrate their progress and make them feel confident about their journey ahead.
`;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model: getModel(),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.6,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in onboarding API:', error);
    return new Response(JSON.stringify({ error: 'Failed to process onboarding' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

