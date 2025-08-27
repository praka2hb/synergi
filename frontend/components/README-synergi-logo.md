# Synergi Logo React Component

A reusable React component that renders the Synergi logo as an SVG with theme-aware color adaptation. This component is converted from the original `synergi.svg` file and provides a flexible, scalable way to include the logo in your React applications with enhanced contrast in light mode.

## Usage

### Basic Import

```tsx
import { SynergiLogo } from './components/synergi-logo';
// or
import SynergiLogo from './components/synergi-logo';
```

### Basic Usage

```tsx
// Default size (1024x1024)
<SynergiLogo />

// Custom size
<SynergiLogo width={64} height={64} />

// With CSS units
<SynergiLogo width="5rem" height="5rem" />

// With custom CSS classes
<SynergiLogo 
  width={100} 
  height={100} 
  className="hover:scale-110 transition-transform" 
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number \| string` | `1024` | Width of the SVG |
| `height` | `number \| string` | `1024` | Height of the SVG |
| `className` | `string` | `''` | CSS classes to apply to the SVG |
| `viewBox` | `string` | `'0 0 1024 1024'` | SVG viewBox attribute |
| `variant` | `'default' \| 'high-contrast'` | `'default'` | Color variant - high-contrast forces darker colors |

## Features

- **Theme-Aware**: Automatically adapts colors for better contrast in light/dark modes
- **Scalable**: Being an SVG, the logo scales perfectly at any size
- **Lightweight**: Pure SVG with no external dependencies
- **Customizable**: Supports custom dimensions and CSS classes
- **TypeScript**: Fully typed with TypeScript interfaces
- **High Contrast Mode**: Optional high-contrast variant for better visibility
- **Accessible**: Can be enhanced with aria-labels if needed

## Examples

### In a Navigation Bar

```tsx
<nav className="flex items-center space-x-2">
  <SynergiLogo width={40} height={40} />
  <span className="text-xl font-bold">Synergi</span>
</nav>
```

### As a Favicon-like Icon

```tsx
<SynergiLogo width={32} height={32} className="inline-block" />
```

### In a Hero Section

```tsx
<div className="text-center">
  <SynergiLogo width={200} height={200} className="mx-auto mb-4" />
  <h1 className="text-4xl font-bold">Welcome to Synergi</h1>
</div>
```

### Responsive Logo

```tsx
<SynergiLogo 
  width="clamp(50px, 10vw, 150px)" 
  height="clamp(50px, 10vw, 150px)"
  className="transition-all duration-300"
/>
```

### High Contrast Mode

```tsx
<SynergiLogo 
  width={100} 
  height={100}
  variant="high-contrast"
  className="enhanced-visibility"
/>
```

### Theme Adaptation Examples

```tsx
// Automatically adapts based on theme
<SynergiLogo width={64} height={64} />

// Force high contrast in any theme
<SynergiLogo width={64} height={64} variant="high-contrast" />
```

## Customization

### Adding Hover Effects

```tsx
<SynergiLogo 
  width={100} 
  height={100}
  className="hover:scale-110 hover:rotate-12 transition-transform duration-300 cursor-pointer"
/>
```

### Making it Clickable

```tsx
<button onClick={() => navigate('/')}>
  <SynergiLogo width={50} height={50} />
</button>
```

## Notes

- The current component includes the main structural paths of the logo for optimal performance
- For the complete logo with all 300+ original paths, you can extend the component by adding all paths from the original SVG file
- The logo maintains its original color scheme and proportions
- All paths use the exact same coordinates and transforms as the original SVG

## File Structure

```
components/
├── synergi-logo.tsx              # Main component
├── synergi-logo-examples.tsx     # Usage examples
└── README-synergi-logo.md        # This documentation
```
