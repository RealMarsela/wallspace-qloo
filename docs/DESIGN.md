# Wallspace design system

One system for the landing page, product pages, sign-in and onboarding. Components and their props are listed in
[UI-KIT.md](UI-KIT.md).

## Motif: city streets

- **Street ribbons.** Thick multi-colour ribbons read as streets on a city plan: a solid ribbon with a dashed lane line,
  parallel ribbons for avenues, 45-degree bends for diagonals (Atlanta's Ponce de Leon and Moreland avenues). Bends use
  large radii.
- **Stops are billboard faces.** Rounded rectangles in a 3:1 or 2:1 frame on a small post tick, holding a copy line, a
  face id or a connector logo.
- **Crosswalks.** Where streets cross, a striped square block marks the junction.
- Ribbons enter from page edges and frame sections (hero, dark bands, call to action, sample cards). They never sit
  behind body text.

## Tokens

Single source: `src/styles/tokens.css`.

- **Base.** Ink `#22211D` (dark bands, primary button), paper `#FBFAF7` (page), panel `#EFEEEA` (cards on paper), ink-2
  `#2F2E29` (cards on dark), line `#E2E0DA`, muted text `#6E6B63`, muted on dark `#A9A69C`.
- **Street inks.** Signal yellow `#FFD12E`, poster red `#FF5B3A`, cobalt `#4C6BFF`, park green `#3FD6A0`, lilac
  `#C49BFF`. Each also has a light tint for tags. One accent per feature card; ribbons mix two to four.
- **Radius.** 8 (cards, inputs, buttons), 14 (feature panels), 999 (pills and tags), 4 (chips). Borders 1px line.
- **Type.** Host Grotesk (Google Fonts) at weight 400 throughout; emphasis is weight 600 on single words. Display
  64/1.05/-0.02em, H2 40/1.1/-0.02em, H3 32/1.1, body 16/1.4, small 14/1.4, micro 12/1.35. Numbers and step markers in
  Geist Mono 500 ("01 02 03" in a 40px circle on ink-2).
- **Backgrounds.** A faint vertical pinstripe in the side gutters of paper sections; a dot grid on dark bands.
- **Layout.** Content column 1192px max, 160px side gutters on desktop, 16px on phones.

## Components

Each is built once and reused by product pages.

- **Top bar.** Thin ink announcement strip, then a paper nav: logo left, three links centre, ink pill button right.
- **Buttons.** Ink pill with arrow (primary), white on dark (primary on ink), ghost (secondary). The arrow nudges 2px on
  hover.
- **Hero.** Centred headline on ink, one line of body, one button, then a framed product window showing real Wallspace
  UI (picks table with faces, neighbourhood, cost, taste tags and a copy line), overlapping the next section.
- **Built-on strip.** Qloo, NVIDIA, Nebius, Cloudflare and Tavily logos, greyscale on panel.
- **Feature split cards.** A coloured media panel with a live product fragment on one side; icon chip, label, heading,
  body and a text link on the other. Sides alternate.
- **Product overview.** A 2x2 grid of panels, each with an icon chip, title, one line and a real UI fragment.
- **Dark band.** Ink block with a dot grid, centred heading and button, and three numbered cards.
- **"From the sample plan" cards.** Ink cards showing a real copy line and the face it ran on. No testimonials and no
  invented logos.
- **Connectors band.** Slack, Gmail, Outlook, HubSpot, Sheets and calendar logos as billboard stops on the street network.
- **FAQ.** Heading left, accordion right.
- **Call to action and footer.** Ink, heading left, two buttons, ribbons sweeping in from the right.
- **App shell.** Paper canvas, left rail nav on panel, top bar with workspace switcher. Map pages place the MapLibre map
  inside a framed window.

## Motion

- Ribbons draw in on scroll (SVG path length, 900 ms, ease-out); lane dashes then crawl slowly (6 s loop). Stops pop in
  with a 120 ms scale from 0.96 to 1.
- The hero window rises 24px and fades in after the headline; table rows stagger by 30 ms.
- Feature panels animate real product UI built in HTML and SVG, not screen recordings.
- Under `prefers-reduced-motion`, ribbons render fully drawn with no crawl and no stagger.

## Content rules

- Real numbers only, each with its source. Sample values (brand, sizes, rates, owners) carry a "sample" stamp.
- Every async view has loading, empty and error states.
- Pages work at phone, tablet and desktop widths and in dark mode.
