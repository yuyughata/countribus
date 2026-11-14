import type { Metadata, Viewport } from "next";
import type * as React from "react";
import { Plus_Jakarta_Sans, Fraunces, Geist_Mono } from "next/font/google";

import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Countribus — Nigerian Intercity Bus Booking",
    template: "%s · Countribus",
  },
  description:
    "Book intercity bus journeys across Nigeria from trusted operators, with live seat availability and secure payments.",
  applicationName: "Countribus",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#3d1020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
