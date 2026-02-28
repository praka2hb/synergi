Perfect setup. Let's build this step by step.

**Step 1 — Install dependencies**

```bash
bun add ai @ai-sdk/google @tavily/core zod
```

**Step 2 — Get your Tavily API key**

Sign up at [tavily.com](https://tavily.com) — free tier gives you 1000 searches/month. Add it to your `.env`:

```env
TAVILY_API_KEY=your_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
```

**Step 3 — Create the Web Search Agent**

Create `src/agents/webSearchAgent.ts`:

```ts
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { tavily } from "@tavily/core";
import { z } from "zod";

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export const webSearchAgent = async (userMessage: string) => {
  return streamText({
    model: google("gemini-2.0-flash"),
    system: `You are a helpful web search assistant. 
    When the user asks something that requires current or real-time information, 
    use the search tool to find accurate results. 
    Always cite where you found the information.`,
    messages: [{ role: "user", content: userMessage }],
    tools: {
      search: tool({
        description: "Search the web for current information",
        parameters: z.object({
          query: z.string().describe("The search query"),
        }),
        execute: async ({ query }) => {
          const results = await tavilyClient.search(query, {
            maxResults: 5,
          });
          return results.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
          }));
        },
      }),
    },
    maxSteps: 3, // allows Gemini to search then summarize
  });
};
```

**Step 4 — Create the route**

Create `src/routes/chat.ts` (or add to your existing chat route):

```ts
import { Router, Request, Response } from "express";
import { webSearchAgent } from "../agents/webSearchAgent";

const router = Router();

router.post("/search", async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const result = await webSearchAgent(message);

    // Set headers for streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");

    // Pipe the stream to response
    for await (const chunk of result.textStream) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Agent failed" });
  }
});

export default router;
```

**Step 5 — Register the route in your main file**

In your `src/index.ts`:

```ts
import chatRoutes from "./routes/chat";

app.use("/api/chat", chatRoutes);
```

**Step 6 — Consume it in Next.js frontend**

```ts
// In your Next.js component
const sendMessage = async (message: string) => {
  const response = await fetch("http://localhost:3001/api/chat/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // append chunk to your message state
    setResponse((prev) => prev + chunk);
  }
};
```

---

**How it works end to end:**

```
User asks "What's the latest AI news?"
    → Express route receives it
    → webSearchAgent runs
    → Gemini decides to call the search tool
    → Tavily searches the web
    → Gemini gets results and summarizes
    → Streams back to your frontend chunk by chunk
```

---

Once this is working, the next step would be building the **router** that automatically decides whether to use the search agent or any other agent based on the user's message. Want me to help with that after you get this running?