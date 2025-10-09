# Quick Customization Cheat Sheet

## File Location
`frontend/components/advanced-streaming-text.tsx`

## Common Customizations

### Make Animation Faster ⚡
```typescript
// TOP OF FILE - Change these constants:
const ANIMATION_DURATION = 200;  // Was: 300
const WORD_DELAY = 20;           // Was: 30
```

### Make Animation Slower 🐌
```typescript
const ANIMATION_DURATION = 500;  // Was: 300
const WORD_DELAY = 50;           // Was: 30
```

### Change Cursor Color 🎨
```css
/* IN THE COMPONENT */
.blinking-cursor {
  background-color: #3b82f6; /* Blue - was: #14b8a6 */
}
```

**Color Options:**
- `#14b8a6` - Teal (default)
- `#3b82f6` - Blue
- `#8b5cf6` - Purple
- `#10b981` - Green
- `#ef4444` - Red

### Change Slide Distance 📏
```css
.animated-word {
  transform: translateY(15px); /* Higher = slides from further - was: 8px */
}
```

### Change Cursor Blink Speed ⏱️
```css
.blinking-cursor {
  animation: blink 0.5s step-end infinite; /* Faster - was: 1s */
}
```

### Disable Animation (for debugging) 🔧
```typescript
<AdvancedStreamingText
  content={content}
  isStreaming={false} // Set to false to disable
/>
```

## Quick Test Changes

Copy these into your component to test different styles:

### Ultra Fast (Snappy)
```typescript
const ANIMATION_DURATION = 150;
const WORD_DELAY = 15;
```

### Dramatic (Slow Motion)
```typescript
const ANIMATION_DURATION = 600;
const WORD_DELAY = 80;
```

### Subtle (Barely Noticeable)
```typescript
const ANIMATION_DURATION = 200;
const WORD_DELAY = 10;
// Also change in CSS:
transform: translateY(3px); /* Very small slide */
```

That's it! These are the most common customizations you'll need. 🚀

