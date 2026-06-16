import { LoginForm } from "@/components/LoginForm";
import { safeNextPath } from "@/lib/safeRedirect";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  const rawNext = Array.isArray(searchParams.next)
    ? searchParams.next[0]
    : searchParams.next;
  const next = safeNextPath(rawNext);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-65px)] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-card border border-smoke bg-white p-8 shadow-card">
        <h1 className="text-xl font-medium tracking-tight text-brand-dark">
          Anmeldung
        </h1>
        <p className="mt-1 text-sm text-ash">
          Dieser Bereich ist intern. Bitte das Firmen-Passwort eingeben.
        </p>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
