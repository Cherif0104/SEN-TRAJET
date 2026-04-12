import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SEN TRAJET — Trajets interurbains au Sénégal",
  description:
    "Recherchez, réservez et payez vos trajets entre villes. Chauffeurs identifiés, mobile money, suivi en direct.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SEN TRAJET",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={plusJakarta.variable}>
      <head>
        <link rel="icon" href="/icons/app-icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){var h=location.hostname;var local=h==='localhost'||h==='127.0.0.1'||h==='[::1]';if(!local){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}}`,
          }}
        />
      </body>
    </html>
  );
}
