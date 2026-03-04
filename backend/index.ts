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

// CORS — allow all origins in dev; restrict in production via ALLOWED_ORIGIN env var
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/privy", privyAuthRouter);
app.use("/api/chat/code", codeAssistantRouter);
app.use("/api/chat", chatRouter);

app.get("/", (_req, res) => {
    res.send("Synergi API is running ✅");
});

// Only bind a port when running locally (Vercel handles routing via the export)
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Export app for Vercel serverless runtime
export default app;

