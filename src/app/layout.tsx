import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentraJet Premium — Mobilité en temps réel",
  description: "Courses VTC, taxi AIBD, Allô Dakar et covoiturage suivis en temps réel au Sénégal.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  appleWebApp: {
    capable: true,
    title: "SentraJet Premium",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111f"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const serviceWorkerScript =
    process.env.NODE_ENV === "production"
      ? "if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{}))}"
      : "if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister())));if('caches' in window){caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('sentrajet-')).map(k=>caches.delete(k))))}}";

  return (
    <html lang="fr">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: serviceWorkerScript
          }}
        />
      </body>
    </html>
  );
}
