import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paraner — Finans & Bütçe Koçun",
    short_name: "Paraner",
    description:
      "Paranı yönet, geleceğini kur. AI destekli kişisel ve işletme finans asistanı.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1F1C",
    theme_color: "#0B1F1C",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
