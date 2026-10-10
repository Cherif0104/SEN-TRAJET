import { AuthGate } from "@/components/AuthGate";
import { DriverOnboardingWizard } from "@/components/driver/DriverOnboardingWizard";

export default function DriverOnboardingPage() {
  return (
    <AuthGate role="driver">
      <main className="mobile-screen driver-shell">
        <DriverOnboardingWizard />
      </main>
    </AuthGate>
  );
}
