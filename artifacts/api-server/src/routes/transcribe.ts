import { Router, type IRouter } from "express";
import multer from "multer";
import OpenAI from "openai";
import { Readable } from "stream";
import { toFile } from "openai";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/x-wav"];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(webm|wav|mp3|mp4|ogg|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported audio format. Use webm or wav."));
    }
  },
});

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.WHISPER_BASE_URL;
  if (!apiKey && !baseURL) {
    throw new Error("OPENAI_API_KEY is required for transcription");
  }
  return new OpenAI({
    apiKey: apiKey ?? "local",
    baseURL: baseURL,
  });
}

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio file uploaded. Send a multipart form with field 'audio'." });
      return;
    }

    const client = getOpenAIClient();

    const audioFile = await toFile(
      Readable.from(req.file.buffer),
      req.file.originalname || "audio.webm",
      { type: req.file.mimetype }
    );

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(transcription.text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    res.status(500).json({ error: message });
  }
});

export default router;
