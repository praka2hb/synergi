/**
 * Code Assistant Agent — handles code execution (E2B) and UI generation.
 * Uses OpenRouter free model via Vercel AI SDK.
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, tool, stepCountIs, zodSchema } from "ai";
import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
const MODEL = "openrouter/auto";

const SYSTEM_PROMPT = `You are Synergi's Code Assistant — a specialized agent within the Synergi Multi-Agent system.

You have TWO capabilities. Decide which to use based on the user's intent:

## 1. Code Execution (executeCode tool)
Use this when the user wants to:
- Run algorithms, scripts, or logic (Fibonacci, sorting, math, etc.)
- Process data, do calculations, or test code snippets
- See actual output/results from code execution

Supported languages: Python and JavaScript.
Write clean, working code. Always print/log the output so the user can see results.

## 2. UI Generation (generateUI tool)
Use this when the user wants to:
- Create a webpage, landing page, dashboard, or any visual UI
- Build a UI component, form, card, or layout
- See something visual rendered in a browser

By default, generate a complete HTML page using Tailwind CSS (via CDN).
Only generate a React component if the user explicitly asks for React.

IMPORTANT RULES:
- Always use exactly ONE tool per response. Never skip using a tool.
- For code execution: write complete, self-contained code that prints output.
- For UI generation: write complete, self-contained code. HTML should include the full <!DOCTYPE html> structure with Tailwind CDN. React should be a single default-exported component.
- Make your code clean, well-structured, and visually appealing for UI tasks.
- After the tool result, provide a brief explanation of what was done.`;

export const codeAssistantAgent = async (
    userMessage: string,
    messageHistory: Array<{ role: string; content: string }> = []
) => {
    const messages = [
        ...messageHistory.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
        { role: "user" as const, content: userMessage },
    ];

    return streamText({
        model: openrouter(MODEL),
        system: SYSTEM_PROMPT,
        messages,
        tools: {
            executeCode: tool({
                description:
                    "Execute code in a secure sandbox and return the output. Use for algorithms, scripts, calculations, data processing — anything that needs to RUN.",
                inputSchema: zodSchema(
                    z.object({
                        language: z
                            .enum(["python", "javascript"])
                            .describe("The programming language to execute"),
                        code: z
                            .string()
                            .describe("The complete code to execute. Must print/log output."),
                    })
                ),
                execute: async ({ language, code }: { language: "python" | "javascript"; code: string }) => {
                    let sandbox: Sandbox | null = null;
                    try {
                        sandbox = await Sandbox.create();

                        let execution;
                        if (language === "python") {
                            execution = await sandbox.runCode(code);
                        } else {
                            execution = await sandbox.runCode(code, { language: "javascript" });
                        }

                        const stdout = execution.logs.stdout.join("\n");
                        const stderr = execution.logs.stderr.join("\n");

                        if (execution.error) {
                            return {
                                success: false,
                                error: execution.error.name + ": " + execution.error.value,
                                stdout: stdout || undefined,
                                stderr: stderr || undefined,
                            };
                        }

                        return {
                            success: true,
                            output: stdout || "(no output)",
                            stderr: stderr || undefined,
                        };
                    } catch (err: any) {
                        return {
                            success: false,
                            error: `Sandbox error: ${err.message || "Unknown error"}`,
                        };
                    } finally {
                        if (sandbox) {
                            await sandbox.kill().catch(() => { });
                        }
                    }
                },
            }),

            generateUI: tool({
                description:
                    "Generate a UI component or webpage. Use for landing pages, dashboards, forms, cards — anything visual. Returns code for live preview, does NOT execute it.",
                inputSchema: zodSchema(
                    z.object({
                        code: z
                            .string()
                            .describe(
                                "The complete HTML (with Tailwind CDN) or React component code"
                            ),
                        framework: z
                            .enum(["html", "react"])
                            .describe(
                                "The framework used. Use 'html' for standalone HTML pages (default), 'react' only if user explicitly asks for React."
                            ),
                    })
                ),
                execute: async ({ code, framework }: { code: string; framework: "html" | "react" }) => {
                    return {
                        success: true,
                        code,
                        framework,
                        message: `UI generated as ${framework === "react" ? "React component" : "HTML page"}. Rendering in live preview.`,
                    };
                },
            }),
        },
        stopWhen: stepCountIs(5),
    });
};
