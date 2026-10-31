"use client";
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

const NOSCRIPT = "<style>.ws-draw{stroke-dashoffset:0!important}.ws-pop,.ws-fade-up,.ws-lane,.ws-bar{opacity:1!important;transform:none!important}.ws-type{clip-path:none!important}</style>";

/** Sets data-inview="true" on its element the first time it scrolls into view (once). Motif CSS keys every draw-in,
 *  pop and fade-up off that attribute. Without JS a <noscript> style shows everything drawn. */
export function InView({
  as: Tag = "div",
  className,
  style,
  children,
  margin = "0px 0px -12% 0px",
  testId,
  ...aria
}: {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  margin?: string;
  testId?: string;
  "aria-hidden"?: boolean;
  "aria-labelledby"?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return (
    <Tag ref={ref} data-inview={seen ? "true" : "false"} data-testid={testId} className={className} style={style} {...aria}>
      {children}
      <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT }} />
    </Tag>
  );
}
