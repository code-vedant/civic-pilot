
import { Router } from "express";
import { z } from "zod";
import { requireClerkAuth } from "../auth/clerk.js";
import { env } from "../config/env.js";

export const voiceRouter = Router();

const voiceSchema = z.object({
  text: z.string().trim().min(1).max(3500)
});

voiceRouter.post("/", requireClerkAuth, async (req, res) => {
  const parsed = voiceSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Provide valid response text to read."
    });
    return;
  }

  if (!env.elevenLabsApiKey || !env.elevenLabsVoiceId) {
    res.status(503).json({
      success: false,
      error: "Voice assistance is not configured yet."
    });
    return;
  }

  try {
    const url =
      `https://api.elevenlabs.io/v1/text-to-speech/` +
      `${encodeURIComponent(env.elevenLabsVoiceId)}` +
      "?output_format=mp3_44100_128";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": env.elevenLabsApiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text: parsed.data.text,
        model_id: env.elevenLabsModel
      }),
      signal: AbortSignal.timeout(35000)
    });

    if (!response.ok) {
      // Do not log the key or the response text.
      console.error(
        "[CivicPilot] ElevenLabs returned status:",
        response.status
      );

      res.status(502).json({
        success: false,
        error: "Voice generation failed. Please try again."
      });
      return;
    }

    const audio = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(audio);
  } catch (error) {
    console.error(
      "[CivicPilot] Voice request failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    res.status(503).json({
      success: false,
      error: "Voice assistance is temporarily unavailable."
    });
  }
});
