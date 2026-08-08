import { useState } from "react";
import { Link } from "react-router";

const columns: Record<string, { label: string; href: string }[]> = {
  Learn: [
    { label: "Extracurriculars", href: "/extracurriculars" },
    { label: "Academics", href: "/academics" },
    { label: "Standardized testing", href: "/testing" },
    { label: "Lifestyle", href: "/lifestyle" },
    { label: "College prep", href: "/college" },
    { label: "Summer planning", href: "/summer" },
    { label: "GPA & target tools", href: "/gpa-tool" },
  ],
  Organization: [
    { label: "About us", href: "/about" },
    { label: "Our team", href: "/about#team" },
    { label: "Get involved", href: "/get-involved" },
    { label: "Partner with us", href: "/get-involved#partner" },
    { label: "Contact", href: "/about#contact" },
  ],
};

const social = [
  { label: "Instagram", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Email", href: "mailto:hello@illuminate.org" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
  }

  return (
    <footer className="bg-chalkboard text-chalk">
      <div className="border-b border-rule-dark">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h3 className="font-display font-extrabold text-2xl text-chalk">
              Get the next guide first
            </h3>
            <p className="text-chalk-soft text-sm mt-1">
              One email when something new goes up. Nothing else.
            </p>
          </div>
          {subscribed ? (
            <p className="font-mono text-sm text-marker">
              You're on the list. Talk soon.
            </p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex w-full lg:w-auto gap-0">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 lg:w-64 px-3 py-2.5 bg-transparent border-b-2 border-chalk-soft/40 text-chalk placeholder:text-chalk-soft/50 text-sm focus:outline-none focus:border-marker transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 border-b-2 border-marker text-marker font-mono text-xs font-semibold uppercase tracking-wide hover:text-chalk hover:border-chalk transition-colors"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/illuminate-logo.png" alt="" className="w-8 h-8 rounded-md" />
              <span className="font-display font-extrabold text-2xl text-chalk">Illuminate</span>
            </Link>
            <p className="text-chalk-soft text-sm leading-relaxed mt-4 max-w-xs">
              A student-led nonprofit bridging the knowledge gap so every K–12
              student can build their future — completely free.
            </p>
            <div className="flex items-center gap-4 mt-6 font-mono text-xs uppercase tracking-wide">
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="text-chalk-soft hover:text-pen transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(columns).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-mono text-xs uppercase tracking-widest text-marker mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-chalk-soft hover:text-chalk transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-rule-dark flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-chalk-soft/70">
          <p>© {new Date().getFullYear()} Illuminate. Student-led. Nonprofit.</p>
          <p>Made by students, for students.</p>
        </div>
      </div>
    </footer>
  );
}
