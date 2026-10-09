import { Suspense } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { RideFlow } from "@/components/RideFlow";

export default function RidePage() {
  return (
    <AuthGate role="client">
      <AppShell>
        <Suspense fallback={<div style={{ padding: 24 }}>Préparation du trajet…</div>}>
          <RideFlow />
        </Suspense>
      </AppShell>
    </AuthGate>
  );
}
