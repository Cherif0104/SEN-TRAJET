import { AuthGate } from "@/components/AuthGate";
import { AdminDriverReview } from "@/components/admin/AdminDriverReview";

export default function AdminPage() {
  return (
    <AuthGate role="admin">
      <main className="mobile-screen admin-shell">
        <AdminDriverReview />
      </main>
    </AuthGate>
  );
}
