/**
 * Platform OS — Unified Design Tokens
 *
 * WO-P4C: Single source of truth for all visual values.
 * NO hardcoded colors/spacing/shadows in business code.
 */

// ═══════════════════════════════════════════
// Colors
// ═══════════════════════════════════════════

export const colors = {
  // Brand primaries
  brand: {
    50:  "#FDF8F0",
    100: "#F5F1EA",
    200: "#E8DFD0",
    300: "#D9CCB8",
    400: "#C4B39A",
    500: "#8A6A44",
    600: "#6B4F30",
    700: "#4A3520",
    800: "#2B1F12",
    900: "#1A120A",
  },

  // Sidebar
  sidebar: {
    bg:             "#50677D",
    bgHover:        "#425A6F",
    bgActive:       "#5B7991",
    bgGradient:     "linear-gradient(175deg, #3D5265 0%, #50677D 40%, #445B6F 100%)",
    border:         "#5E7A8F",
    text:           "#F5F2EE",
    textMuted:      "rgba(245,242,238,0.78)",
    textDim:        "rgba(245,242,238,0.55)",
    itemText:       "#DCE8F2",
    itemActive:     "#FFFFFF",
    groupLabel:     "#9BBAD4",
    logoSub:        "#A8C0D4",
    footerText:     "#8BA7BF",
    logoutText:     "rgba(245,242,238,0.65)",
    logoutHoverBg:  "rgba(220,38,38,0.18)",
    logoutHoverText:"rgba(248,113,113,0.95)",
    copyright:      "rgba(245,242,238,0.42)",
    avatarBorder:   "rgba(251,191,36,0.22)",
    userRoleText:   "rgba(245,242,238,0.68)",
    hoverBg:        "rgba(245,242,238,0.10)",
  },

  // Active/highlight
  accent: {
    50:  "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    activeText:     "#FBBF24",
    activeBg:       "linear-gradient(135deg, rgba(251,191,36,0.14), rgba(251,191,36,0.05))",
    activeBorder:   "rgba(251,191,36,0.30)",
    indicatorGrad:  "linear-gradient(180deg, #fbbf24, #b45309)",
    childActive:    "#FBBF24",
    childActiveBg:  "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(180,83,9,0.05))",
  },

  // Semantic
  neutral: {
    50:  "#FAFAFA",
    100: "#F5F5F4",
    200: "#E7E5E4",
    300: "#D6D3D1",
    400: "#A8A29E",
    500: "#78716C",
    600: "#57534E",
    700: "#44403C",
    800: "#292524",
    900: "#1C1917",
  },

  background: {
    page:   "#F6F1EB",
    card:   "#FFFFFF",
    input:  "#FFFFFF",
    muted:  "#FAF6F0",
  },

  ink: {
    primary:   "#1C1917",
    secondary: "#78716C",
    muted:     "#A8A29E",
    link:      "#1E40AF",
  },

  border: {
    light: "#E7E5E4",
    med:   "#D6D3D1",
    focus: "#FBBF24",
  },

  semantic: {
    success: "#059669",
    warning: "#D97706",
    error:   "#DC2626",
    info:    "#2563EB",
    successBg: "#ECFDF5",
    warningBg: "#FFFBEB",
    errorBg:   "#FEF2F2",
    infoBg:    "#EFF6FF",
  },
} as const;

// ═══════════════════════════════════════════
// Spacing
// ═══════════════════════════════════════════

export const spacing = {
  0:  "0",
  1:  "0.25rem",
  2:  "0.5rem",
  3:  "0.75rem",
  4:  "1rem",
  5:  "1.25rem",
  6:  "1.5rem",
  8:  "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  sidebar: "15rem",    // 240px unified sidebar width
  content: "3rem",     // content padding
  section: "4rem",     // section gap
} as const;

// ═══════════════════════════════════════════
// Border Radius
// ═══════════════════════════════════════════

export const radius = {
  none:  "0",
  sm:    "0.375rem",
  md:    "0.5rem",
  lg:    "0.75rem",
  xl:    "1rem",
  "2xl": "1.5rem",
  full:  "9999px",
} as const;

// ═══════════════════════════════════════════
// Shadows
// ═══════════════════════════════════════════

export const shadow = {
  none: "none",
  sm:   "0 1px 2px 0 rgba(0,0,0,0.05)",
  md:   "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  lg:   "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  xl:   "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
  sidebar: "4px 0 32px rgba(0,0,0,0.25)",
  card: "0 1px 3px rgba(0,0,0,0.06)",
  modal: "0 25px 50px rgba(0,0,0,0.25)",
} as const;

// ═══════════════════════════════════════════
// Z-Index
// ═══════════════════════════════════════════

export const zIndex = {
  0:    "0",
  10:   "10",
  20:   "20",
  30:   "30",
  40:   "40",
  50:   "50",
  sidebar: "40",
  overlay: "30",
  modal:   "50",
  toast:   "60",
  tooltip: "70",
} as const;

// ═══════════════════════════════════════════
// Typography
// ═══════════════════════════════════════════

export const typography = {
  fontFamily: {
    sans:  "system-ui, -apple-system, sans-serif",
    serif: "'Noto Serif SC', 'Source Han Serif SC', serif",
    mono:  "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs:   "0.75rem",
    sm:   "0.875rem",
    base: "1rem",
    lg:   "1.125rem",
    xl:   "1.25rem",
    "2xl":"1.5rem",
    "3xl":"1.875rem",
    "4xl":"2.25rem",
  },
  fontWeight: {
    light:    "300",
    normal:   "400",
    medium:   "500",
    semibold: "600",
    bold:     "700",
  },
  letterSpacing: {
    tight:  "-0.02em",
    normal: "0",
    wide:   "0.05em",
    wider:  "0.1em",
    widest: "0.15em",
  },
} as const;

// ═══════════════════════════════════════════
// Motion
// ═══════════════════════════════════════════

export const motion = {
  duration: {
    fast:    "150ms",
    normal:  "200ms",
    slow:    "300ms",
    slower:  "500ms",
  },
  easing: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in:      "cubic-bezier(0.4, 0, 1, 1)",
    out:     "cubic-bezier(0, 0, 0.2, 1)",
    inOut:   "cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

// ═══════════════════════════════════════════
// Sidebar constants
// ═══════════════════════════════════════════

export const sidebar = {
  width: "15rem",       // 240px
  collapsedWidth: "3.5rem", // 56px
  breakpoint: "1024px",
  padding: "10px 10px",
  itemHeight: "2.5rem",
  iconSize: 17,
  logoHeight: 64,
} as const;
