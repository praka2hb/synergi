"use strict";
/**
 * Code Assistant Agent — handles code execution (E2B) and UI generation.
 * Uses OpenRouter free model via Vercel AI SDK.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeAssistantAgent = void 0;
const ai_sdk_provider_1 = require("@openrouter/ai-sdk-provider");
const ai_1 = require("ai");
const zod_1 = require("zod");
const code_interpreter_1 = require("@e2b/code-interpreter");
const openrouter = (0, ai_sdk_provider_1.createOpenRouter)({ apiKey: process.env.OPENROUTER_API_KEY });
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
const codeAssistantAgent = async (userMessage, messageHistory = []) => {
    const messages = [
        ...messageHistory.map((m) => ({
            role: m.role,
            content: m.content,
        })),
        { role: "user", content: userMessage },
    ];
    return (0, ai_1.streamText)({
        model: openrouter(MODEL),
        system: SYSTEM_PROMPT,
        messages,
        tools: {
            executeCode: (0, ai_1.tool)({
                description: "Execute code in a secure sandbox and return the output. Use for algorithms, scripts, calculations, data processing — anything that needs to RUN.",
                inputSchema: (0, ai_1.zodSchema)(zod_1.z.object({
                    language: zod_1.z
                        .enum(["python", "javascript"])
                        .describe("The programming language to execute"),
                    code: zod_1.z
                        .string()
                        .describe("The complete code to execute. Must print/log output."),
                })),
                execute: async ({ language, code }) => {
                    let sandbox = null;
                    try {
                        sandbox = await code_interpreter_1.Sandbox.create();
                        let execution;
                        if (language === "python") {
                            execution = await sandbox.runCode(code);
                        }
                        else {
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
                    }
                    catch (err) {
                        return {
                            success: false,
                            error: `Sandbox error: ${err.message || "Unknown error"}`,
                        };
                    }
                    finally {
                        if (sandbox) {
                            await sandbox.kill().catch(() => { });
                        }
                    }
                },
            }),
            generateUI: (0, ai_1.tool)({
                description: "Generate a UI component or webpage. Use for landing pages, dashboards, forms, cards — anything visual. Returns code for live preview, does NOT execute it.",
                inputSchema: (0, ai_1.zodSchema)(zod_1.z.object({
                    code: zod_1.z
                        .string()
                        .describe("The complete HTML (with Tailwind CDN) or React component code"),
                    framework: zod_1.z
                        .enum(["html", "react"])
                        .describe("The framework used. Use 'html' for standalone HTML pages (default), 'react' only if user explicitly asks for React."),
                })),
                execute: async ({ code, framework }) => {
                    return {
                        success: true,
                        code,
                        framework,
                        message: `UI generated as ${framework === "react" ? "React component" : "HTML page"}. Rendering in live preview.`,
                    };
                },
            }),
        },
        stopWhen: (0, ai_1.stepCountIs)(5),
    });
};
exports.codeAssistantAgent = codeAssistantAgent;
