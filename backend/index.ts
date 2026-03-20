import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import privyAuthRouter from "./routes/privy-auth";
import chatRouter from "./routes/chat";
import codeAssistantRouter from "./routes/codeAssistant";
import { validateEnvironment } from "./env-check";

// Validate environment variables at startup
validateEnvironment();

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = (process.env.ALLOWED_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (
      allowedOrigins.includes("*") ||
      !origin ||
      allowedOrigins.includes(origin)
    ) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRouter);
app.use("/api/privy", privyAuthRouter);
app.use("/api/chat/code", codeAssistantRouter);
app.use("/api/chat", chatRouter);

app.get("/", (_req, res) => {
  res.send("Synergi API is running ✅");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString(),
  });
});

// Only bind a port when running locally (Vercel handles routing via the export)
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export app for Vercel serverless runtime
export default app;
