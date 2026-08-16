import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { AppProviders } from "@/providers/AppProviders";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SentraJet Premium — Transport avec chauffeur",
  description:
    "Plateforme propriétaire SentraJet Premium : réservation, dispatch, flotte, partenaires B2B et suivi de courses au Sénégal.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/app-icon-transparent-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/app-icon-transparent-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon-v2.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SentraJet Premium",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#07111f" },
  ],
};

const preferencesInitScript = `
(function(){
  try {
    var savedTheme = localStorage.getItem('sentrajet-theme') || 'system';
    var dark = savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var savedLocale = localStorage.getItem('sentrajet-locale');
    var browserLocale = (navigator.language || 'fr').toLowerCase().split('-')[0];
    var locale = ['fr','en','ar','es','zh'].indexOf(savedLocale) >= 0 ? savedLocale : (['fr','en','ar','es','zh'].indexOf(browserLocale) >= 0 ? browserLocale : 'fr');
    var root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themePreference = savedTheme;
    root.lang = locale;
    root.dir = locale === 'ar' ? 'rtl' : 'ltr';
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (_) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      dir="ltr"
      data-theme="light"
      className={`${dmSans.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesInitScript }} />
        <link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-v2.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <AppProviders>
          {children}
          <InstallAppPrompt />
        </AppProviders>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){var h=location.hostname;var local=h==='localhost'||h==='127.0.0.1'||h==='[::1]';if(!local){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}}`,
          }}
        />
      </body>
    </html>
  );
}
