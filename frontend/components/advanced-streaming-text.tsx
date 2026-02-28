"use client"

import { MarkdownMessage } from './markdown-message';

interface AdvancedStreamingTextProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

/**
 * AdvancedStreamingText Component - Google Gemini Style
 * 
 * Mimics Google Gemini's clean streaming appearance:
 * - Text appears instantly as it streams (no animations)
 * - Subtle blinking cursor at the end while streaming
 * - Clean, natural typing-like flow
 * 
 * HOW TO CUSTOMIZE:
 * 
 * 1. Cursor Blink Speed:
 *    - Change animation duration in .gemini-cursor (default: 1s)
 * 
 * 2. Cursor Style:
 *    - Modify width for cursor thickness (default: 1.5px for subtle look)
 *    - Modify height for cursor height (default: 1em to match text)
 *    - Change background-color for cursor color
 */

export function AdvancedStreamingText({ 
  content, 
  isStreaming, 
  className = '' 
}: AdvancedStreamingTextProps) {
  return (
    <div className={`relative ${className}`}>
      <style jsx>{`
        /* Google Gemini-style cursor: thin, subtle, blinking */
        .gemini-cursor {
          display: inline-block;
          width: 1.5px;           /* Thin cursor like Gemini */
          height: 1em;            /* Match text height */
          background-color: currentColor; /* Uses text color */
          margin-left: 1px;
          vertical-align: text-bottom;
          animation: gemini-blink 1s ease-in-out infinite;
        }

        @keyframes gemini-blink {
          0%, 49% {
            opacity: 1;
          }
          50%, 100% {
            opacity: 0;
          }
        }

        /* Ensure proper inline display for markdown elements */
        .streaming-wrapper :global(p) {
          display: inline;
        }

        .streaming-wrapper :global(p:not(:last-child)) {
          margin-bottom: 0;
        }
      `}</style>

      <div className="streaming-wrapper inline">
        {/* Display content directly without animations */}
        <span className="inline">
          <MarkdownMessage content={content} className="text-sm inline" />
        </span>
        
        {/* Subtle blinking cursor during streaming */}
        {isStreaming && <span className="gemini-cursor" aria-hidden="true" />}
      </div>
    </div>
  );
}

