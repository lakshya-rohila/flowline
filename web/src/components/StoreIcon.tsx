// SVG icons for store items
export function StoreIcon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactElement> = {
    // Themes
    moon: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
      </svg>
    ),
    stars: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z" fill="currentColor"/>
        <circle cx="18" cy="6" r="1.5" fill="currentColor" opacity="0.6"/>
        <circle cx="6" cy="8" r="1" fill="currentColor" opacity="0.4"/>
      </svg>
    ),
    sunset: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="16" r="4" fill="currentColor"/>
        <path d="M2 20h20M12 4v4M4 12l2 2M18 12l2 2M20 14l-2 2M4 14l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    waves: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M2 12c2-1.5 3-1.5 5 0s3 1.5 5 0 3-1.5 5 0 3 1.5 5 0M2 18c2-1.5 3-1.5 5 0s3 1.5 5 0 3-1.5 5 0 3 1.5 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    leaf: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 21s9-12 18-18c0 9-6 18-18 18zM9 12l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    city: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 21h18M5 21V8h4v13M13 21V3h6v18M9 8h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <rect x="7" y="11" width="1" height="1" fill="currentColor"/>
        <rect x="7" y="15" width="1" height="1" fill="currentColor"/>
        <rect x="15" y="7" width="1" height="1" fill="currentColor"/>
        <rect x="15" y="11" width="1" height="1" fill="currentColor"/>
        <rect x="15" y="15" width="1" height="1" fill="currentColor"/>
      </svg>
    ),

    // Hints & Power-ups
    lightbulb: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2a7 7 0 0 1 3.5 13.07V17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1.93A7 7 0 0 1 12 2z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9.5 21h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    unlock: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
      </svg>
    ),
    zap: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    undo: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 8h10a6 6 0 0 1 0 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 5L4 8l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    eye: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
    ),
    skip: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M5 4l10 8-10 8V4zM19 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),

    // Cosmetics
    minus: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    circle: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="8" fill="currentColor"/>
      </svg>
    ),
    grid: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    sparkles: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM6 3l.75 2.25L9 6 6.75 6.75 6 9 5.25 6.75 3 6l2.25-.75L6 3zM18 15l.75 2.25L21 18l-2.25.75L18 21l-.75-2.25L15 18l2.25-.75L18 15z" fill="currentColor"/>
      </svg>
    ),
    gamepad: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="7" width="20" height="10" rx="3" stroke="currentColor" strokeWidth="2"/>
        <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="10" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="14" r="1.5" fill="currentColor"/>
      </svg>
    ),
    music: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
        <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),

    // Category icons
    palette: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="9" cy="15" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="15" r="1.5" fill="currentColor"/>
      </svg>
    ),

    // Earn guide icons
    star: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    target: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>
    ),
    new: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 10v4M11 10l2 4 2-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),

    // Achievement icons
    trophy: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M7 2h10v6a5 5 0 0 1-10 0V2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 13v3M9 21h6M7 2H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h3M17 2h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <rect x="8" y="16" width="8" height="5" rx="1" fill="currentColor"/>
      </svg>
    ),
    medal: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="14" r="6" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 8L9 2 6 8M12 8L15 2l3 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="14" r="2.5" fill="currentColor"/>
      </svg>
    ),
    coin: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 6v12M8 9c0-1.5 1.5-2 4-2s4 .5 4 2M16 15c0 1.5-1.5 2-4 2s-4-.5-4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    clock: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 21h18M3 17h4v4H3v-4zM10 13h4v8h-4v-8zM17 9h4v12h-4V9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
      </svg>
    ),
  };

  return icons[name] || icons.circle;
}
