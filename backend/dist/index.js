"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const privy_auth_1 = __importDefault(require("./routes/privy-auth"));
const chat_1 = __importDefault(require("./routes/chat"));
const codeAssistant_1 = __importDefault(require("./routes/codeAssistant"));
const env_check_1 = require("./env-check");
// Validate environment variables at startup
(0, env_check_1.validateEnvironment)();
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const corsOptions = {
    origin(origin, callback) {
        if (allowedOrigins.includes("*") ||
            !origin ||
            allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Not allowed by CORS"));
    },
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: "1mb" }));
app.use("/api/auth", auth_1.default);
app.use("/api/privy", privy_auth_1.default);
app.use("/api/chat/code", codeAssistant_1.default);
app.use("/api/chat", chat_1.default);
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
exports.default = app;
