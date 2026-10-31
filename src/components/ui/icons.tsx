import type { SVGProps } from "react";

// Stroke icons on a 20px grid, 1.6 stroke, currentColor. Decorative by default (aria-hidden); pass a <title> child to label.
type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

export const ArrowRight = (p: P) => <Svg {...p}><path d="M4 10h11M11 5.5 15.5 10 11 14.5" /></Svg>;
export const ArrowUpRight = (p: P) => <Svg {...p}><path d="M6 14 14 6M7.5 6H14v6.5" /></Svg>;
export const ArrowLeft = (p: P) => <Svg {...p}><path d="M16 10H5M9 5.5 4.5 10 9 14.5" /></Svg>;
export const Plus = (p: P) => <Svg {...p}><path d="M10 4v12M4 10h12" /></Svg>;
export const Close = (p: P) => <Svg {...p}><path d="m5 5 10 10M15 5 5 15" /></Svg>;
export const Check = (p: P) => <Svg {...p}><path d="m4.5 10.5 3.5 3.5 7.5-8" /></Svg>;
export const ChevronDown = (p: P) => <Svg {...p}><path d="m5 7.5 5 5 5-5" /></Svg>;
export const Info = (p: P) => <Svg {...p}><circle cx="10" cy="10" r="7" /><path d="M10 9v4.5M10 6.5v.01" /></Svg>;
export const Alert = (p: P) => <Svg {...p}><path d="M10 3.5 17 16H3L10 3.5Z" /><path d="M10 8.5v3.5M10 14v.01" /></Svg>;
/** Heat map: a block grid with a hot cell. */
export const HeatGrid = (p: P) => <Svg {...p}><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M3 8h14M3 12.5h14M8 3v14M12.5 3v14" /><rect x="8" y="8" width="4.5" height="4.5" fill="currentColor" stroke="none" /></Svg>;
/** Photo read: a camera viewfinder. */
export const Viewfinder = (p: P) => <Svg {...p}><path d="M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7M13 3h2.5A1.5 1.5 0 0 1 17 4.5V7M17 13v2.5a1.5 1.5 0 0 1-1.5 1.5H13M7 17H4.5A1.5 1.5 0 0 1 3 15.5V13" /><circle cx="10" cy="10" r="3" /></Svg>;
/** Copy per block: a pen nib. */
export const Pen = (p: P) => <Svg {...p}><path d="M13.5 3.5 16.5 6.5 7 16H4v-3l9.5-9.5Z" /><path d="m11.5 5.5 3 3" /></Svg>;
/** Guard / sign-off: a shield with a check. */
export const Shield = (p: P) => <Svg {...p}><path d="M10 2.8 16 5v4.6c0 3.7-2.6 6.5-6 7.6-3.4-1.1-6-3.9-6-7.6V5l6-2.2Z" /><path d="m7.3 10 2 2 3.6-4" /></Svg>;
/** Review: an eye. */
export const Eye = (p: P) => <Svg {...p}><path d="M2.5 10S5.2 4.8 10 4.8 17.5 10 17.5 10 14.8 15.2 10 15.2 2.5 10 2.5 10Z" /><circle cx="10" cy="10" r="2.4" /></Svg>;
/** Budget split: a pie wedge. */
export const Split = (p: P) => <Svg {...p}><path d="M10 3a7 7 0 1 0 7 7h-7V3Z" /><path d="M12.5 2.8A7 7 0 0 1 17.2 7.5h-4.7V2.8Z" /></Svg>;
/** Send: a paper plane. */
export const Send = (p: P) => <Svg {...p}><path d="M17 3 8.5 11.5M17 3l-5 14-3.5-5.5L3 8l14-5Z" /></Svg>;
/** Map pin as a billboard on a post. */
export const Billboard = (p: P) => <Svg {...p}><rect x="2.5" y="3.5" width="15" height="8.5" rx="1.5" /><path d="M10 12v5M7 17h6M5.5 6.5l1.5 3M9 6.5l1.5 3M12.5 6.5l1.5 3" /></Svg>;
export const Calendar = (p: P) => <Svg {...p}><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M3 8.5h14M7 3v3M13 3v3" /></Svg>;
export const Users = (p: P) => <Svg {...p}><circle cx="7.5" cy="7" r="2.8" /><path d="M2.8 16c.6-2.6 2.4-4 4.7-4s4.1 1.4 4.7 4M13 4.6a2.6 2.6 0 0 1 0 5M14.6 12.2c1.4.5 2.3 1.8 2.6 3.8" /></Svg>;
export const Coins = (p: P) => <Svg {...p}><ellipse cx="8" cy="6" rx="5" ry="2.4" /><path d="M3 6v4c0 1.3 2.2 2.4 5 2.4s5-1.1 5-2.4V6" /><path d="M7 14.2c.5 1.1 2.5 2 5 2 2.8 0 5-1.1 5-2.4v-4c0-1.2-1.8-2.1-4.2-2.4" /></Svg>;
export const Plug = (p: P) => <Svg {...p}><path d="M7 2.5v4M13 2.5v4M5 6.5h10v3a5 5 0 0 1-10 0v-3ZM10 14.5v3" /></Svg>;
export const Sparkle = (p: P) => <Svg {...p}><path d="M10 2.5c.6 3.6 1.9 4.9 5.5 5.5-3.6.6-4.9 1.9-5.5 5.5-.6-3.6-1.9-4.9-5.5-5.5 3.6-.6 4.9-1.9 5.5-5.5ZM15.5 13c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5Z" /></Svg>;
export const Lock = (p: P) => <Svg {...p}><rect x="4" y="9" width="12" height="8.5" rx="2" /><path d="M6.8 9V6.5a3.2 3.2 0 0 1 6.4 0V9" /></Svg>;
export const Gauge = (p: P) => <Svg {...p}><path d="M3.5 14a6.5 6.5 0 1 1 13 0" /><path d="m10 14 3.2-4.2" /><circle cx="10" cy="14" r="1" fill="currentColor" /></Svg>;
