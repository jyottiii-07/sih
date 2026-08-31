# Design System & Aesthetic Specification
## Seafloor Metal Detection Sensor Mission Control Dashboard

> **Design Theme**: Deep Ocean Scientific Exploration / Marine Research Mission Control  
> **Target Audience**: Marine Geophysicists, NCPOR Researchers, Exploration Engineers

---

## 1. Visual Identity & Design Philosophy

The user interface balances scientific rigor with modern, high-information-density mission control aesthetics. It evokes deep-ocean bathymetric exploration with an abyssal dark mode, crisp high-contrast telemetry readings, and bioluminescent status indicators.

### Key Principles:
1. **Scientific Integrity**: The data visualization is the hero. Avoid distracting neon gamification or decorative clutter.
2. **High Information Density**: Enable researchers to review spatial distribution, raw magnetic telemetry, and ML classifications concurrently.
3. **Accessibility & Clarity**: Never rely on color alone to communicate anomaly severity; pair colors with distinct icons, clear typographic tags, and numeric values.
4. **Data Segregation**: Always clearly distinguish upstream **Raw Sensor Telemetry** ($Bx, By, Bz, \text{Signal}$) from **ML Model Analysis** ($\text{Anomaly Score}, \text{Classification}$).

---

## 2. Color Palette & Semantic Tokens

### Core Theme Tokens
```css
:root {
  /* Abyssal Backgrounds */
  --color-bg-abyss: #070b12;        /* Deepest ocean black-navy */
  --color-bg-surface: #0e1626;      /* Primary card/panel surface */
  --color-bg-elevated: #152238;     /* Elevated modals/dropdowns/drawers */
  --color-bg-subtle: #1c2c47;       /* Hover states, subtle borders */

  /* Borders & Dividers */
  --color-border-subtle: #1f324d;   /* Subtle container borders */
  --color-border-accent: #2e4d75;   /* Highlighted active borders */

  /* Typography */
  --color-text-primary: #f1f5f9;    /* High contrast reading text */
  --color-text-secondary: #94a3b8;  /* Labels, table headers, captions */
  --color-text-muted: #64748b;      /* Inactive metadata, gridlines */

  /* Scientific Accents */
  --color-ocean-cyan: #06b6d4;      /* Primary ocean accent */
  --color-ocean-glow: #22d3ee;      /* Radar sweep & active telemetry */
  --color-deep-blue: #3b82f6;       /* Neutral telemetry channels */
}
```

### Anomaly Classification Tokens
| Classification | Visual Token | Hex Code | Border/Glow | Icon / Symbol | Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `normal` | **Seafloor Baseline** | `#10b981` (Emerald) | `rgba(16, 185, 129, 0.2)` | CheckCircle / Circle | Baseline seafloor magnetic reading |
| `weak_anomaly` | **Fringe Anomaly** | `#f59e0b` (Amber) | `rgba(245, 158, 11, 0.3)` | AlertCircle / Triangle | Moderate magnetic variance; potential anomaly boundary |
| `strong_anomaly`| **High Ferrous Anomaly**| `#ef4444` (Crimson) | `rgba(239, 68, 68, 0.45)` | Flame / Diamond | High confidence magnetic anomaly; prospective deposit |

---

## 3. Typography Hierarchy

| Role | Font Family | Weight | Size | Usage Example |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Header** | `Outfit`, sans-serif | SemiBold (600) / Bold (700) | `1.5rem` – `2.0rem` | Page Titles, Mission Control Banner |
| **Section Title** | `Outfit`, sans-serif | Medium (500) / SemiBold (600) | `1.125rem` – `1.25rem` | Card Headers, Visualization Labels |
| **Body Text** | `Inter`, sans-serif | Regular (400) / Medium (500) | `0.875rem` – `1.0rem` | Descriptions, Tooltip text, Modal body |
| **Telemetry / Numeric** | `JetBrains Mono`, monospace | Medium (500) / Bold (700) | `0.875rem` – `1.5rem` | $Bx, By, Bz$, Sensor ID, Timestamps, Coords |
| **Caption / Badge** | `Inter` / `JetBrains Mono` | Medium (500) | `0.75rem` | Status tags, Axis labels, Table metadata |

---

## 4. Component Design Specifications

### 4.1 Cards & Containers
- **Background**: `bg-[#0e1626]/90` with subtle backdrop blur (`backdrop-blur-md`).
- **Border**: `border border-[#1f324d] rounded-xl`.
- **Header**: Flex container with an icon, uppercase title (`text-xs font-semibold text-slate-400 tracking-wider`), and optional action badge.

### 4.2 Badges & Status Indicators
- Standardized pill design (`px-2.5 py-0.5 rounded-full text-xs font-medium font-mono uppercase tracking-wider`).
- Includes a pulsing status dot (`w-1.5 h-1.5 rounded-full mr-1.5`).
- Visual variants: `normal`, `weak_anomaly`, `strong_anomaly`, `mock_mode`, `live_mode`.

### 4.3 Seafloor Survey Grid (Heatmap)
- **Viewport Canvas**: Dark bathymetric grid (`#070b12`) with major/minor grid lines (`#1e293b`).
- **Coordinate System**: Cartesian survey coordinates ($X \in [0, 60], Y \in [0, 60]$).
- **Data Points**:
  - `normal`: Small emerald dots ($r = 4.5\text{px}$, opacity $0.8$).
  - `weak_anomaly`: Medium amber dots with outer pulse ring ($r = 6.5\text{px}$, opacity $0.9$).
  - `strong_anomaly`: Large crimson dots with multi-stop radial glow halo ($r = 8.5\text{px} + 18\text{px}\text{ halo}$, opacity $1.0$).
- **Selection Highlight**: Target reticle crosshair with pulsating cyan ring around active selection.
- **Controls**: Floating overlay with Zoom In, Zoom Out, Reset Center, Layer Filters, and Coordinate Display.

### 4.4 Reading Detail Drawer
- Right-aligned sliding inspection panel.
- Header: Sensor ID badge + Classification indicator + Close button.
- **Section 1: Raw Sensor Telemetry** (Grid with Sensor ID, Timestamp, $X/Y$ Coordinates, $Bx, By, Bz$, and Magnetic Signal).
- **Section 2: ML Anomaly Analysis** (Classification badge, Anomaly Score progress meter with color zoning).
- **Section 3: Actions** (Center in Grid, Filter for nearby points, Export single record JSON).

### 4.5 Scientific Charts (Recharts)
- Custom dark tooltips (`bg-[#0e1626] border border-[#2e4d75] shadow-2xl rounded-lg p-3`).
- Grid lines styled with `stroke="#1e293b" strokeDasharray="3 3"`.
- Dedicated color strokes:
  - $Bx$: `#38bdf8` (Light Blue)
  - $By$: `#818cf8` (Indigo)
  - $Bz$: `#c084fc` (Purple)
  - Magnetic Signal: `#22d3ee` (Cyan Area)
  - Anomaly Score: `#f43f5e` (Rose Area)

---

## 5. Accessibility & Contrast Compliance

1. **Contrast Ratios**: All foreground text meets WCAG AA (minimum 4.5:1 for normal text, 3:1 for large text). Monospace telemetry numbers on dark cards achieve $> 7:1$.
2. **Non-Color Dependence**: Every anomaly indicator combines color, icon shape, text label, and numeric score.
3. **Keyboard Navigability**: Interactive elements (points, table rows, buttons) feature visible `:focus-visible` outlines (`ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#070b12]`).
4. **ARIA Attributes**: Accessible labels on icon buttons, screen-reader text for state indicators (`aria-live="polite"` for mock stream updates).
