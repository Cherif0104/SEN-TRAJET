import { AuthGate } from "@/components/AuthGate";
import { DriverDashboard } from "@/components/DriverDashboard";

export default function DriverPage() {
  return (
    <AuthGate role="driver">
      <main className="mobile-screen">
        <DriverDashboard />
      </main>
    </AuthGate>
  );
}
