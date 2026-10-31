import type { Metadata, Viewport } from "next";
import { Geist_Mono, Host_Grotesk } from "next/font/google";
import "./globals.css";

const host = Host_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-host", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono", display: "swap" });

const description =
  "Wallspace picks the billboards, bus shelters and street screens where a brand's audience lives, by taste instead of phone tracking, and writes a line for each face.";

export const metadata: Metadata = {
  metadataBase: new URL("https://wallspace.pages.dev"),
  title: { default: "Wallspace", template: "%s · Wallspace" },
  description,
  applicationName: "Wallspace",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "Wallspace",
    title: "Wallspace · put the billboard where the fans live",
    description,
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: "Wallspace: street ribbons and billboard faces over Atlanta" }],
  },
  twitter: { card: "summary_large_image", images: ["/brand/og.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full ${host.variable} ${mono.variable}`}>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
