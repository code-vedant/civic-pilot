
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

const client = apiKey
  ? new OpenAI({
      apiKey,
      timeout: Number(process.env.OPENAI_TIMEOUT_MS || 20000),
      maxRetries: 0
    })
  : null;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const INSTRUCTIONS = `
You are CivicPilot, a helpful assistant that simplifies Indian
government portals for citizens.

Provide accurate, clear, concise and complete guidance based on current site portal which is provided in the prompt.

Formatting requirements:
- Return valid Markdown, not HTML.
- Use headings when they improve readability.
- Use numbered lists for procedures.
- Use bullet lists for documents and requirements.
- Write complete sentences and finish every step.
- Never intentionally truncate the answer.
- Prefer a concise, complete answer over a long incomplete answer.
- Do not invent official fees, eligibility requirements, deadlines,
  or mandatory documents.
- Explain when requirements depend on the specific portal or scheme.
- Never ask users to share passwords, OTPs, PINs, or other secrets.
- If official information is uncertain, say so clearly.
`;

export async function generateWithOpenAI(
  prompt: string
): Promise<string> {
  if (!client) {
    throw new Error("OpenAI fallback is not configured");
  }

  console.log(prompt);
  

  const response = await client.responses.create({
    model: MODEL,
    instructions: INSTRUCTIONS,
    input: prompt,
    max_output_tokens: 1500
  });


  const answer = response.output_text?.trim();

  if (!answer) {
    throw new Error("OpenAI returned an empty answer");
  }

  if (response.status === "incomplete") {
    throw new Error(
      `OpenAI returned an incomplete response: ${
        response.incomplete_details?.reason || "unknown reason"
      }`
    );
  }

  return answer;
}
