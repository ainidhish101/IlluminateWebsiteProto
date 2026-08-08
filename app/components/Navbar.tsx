import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBox } from "./SearchBox";
import { getCategory, type Category } from "../data/categories";
import { AuthNavControls, Avatar, useAuth } from "../auth";

const primaryLinks = [
  { label: "About", href: "/about" },
  { label: "Extracurriculars", href: "/extracurriculars" },
  { label: "Academics", href: "/academics" },
  { label: "Testing", href: "/testing" },
  { label: "Lifestyle", href: "/lifestyle" },
  { label: "College", href: "/college" },
  { label: "Summer", href: "/summer" },
  { label: "Resources", href: "/resources" },
  { label: "GPA tool", href: "/gpa-tool" },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function TierFieldList({
  category,
  onNavigate,
  stacked = false,
}: {
  category: Category;
  onNavigate: () => void;
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? "space-y-5" : "grid grid-cols-2 gap-x-8 gap-y-6"}>
      {category.tiers.map((tier) => (
        <div key={tier.label}>
          <p className="course-code text-[0.65rem] uppercase text-pen mb-3">{tier.label}</p>
          <ul className="space-y-1.5">
            {tier.fields.map((field) => (
              <li key={field.slug}>
                <Link
                  to={`/${category.slug}/${field.slug}`}
                  onClick={onNavigate}
                  className="text-sm text-ink-soft hover:text-ink transition-colors block py-0.5"
                >
                  {field.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Account block at the bottom of the mobile drawer. */
function MobileAccountSection({ onNavigate }: { onNavigate: () => void }) {
  const { user, isAuthenticated, isReady, openAuth, logout, savedResources } = useAuth();

  if (!isReady) return null;

  if (!isAuthenticated) {
    return (
      <li className="pt-2 pb-4 border-t border-rule flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            onNavigate();
            openAuth("login");
          }}
          className="px-4 py-2 border border-rule rounded-md font-mono text-xs font-semibold uppercase tracking-wide text-ink-soft"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => {
            onNavigate();
            openAuth("signup");
          }}
          className="px-4 py-2 bg-marker text-ink-solid rounded-md font-mono text-xs font-semibold uppercase tracking-wide"
        >
          Sign up
        </button>
      </li>
    );
  }

  return (
    <li className="pt-4 pb-4 border-t border-rule normal-case">
      <div className="flex items-center gap-3 mb-4">
        <Avatar user={user!} className="w-9 h-9" />
        <div className="min-w-0">
          <p className="text-ink font-semibold text-sm truncate">{user!.name}</p>
          <p className="text-ink-soft text-xs truncate">{user!.email}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="px-3 py-2 bg-pen-solid text-white rounded-md text-sm font-semibold"
        >
          Dashboard
        </Link>
        <Link
          to="/account"
          onClick={onNavigate}
          className="px-3 py-2 border border-rule rounded-md text-sm text-ink-soft hover:text-ink"
        >
          My profile
        </Link>
        <Link
          to="/saved"
          onClick={onNavigate}
          className="px-3 py-2 border border-rule rounded-md text-sm text-ink-soft hover:text-ink"
        >
          Saved ({savedResources.length})
        </Link>
        <button
          type="button"
          onClick={() => {
            onNavigate();
            logout();
          }}
          className="px-3 py-2 text-sm text-ink-soft hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </li>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openDesktop, setOpenDesktop] = useState<string | null>(null);
  const [openMobile, setOpenMobile] = useState<string | null>(null);
  const desktopNavRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!openDesktop) return;

    function onPointerDown(e: PointerEvent) {
      if (desktopNavRef.current && !desktopNavRef.current.contains(e.target as Node)) {
        setOpenDesktop(null);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenDesktop(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openDesktop]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function openOnHover(slug: string) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenDesktop(slug);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpenDesktop(null), 150);
  }

  return (
    <header
      className={`sticky top-0 z-50 bg-paper transition-shadow ${
        scrolled ? "shadow-[0_1px_0_0_var(--color-rule)]" : ""
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-6">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/illuminate-logo.png" alt="" className="w-8 h-8 rounded-md" />
            <span className="flex items-baseline gap-2">
              <span className="font-display font-extrabold text-2xl tracking-tight text-ink">
                Illuminate
              </span>
              <span className="hidden sm:inline course-code text-[0.65rem] text-ink-soft uppercase">
                K–12 guidance
              </span>
            </span>
          </Link>

          <nav
            ref={desktopNavRef}
            className="hidden lg:flex items-center gap-1 course-code text-[0.7rem] uppercase text-ink-soft"
          >
            {primaryLinks.map((item, i) => {
              const category = getCategory(item.href.slice(1));
              const isOpen = !!category && openDesktop === category.slug;
              return (
                <span
                  key={item.href}
                  className="flex items-center relative"
                  onMouseEnter={() => category && openOnHover(category.slug)}
                  onMouseLeave={() => category && scheduleClose()}
                >
                  <Link
                    to={item.href}
                    className="nav-link px-2.5 py-1.5 hover:text-ink transition-colors"
                  >
                    {item.label}
                  </Link>
                  {category && (
                    <button
                      type="button"
                      onClick={() => setOpenDesktop(isOpen ? null : category.slug)}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      aria-label={`${item.label} guide list`}
                      className="p-1 -ml-1 mr-0.5 text-ink-soft hover:text-ink transition-colors"
                    >
                      <ChevronIcon open={isOpen} />
                    </button>
                  )}
                  {i < primaryLinks.length - 1 && (
                    <span className="text-rule select-none">/</span>
                  )}

                  {category && isOpen && (
                    <div
                      className={`absolute top-full ${
                        i >= 3 ? "right-0" : "left-0"
                      } mt-3 z-50 w-[460px] bg-paper border border-rule rounded-lg shadow-lg p-6 normal-case`}
                    >
                      <TierFieldList
                        category={category}
                        onNavigate={() => setOpenDesktop(null)}
                      />
                      <div className="mt-5 pt-4 border-t border-rule">
                        <Link
                          to={`/${category.slug}`}
                          onClick={() => setOpenDesktop(null)}
                          className="text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
                        >
                          View all {category.label} guides <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </span>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <SearchBox />
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link
              to="/get-involved"
              className="hidden xl:inline-flex items-center px-4 py-2 bg-pen-solid hover:bg-pen-solid-dim text-white font-mono text-xs font-semibold uppercase tracking-wide rounded-md transition-colors hover:-translate-y-0.5"
            >
              Get involved
            </Link>
            <AuthNavControls />
            <button
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden flex flex-col justify-center gap-1.5 w-9 h-9"
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              <span className={`block h-[2px] w-5 bg-ink transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`block h-[2px] w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`block h-[2px] w-5 bg-ink transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-rule bg-paper">
          <ul className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2">
            {primaryLinks.map((item) => {
              const category = getCategory(item.href.slice(1));
              const isOpen = !!category && openMobile === category.slug;
              return (
                <li key={item.href} className="border-b border-rule last:border-b-0">
                  <div className="flex items-center justify-between">
                    <Link
                      to={item.href}
                      onClick={() => setOpen(false)}
                      className="flex-1 block py-3 course-code text-sm uppercase text-ink-soft hover:text-ink"
                    >
                      {item.label}
                    </Link>
                    {category && (
                      <button
                        type="button"
                        onClick={() => setOpenMobile(isOpen ? null : category.slug)}
                        aria-expanded={isOpen}
                        aria-label={`${item.label} guide list`}
                        className="p-3 text-ink-soft hover:text-ink transition-colors"
                      >
                        <ChevronIcon open={isOpen} />
                      </button>
                    )}
                  </div>
                  {category && isOpen && (
                    <div className="pb-5 pl-1 normal-case">
                      <TierFieldList
                        category={category}
                        stacked
                        onNavigate={() => {
                          setOpen(false);
                          setOpenMobile(null);
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
            <li className="pt-3 pb-2 flex items-center gap-3">
              <Link
                to="/get-involved"
                onClick={() => setOpen(false)}
                className="inline-flex items-center px-4 py-2 bg-pen-solid text-white font-mono text-xs font-semibold uppercase tracking-wide rounded-md"
              >
                Get involved
              </Link>
              <ThemeToggle />
            </li>
            <MobileAccountSection onNavigate={() => setOpen(false)} />
          </ul>
        </nav>
      )}
    </header>
  );
}
