import type { MetadataRoute } from "next";

/** PWA manifest (plan: installable mobile-friendly PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Countribus — Nigerian Intercity Bus Booking",
    short_name: "Countribus",
    description:
      "Book intercity bus journeys across Nigeria from trusted operators, with live seat availability and secure payments.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7f4",
    theme_color: "#f2863c",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
