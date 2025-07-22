// Branding constants - Single source of truth for app identity
export const BRANDING = {
  // Core brand identity
  name: "Oh Sheet!",
  tagline: "Score like a pro",
  fullTitle: "Oh Sheet! Score like a pro",
  
  // Descriptions for different contexts
  description: {
    short: "The fun way to score your multiplayer games",
    full: "Oh Sheet! The fun way to score your multiplayer card and dice games in real-time",
    seo: "Real-time multiplayer game scoring made fun and easy"
  },
  
  // Loading states
  loading: {
    text: "Score like a pro - Chargement...",
    redirect: "Score like a pro - Redirection en cours..."
  },
  
  // Technical info
  tech: {
    subtitle: "Next.js 15 + Turso SQLite + Polling temps réel • 🚧 Version de développement"
  },
  
  // UI labels and headings
  ui: {
    dashboard: {
      title: "Game Scoring Hub",
      subtitle: "Créez des parties et invitez vos amis à jouer ensemble",
      gamesAvailable: "Jeux Disponibles"
    },
    sidebar: {
      title: "Oh Sheet!"
    }
  }
} as const;

// Utility function for dynamic titles
export function getPageTitle(pageTitle?: string): string {
  return pageTitle ? `${pageTitle} - ${BRANDING.name}` : BRANDING.fullTitle;
}

// Utility for meta descriptions
export function getMetaDescription(customDescription?: string): string {
  return customDescription || BRANDING.description.full;
}