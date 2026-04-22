# Yeet Dashboard - Design Document

## Overview
A personal mission control dashboard for Yigit's development workflow. Dark NASA-inspired theme with modern widgets.

## Design Principles
- **Dark mode**: Space/night theme with neon accents
- **High contrast**: Clear visual hierarchy
- **Density**: Information-rich but organized
- **Responsive**: Works on desktop and mobile
- **Real-time**: Live data updates

## Color Palette
- Background: `#0a0e1a` (deep space)
- Card bg: `#121829` (dark blue-grey)
- Border: `#1e2a45` (muted blue)
- Text primary: `#e0e6f1` (off-white)
- Text secondary: `#6b7b9c` (muted blue-grey)
- Accent cyan: `#00d4ff` (neon cyan)
- Accent green: `#00ff88` (neon green)
- Accent yellow: `#ffcc00` (warm yellow)
- Accent red: `#ff3366` (neon red)
- Accent purple: `#a855f7` (soft purple)

## Typography
- Headings: JetBrains Mono / monospace
- Body: Inter / system-ui
- Monospace: JetBrains Mono (metrics, logs)

## Layout Structure

### Header
- Clock widget (real-time)
- System status indicators
- Quick actions bar

### Sidebar Navigation
- Overview
- Daily (weather, notes, todos)
- System (metrics, terminal)
- Services (Cloudflare, Dokploy)
- Projects
- Logs
- Settings

### Main Content Area
- Cards grid layout
- Expandable widgets
- Modal overlays for details

## Widgets

### Overview Tab
- Gateway status card
- System resources (CPU/RAM/Disk gauges)
- Active projects summary
- Recent alerts/notifications

### Daily Tab
- Clock + date + greeting
- Weather widget (Istanbul default)
- Quick notes (localStorage)
- Todo list with priorities
- Daily focus quote
- Unit converter
- Bookmark shortcuts

### System Tab
- CPU usage gauge (real-time)
- RAM usage gauge
- Disk usage gauge
- Top processes table
- Network status checker
- Terminal widget (mini CLI)

### Services Tab
**Cloudflare Sub-tab**
- DNS records table
- Zone status
- Proxied indicators

**Dokploy Sub-tab**
- Project cards
- App status
- Database status

### Projects Tab
- Project cards with tags
- Git status indicators
- Quick actions (open folder, GitHub)
- Health status

### Logs Tab
- System log viewer
- Gateway logs
- Filter/search
- Auto-scroll

## Animations
- Smooth transitions (200-300ms)
- Pulse animations for status indicators
- Loading skeletons
- Hover effects on cards

## Icons
- Emoji-based icons (no external dependencies)
- Status dots with color coding

## Interactions
- Click to expand cards
- Right-click for context menu
- Drag to reorder (future)
- Keyboard shortcuts (future)

## Data Sources
- OpenClaw workspace state (local JSON)
- Dokploy API (via proxy)
- Cloudflare API (via proxy)
- wttr.in (weather)
- System metrics (/proc, ps)

## Security
- All API calls go through backend proxy
- No tokens exposed client-side
- CSP headers enforced
- Input sanitization

## Future Features
- Dark/light theme toggle
- Draggable widgets
- Custom CSS themes
- Data export
- Multi-user support
- WebSocket real-time updates
- Deployment pipeline visualization
- GitHub activity feed
- Docker container management

## Tech Stack
- Vanilla HTML/CSS/JS (no frameworks)
- ES modules for organization
- Express proxy backend
- Environment variables for secrets
- GitHub for version control
