import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Mail, MessageCircle } from "lucide-react";

export const metadata = {
  title: "Nous contacter — SEN TRAJET",
  description: "Contactez l’équipe SEN TRAJET pour toute question ou demande de support.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          Nous contacter
        </h1>
        <p className="mt-2 text-neutral-600 text-sm">
          Une question, un problème ou une suggestion ? Utilisez les moyens ci-dessous pour joindre l’équipe SEN TRAJET.
        </p>
        <div className="mt-8 space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900">Email</h2>
                <a
                  href="mailto:contact@sentrajet.com"
                  className="text-sm text-primary hover:underline"
                >
                  contact@sentrajet.com
                </a>
              </div>
            </div>
            <p className="mt-3 text-sm text-neutral-600">
              Pour les demandes générales, le support technique ou les partenariats. Nous nous efforçons de répondre sous 48 h ouvrées.
            </p>
          </section>
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900">Support utilisateur</h2>
                <p className="text-sm text-neutral-600">
                  Pour les litiges liés à une réservation, utilisez d’abord la messagerie avec le chauffeur ou le client. Si le différend persiste, contactez-nous par email en indiquant le numéro de réservation.
                </p>
              </div>
            </div>
          </section>
          <p className="text-sm text-neutral-500">
            SEN TRAJET — Développé par{" "}
            <a
              href="https://impulcia-afrique.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Impulcia Afrique
            </a>
            . Fondateur : Chérif Aidara Naing.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
