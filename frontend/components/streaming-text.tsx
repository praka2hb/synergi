"use client"

import { useEffect, useState, useMemo } from 'react';
import { MarkdownMessage } from './markdown-message';

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

/**
 * StreamingText Component
 * 
 * Displays text with word-by-word animation as it streams in.
 * Each word fades in with a subtle upward slide effect.
 * 
 * Animation Customization:
 * - Speed: Adjust `--word-animation-duration` in the style tag (default: 0.3s)
 * - Delay between words: Adjust the calculation in getWordDelay (default: 50ms)
 * - Slide distance: Modify `translateY` values in keyframes (default: 10px)
 * - Fade timing: Adjust opacity values in keyframes
 */
export function StreamingText({ content, isStreaming, className = '' }: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [wordCount, setWordCount] = useState(0);

  // Split content into words while preserving markdown structure
  const words = useMemo(() => {
    if (!content) return [];
    // Split by spaces but keep the spaces for proper reconstruction
    return content.split(/(\s+)/);
  }, [content]);

  useEffect(() => {
    if (isStreaming) {
      // Update displayed content as new content arrives
      setDisplayedContent(content);
      setWordCount(words.length);
    } else {
      // When streaming stops, show all content immediately
      setDisplayedContent(content);
      setWordCount(words.length);
    }
  }, [content, words.length, isStreaming]);

  // Calculate animation delay for each word
  // Modify the multiplier (50) to adjust delay between words (in milliseconds)
  const getWordDelay = (index: number) => {
    return index * 50; // 50ms delay between each word
  };

  if (!isStreaming) {
    // When not streaming, display normally without animation
    return (
      <div className={className}>
        <MarkdownMessage content={content} className="text-sm" />
      </div>
    );
  }

  return (
    <div className={className}>
      <style jsx>{`
        /* Word animation keyframes */
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px); /* Adjust vertical slide distance */
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Blinking cursor animation */
        @keyframes blink {
          0%, 49% {
            opacity: 1;
          }
          50%, 100% {
            opacity: 0;
          }
        }

        .streaming-word {
          display: inline;
          animation: fadeSlideIn var(--word-animation-duration, 0.3s) ease-out forwards;
          animation-delay: var(--word-delay, 0ms);
          opacity: 0; /* Start invisible */
        }

        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background-color: currentColor;
          margin-left: 2px;
          animation: blink 1s step-end infinite;
          vertical-align: text-bottom;
        }

        /* Ensure markdown content displays inline properly */
        .streaming-container {
          display: inline;
        }

        .streaming-container :global(p) {
          display: inline;
        }

        .streaming-container :global(code) {
          display: inline;
        }
      `}</style>

      <div className="streaming-container">
        {words.map((word, index) => (
          <span
            key={`${index}-${word}`}
            className="streaming-word"
            style={{
              '--word-delay': `${getWordDelay(index)}ms`,
              '--word-animation-duration': '0.3s', // Adjust animation speed here
            } as React.CSSProperties}
          >
            {word}
          </span>
        ))}
        {isStreaming && (
          <span className="streaming-cursor" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

