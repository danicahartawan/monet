import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { z } from "zod";

const router: IRouter = Router();

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!apiKey && !baseURL) {
    throw new Error("OPENAI_API_KEY is required for extraction");
  }
  return new OpenAI({
    apiKey: apiKey ?? "local",
    baseURL: baseURL,
  });
}

const ExtractRequestSchema = z.object({
  transcript: z.string().min(1, "transcript must not be empty"),
  model: z.string().optional(),
});

const SuggestedNodeSchema = z.object({
  title: z.string(),
  body: z.string(),
});

const SuggestedEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

const ExtractionResponseSchema = z.object({
  nodes: z.array(SuggestedNodeSchema),
  edges: z.array(SuggestedEdgeSchema),
});

const SYSTEM_PROMPT = `You are a knowledge graph extractor. Given a spoken transcript, identify discrete concept nodes and their relationships.

Return a JSON object with exactly two keys:
- "nodes": an array of objects with "title" (short label) and "body" (Markdown explanation of the concept)
- "edges": an array of objects with "source" (node title), "target" (node title), and optional "label" (relationship description)

Rules:
- Each node must have a unique, concise title
- Edges must only reference node titles that exist in the nodes array
- The body should be 1-3 sentences of Markdown
- Return only valid JSON, no commentary`;

router.post("/extract", async (req, res) => {
  try {
    const parsed = ExtractRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { transcript, model = "gpt-4o-mini" } = parsed.data;
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Transcript:\n\n${transcript}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      res.status(500).json({ error: "Empty response from AI model" });
      return;
    }

    let parsed2: unknown;
    try {
      parsed2 = JSON.parse(raw);
    } catch {
      res.status(500).json({ error: "AI returned invalid JSON", raw });
      return;
    }

    const validated = ExtractionResponseSchema.safeParse(parsed2);
    if (!validated.success) {
      res.status(500).json({ error: "AI response did not match expected schema", details: validated.error.flatten(), raw: parsed2 });
      return;
    }

    res.json(validated.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    res.status(500).json({ error: message });
  }
});

export default router;
