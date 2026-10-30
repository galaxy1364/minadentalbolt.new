import React from 'react';

interface AnimatedGeminiBackgroundProps {
  activeView: string;
}

interface ViewPalette {
  c1: string; // Top Right Primary
  c2: string; // Bottom Left Secondary
  c3: string; // Center / Accent
  c4: string; // Ambient subtle top wash
}

const VIEW_PALETTES: Record<string, ViewPalette> = {
  // 1. Dashboard: Gemini signature sky, lime & violet
  home: {
    c1: 'rgba(56, 189, 248, 0.28)',   // Sky 400
    c2: 'rgba(132, 204, 22, 0.22)',   // Lime 500
    c3: 'rgba(139, 92, 246, 0.24)',   // Violet 500
    c4: 'rgba(6, 182, 212, 0.15)'     // Cyan 500
  },
  // 2. Financial: Gold, Emerald & Rose
  financial: {
    c1: 'rgba(245, 158, 11, 0.28)',   // Amber 500
    c2: 'rgba(16, 185, 129, 0.24)',   // Emerald 500
    c3: 'rgba(236, 72, 153, 0.20)',   // Pink 500
    c4: 'rgba(251, 191, 36, 0.16)'    // Amber 400
  },
  // 3. Appointments: Sky Blue, Indigo & Cyan
  appointments: {
    c1: 'rgba(14, 165, 233, 0.30)',   // Sky 500
    c2: 'rgba(99, 102, 241, 0.25)',   // Indigo 500
    c3: 'rgba(20, 184, 166, 0.22)',   // Teal 500
    c4: 'rgba(59, 130, 246, 0.16)'    // Blue 500
  },
  // 4. Lab: Orchid, Fuchsia & Purple
  lab: {
    c1: 'rgba(168, 85, 247, 0.30)',   // Purple 500
    c2: 'rgba(217, 70, 239, 0.25)',   // Fuchsia 500
    c3: 'rgba(99, 102, 241, 0.22)',   // Indigo 500
    c4: 'rgba(192, 132, 252, 0.18)'   // Purple 400
  },
  // 5. Implant: Surgical Cyan, Teal & Sky
  implant: {
    c1: 'rgba(6, 182, 212, 0.32)',    // Cyan 500
    c2: 'rgba(13, 148, 136, 0.26)',   // Teal 600
    c3: 'rgba(56, 189, 248, 0.24)',   // Sky 400
    c4: 'rgba(20, 184, 166, 0.18)'    // Teal 500
  },
  // 6. Patients: Fresh Emerald, Mint & Jade
  patients: {
    c1: 'rgba(16, 185, 129, 0.30)',   // Emerald 500
    c2: 'rgba(6, 182, 212, 0.24)',    // Cyan 500
    c3: 'rgba(132, 204, 22, 0.20)',   // Lime 500
    c4: 'rgba(52, 211, 153, 0.18)'    // Emerald 400
  },
  // 7. AI Assistant: Authentic Gemini Aurora (Cyan, Purple, Electric Blue)
  ai_assistant: {
    c1: 'rgba(56, 189, 248, 0.35)',   // Gemini Cyan
    c2: 'rgba(192, 132, 252, 0.32)',  // Gemini Purple
    c3: 'rgba(59, 130, 246, 0.28)',   // Gemini Blue
    c4: 'rgba(168, 85, 247, 0.20)'
  },
  // 8. Inventory: Mint, Amber & Emerald
  inventory: {
    c1: 'rgba(5, 150, 105, 0.28)',    // Emerald 600
    c2: 'rgba(245, 158, 11, 0.24)',   // Amber 500
    c3: 'rgba(13, 148, 136, 0.22)',   // Teal 600
    c4: 'rgba(16, 185, 129, 0.16)'
  },
  // 9. Reminders: Rose, Coral & Violet
  reminders: {
    c1: 'rgba(244, 63, 94, 0.28)',    // Rose 500
    c2: 'rgba(251, 146, 60, 0.24)',   // Orange 400
    c3: 'rgba(168, 85, 247, 0.22)',   // Purple 500
    c4: 'rgba(253, 164, 175, 0.16)'
  },
  // 10. X-Rays: Neon Teal & Clinical Indigo
  xrays: {
    c1: 'rgba(20, 184, 166, 0.30)',   // Teal 500
    c2: 'rgba(99, 102, 241, 0.25)',   // Indigo 500
    c3: 'rgba(6, 182, 212, 0.24)',    // Cyan 500
    c4: 'rgba(14, 165, 233, 0.18)'
  },
  // 11. Settings: Slate, Sky & Emerald
  settings: {
    c1: 'rgba(100, 116, 139, 0.24)',  // Slate 500
    c2: 'rgba(14, 165, 233, 0.22)',   // Sky 500
    c3: 'rgba(16, 185, 129, 0.20)',   // Emerald 500
    c4: 'rgba(148, 163, 184, 0.16)'
  }
};

export const AnimatedGeminiBackground: React.FC<AnimatedGeminiBackgroundProps> = ({ activeView }) => {
  const palette = VIEW_PALETTES[activeView] || VIEW_PALETTES.home;

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-white"
      aria-hidden="true"
    >
      {/* Subtle Gemini Micro-Grid / Noise Texture on Pure White Canvas */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#000000 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Floating Fluid Blob 1: Top Right Aurora */}
      <div 
        className="gemini-blob-1 absolute -top-[10%] -right-[15%] w-[420px] sm:w-[540px] h-[420px] sm:h-[540px] rounded-full blur-[90px] opacity-90 transition-colors duration-1000 ease-out"
        style={{ backgroundColor: palette.c1 }}
      />

      {/* Floating Fluid Blob 2: Bottom Left Aurora */}
      <div 
        className="gemini-blob-2 absolute -bottom-[12%] -left-[15%] w-[380px] sm:w-[500px] h-[380px] sm:h-[500px] rounded-full blur-[100px] opacity-85 transition-colors duration-1000 ease-out"
        style={{ backgroundColor: palette.c2 }}
      />

      {/* Floating Fluid Blob 3: Center Organic Core */}
      <div 
        className="gemini-blob-3 absolute top-[35%] right-[20%] w-[320px] sm:w-[420px] h-[320px] sm:h-[420px] rounded-full blur-[95px] opacity-75 transition-colors duration-1000 ease-out"
        style={{ backgroundColor: palette.c3 }}
      />

      {/* Subtle Top Wash Glow */}
      <div 
        className="absolute top-0 inset-x-0 h-40 blur-3xl opacity-60 transition-colors duration-1000 ease-out"
        style={{
          background: `radial-gradient(ellipse at top, ${palette.c4} 0%, transparent 70%)`
        }}
      />
    </div>
  );
};
