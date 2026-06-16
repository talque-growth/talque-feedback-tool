import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-smoke bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl font-medium tracking-tight text-brand-dark">
            talque
          </span>
          <span className="hidden h-6 w-px bg-smoke sm:block" />
          <span className="hidden text-sm text-ash sm:block">
            Post-Event-Feedback
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-ash sm:block">
            Internes Sales-Tool
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
