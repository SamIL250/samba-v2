import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Stable id so Chrome can update an existing install instead of leaving a shortcut.
    id: "/",
    name: "SAMBA",
    short_name: "SAMBA",
    description:
      "A private space for two: chat, play, share moments, and optionally open a window to the world.",
    // Must be a public URL that returns 200 without auth — /home 404s when signed out
    // and that breaks / hangs Android WebAPK install.
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#FFFDF7",
    // Match the app surface so the Android status bar doesn’t look like a browser toolbar.
    theme_color: "#FFFDF7",
    categories: ["social", "lifestyle"],
    lang: "en",
    prefer_related_applications: false,
    launch_handler: {
      // Prefer the existing installed window over a new Chrome tab / Custom Tab.
      client_mode: ["focus-existing", "navigate-existing", "navigate-new"],
    },
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
