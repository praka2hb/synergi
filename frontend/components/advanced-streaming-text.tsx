"use client"

import { useEffect, useState, useRef } from 'react';
import { MarkdownMessage } from './markdown-message';

interface AdvancedStreamingTextProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

/**
 * AdvancedStreamingText Component
 * 
 * A more sophisticated streaming text component that handles:
 * - Word-by-word animations for incoming text from backend stream
 * - Only animates NEW words that arrive (not previously rendered words)
 * - Smooth fade-in and upward slide for each new word
 * - Blinking cursor while streaming
 * 
 * HOW TO CUSTOMIZE:
 * 
 * 1. Animation Speed:
 *    - Change ANIMATION_DURATION constant (default: 300ms)
 *    - Change CSS transition-duration in .animated-word class
 * 
 * 2. Delay Between Words:
 *    - Change WORD_DELAY constant (default: 30ms)
 *    - Lower = faster word appearance, Higher = slower
 * 
 * 3. Slide Distance:
 *    - Modify 'transform: translateY(8px)' in .animated-word
 *    - Higher value = slides from further down
 * 
 * 4. Cursor Blink Speed:
 *    - Change animation duration in .blinking-cursor (default: 1s)
 * 
 * 5. Cursor Style:
 *    - Modify width, height, background in .blinking-cursor class
 */

// CUSTOMIZATION: Adjust these values to change animation behavior
const ANIMATION_DURATION = 300; // Duration of fade-in animation in milliseconds
const WORD_DELAY = 30; // Delay between each word animation in milliseconds

export function AdvancedStreamingText({ 
  content, 
  isStreaming, 
  className = '' 
}: AdvancedStreamingTextProps) {
  const [animatedWords, setAnimatedWords] = useState<string[]>([]);
  const [staticContent, setStaticContent] = useState('');
  const previousContentRef = useRef('');
  const animationTimeoutRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!isStreaming) {
      // When streaming ends, clear all animations and show full content
      animationTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      animationTimeoutRef.current = [];
      setStaticContent(content);
      setAnimatedWords([]);
      previousContentRef.current = content;
      return;
    }

    // Only process new content that was added
    if (content.length > previousContentRef.current.length) {
      const newText = content.slice(previousContentRef.current.length);
      
      // Split new text into words (preserving spaces)
      const newWords = newText.split(/(\s+)/).filter(w => w.length > 0);
      
      if (newWords.length > 0) {
        // Clear previous animation timeouts
        animationTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
        animationTimeoutRef.current = [];

        // Keep existing static content
        const baseContent = previousContentRef.current;
        setStaticContent(baseContent);

        // Animate new words one by one
        newWords.forEach((word, index) => {
          const timeout = setTimeout(() => {
            setAnimatedWords(prev => [...prev, word]);
            
            // After animation completes, move word to static content
            const moveToStatic = setTimeout(() => {
              setStaticContent(current => current + word);
              setAnimatedWords(prev => prev.filter(w => w !== word));
            }, ANIMATION_DURATION);
            
            animationTimeoutRef.current.push(moveToStatic);
          }, index * WORD_DELAY);
          
          animationTimeoutRef.current.push(timeout);
        });

        previousContentRef.current = content;
      }
    }

    return () => {
      // Cleanup timeouts on unmount
      animationTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [content, isStreaming]);

  return (
    <div className={`relative ${className}`}>
      <style jsx>{`
        /* 
         * ANIMATION CUSTOMIZATION GUIDE:
         * 
         * 1. Change slide distance: modify 'translateY(8px)' to higher/lower value
         * 2. Change fade speed: modify 'transition' duration (currently 0.3s)
         * 3. Change easing: replace 'cubic-bezier' with 'ease', 'ease-in', 'ease-out', etc.
         */
        .animated-word {
          display: inline;
          opacity: 0;
          transform: translateY(8px); /* CUSTOMIZE: Vertical slide distance */
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes slideIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 
         * CURSOR CUSTOMIZATION:
         * - Change width/height for cursor size
         * - Change background-color for cursor color
         * - Change animation duration (1s) for blink speed
         */
        .blinking-cursor {
          display: inline-block;
          width: 2px;              /* CUSTOMIZE: Cursor width */
          height: 1em;             /* CUSTOMIZE: Cursor height */
          background-color: #14b8a6; /* CUSTOMIZE: Cursor color (teal-500) */
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: blink 1s step-end infinite; /* CUSTOMIZE: Blink speed */
        }

        @keyframes blink {
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
        {/* Static content (already animated) */}
        {staticContent && (
          <span className="inline">
            <MarkdownMessage content={staticContent} className="text-sm inline" />
          </span>
        )}
        
        {/* Animated words (currently animating in) */}
        {animatedWords.map((word, index) => (
          <span
            key={`${index}-${word}-${Date.now()}`}
            className="animated-word"
          >
            {word}
          </span>
        ))}
        
        {/* Blinking cursor during streaming */}
        {isStreaming && <span className="blinking-cursor" aria-hidden="true" />}
      </div>
    </div>
  );
}

