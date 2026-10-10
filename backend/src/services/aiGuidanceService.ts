
import { GoogleGenAI } from "@google/genai";
import { generateWithOpenAI } from "./openai.service.js";

const geminiKey = process.env.GEMINI_API_KEY;
const geminiModel =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const gemini = geminiKey
  ? new GoogleGenAI({ apiKey: geminiKey })
  : null;

const GEMINI_TIMEOUT_MS = 12000;

type PortalContext = {
  domain?: string;
  title?: string;
};

function buildPrompt(
  query: string,
  portal?: PortalContext
): string {


  return `
You are CivicPilot, an assistant that helps citizens navigate
Indian government portals.

Current portal: ${portal?.domain || "Unknown"}
Current page: ${portal?.title || "Unknown"}

Provide accurate, complete and concise Markdown guidance.
Use numbered lists for procedures and bullet lists for documents.
Do not invent official requirements, fees or deadlines.
Never request passwords, OTPs or PINs.
Finish every sentence and step.

User's question:
${query}
`.trim();
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${provider} request timed out`));
    }, timeoutMs);

    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function generateWithGemini(
  prompt: string
): Promise<string> {
  if (!gemini) {
    throw new Error("Gemini is not configured");
  }

  console.log("Runnnig" , prompt);
  

  const response = await withTimeout(
    gemini.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 1500
      }
    }),
    GEMINI_TIMEOUT_MS,
    "Gemini"
  );

  const answer = response.text?.trim();

  if (!answer) {
    throw new Error("Gemini returned an empty answer");
  }

  const finishReason =
    response.candidates?.[0]?.finishReason;

  if (
    String(finishReason).toUpperCase().includes("MAX_TOKENS")
  ) {
    throw new Error("Gemini response was truncated");
  }

  return answer;
}

function deterministicFallback(): string {
  return [
    "## I couldn't retrieve the full guidance",
    "",
    "The AI guidance services are temporarily unavailable.",
    "",
    "1. Check the instructions published on the official government portal.",
    "2. Review the portal's eligibility and document checklist.",
    "3. Do not submit the form until you have verified the information.",
    "",
    "Please try again shortly."
  ].join("\n");
}

export async function generateGuidance(
  query: string,
  portal?: PortalContext
): Promise<string> {
  const prompt = buildPrompt(query, portal);

  // Provider 1: Gemini
  try {
    return await generateWithGemini(prompt);
  } catch (error) {
    // Log only provider and error metadata, never the user's
    // full question, form values or authentication credentials.
    console.warn(
      "[CivicPilot] Gemini failed; trying OpenAI:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Provider 2: OpenAI
  try {
    return await generateWithOpenAI(prompt);
  } catch (error) {
    console.error(
      "[CivicPilot] OpenAI fallback failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Provider 3: deterministic fallback
  return deterministicFallback();
}
