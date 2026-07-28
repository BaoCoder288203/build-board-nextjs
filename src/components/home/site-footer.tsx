import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-bb-border/70 bg-bb-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-bb-muted">
            A focused board for software teams — capture, organize, and ship.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-bb-muted">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="#how-it-works"
                  className="text-sm font-medium text-bb-ink transition hover:text-bb-blue"
                >
                  How it works
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="text-sm font-medium text-bb-ink transition hover:text-bb-blue"
                >
                  Features
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-bb-muted">
              Account
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-sm font-medium text-bb-ink transition hover:text-bb-blue"
                >
                  Log in
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm font-medium text-bb-ink transition hover:text-bb-blue"
                >
                  Sign up
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-bb-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-bb-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} BuildBoard</p>
          <p>Built for teams who ship.</p>
        </div>
      </div>
    </footer>
  );
}
