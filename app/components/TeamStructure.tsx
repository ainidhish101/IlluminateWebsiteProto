import { teamRoles, type TeamRole } from "../data/team";
import { RoleIcon } from "./RoleIcon";

const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

const headerStyles: Record<string, string> = {
  directors: "bg-pen-solid text-white",
  officers: "bg-marker text-ink-solid",
  associates: "bg-paper-dim text-ink border-b border-rule",
  members: "bg-paper text-ink border-b border-rule",
};

const subtitleStyles: Record<string, string> = {
  directors: "text-white/70",
  officers: "text-ink-solid/60",
  associates: "text-ink-soft",
  members: "text-ink-soft",
};

type TeamStructureProps = {
  variant?: "info" | "apply";
  /** When provided, the apply link becomes a button that opens the in-app form. */
  onApply?: (role: TeamRole) => void;
  /** Slug of the role currently selected in the application form. */
  activeSlug?: string | null;
};

export function TeamStructure({ variant = "info", onApply, activeSlug }: TeamStructureProps) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {teamRoles.map((role, i) => (
        <div
          key={role.slug}
          className={`card-elevate border rounded-lg overflow-hidden bg-paper flex flex-col ${
            activeSlug === role.slug ? "border-pen ring-2 ring-pen/20" : "border-rule"
          }`}
        >
          <div className={`px-5 py-5 ${headerStyles[role.slug]}`}>
            <div className="flex items-center justify-between mb-2">
              <RoleIcon slug={role.slug} className="w-5 h-5" />
              <span className="course-code text-xs opacity-50">0{i + 1}</span>
            </div>
            <h3 className="font-display font-bold text-xl">{role.title}</h3>
            <p className={`text-xs mt-0.5 ${subtitleStyles[role.slug]}`}>{role.subtitle}</p>
          </div>

          <div className="p-5 flex-1 flex flex-col">
            <p className="text-ink-soft text-sm leading-relaxed mb-4">{role.desc}</p>
            <ul className="space-y-1.5 mb-4">
              {role.members.map((m) => (
                <li key={m} className="flex items-center gap-2 text-xs text-ink">
                  <span className="w-1 h-1 rounded-full bg-marker shrink-0" aria-hidden="true" />
                  {m}
                </li>
              ))}
            </ul>

            {variant === "apply" &&
              (onApply ? (
                <button
                  type="button"
                  onClick={() => onApply(role)}
                  className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pen hover:text-pen-dim transition-colors self-start"
                >
                  Apply as {article(role.singular)} {role.singular}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <a
                  href={`mailto:hello@illuminate.org?subject=${encodeURIComponent(
                    `Application: ${role.singular}`,
                  )}`}
                  className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pen hover:text-pen-dim transition-colors"
                >
                  Apply as {article(role.singular)} {role.singular}{" "}
                  <span aria-hidden="true">→</span>
                </a>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
