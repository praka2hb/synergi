import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import privyAuthRouter from "./routes/privy-auth";
import chatRouter from "./routes/chat";
import { validateEnvironment } from "./env-check";

// Validate environment variables at startup
const config = validateEnvironment();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/privy", privyAuthRouter);
app.use("/api/chat", chatRouter)

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.listen(3001, () => {
    console.log("Server is running on port 3001");
});
