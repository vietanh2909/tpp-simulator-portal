---
name: TPP Callback Simulator
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  code-body:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system is architected exclusively for technical environments, targeting banking integration engineers, third-party provider (TPP) developers, and QA automation teams validating webhook lifecycles in Sandbox and UAT stages.

The design philosophy follows an **Engineered Functionalist** ethos:
- **Precision & High Density:** Prioritizes dense, tabular payloads, sub-millisecond trace visibility, and explicit state reflection over decorative padding or aesthetic flourishes.
- **Instrumental Focus:** Eliminates illustrations, marketing graphics, empty-state artwork, and animated transitions that do not communicate data state. The UI treats interface elements as operational instrumentation.
- **Deterministic Hierarchy:** Clear, structural boundaries using thin, mechanical borders, subdued surface elevation, and exact type pairing differentiate metadata headers, configuration panels, and streaming log views.

## Colors

The palette establishes high readability against long debugging sessions, prioritizing tokenized functional roles over expressive branding.

- **Background & Canvas:** Crisp light gray (`#f8fafc` / `slate-50` base, `#f1f5f9` / `slate-100` sub-canvases).
- **Surfaces & Cards:** `#ffffff` (pure white) with `#e2e8f0` (`slate-200`) structural borders.
- **Primary Actions:** `#4f46e5` (`indigo-600`) default, `#4338ca` (`indigo-700`) hover, accented with `#eef2ff` (`indigo-50`) surface tints for selected rows, active tabs, and focus bounds.
- **Functional Telemetry & Status:**
  - **HTTP 200 / Success:** `#059669` (`emerald-600`) text on `#ecfdf5` (`emerald-50`) fill with `#a7f3d0` border.
  - **HTTP 4xx/5xx & Fatal Errors:** `#e11d48` (`rose-600`) text on `#fff1f2` (`rose-50`) fill with `#fecdd3` border.
  - **Mapping & Schema Warnings:** `#d97706` (`amber-600`) text on `#fffbeb` (`amber-50`) fill with `#fde68a` border.
  - **Raw Business Statuses (e.g., `PROCESSING`, `RC_00`, `RC_99`):** Neutral slate/zinc styling (`#475569` text on `#f8fafc` background with `#cbd5e1` outline) to ensure protocol telemetry is not visually confused with application business responses.
- **Environment & Timezone Markers:** UAT tags use deep amber or indigo pill indicators; time stamps specify explicit `GMT+7` offsets in muted slate (`#64748b`).

## Typography

The type system is strictly divided between operational interface text (**Inter**) and machine data (**JetBrains Mono**):

- **Inter:** Drives layouts, forms, tooltips, table column headers, and system metadata. Tight letter spacing (`-0.01em` to `-0.02em`) preserves space efficiency while retaining legibility at small sizes (12px–14px).
- **JetBrains Mono:** Exclusively renders HTTP methods, endpoints, JSON payload blocks, response headers, transaction IDs (`txn_id`), correlation tokens, ISO 8583 response codes, and JSONPath expressions. Tabular figures are forced by default (`font-variant-numeric: tabular-nums`).
- **Scale Compactness:** Primary UI headings max out at 24px desktop / 20px mobile to prevent wasted viewport height and prioritize data tables and code streams.

## Layout & Spacing

The layout is built for split-pane monitoring, multi-column event logs, and side-by-side payload comparisons.

- **Grid Architecture:** 
  - Dual-panel asymmetric desktop layout: Left panel (360px–420px fixed) for active callback triggers, payload injectors, and endpoint configs; Right panel (fluid flex) for live webhook receipts, parsed headers, retry histories, and schema validation.
  - Full-width diagnostic mode collapses navigation into a tight 48px rail.
- **Rhythm & Padding:** Base multiplier is 4px. Component internals favor compressed vertical padding (`0.375rem` / 6px to `0.5rem` / 8px) to maximize row density inside tables and inspector panels.
- **Viewport Adaptation:** 
  - Breakpoints: Desktop (`≥1280px`), Compact Desktop (`1024px–1279px`), Diagnostic Tablet (`768px–1023px`). Below `1024px`, split panels stack into single full-width tabs ("Request Simulator" vs "Callback Stream").

## Elevation & Depth

Visual hierarchy is communicated via clean structural boundaries and deliberate surface changes rather than heavy drop shadows:

- **Flat Layering & Borders:** Primary containment uses 1px solid borders (`#e2e8f0`). Cards sit directly on the `#f8fafc` canvas with zero blur shadow, maintaining a clean architectural appearance.
- **Active Focus & Modals:** Modals, dropdown sheets, and JSON full-screen inspectors use low-diffusion, tinted technical shadows: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Code Panes & Inset Wells:** Payloads and raw trace streams sit in recessed wells using `#f8fafc` or `#0f172a` (dark view mode) with a 1px inset border (`#cbd5e1` or `#334155`), visually locking the data into the page.

## Shapes

The design system uses precise, compact corners (`roundedness: 1`):
- **Base Geometry:** Standard containers, input fields, buttons, and code panels feature a `0.25rem` (4px) corner radius.
- **Badges & Tags:** HTTP response chips, UAT tags, and raw status indicators use a `0.25rem` (4px) radius. Pill shapes (`9999px`) are banned to avoid visual inconsistency with dense monospace elements.
- **Toggles & Small Controls:** Maintain tight, structural rectangular geometry to reflect high-precision financial apparatus tooling.

## Components

### Buttons
- **Primary:** Solid `#4f46e5`, white label, 32px height, font-size 13px Inter semi-bold, 4px radius.
- **Secondary / Action Tool:** `#ffffff` surface, `#cbd5e1` border, `#334155` text. On hover: `#f8fafc` background.
- **Monospace Icon Action (Copy / Replay / Curl):** 28px square, `#f1f5f9` surface with `#94a3b8` icon. On click, switches to a green checkmark indicating clipboard success for 1500ms.

### Code Viewer & Payload Editor
- **Frame:** `#ffffff` surface or `#0f172a` dark editor surface, 1px `#e2e8f0` border, integrated top toolbar containing title, byte count, formatted/raw switch, and copy action.
- **Line Numbers:** Right-aligned, unselectable (`user-select: none`), `#94a3b8` text, separated by a 1px vertical rule.
- **Syntax Highlighting:** Strict developer palette—Strings in emerald (`#059669`), Keys in indigo (`#4338ca`), Integers/Booleans in amber (`#d97706`), Nulls in rose (`#e11d48`).
- **JSONPath Query Bar:** Embedded top input with `$` prefix marker, evaluating and highlighting matched nodes live.

### Badges & Status Chips
- **HTTP Badges:** Monospace 11px font, bold. `200 OK` (green), `401 Unauthorized` / `500 Internal Error` (rose), `302 Found` (sky blue).
- **Bank Business Response Code:** Slate frame, e.g., `RC: 00 (APPROVED)`, `RC: 99 (TIMEOUT)` rendered in neutral slate monospace without saturated fills.
- **Environment Indicator:** Sticky header tag with an amber or indigo dot: `UAT 01 • GMT+7 14:02:18`.

### Input Fields & Parameter Tables
- **Inputs:** 32px height, 1px `#cbd5e1` border, `#0f172a` text, `#ffffff` background. Active focus is indicated by a 1px ring in `#4f46e5` with no diffuse outline.
- **Key-Value Pair Editors:** Dense rows with 4px gap, auto-expanding keys, and values featuring inline JSON/type badges (`string`, `int`, `boolean`).

### Tables & Callback Event Logs
- **Row Density:** 36px fixed row height with single-line truncation.
- **Columns:** Monospace timestamp (`HH:mm:ss.SSS`), Method badge (`POST`), Endpoint URL, Status badge, Latency (`ms`), and Action buttons.
- **Selection:** Active row receives a 2px solid `#4f46e5` left border and an `#eef2ff` background tint.