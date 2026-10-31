# Wallspace UI kit

Companion to [DESIGN.md](DESIGN.md): the building blocks every page uses. Pages compose these pieces rather than restyling them.
Tokens: src/styles/tokens.css. Motif motion: src/styles/motif.css. Base: src/app/globals.css.

## Tokens (Tailwind names in brackets)
- Surfaces: paper page (`bg-paper`), panel cards on paper (`bg-panel`, hover `bg-panel-2`), surface for inputs, tables and
  window bodies (`bg-surface`, white in light). Night = dark bands, hero, CTA, footer, window frame (`bg-night`, cards
  `bg-night-2`, border `border-night-line`, text `text-on-night`, `text-on-night-muted`). Night stays dark in both themes.
- Text: `text-ink` (primary), `text-ink-2` (secondary), `text-muted` (captions). Lines: `border-line`, `border-line-2`.
- Street inks: `signal` yellow, `poster` red, `cobalt` blue, `park` green, `lilac`. Each has `-soft` (tint fill) and
  `-deep` (text on the tint, AA). Solid fills take dark ink text (`text-[#22211d]`), except cobalt (white).
  One accent per feature card; ribbons mix 2 to 4.
- Older token names still work and map onto the current values: ground=paper, ground-2=panel, rule=line, rule-2=line-2,
  heat=poster, picked=#13875f (park-deep for text), guard=#c93a1d, warn=signal-deep, ok=picked, info=cobalt-deep,
  h1..h4 = heat ramp signal to poster.
- Type: Host Grotesk 400 everywhere, emphasis 600 on single words (`<Em>`). Geist Mono for numbers, IDs, step markers
  (`font-mono`, `.eyebrow`). Sizes `text-display` 64 (fluid), `text-h2` 40, `text-h3` 32, `text-h4` 20, `text-body` 16,
  `text-small` 14, `text-micro` 12.
- Radius: `rounded-xs` 4 (chips), `rounded-md` 8 (cards, inputs, buttons), `rounded-lg` 14 (feature panels, windows),
  `rounded-xl` 20 (bands), `rounded-full` (tags). Shadows `shadow-sm`, `shadow-md`, `shadow-lg` (windows, toasts).
- Layout: `.wrap` = 1192px column + fluid gutter (16px phone). Focus ring: 2px cobalt, global `:focus-visible`.
- Motion: --dur-fast 120, --dur 200, --dur-slow 400, --dur-draw 900, --dur-crawl 6s, --ease-out. All motif motion stops
  under prefers-reduced-motion (rendered in its final state).
- Dark theme: follows the system; `<html data-theme="light|dark">` forces one. Use tokens only, never raw hex for
  surfaces or text, and app pages stay readable in dark automatically.

## Primitives (src/components/ui)
| Import | Props | Use |
|---|---|---|
| `Button`, `LinkButton`, `buttonClass` (Button.tsx) | `variant` primary / light / secondary / ghost / quiet (+ legacy heat, picked), `size` sm / md / lg, `arrow`, LinkButton `href`, `testId`, `external` | primary on paper; light (white) and secondary on night; ghost for second actions; `arrow` adds the 2px hover nudge |
| `TextLink` | `href`, `testId` | "Open the sample plan ->" links in cards |
| `Tag` (Pill.tsx) | `ink` signal / poster / cobalt / park / lilac / neutral / night, `dot` | 999-radius tags: taste tags, block lift, filters |
| `Pill`, `SampleStamp` | legacy `tone` | 4px status chips; stamp every invented value |
| `inkTint`, `inkFill`, `inkVar` | maps | class strings per ink for custom pieces |
| `IconChip` | `ink`, `size`, `label`, child = icon | accent tile with an ink glyph (feature cards, bento, settings rows) |
| `icons.tsx` | `size`, svg props | 20px stroke icons: ArrowRight, Plus, Close, Check, HeatGrid, Viewfinder, Pen, Shield, Eye, Split, Send, Billboard, Calendar, Users, Coins, Plug, Sparkle, Lock, Gauge, Info, Alert |
| `Card`, `Panel` | `surface` panel / surface / paper / night / night-2, `radius` md / lg / xl, `pad`, `as` | every card |
| `SectionHeading`, `Em` | `eyebrow`, `title`, `lede`, `align`, `size` display / h2 / h3, `tone` paper / night, `as`, `id` | every section gets a real heading |
| `StepNumber` | `n`, `tone` night / paper, `size` | "01 02 03" markers |
| `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `fieldClass` | native props; Field `label`, `hint`, `error`, `htmlFor` | all forms; put `fieldClass` on raw inputs you cannot swap |
| `Tabs` | `items`, `value`, `onChange`, `label`, `tone` | segmented tabs with arrow-key focus |
| `Accordion` | `items` {id, q, a}, `testId` | FAQ and disclosure lists (native details) |
| `TableFrame`, `Table`, `Th`, `Td`, `Tr` | `numeric` on cells, `label` on frame | data tables in the hero-window style; frame scrolls on phones |
| `Badge` | `status` ok / warn / guard / info / neutral / running | status pill with dot (plan status, connection, guard) |
| `ToastProvider`, `useToast` | push({kind ok / info / guard, title, body, ms}) | transient confirmations on night cards |
| `Skeleton`, `LoadingState`, `EmptyState`, `ErrorState` | as named | every async view has all three; size skeletons to the loaded layout (no shift) |
| `Modal` | `open`, `onClose`, `title`, `description`, `footer`, `variant` modal / sheet | native dialog; sheet slides from the right |
| `Tooltip` | `tip`, `side`, `focusable` | short hints; shows on hover and keyboard focus |
| `ModelChip` | `role`, `model` | names the model behind a step |
| `Logo`, `LogoMark` | `size`, `tone` auto / night / paper | brand in nav, footer, sign-in, app shell |

## Motif (src/components/motif)
| Import | Props | Use |
|---|---|---|
| `StreetCanvas` | `viewBox`, `fit` slice / meet, `align`, `className`, `label` | SVG host; draws its streets when scrolled into view |
| `Street` | `points` (90/45-degree polyline), `lanes` [{ink, line dash / dot / double / none, lineInk}], `width` 18, `gap` 5, `radius` 72, `delay`, `edge` (kerb colour), `crawl` | one street of parallel lanes with concentric bends; draw-in, then markings fade in and crawl |
| `CrosswalkSvg` / `CrosswalkBlock` | x, y, size, angle / size, tone | junction where streets cross (SVG) or a standalone block (HTML) |
| `BillboardStopSvg` | x, y, w, h, ink, `logo`, `label`, `link`, `text`, `delay` | stop on a street: logo greyscale at rest, colour on hover/focus; real link when `link` |
| `BillboardStop` | `ink`, `ratio` 3:1 / 2:1 / auto, `tone`, `post`, `delay` | the same stop in HTML layout (copy lines, face IDs) |
| `DotGrid` | `gap`, `color`, `fade` | dot texture on night bands (absolute, behind content) |
| `PinstripeSection`, `PinstripeGutter` | `id`, `labelledBy` | paper section with pinstripes in the desktop gutters |
| `ProductWindow`, `WindowChip` | `crumbs`, `actions`, `toolbar`, `label` | framed real UI (hero table, feature media, map frames) |
| `InView` | `as`, `margin` | sets data-inview once; use with `.ws-pop`, `.ws-fade-up` (and `--delay`) for your own reveals |
| `geometry.ts` | `roundedPath`, `offsetPolyline`, `pointAt` | build street paths and place stops |

Rules: ribbons enter from edges and frame sections; never behind body text. Data shown as designed views (bars, maps,
tables), real numbers only, each with its source. App pages: paper canvas, panel rail, tables/tags/inputs exactly as above.
