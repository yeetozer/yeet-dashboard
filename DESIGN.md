# Yeet Dashboard - Mission Control Design Spec

## Direction
A polished personal mission-control dashboard with NASA control-room cues, glass telemetry panels, and restrained neon accents. The interface should feel operational, dense, and calm rather than playful.

## Core Principles
- Dark first: deep-space surfaces with clear contrast and readable telemetry.
- Mission hierarchy: strong framing for status, alerts, and systems before secondary content.
- Dense but breathable: high information throughput with disciplined spacing and grouping.
- Responsive control room: desktop gets a fixed navigation rail and fluid main deck; mobile collapses into stacked panels.
- No broken wiring: existing vanilla JS features and service IDs stay intact unless updated in code as well.

## Palette
- Background: `#0a0e1a`
- Elevated background: `#121829`
- Panel glass: `rgba(18, 24, 41, 0.76)`
- Border: `#1e2a45`
- Border glow: `rgba(0, 212, 255, 0.26)`
- Text primary: `#e0e6f1`
- Text secondary: `#6b7b9c`
- Text tertiary: `#90a4c3`
- Accent cyan: `#00d4ff`
- Accent green: `#00ff88`
- Accent yellow: `#ffcc00`
- Accent red: `#ff3366`
- Accent purple: `#a855f7`

## Typography
- UI headings: `JetBrains Mono`, `SFMono-Regular`, monospace
- Body: `Inter`, `Segoe UI`, system sans
- Metrics, logs, gauges, terminal: `JetBrains Mono`, monospace

## Layout

### Navigation Rail
- Fixed left rail on desktop with brand block, grouped navigation, service sub-navigation, mission clock, and online indicator.
- Primary tabs:
  - Overview
  - Daily
  - System
  - Services
    - Cloudflare
    - Dokploy
  - Projects
  - Logs
- Secondary tabs:
  - Terminal
  - GitHub
  - Deployments
  - Settings

### Header
- Page title and contextual subtitle.
- Mission time capsule.
- Telemetry chips for refresh mode and weather city.
- Quick-action bar for refresh and section routing.

### Content Deck
- Modular glass-card grid with large feature cards and stacked operational cards.
- Smooth tab transitions.
- Skeleton states for loading panels.
- Reusable panel treatment across all sections.

## Tabs And Widgets

### Overview
- Gateway status with uptime and bind details.
- Mission snapshot metrics for sessions, models, and projects.
- Weather snapshot.
- Recent alert feed.
- Active sessions list.
- Service health sweep.
- Model constellation list.
- Project activity summary.
- Token utilization bars.

### Daily
- Daily briefing and quote.
- Personal focus panel.
- Detailed weather card.
- Quick converter.
- Bookmark shortcuts.
- Quick notes.
- Todo queue.

### System
- Improved circular gauges for CPU, RAM, and disk.
- Host and platform telemetry card.
- Top processes table.

### Services
- Services overview tab with routing cards into detail tabs.
- Cloudflare tab with DNS summary metrics plus records grid.
- Dokploy tab with fleet summary metrics plus project cards.

### Projects
- Project summary strip with running, stopped, and dirty repo counts.
- Rich project cards with health, git state, runtime stats, and actions.

### Logs
- Search/filter input.
- Pause and clear actions.
- Monospace event stream with level styling.

### Terminal
- Full local terminal panel with command hints and neon command/output styling.

## Motion And Finish
- 200-300ms transitions.
- Soft cyan glow on hover and active states.
- Skeleton shimmer for loading blocks.
- Pulse for online/status indicators.
- Subtle grid and radar background treatments.

## Accessibility
- Semantic sections and buttons.
- Accessible labels on controls and navigation.
- Focus-visible treatment for keyboard navigation.
- Clear contrast on all primary surfaces.

## Implementation Notes
- Vanilla HTML, CSS, and JS only.
- Preserve service/proxy integrations.
- Keep external dependencies at zero.
- Keep IDs used by current services unless code updates them too.
