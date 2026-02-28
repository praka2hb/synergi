"use client";

import React, { useState } from "react";
import {
    SandpackProvider,
    SandpackLayout,
    SandpackCodeEditor,
    SandpackPreview,
} from "@codesandbox/sandpack-react";

interface CodePreviewProps {
    code: string;
    type: "output" | "ui";
    framework?: "html" | "react";
    /** Source code that was executed (for type="output") */
    sourceCode?: string;
    /** Language of the source code */
    language?: "python" | "javascript";
}

/**
 * CodePreview — renders code playground or live UI preview.
 *
 * - type="output" → Code playground with source code, Run button, and terminal output
 * - type="ui"     → Sandpack live preview with fullscreen toggle
 */
export default function CodePreview({
    code,
    type,
    framework = "html",
    sourceCode,
    language = "python",
}: CodePreviewProps) {
    if (type === "output") {
        return (
            <CodePlayground
                output={code}
                sourceCode={sourceCode || ""}
                language={language}
            />
        );
    }

    return <UIPreview code={code} framework={framework} />;
}

/* ─── Code Playground ──────────────────────────────────────────── */

function CodePlayground({
    output,
    sourceCode,
    language,
}: {
    output: string;
    sourceCode: string;
    language: "python" | "javascript";
}) {
    const [isRunning, setIsRunning] = useState(false);
    const [execOutput, setExecOutput] = useState(output);
    const [showOutput, setShowOutput] = useState(!!output);

    const handleRun = async () => {
        setIsRunning(true);
        setShowOutput(true);
        setExecOutput("Running...");

        try {
            const response = await fetch("http://localhost:3001/api/chat/code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: `Run this ${language} code exactly as-is:\n\`\`\`${language}\n${sourceCode}\n\`\`\`` }),
            });

            if (!response.ok) throw new Error("Execution failed");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let result = "";
            let currentEvent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.startsWith("event:")) {
                            currentEvent = line.substring(6).trim();
                            continue;
                        }
                        if (line.startsWith("data:")) {
                            try {
                                const data = JSON.parse(line.substring(5).trim());
                                if (currentEvent === "tool-result" && data.result) {
                                    result = data.result.success
                                        ? data.result.output || "(no output)"
                                        : data.result.error || "Execution failed";
                                }
                            } catch { }
                        }
                    }
                }
            }

            setExecOutput(result || execOutput);
        } catch (err: any) {
            setExecOutput(`Error: ${err.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const langLabel = language === "python" ? "Python" : "JavaScript";
    const langColor = language === "python" ? "#3572A5" : "#f7df1e";
    const langTextColor = language === "python" ? "#fff" : "#000";

    return (
        <div
            style={{
                background: "#0d1117",
                border: "1px solid #30363d",
                borderRadius: "12px",
                overflow: "hidden",
                fontFamily:
                    "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: "13px",
                lineHeight: "1.6",
            }}
        >
            {/* ── Header ─────────────────────────────── */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    background: "#161b22",
                    borderBottom: "1px solid #30363d",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
                    </div>
                    <span
                        style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: langColor,
                            color: langTextColor,
                            letterSpacing: "0.5px",
                        }}
                    >
                        {langLabel}
                    </span>
                </div>

                <button
                    onClick={handleRun}
                    disabled={isRunning || !sourceCode}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 14px",
                        borderRadius: "8px",
                        border: "none",
                        background: isRunning ? "#30363d" : "#238636",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: isRunning || !sourceCode ? "not-allowed" : "pointer",
                        opacity: isRunning ? 0.7 : 1,
                        transition: "all 0.2s",
                    }}
                >
                    {isRunning ? (
                        <>
                            <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            Running…
                        </>
                    ) : (
                        <>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M4 2l10 6-10 6V2z" />
                            </svg>
                            Run
                        </>
                    )}
                </button>
            </div>

            {/* ── Source Code ─────────────────────────── */}
            {sourceCode && (
                <div style={{ position: "relative" }}>
                    <pre
                        style={{
                            margin: 0,
                            padding: "16px",
                            color: "#c9d1d9",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            maxHeight: "350px",
                            overflowY: "auto",
                            background: "#0d1117",
                        }}
                    >
                        <code>{sourceCode}</code>
                    </pre>
                </div>
            )}

            {/* ── Output Terminal ─────────────────────── */}
            {showOutput && (
                <div
                    style={{
                        borderTop: "1px solid #30363d",
                        background: "#010409",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 16px",
                            borderBottom: "1px solid #21262d",
                            fontSize: "11px",
                            color: "#8b949e",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#39d353" }}>
                            <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25H1.75zM7.25 8a.75.75 0 01-1.06 0L3.72 5.53a.75.75 0 011.06-1.06L7 6.69l2.22-2.22a.75.75 0 011.06 1.06L7.25 8z" />
                        </svg>
                        Output
                    </div>
                    <pre
                        style={{
                            margin: 0,
                            padding: "12px 16px",
                            color: "#39d353",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            maxHeight: "250px",
                            overflowY: "auto",
                            fontSize: "13px",
                        }}
                    >
                        {execOutput || "No output"}
                    </pre>
                </div>
            )}

            {/* spinner keyframe */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

/* ─── Live UI Preview (Sandpack) with Fullscreen ─────────────── */

function UIPreview({
    code,
    framework,
}: {
    code: string;
    framework: "html" | "react";
}) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const sandpackContent = (heightVal: string) => {
        if (framework === "react") {
            return (
                <SandpackProvider
                    template="react"
                    files={{
                        "/App.js": {
                            code,
                            active: true,
                        },
                    }}
                    theme="dark"
                    options={{
                        externalResources: [
                            "https://cdn.tailwindcss.com",
                        ],
                    }}
                >
                    <SandpackLayout
                        style={{
                            borderRadius: isFullscreen ? "0px" : "12px",
                            border: isFullscreen ? "none" : "1px solid #30363d",
                            height: isFullscreen ? "100%" : undefined,
                        }}
                    >
                        {!isFullscreen && (
                            <SandpackCodeEditor
                                showLineNumbers
                                showTabs
                                style={{ height: heightVal }}
                            />
                        )}
                        <SandpackPreview
                            showOpenInCodeSandbox={false}
                            showRefreshButton
                            style={{ height: heightVal, flex: isFullscreen ? 1 : undefined }}
                        />
                    </SandpackLayout>
                </SandpackProvider>
            );
        }

        return (
            <SandpackProvider
                template="static"
                files={{
                    "/index.html": {
                        code,
                        active: true,
                    },
                }}
                theme="dark"
            >
                <SandpackLayout
                    style={{
                        borderRadius: isFullscreen ? "0px" : "12px",
                        border: isFullscreen ? "none" : "1px solid #30363d",
                        height: isFullscreen ? "100%" : undefined,
                    }}
                >
                    {!isFullscreen && (
                        <SandpackCodeEditor
                            showLineNumbers
                            showTabs
                            style={{ height: heightVal }}
                        />
                    )}
                    <SandpackPreview
                        showOpenInCodeSandbox={false}
                        showRefreshButton
                        style={{ height: heightVal, flex: isFullscreen ? 1 : undefined }}
                    />
                </SandpackLayout>
            </SandpackProvider>
        );
    };

    /* ── Fullscreen Overlay ── */
    if (isFullscreen) {
        return (
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    background: "#0d1117",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Toolbar */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 20px",
                        background: "#161b22",
                        borderBottom: "1px solid #30363d",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="#8b949e">
                            <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0113.25 15H2.75A1.75 1.75 0 011 13.25V2.75z" />
                        </svg>
                        <span style={{ color: "#c9d1d9", fontSize: "14px", fontWeight: 600 }}>
                            Live Preview
                        </span>
                        <span
                            style={{
                                fontSize: "10px",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                background: framework === "react" ? "#61dafb" : "#e34c26",
                                color: "#000",
                                fontWeight: 600,
                            }}
                        >
                            {framework === "react" ? "React" : "HTML"}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsFullscreen(false)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            border: "1px solid #30363d",
                            background: "#21262d",
                            color: "#c9d1d9",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                        </svg>
                        Exit Fullscreen
                    </button>
                </div>

                {/* Preview content */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                    {sandpackContent("100%")}
                </div>
            </div>
        );
    }

    /* ── Inline Preview ── */
    return (
        <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative" }}>
            {/* Fullscreen button */}
            <div
                style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    zIndex: 10,
                }}
            >
                <button
                    onClick={() => setIsFullscreen(true)}
                    title="Open fullscreen preview"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "1px solid #30363d",
                        background: "rgba(22, 27, 34, 0.9)",
                        color: "#c9d1d9",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        backdropFilter: "blur(8px)",
                        transition: "all 0.2s",
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                    Fullscreen
                </button>
            </div>

            {sandpackContent("400px")}
        </div>
    );
}
