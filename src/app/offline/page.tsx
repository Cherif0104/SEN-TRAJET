import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="mobile-screen" style={{ background: "var(--ink)", color: "white", display: "grid", placeItems: "center", padding: 22, textAlign: "center" }}>
      <div>
        <WifiOff size={54} color="var(--gold)" />
        <h1 style={{ marginTop: 24 }}>Vous êtes hors ligne</h1>
        <p style={{ color: "#aeb9c8", lineHeight: 1.6 }}>Les écrans déjà consultés restent disponibles. Une connexion est nécessaire pour demander un chauffeur.</p>
        <Link href="/" className="primary-button gold" style={{ marginTop: 24 }}><RefreshCw size={18} /> Réessayer</Link>
      </div>
    </main>
  );
}
