import type { Metadata, Viewport } from "next";
import { Manrope, Syne } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  applicationName: "SAMBA",
  title: {
    default: "SAMBA — Your couple space",
    template: "%s · SAMBA",
  },
  description:
    "A private space for two: chat, play, share moments, and optionally open a window to the world.",
  appleWebApp: {
    capable: true,
    title: "SAMBA",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(display-mode: standalone)", color: "#FFFDF7" },
    { media: "(display-mode: fullscreen)", color: "#FFFDF7" },
    { color: "#FFFDF7" },
  ],
  colorScheme: "light dark",
  /** Helps Chrome/Android resize layout when the soft keyboard opens */
  interactiveWidget: "resizes-content",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full font-[family-name:var(--font-body)] antialiased">
        <ClerkProvider>
          <ConvexClientProvider>
            {children}
            <PwaRegister />
            <InstallPrompt />
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
