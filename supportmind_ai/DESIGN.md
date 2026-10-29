---
name: SupportMind AI
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf6'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e8edff'
  surface-container-high: '#e0e8ff'
  surface-container-highest: '#d7e2ff'
  on-surface: '#101b30'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#263046'
  inverse-on-surface: '#edf0ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4c'
  primary: '#006c4c'
  on-primary: '#ffffff'
  primary-container: '#00a878'
  on-primary-container: '#003422'
  inverse-primary: '#59dda9'
  secondary: '#13677b'
  on-secondary: '#ffffff'
  secondary-container: '#a1e7ff'
  on-secondary-container: '#18697e'
  tertiary: '#206d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#36aa00'
  on-tertiary-container: '#0b3500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#78fac3'
  primary-fixed-dim: '#59dda9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005138'
  secondary-fixed: '#b2ebff'
  secondary-fixed-dim: '#8bd1e8'
  on-secondary-fixed: '#001f27'
  on-secondary-fixed-variant: '#004e5f'
  tertiary-fixed: '#84fe58'
  tertiary-fixed-dim: '#69e03e'
  on-tertiary-fixed: '#052100'
  on-tertiary-fixed-variant: '#165200'
  background: '#f9f9ff'
  on-background: '#101b30'
  surface-variant: '#d7e2ff'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  code:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is engineered for a premium enterprise AI environment, emphasizing precision, clarity, and sophisticated utility. The brand personality is authoritative yet accessible, positioned as an intelligent partner rather than just a tool.

The aesthetic blends **Minimalism** with subtle **Glassmorphism** to create a sense of depth without visual clutter. Drawing inspiration from high-performance productivity tools, the UI utilizes generous whitespace and a rigorous structural grid. The emotional response is one of "calm capability"—a workspace that reduces cognitive load while providing powerful AI insights.

Key stylistic markers include:
- Refined typography with high legibility.
- Soft, intentional depth through layered surfaces.
- Micro-interactions that feel responsive and high-end.
- High-quality, thin-stroke iconography.

## Colors

The color palette is built around an **Emerald and Deep Teal** foundation, intentionally avoiding the standard "SaaS Blue" to differentiate the product in the enterprise sector.

**Light Mode** utilizes a cool, off-white background (#F7F9F9) to reduce eye strain, with pure white surfaces to denote interactivity. **Dark Mode** shifts to a deep obsidian palette, swapping the primary emerald for a high-visibility cyan-tinted green (#2EC4B6) to maintain AAA accessibility standards against dark backgrounds.

Functional colors (Success, Warning, Error) are desaturated slightly in light mode for a professional look and brightened in dark mode for clarity. Use the secondary color (#005F73) for structural elements, navigation headers, or "quiet" interactive states.

## Typography

This design system uses a tri-font strategy to define clear information hierarchies:
1. **Hanken Grotesk** is used for headlines. It provides a sharp, modern, and high-end feel that communicates precision.
2. **Inter** is the workhorse for all body copy. It is chosen for its exceptional readability in data-dense SaaS environments.
3. **Geist** is reserved for labels, data points, and technical metadata. Its monospaced-leaning proportions lend a "technical tool" aesthetic to UI controls and AI-generated outputs.

Maintain strict adherence to vertical rhythm by using the defined line heights. For long-form AI responses, use `body-md` with `text-secondary` to improve reading endurance.

## Layout & Spacing

The layout follows a **Fluid Grid** philosophy within a maximum container width of 1440px. 

- **Desktop (1280px+):** 12-column grid, 24px gutters, 40px side margins. 
- **Tablet (768px - 1279px):** 8-column grid, 16px gutters, 24px side margins.
- **Mobile (<768px):** 4-column grid, 16px gutters, 16px side margins.

Horizontal spacing for components should strictly follow the 4px base unit. Use `2xl` and `3xl` for section padding to emphasize the premium, spacious feel. For dashboard layouts, use a fixed left-sidebar (280px) and a fluid main content area.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Glassmorphism**.

1. **Level 0 (Background):** Base color (#F7F9F9 / #0D1117).
2. **Level 1 (Surface):** Default card and container background. Uses a 1px border (#E5E7EB / #2A2F36).
3. **Level 2 (Raised):** Hover states or active cards. 
   - *Light Mode:* Shadow: `0 4px 12px rgba(27, 38, 59, 0.05)`.
   - *Dark Mode:* Shadow: `0 4px 12px rgba(0, 0, 0, 0.4)`.
4. **Level 3 (Overlay):** Modals and dropdowns. 
   - Apply a backdrop-filter: `blur(8px)` with 80% opacity on the surface color.
   - 1px "inner-glow" border for dark mode: `rgba(255, 255, 255, 0.1)`.

Shadows should be extra-diffused and avoid high-contrast blacks in light mode, opting for a tint of the `text_primary` color.

## Shapes

The design system utilizes **Rounded** geometry (8px base radius) to bridge the gap between "technical" and "friendly."

- **Standard Elements (Buttons, Inputs):** 8px (`rounded-md`).
- **Containers (Cards, Modals):** 12px - 16px (`rounded-lg` to `rounded-xl`).
- **Badges/Toggle Tracks:** Full pill-shape (`rounded-full`).

This consistency in curvature creates a cohesive visual flow. Interactive elements like cards should transition from 12px to 16px when nested to maintain optical balance.

## Components

### Buttons
- **Primary:** Filled `primary_color`. White text in Light mode, Dark text in Dark mode. 8px radius.
- **Secondary:** Ghost style. `text_primary` with a 1px `border`. Subtle background fill (#F7F9F9) on hover.
- **Tertiary/AI:** Gradient border (Primary to Secondary) with a subtle glass blur background.

### Cards
- Use 16px corner radius. Include a 1px border. On hover, increase elevation and shift border color to `primary_color` at 30% opacity.

### Tables
- Header row: `label-sm`, uppercase, `text_secondary`. 
- Rows: 56px height, 1px bottom border only. No vertical lines.
- Hover: Soft background tint (`primary_color` at 5% opacity).

### Badges
- 12px text (`label-sm`). 
- Soft tint background (10% opacity of the functional color) with 100% opacity text of that same color.

### Charts
- Use a stroke width of 2px for line charts.
- Palette: Primary Emerald, Secondary Teal, and Success Green. 
- Use semi-transparent area gradients beneath lines to denote volume.

### Animated Theme Toggle
- A pill-shaped track. The "thumb" should contain a sun/moon icon. 
- Transition: Use a `cubic-bezier(0.4, 0, 0.2, 1)` for the thumb slide and a 360-degree rotation on the icon during the switch.

### Input Fields
- 1px border. On focus, the border changes to `primary_color` and a 3px "halo" (Primary color at 15% opacity) appears.