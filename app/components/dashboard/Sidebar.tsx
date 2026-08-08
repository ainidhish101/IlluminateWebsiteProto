/*
  Vertical left navigation for the dashboard.

  Tabs come from the manifest in `~/lib/roles`, filtered by the signed-in
  user's role, so a Member never renders an Admin link in the first place —
  and Row Level Security refuses the data even if one were forged.

  Below `lg` the sidebar becomes an overlay drawer driven by `open`; the
  header owns the toggle.
*/

import { NavLink, Link } from "react-router";
import {
  Activity,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Send,
  Settings,
  Target,
  Trophy,
  Users,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { ROLE_BLURB, ROLE_LABEL, TAB_GROUPS, tabsForRole, type Role } from "~/lib/roles";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  GraduationCap,
  FileText,
  Trophy,
  BookOpen,
  Target,
  CalendarDays,
  Send,
  ListChecks,
  Clock,
  ClipboardCheck,
  Users,
  BadgeCheck,
  Megaphone,
  Activity,
  Settings,
};

export function Sidebar({
  role,
  officerCategory,
  open,
  onClose,
}: {
  role: Role;
  officerCategory: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const tabs = tabsForRole(role);

  return (
    <>
      {/* Mobile scrim */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-chalkboard/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-chalkboard border-r border-rule-dark flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Dashboard sections"
      >
        <div className="px-5 py-5 border-b border-rule-dark shrink-0">
          <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <img src="/illuminate-logo.png" alt="" className="w-8 h-8 rounded-md" />
            <span className="font-display font-extrabold text-xl tracking-tight text-chalk">
              Illuminate
            </span>
          </Link>
          <p className="course-code text-[0.6rem] uppercase tracking-[0.15em] text-marker mt-2.5">
            {ROLE_LABEL[role]}
            {officerCategory ? ` · ${officerCategory}` : ""}
          </p>
          <p className="text-chalk-soft text-xs leading-relaxed mt-1.5">{ROLE_BLURB[role]}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {TAB_GROUPS.map((group) => {
            const groupTabs = tabs.filter((tab) => tab.group === group);
            if (groupTabs.length === 0) return null;
            return (
              <div key={group}>
                <p className="course-code text-[0.6rem] uppercase tracking-[0.15em] text-chalk-soft px-3 mb-2">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {groupTabs.map((tab) => {
                    const Icon = ICONS[tab.icon] ?? LayoutDashboard;
                    return (
                      <li key={tab.to || "index"}>
                        <NavLink
                          to={tab.to ? `/dashboard/${tab.to}` : "/dashboard"}
                          end={tab.to === ""}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                              isActive
                                ? "bg-pen-solid text-white font-semibold"
                                : "text-chalk-soft hover:text-chalk hover:bg-chalkboard-soft"
                            }`
                          }
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-rule-dark shrink-0">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-chalk-soft hover:text-chalk hover:bg-chalkboard-soft transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Back to the site
          </Link>
        </div>
      </aside>
    </>
  );
}
