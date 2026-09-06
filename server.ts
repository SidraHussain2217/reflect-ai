import express from "express";
import path from "path";
//import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
// Mounted strictly BEFORE any endpoint routes
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "reflective-journal-gemini" });
});

// Model Fallback Ladder according to Production Directives
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

// Lazy Gemini Client getter
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured in the runtime.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Resilient fallback helper
async function generateContentWithFallback(params: {
  contents: any[];
  systemInstruction?: string;
  responseSchema?: any;
}) {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: params.responseSchema,
          temperature: 0.7,
        },
      });

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.status || err?.statusCode || err?.code;
      console.warn(`[Gemini Fallback] Model ${model} encountered error (status: ${statusCode}):`, err?.message || err);
      // If error is recoverable, proceed down the ladder
      const isRecoverable =
        statusCode === 503 ||
        statusCode === 429 ||
        statusCode === 404 ||
        statusCode === 500 ||
        /unavailable|quota|resource_exhausted|not found|internal/i.test(err?.message || "");

      if (!isRecoverable && MODEL_FALLBACK_LADDER.indexOf(model) === 0) {
        // Continue to fallback even if ambiguous error code
      }
    }
  }

  throw new Error(`All models in the fallback ladder failed. Last error: ${lastError?.message || lastError}`);
}

// Structured JSON schema for reflection
const reflectionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reflection: {
      type: Type.STRING,
      description: "Empathetic, compassionate conversational reflection acknowledging feelings with warmth and psychological safety.",
    },
    moodScore: {
      type: Type.NUMBER,
      description: "Numerical mood rating from 1 to 10 (1 = deeply distressed/exhausted, 5 = neutral/contemplative, 10 = euphoric/highly joyful).",
    },
    moodLabel: {
      type: Type.STRING,
      description: "A concise 1-2 word mood descriptor, e.g., 'Calm & Centered', 'Anxious', 'Deeply Grateful', 'Overwhelmed', 'Hopeful', 'Exhausted'.",
    },
    actionableTakeaway: {
      type: Type.STRING,
      description: "A gentle, specific, realistic micro-action or grounding exercise the user can perform today.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2 to 4 thematic tags (e.g. ['Work', 'Mindfulness', 'Relationships', 'Rest']).",
    },
  },
  required: ["reflection", "moodScore", "moodLabel", "actionableTakeaway", "tags"],
};

// API Route: Process journal entry or voice memo with empathetic guidance
app.post("/api/gemini/reflect", async (req, res) => {
  try {
    // 2. Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { prompt, audioBase64, audioMimeType, recentInteractions, userId } = data;

    // Verify minimum input requirements
    if ((!prompt || typeof prompt !== "string" || prompt.trim().length === 0) && !audioBase64) {
      return res.status(400).json({
        error: "Either journal text or an audio voice recording is required.",
      });
    }

    if (!userId || typeof userId !== "string") {
      return res.status(401).json({
        error: "User authentication identification is required to isolate interactions.",
      });
    }

    // Context preparation for long-term memory
    let memoryContext = "";
    if (Array.isArray(recentInteractions) && recentInteractions.length > 0) {
      memoryContext = "Past journal context (chronological history):\n" +
        recentInteractions
          .slice(-5)
          .map((item: any, idx: number) => {
            const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : `Entry ${idx + 1}`;
            return `[${dateStr}] Mood: ${item.moodLabel || "Unknown"} (${item.moodScore || 5}/10). User wrote: "${(item.prompt || "").slice(0, 200)}...". Guide previously suggested: "${(item.actionableTakeaway || "").slice(0, 150)}..."`;
          })
          .join("\n\n");
    }

    const systemInstruction = `You are a supportive, empathetic, and trauma-informed mindfulness guide.
Your purpose is to deeply listen to the user's personal thoughts or voice reflections, validate their emotional journey, and provide compassionate guidance.

Guidelines:
1. Speak directly to the user in a gentle, warm, non-judgmental second-person tone ("I hear how exhausting...", "It is completely valid to feel...").
2. Connect their current feelings with patterns from their recent entries when applicable (memory continuity).
3. Provide an authentic mood score between 1.0 and 10.0 based on sentiment and emotion.
4. Offer exactly ONE small, gentle, practical takeaway or somatic exercise (e.g. 4-7-8 breathing, progressive muscle relaxation, setting a gentle boundary, taking a 5-minute screen break).
5. Always output strictly valid JSON matching the schema.

${memoryContext ? "\n--- Long-term User Context ---\n" + memoryContext : ""}`;

    // Assemble contents payload
    const parts: any[] = [];

    // If audio is provided, send inlineData part
    if (audioBase64 && typeof audioBase64 === "string") {
      // 1. Strip ANY data URL prefix reliably
      let cleanBase64 = audioBase64.trim();
      const commaIndex = cleanBase64.indexOf(",");
      if (commaIndex !== -1 && (cleanBase64.slice(0, commaIndex).includes("base64") || cleanBase64.slice(0, commaIndex).startsWith("data:"))) {
        cleanBase64 = cleanBase64.slice(commaIndex + 1);
      } else if (cleanBase64.startsWith("data:")) {
        cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/i, "");
      }
      cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, "");

      // 2. Normalize and strip parameters from MIME type for Gemini
      // (e.g. "audio/webm;codecs=opus" -> "audio/webm")
      let cleanMimeType = "audio/webm";
      if (audioMimeType && typeof audioMimeType === "string") {
        const baseMime = audioMimeType.split(";")[0].trim().toLowerCase();
        if (baseMime.includes("mp4") || baseMime.includes("m4a")) {
          cleanMimeType = "audio/mp4";
        } else if (baseMime.includes("wav")) {
          cleanMimeType = "audio/wav";
        } else if (baseMime.includes("ogg")) {
          cleanMimeType = "audio/ogg";
        } else if (baseMime.includes("mp3") || baseMime.includes("mpeg")) {
          cleanMimeType = "audio/mp3";
        } else {
          cleanMimeType = "audio/webm";
        }
      }

      if (cleanBase64.length > 0) {
        parts.push({
          inlineData: {
            mimeType: cleanMimeType,
            data: cleanBase64,
          },
        });
        parts.push({
          text: `The user provided this voice memo reflection.${prompt ? ` Additional written notes: "${prompt}"` : ""}\nListen to their voice tone, speech pacing, emotional valence, and spoken words. Provide your structured empathetic reflection.`
        });
      } else if (prompt) {
        parts.push({
          text: `The user wrote the following journal reflection:\n\n"""\n${prompt}\n"""\n\nProvide your empathetic response and structured analysis.`
        });
      }
    } else {
      parts.push({
        text: `The user wrote the following journal reflection:\n\n"""\n${prompt}\n"""\n\nProvide your empathetic response and structured analysis.`
      });
    }

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts }],
      systemInstruction,
      responseSchema: reflectionResponseSchema,
    });

    let parsedResult;
    try {
      parsedResult = JSON.parse(result.text);
    } catch (parseError) {
      console.error("JSON parsing error from Gemini output:", result.text);
      throw new Error("Unable to parse structured guidance response from the AI model.");
    }

    return res.json({
      success: true,
      modelUsed: result.modelUsed,
      data: {
        reflection: parsedResult.reflection || "Thank you for sharing your thoughts today. Take a deep, restorative breath.",
        moodScore: Math.min(10, Math.max(1, Number(parsedResult.moodScore) || 5)),
        moodLabel: parsedResult.moodLabel || "Reflective",
        actionableTakeaway: parsedResult.actionableTakeaway || "Take 3 mindful breaths and gently pause before your next task.",
        tags: Array.isArray(parsedResult.tags) ? parsedResult.tags.slice(0, 4) : ["Journal"],
      },
    });
  } catch (error: any) {
    console.error("[API /api/gemini/reflect Error]", error);
    return res.status(500).json({
      error: error?.message || "An unexpected error occurred while processing your reflection.",
    });
  }
});

// Vite middleware & Static serving
let viteServer: any = null;

if (process.env.NODE_ENV !== "production") {
  // Delegate to Vite dev middleware once initialized
  app.use((req, res, next) => {
    // Never let API routes hit Vite fallback or return HTML
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
    }
    if (viteServer) {
      return viteServer.middlewares(req, res, next);
    }
    // If Vite is still starting up, wait briefly for Vite or return 503
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (viteServer) {
        clearInterval(interval);
        return viteServer.middlewares(req, res, next);
      }
      if (Date.now() - startTime > 5000) {
        clearInterval(interval);
        if (!res.headersSent) {
          res.status(503).send("Development server warming up, please refresh in a moment.");
        }
      }
    }, 50);
  });

  // Initialize Vite asynchronously in the background
  createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
    },
    appType: "spa",
  })
    .then((vite) => {
      viteServer = vite;
      console.log("Vite development middleware attached.");
    })
    .catch((err) => {
      console.error("Failed to initialize Vite dev server:", err);
    });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Reflective AI Journal server running on http://0.0.0.0:${PORT}`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
