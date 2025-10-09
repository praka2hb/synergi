# Word-by-Word Streaming Animation Guide

This guide explains how the word-by-word streaming animation works and how to customize it.

## Overview

The AI responses now display with a beautiful word-by-word animation:
- ✨ Each word fades in with a subtle upward slide
- 📝 Blinking cursor shows while generating
- 🎯 Only new words are animated (existing text stays static)
- ⚡ Smooth handling of backend text streams

## Components

### `AdvancedStreamingText` (Recommended)
**Location:** `frontend/components/advanced-streaming-text.tsx`

This is the **recommended component** that intelligently handles streaming:
- Only animates NEW words arriving from the backend
- Previously rendered words remain static (no re-animation)
- More efficient and smoother for long responses
- Perfect for real backend streaming

### `StreamingText` (Alternative)
**Location:** `frontend/components/streaming-text.tsx`

Simpler version that animates all words at once:
- Good for demonstrating the animation effect
- Less ideal for actual streaming (re-animates everything)
- Use for static content with animation effect

## How It Works

### Backend Streaming Flow

```
Backend sends text stream
    ↓
Content updates in real-time
    ↓
Component detects new text
    ↓
Splits new text into words
    ↓
Animates each word sequentially
    ↓
Words fade in + slide up
    ↓
Cursor blinks at the end
```

### Component Logic

```typescript
// 1. Track what content was already displayed
const previousContentRef = useRef('');

// 2. When new content arrives, extract only the new part
const newText = content.slice(previousContentRef.current.length);

// 3. Split into words
const newWords = newText.split(/(\s+)/);

// 4. Animate each word with a delay
newWords.forEach((word, index) => {
  setTimeout(() => {
    // Animate word in
  }, index * WORD_DELAY);
});
```

## Customization Guide

### 1. Animation Speed

**File:** `frontend/components/advanced-streaming-text.tsx`

```typescript
// Change this constant at the top of the file
const ANIMATION_DURATION = 300; // milliseconds (default: 300ms)

// Lower = faster fade-in (e.g., 150ms)
// Higher = slower fade-in (e.g., 500ms)
```

**In CSS:**
```css
.animated-word {
  transition: opacity 0.3s ...; 
  /* Change 0.3s to match ANIMATION_DURATION */
}
```

### 2. Delay Between Words

**File:** `frontend/components/advanced-streaming-text.tsx`

```typescript
// Change this constant at the top of the file
const WORD_DELAY = 30; // milliseconds between words (default: 30ms)

// Lower = words appear faster (e.g., 20ms)
// Higher = words appear slower (e.g., 50ms)
```

**Examples:**
- `WORD_DELAY = 20` → Fast (words appear quickly)
- `WORD_DELAY = 30` → Medium (default)
- `WORD_DELAY = 50` → Slow (more dramatic effect)

### 3. Slide Distance

**File:** `frontend/components/advanced-streaming-text.tsx`

```css
.animated-word {
  transform: translateY(8px); 
  /* Change 8px to adjust vertical slide */
}
```

**Examples:**
- `translateY(4px)` → Subtle slide
- `translateY(8px)` → Medium slide (default)
- `translateY(15px)` → Dramatic slide

### 4. Cursor Customization

#### Cursor Color

```css
.blinking-cursor {
  background-color: #14b8a6; /* Teal color */
}
```

**Popular colors:**
- `#14b8a6` → Teal (default)
- `#3b82f6` → Blue
- `#8b5cf6` → Purple
- `#10b981` → Green

#### Cursor Size

```css
.blinking-cursor {
  width: 2px;    /* Cursor width */
  height: 1em;   /* Cursor height */
}
```

#### Blink Speed

```css
.blinking-cursor {
  animation: blink 1s step-end infinite;
  /* Change 1s to adjust blink speed */
}
```

**Examples:**
- `0.5s` → Fast blinking
- `1s` → Normal (default)
- `1.5s` → Slow blinking

### 5. Animation Easing

**File:** `frontend/components/advanced-streaming-text.tsx`

```css
.animated-word {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* Change easing function */
}
```

**Common easing functions:**
- `ease` → Default browser easing
- `ease-in` → Slow start, fast end
- `ease-out` → Fast start, slow end
- `ease-in-out` → Slow start and end
- `linear` → Constant speed
- `cubic-bezier(0.4, 0, 0.2, 1)` → Custom (default)

## Integration with Backend

### How to Use with Streaming API

The component automatically handles streaming text. Just pass the accumulated content:

```typescript
// Your chat component
const [streamingContent, setStreamingContent] = useState("");

// As backend sends chunks:
reader.onData((chunk) => {
  setStreamingContent(prev => prev + chunk);
  // Component will automatically animate new words!
});

// In your JSX:
<AdvancedStreamingText
  content={streamingContent}
  isStreaming={true}
  className="text-sm"
/>
```

### Complete Example

```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [isStreaming, setIsStreaming] = useState(false);

const handleStream = async () => {
  setIsStreaming(true);
  
  const response = await fetch('/api/chat', { method: 'POST' });
  const reader = response.body?.getReader();
  
  let accumulatedText = "";
  
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    
    const chunk = new TextDecoder().decode(value);
    accumulatedText += chunk;
    
    // Update the last message with accumulated text
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: accumulatedText,
        isStreaming: true
      };
      return updated;
    });
  }
  
  setIsStreaming(false);
};

// Render:
<AdvancedStreamingText
  content={message.content}
  isStreaming={message.isStreaming}
/>
```

## Performance Tips

### 1. Use `AdvancedStreamingText` for Streaming
- Only animates new words
- More efficient for long responses
- Better user experience

### 2. Disable Animation for Very Long Texts
```typescript
const shouldAnimate = content.length < 1000; // Don't animate if > 1000 chars

<AdvancedStreamingText
  content={content}
  isStreaming={isStreaming && shouldAnimate}
/>
```

### 3. Adjust Word Delay for Performance
```typescript
// For slower devices, increase delay to reduce simultaneous animations
const WORD_DELAY = 50; // Instead of 30
```

## Troubleshooting

### Issue: Words animate too fast

**Solution:** Increase `WORD_DELAY`
```typescript
const WORD_DELAY = 50; // Slower
```

### Issue: Animation feels sluggish

**Solution:** Decrease `ANIMATION_DURATION`
```typescript
const ANIMATION_DURATION = 200; // Faster
```

### Issue: Cursor doesn't show

**Solution:** Make sure `isStreaming` prop is `true`
```typescript
<AdvancedStreamingText
  content={content}
  isStreaming={true} // ← Make sure this is true
/>
```

### Issue: All words re-animate on update

**Solution:** Use `AdvancedStreamingText` instead of `StreamingText`

### Issue: Markdown not rendering correctly

**Solution:** The component uses `MarkdownMessage` internally. Make sure your markdown is properly formatted.

## Visual Examples

### Fast Animation
```typescript
const ANIMATION_DURATION = 150;
const WORD_DELAY = 20;
```
Result: ⚡ Very quick, snappy animation

### Medium Animation (Default)
```typescript
const ANIMATION_DURATION = 300;
const WORD_DELAY = 30;
```
Result: 🎯 Balanced, smooth animation

### Slow Animation
```typescript
const ANIMATION_DURATION = 500;
const WORD_DELAY = 50;
```
Result: 🐌 Dramatic, deliberate animation

## Advanced Customization

### Custom Animation Keyframes

Edit the `@keyframes slideIn` in the component:

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.95); /* Add scale */
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### Different Cursor Styles

**Block cursor:**
```css
.blinking-cursor {
  width: 0.5em;
  height: 1em;
  background-color: #14b8a6;
  border-radius: 2px;
}
```

**Underscore cursor:**
```css
.blinking-cursor {
  width: 0.6em;
  height: 2px;
  background-color: #14b8a6;
  margin-left: 0;
  vertical-align: baseline;
}
```

## Best Practices

1. **Use for AI responses only** - Don't animate user messages
2. **Keep WORD_DELAY low** - 20-50ms is ideal
3. **Test on slower devices** - Ensure smooth performance
4. **Respect user preferences** - Consider prefers-reduced-motion
5. **Match brand colors** - Customize cursor color to your theme

## Summary

The streaming animation enhances the chat experience by:
- ✨ Making AI responses feel more natural and engaging
- 📝 Providing visual feedback during generation
- 🎯 Smoothly handling backend text streams
- ⚡ Being fully customizable to match your brand

All customization happens in:
- `frontend/components/advanced-streaming-text.tsx`

Enjoy your beautiful streaming animations! 🎉

