import type { SVGProps } from "react";

// Product-shell icons on the same 20px grid, 1.6 stroke, currentColor as icons.tsx (UI-1). Decorative by default.
type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

export const Dashboard = (p: P) => <Svg {...p}><rect x="3" y="3" width="6" height="7" rx="1.5" /><rect x="11" y="3" width="6" height="4" rx="1.5" /><rect x="11" y="9" width="6" height="8" rx="1.5" /><rect x="3" y="12" width="6" height="5" rx="1.5" /></Svg>;
export const Brief = (p: P) => <Svg {...p}><path d="M6 3h6l3 3v11H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M12 3v3h3M8 10h5M8 13h3" /></Svg>;
export const Compare = (p: P) => <Svg {...p}><rect x="2.5" y="4" width="6.5" height="12" rx="1.5" /><rect x="11" y="4" width="6.5" height="12" rx="1.5" /><path d="M5 8h1.5M13.5 8H15M5 11h2M13.5 11h1" /></Svg>;
export const Route = (p: P) => <Svg {...p}><circle cx="5" cy="15" r="2" /><circle cx="15" cy="5" r="2" /><path d="M7 15h4.5a2.5 2.5 0 0 0 0-5h-3a2.5 2.5 0 0 1 0-5H13" /></Svg>;
export const Help = (p: P) => <Svg {...p}><circle cx="10" cy="10" r="7" /><path d="M7.9 7.8a2.2 2.2 0 1 1 3 2.1c-.6.3-.9.8-.9 1.4v.4M10 14.2v.01" /></Svg>;
export const Menu = (p: P) => <Svg {...p}><path d="M3.5 6h13M3.5 10h13M3.5 14h13" /></Svg>;
export const Search = (p: P) => <Svg {...p}><circle cx="9" cy="9" r="5" /><path d="m13 13 3.5 3.5" /></Svg>;
export const LogOut = (p: P) => <Svg {...p}><path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M12 6.5 15.5 10 12 13.5M15.5 10H8" /></Svg>;
export const Globe = (p: P) => <Svg {...p}><circle cx="10" cy="10" r="7" /><path d="M3 10h14M10 3c2 2 2.8 4.4 2.8 7s-.8 5-2.8 7c-2-2-2.8-4.4-2.8-7S8 5 10 3Z" /></Svg>;
export const Copy = (p: P) => <Svg {...p}><rect x="7" y="7" width="9.5" height="9.5" rx="1.8" /><path d="M13 7V5a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 0 4 5v6.5A1.5 1.5 0 0 0 5.5 13H7" /></Svg>;
export const ChevronLeft = (p: P) => <Svg {...p}><path d="m12.5 5-5 5 5 5" /></Svg>;
export const ChevronRight = (p: P) => <Svg {...p}><path d="m7.5 5 5 5-5 5" /></Svg>;
export const ChevronUpDown = (p: P) => <Svg {...p}><path d="m6.5 8 3.5-3.5L13.5 8M6.5 12l3.5 3.5 3.5-3.5" /></Svg>;
export const Filter = (p: P) => <Svg {...p}><path d="M3.5 5h13M6 10h8M8.5 15h3" /></Svg>;
export const MapIcon = (p: P) => <Svg {...p}><path d="m3 5.5 4.5-2 5 2 4.5-2v11l-4.5 2-5-2-4.5 2v-11Z" /><path d="M7.5 3.5v11M12.5 5.5v11" /></Svg>;
export const Download = (p: P) => <Svg {...p}><path d="M10 3.5v9M6.5 9 10 12.5 13.5 9M4 16h12" /></Svg>;
export const Clock = (p: P) => <Svg {...p}><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2" /></Svg>;
export const Hash = (p: P) => <Svg {...p}><path d="M8 3.5 6.5 16.5M13.5 3.5 12 16.5M4 7.5h12.5M3.5 12.5H16" /></Svg>;
export const Refresh = (p: P) => <Svg {...p}><path d="M15.5 8A6 6 0 0 0 4.7 6.5M4.5 12a6 6 0 0 0 10.8 1.5" /><path d="M4.5 3.5v3h3M15.5 16.5v-3h-3" /></Svg>;
export const Dots = (p: P) => <Svg {...p}><circle cx="5" cy="10" r="1" fill="currentColor" /><circle cx="10" cy="10" r="1" fill="currentColor" /><circle cx="15" cy="10" r="1" fill="currentColor" /></Svg>;
export const Mail = (p: P) => <Svg {...p}><rect x="3" y="4.5" width="14" height="11" rx="1.8" /><path d="m3.5 5.5 6.5 5 6.5-5" /></Svg>;
export const Table = (p: P) => <Svg {...p}><rect x="3" y="3.5" width="14" height="13" rx="1.8" /><path d="M3 8h14M3 12.3h14M8.5 8v8.5" /></Svg>;
export const Layers = (p: P) => <Svg {...p}><path d="m10 3 7 3.8-7 3.8-7-3.8L10 3Z" /><path d="m3 10.2 7 3.8 7-3.8M3 13.6l7 3.8 7-3.8" /></Svg>;
export const Inbox = (p: P) => <Svg {...p}><path d="M3 11.5 5 4.5h10l2 7v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Z" /><path d="M3 11.5h4l1 2h4l1-2h4" /></Svg>;
