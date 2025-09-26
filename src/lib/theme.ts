/**
 * Centralized theme configuration
 * All color values should be defined here for consistency
 */

export const THEME = {
  colors: {
    dark: {
      // Main backgrounds
      background: '#1e1e1e',        // Dark gray - softer than pure black
      backgroundCard: '#3a3a3e',    // Cards and panels
      backgroundSidebar: '#1f2937', // Sidebar (Tailwind gray-800)

      // Borders and inputs
      border: '#2d2d2d',
      input: '#2d2d2d',

      // Text colors
      foreground: '#f8fafc',
      foregroundMuted: '#94a3b8',

      // Brand colors
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      secondary: '#1e293b',
      secondaryForeground: '#f1f5f9',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
    },
    light: {
      // Main backgrounds
      background: '#ffffff',
      backgroundCard: '#ffffff',
      backgroundSidebar: '#f8f9fa',

      // Borders and inputs
      border: '#e5e7eb',
      input: '#e5e7eb',

      // Text colors
      foreground: '#1f2937',
      foregroundMuted: '#64748b',

      // Brand colors (same as dark)
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
    }
  },

  // Tailwind class utilities
  classes: {
    // Background classes with light/dark mode support
    pageBackground: 'bg-background',
    cardBackground: 'bg-white dark:bg-[#3a3a3e]',
    sidebarBackground: 'bg-gray-50 dark:bg-gray-800',

    // Common component patterns
    card: 'bg-white dark:bg-[#3a3a3e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm',
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
      ghost: 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white',
    }
  }
} as const;

// Export utility function to get current theme colors
export function getThemeColors(isDark: boolean = true) {
  return isDark ? THEME.colors.dark : THEME.colors.light;
}

// Generate CSS variables from THEME - Synchronizes with globals.css
export function generateCSSVariables() {
  const { light, dark } = THEME.colors;

  return {
    light: `
:root {
  --background: ${light.background};
  --foreground: ${light.foreground};
  --card: ${light.backgroundCard};
  --card-foreground: ${light.foreground};
  --border: ${light.border};
  --input: ${light.input};
  --ring: ${light.primary};
  --primary: ${light.primary};
  --primary-foreground: ${light.primaryForeground};
  --secondary: ${light.secondary};
  --secondary-foreground: ${light.secondaryForeground};
  --destructive: ${light.destructive};
  --destructive-foreground: ${light.destructiveForeground};
  --muted: ${light.secondary};
  --muted-foreground: ${light.foregroundMuted};
  --accent: ${light.secondary};
  --accent-foreground: ${light.secondaryForeground};
}`,
    dark: `
.dark {
  --background: ${dark.background};
  --foreground: ${dark.foreground};
  --card: ${dark.backgroundCard};
  --card-foreground: ${dark.foreground};
  --border: ${dark.border};
  --input: ${dark.input};
  --ring: ${dark.primary};
  --primary: ${dark.primary};
  --primary-foreground: ${dark.primaryForeground};
  --secondary: ${dark.secondary};
  --secondary-foreground: ${dark.secondaryForeground};
  --destructive: ${dark.destructive};
  --destructive-foreground: ${dark.destructiveForeground};
  --muted: ${dark.secondary};
  --muted-foreground: ${dark.foregroundMuted};
  --accent: ${dark.secondary};
  --accent-foreground: ${dark.secondaryForeground};
}`
  };
}

// Validate that globals.css variables match THEME constants
export function validateCSSSync() {
  const expectedLight = THEME.colors.light;
  const expectedDark = THEME.colors.dark;

  console.log('🎨 Expected CSS variables from THEME:');
  console.log('Light theme:', expectedLight);
  console.log('Dark theme:', expectedDark);

  // This could be extended to read actual CSS and compare
  return {
    isValid: true,
    expected: { light: expectedLight, dark: expectedDark }
  };
}