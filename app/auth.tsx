/*
  Illuminate — Authentication, account management, and feature gating.

  Everything auth-related lives in this single module: the adapter, the
  context/provider, the `useAuth` hook, the modal, the navbar widgets, and
  the <ProtectedFeature> gate. Nothing else in the app touches session
  storage directly.

  ─────────────────────────────────────────────────────────────────────────
  BACKENDS
  ─────────────────────────────────────────────────────────────────────────
  Two adapters implement the same five methods; `authAdapter` picks between
  them at load time:

    supabaseAdapter — used when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
                      are set. Sessions come from Supabase Auth, and the
                      `profiles` table supplies role and officer category.
    mockAdapter     — localStorage stand-in, so the public site still works
                      before the Supabase keys are added. Everyone it creates
                      is a Member; role promotion needs the real backend.

  Both return the same shape ({ user } or { error }), so the provider, modal,
  and every gated component are unaffected by which one is active.
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import { errorMessage, getSupabase, isSupabaseConfigured } from "./lib/supabase";
import { getProfile, updateProfileRow, type ProfileRow } from "./lib/db";
import { ROLE_LABEL, toRole, type Role } from "./lib/roles";
import {
  AlertCircle,
  BookmarkCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";

/* ───────────────────────────── types ───────────────────────────── */

/** The four dashboard tiers. Defined in `lib/roles.ts` alongside the tab manifest. */
export type UserRole = Role;

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: UserRole;
  /** Only set for Officers — the one guide category they review. */
  officerCategory: string | null;
  createdAt: string;
  gradeLevel?: string;
  interests?: string;
};

export type AuthMode = "login" | "signup" | "forgot_password";

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  gradeLevel: string;
  interests: string;
};

type AuthResult = { user: User; error?: never } | { user?: never; error: string };

/* ────────────────── BEGIN swappable backend adapter ────────────────── */

const SESSION_KEY = "illuminate.session";
const USERS_KEY = "illuminate.users"; // mock user table — a real backend owns this
const SAVED_KEY = "illuminate.saved";

/** Mock-only credential scrambling. Never ship this as real password storage. */
const scramble = (s: string) =>
  typeof window === "undefined" ? s : window.btoa(encodeURIComponent(`ilm:${s}`));

type StoredUser = User & { password: string };

function readUsers(): StoredUser[] {
  return readJSON<StoredUser[]>(USERS_KEY, []);
}

function writeUsers(users: StoredUser[]) {
  writeJSON(USERS_KEY, users);
}

type AuthAdapter = {
  getSession(): Promise<User | null>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(payload: SignupPayload): Promise<AuthResult>;
  signOut(): Promise<void>;
  requestReset(email: string): Promise<{ error?: string }>;
  updateProfile(current: User, patch: Partial<User>): Promise<AuthResult>;
};

/**
 * Sessions saved before the four-tier roles existed carry `role: "student"`,
 * which no longer maps to a rank — left alone it renders a sidebar with zero
 * tabs. Normalizing on read repairs those quietly.
 */
function normalizeStored(user: User | null): User | null {
  if (!user) return null;
  return { ...user, role: toRole(user.role), officerCategory: user.officerCategory ?? null };
}

const mockAdapter: AuthAdapter = {
  async getSession(): Promise<User | null> {
    return normalizeStored(readJSON<User | null>(SESSION_KEY, null));
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    await latency();
    const found = readUsers().find((u) => u.email === normalizeEmail(email));
    if (!found) return { error: "No Illuminate account uses that email yet." };
    if (found.password !== scramble(password)) return { error: "That password doesn't match." };
    const { password: _pw, ...stored } = found;
    const user = normalizeStored(stored)!;
    writeJSON(SESSION_KEY, user);
    return { user };
  },

  async signUp(payload: SignupPayload): Promise<AuthResult> {
    await latency();
    const users = readUsers();
    const email = normalizeEmail(payload.email);
    if (users.some((u) => u.email === email))
      return { error: "That email already has an account. Try logging in." };
    const user: User = {
      id: `usr_${Math.random().toString(36).slice(2, 11)}`,
      name: payload.name.trim(),
      email,
      avatar: null,
      role: "member",
      officerCategory: null,
      createdAt: new Date().toISOString(),
      gradeLevel: payload.gradeLevel,
      interests: payload.interests.trim(),
    };
    writeUsers([...users, { ...user, password: scramble(payload.password) }]);
    writeJSON(SESSION_KEY, user);
    return { user };
  },

  async signOut(): Promise<void> {
    await latency(200);
    removeKey(SESSION_KEY);
  },

  async requestReset(email: string): Promise<{ error?: string }> {
    await latency();
    // Deliberately does not reveal whether the address exists.
    return {};
  },

  async updateProfile(current: User, patch: Partial<User>): Promise<AuthResult> {
    await latency(300);
    const user: User = { ...current, ...patch };
    writeUsers(
      readUsers().map((u) => (u.id === user.id ? { ...u, ...patch } : u)),
    );
    writeJSON(SESSION_KEY, user);
    return { user };
  },
};

/** `profiles` row → the User shape the rest of the app already consumes. */
function profileToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.full_name?.trim() || row.email.split("@")[0],
    email: row.email,
    avatar: row.avatar_url,
    role: toRole(row.role),
    officerCategory: row.officer_category,
    createdAt: row.created_at,
    gradeLevel: row.grade_level ?? undefined,
    interests: row.interests ?? undefined,
  };
}

/**
 * The `handle_new_user` trigger inserts the profile row inside the same
 * transaction as the auth user, so it exists by the time we get here. If a
 * project was set up without the trigger this returns null rather than
 * throwing, and the caller reports it as a setup problem.
 */
async function loadProfile(userId: string): Promise<User | null> {
  const row = await getProfile(userId);
  return row ? profileToUser(row) : null;
}

const MISSING_PROFILE =
  "Your account exists but has no profile row. Run supabase/schema.sql, then try again.";

const supabaseAdapter: AuthAdapter = {
  async getSession(): Promise<User | null> {
    const { data } = await getSupabase().auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return null;
    try {
      return await loadProfile(userId);
    } catch {
      return null;
    }
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) return { error: errorMessage(error, "Those credentials didn't work.") };
    if (!data.user) return { error: "Sign-in returned no user." };
    try {
      const user = await loadProfile(data.user.id);
      return user ? { user } : { error: MISSING_PROFILE };
    } catch (err) {
      return { error: errorMessage(err, MISSING_PROFILE) };
    }
  },

  async signUp(payload: SignupPayload): Promise<AuthResult> {
    // The trigger reads these keys out of raw_user_meta_data to seed `profiles`.
    const { data, error } = await getSupabase().auth.signUp({
      email: normalizeEmail(payload.email),
      password: payload.password,
      options: {
        data: {
          full_name: payload.name.trim(),
          grade_level: payload.gradeLevel,
          interests: payload.interests.trim(),
        },
      },
    });
    if (error) return { error: errorMessage(error, "We couldn't create that account.") };
    if (!data.session) {
      // Email confirmation is on for this project — there's no session yet.
      return {
        error: "Account created. Check your inbox to confirm your email, then log in.",
      };
    }
    try {
      const user = data.user ? await loadProfile(data.user.id) : null;
      return user ? { user } : { error: MISSING_PROFILE };
    } catch (err) {
      return { error: errorMessage(err, MISSING_PROFILE) };
    }
  },

  async signOut(): Promise<void> {
    await getSupabase().auth.signOut();
  },

  async requestReset(email: string): Promise<{ error?: string }> {
    const redirectTo =
      typeof window === "undefined" ? undefined : `${window.location.origin}/account`;
    const { error } = await getSupabase().auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo,
    });
    // A missing address is not reported back, to avoid confirming who has an account.
    if (error && !/user not found/i.test(error.message)) {
      return { error: errorMessage(error, "We couldn't send that reset link.") };
    }
    return {};
  },

  async updateProfile(current: User, patch: Partial<User>): Promise<AuthResult> {
    try {
      const row = await updateProfileRow(current.id, {
        full_name: patch.name ?? current.name,
        grade_level: patch.gradeLevel ?? current.gradeLevel ?? null,
        interests: patch.interests ?? current.interests ?? null,
        avatar_url: patch.avatar !== undefined ? patch.avatar : current.avatar,
      });
      return { user: profileToUser(row) };
    } catch (err) {
      return { error: errorMessage(err, "We couldn't save those changes.") };
    }
  },
};

const authAdapter: AuthAdapter = isSupabaseConfigured ? supabaseAdapter : mockAdapter;

/* ─────────────────── END swappable backend adapter ─────────────────── */

const latency = (ms = 550) => new Promise<void>((r) => setTimeout(r, ms));
const normalizeEmail = (e: string) => e.trim().toLowerCase();

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — session simply won't persist */
  }
}

function removeKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ───────────────────────── validation ───────────────────────── */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ───────────────────────── context ───────────────────────── */

export type SavedResource = { href: string; title: string; category: string; savedAt: string };

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  /** False until the persisted session has been read on the client. */
  isReady: boolean;
  authModalOpen: boolean;
  authMode: AuthMode;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  setAuthMode: (mode: AuthMode) => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (payload: SignupPayload) => Promise<AuthResult>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  updateProfile: (patch: Partial<User>) => Promise<AuthResult>;
  /** Re-reads the profile row — call after a role or category change. */
  refreshUser: () => Promise<void>;
  savedResources: SavedResource[];
  isSaved: (href: string) => boolean;
  toggleSaved: (resource: Omit<SavedResource, "savedAt">) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);

  // Session restore runs on the client only, so SSR markup and the first
  // client render agree (no hydration mismatch on the navbar).
  useEffect(() => {
    let cancelled = false;
    authAdapter.getSession().then((restored) => {
      if (cancelled) return;
      setUser(restored);
      if (restored) setSavedResources(readJSON<SavedResource[]>(`${SAVED_KEY}.${restored.id}`, []));
      setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keeps this tab in step with sign-outs, token refreshes, and the password
  // recovery link, all of which fire outside our own login/logout calls.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = getSupabase().auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT" && event !== "TOKEN_REFRESHED") return;
      authAdapter.getSession().then((restored) => {
        setUser(restored);
        setSavedResources(
          restored ? readJSON<SavedResource[]>(`${SAVED_KEY}.${restored.id}`, []) : [],
        );
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshUser = useCallback(async () => {
    const restored = await authAdapter.getSession();
    setUser(restored);
  }, []);

  const openAuth = useCallback((mode: AuthMode = "login") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthModalOpen(false), []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authAdapter.signIn(email, password);
    if (result.user) {
      setUser(result.user);
      setSavedResources(readJSON<SavedResource[]>(`${SAVED_KEY}.${result.user.id}`, []));
      setAuthModalOpen(false);
    }
    return result;
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    const result = await authAdapter.signUp(payload);
    if (result.user) {
      setUser(result.user);
      setSavedResources(readJSON<SavedResource[]>(`${SAVED_KEY}.${result.user.id}`, []));
      setAuthModalOpen(false);
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authAdapter.signOut();
    setUser(null);
    setSavedResources([]);
  }, []);

  const requestPasswordReset = useCallback(
    (email: string) => authAdapter.requestReset(email),
    [],
  );

  const updateProfile = useCallback(
    async (patch: Partial<User>) => {
      if (!user) return { error: "You need to be signed in." } as AuthResult;
      const result = await authAdapter.updateProfile(user, patch);
      if (result.user) setUser(result.user);
      return result;
    },
    [user],
  );

  const isSaved = useCallback(
    (href: string) => savedResources.some((r) => r.href === href),
    [savedResources],
  );

  const toggleSaved = useCallback(
    (resource: Omit<SavedResource, "savedAt">) => {
      if (!user) {
        openAuth("signup");
        return;
      }
      setSavedResources((prev) => {
        const next = prev.some((r) => r.href === resource.href)
          ? prev.filter((r) => r.href !== resource.href)
          : [{ ...resource, savedAt: new Date().toISOString() }, ...prev];
        writeJSON(`${SAVED_KEY}.${user.id}`, next);
        return next;
      });
    },
    [user, openAuth],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isReady,
      authModalOpen,
      authMode,
      openAuth,
      closeAuth,
      setAuthMode,
      login,
      signup,
      logout,
      requestPasswordReset,
      updateProfile,
      refreshUser,
      savedResources,
      isSaved,
      toggleSaved,
    }),
    [
      user,
      isReady,
      authModalOpen,
      authMode,
      openAuth,
      closeAuth,
      login,
      signup,
      logout,
      requestPasswordReset,
      updateProfile,
      refreshUser,
      savedResources,
      isSaved,
      toggleSaved,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal />
    </AuthContext.Provider>
  );
}

/* ───────────────────────── shared form atoms ───────────────────────── */

const fieldClass =
  "w-full px-3.5 py-2.5 bg-paper border border-rule rounded-md text-ink text-sm placeholder:text-ink-soft/60 focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20 transition-colors";

const labelClass = "block font-mono text-[0.7rem] uppercase tracking-wide text-ink-soft mb-1.5";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="text-ink-soft text-xs mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

// React 19 passes `ref` through as a normal prop, so spreading is enough.
export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function SelectInput(props: React.ComponentProps<"select">) {
  return <select {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`${fieldClass} resize-y min-h-[6rem] ${props.className ?? ""}`}
    />
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextInput
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-soft hover:text-ink transition-colors rounded"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 text-sm text-ink bg-marker/15 border border-marker/40 rounded-md px-3 py-2.5"
    >
      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-marker-dim" />
      <span>{message}</span>
    </p>
  );
}

export function SubmitButton({
  busy,
  children,
  ...rest
}: { busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      type={rest.type ?? "submit"}
      disabled={busy || rest.disabled}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-pen-solid hover:bg-pen-solid-dim disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ───────────────────────── auth modal ───────────────────────── */

const GRADE_LEVELS = ["9th grade", "10th grade", "11th grade", "12th grade"];

function AuthModal() {
  const { authModalOpen, authMode, setAuthMode, closeAuth } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuth();
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => firstFieldRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
  }, [authModalOpen, closeAuth]);

  if (!authModalOpen) return null;

  const titles: Record<AuthMode, { title: string; sub: string }> = {
    login: {
      title: "Welcome back",
      sub: "Log in to pick up where you left off.",
    },
    signup: {
      title: "Create your free account",
      sub: "Unlock every guide, template, and planning tool. Always free.",
    },
    forgot_password: {
      title: "Reset your password",
      sub: "We'll email you a link to set a new one.",
    },
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-10 overflow-y-auto bg-chalkboard/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeAuth();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="reveal w-full max-w-md bg-paper border border-rule rounded-xl shadow-2xl overflow-hidden my-auto"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pen mb-2">
              Illuminate account
            </p>
            <h2
              id="auth-modal-title"
              className="font-display font-extrabold text-2xl text-ink tracking-tight"
            >
              {titles[authMode].title}
            </h2>
            <p className="text-ink-soft text-sm mt-1.5 leading-relaxed">{titles[authMode].sub}</p>
          </div>
          <button
            type="button"
            onClick={closeAuth}
            aria-label="Close"
            className="p-1.5 -mr-1.5 -mt-1 text-ink-soft hover:text-ink transition-colors rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {authMode === "login" && <LoginForm firstFieldRef={firstFieldRef} />}
          {authMode === "signup" && <SignupForm firstFieldRef={firstFieldRef} />}
          {authMode === "forgot_password" && <ForgotPasswordForm firstFieldRef={firstFieldRef} />}
        </div>

        <div className="px-6 py-4 bg-paper-dim border-t border-rule text-sm text-ink-soft">
          {authMode === "login" && (
            <p>
              New here?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className="font-semibold text-pen hover:text-pen-dim transition-colors"
              >
                Create a free account
              </button>
            </p>
          )}
          {authMode === "signup" && (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="font-semibold text-pen hover:text-pen-dim transition-colors"
              >
                Log in
              </button>
            </p>
          )}
          {authMode === "forgot_password" && (
            <p>
              Remembered it?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="font-semibold text-pen hover:text-pen-dim transition-colors"
              >
                Back to log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ firstFieldRef }: { firstFieldRef: React.RefObject<HTMLInputElement | null> }) {
  const { login, setAuthMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <FormError message={error} />}
      <Field label="Email" htmlFor="login-email">
        <TextInput
          id="login-email"
          ref={firstFieldRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@school.edu"
        />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <PasswordInput
          id="login-password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
      </Field>
      <button
        type="button"
        onClick={() => setAuthMode("forgot_password")}
        className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-pen transition-colors"
      >
        <Key className="w-3.5 h-3.5" /> Forgot your password?
      </button>
      <SubmitButton busy={busy}>Log in</SubmitButton>
    </form>
  );
}

function SignupForm({ firstFieldRef }: { firstFieldRef: React.RefObject<HTMLInputElement | null> }) {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gradeLevel, setGradeLevel] = useState(GRADE_LEVELS[2]);
  const [interests, setInterests] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Tell us your full name.");
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Passwords need at least 8 characters.");
    setBusy(true);
    const result = await signup({ name, email, password, gradeLevel, interests });
    setBusy(false);
    if (result.error) setError(result.error);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <FormError message={error} />}
      <Field label="Full name" htmlFor="signup-name">
        <TextInput
          id="signup-name"
          ref={firstFieldRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Jordan Rivera"
        />
      </Field>
      <Field label="Email" htmlFor="signup-email">
        <TextInput
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@school.edu"
        />
      </Field>
      <Field label="Password" htmlFor="signup-password" hint="At least 8 characters.">
        <PasswordInput
          id="signup-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Grade level" htmlFor="signup-grade">
        <SelectInput
          id="signup-grade"
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
        >
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field
        label="Target colleges or major"
        htmlFor="signup-interests"
        hint="Optional — we use it to point you at the right guides."
      >
        <TextInput
          id="signup-interests"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="Bioengineering, UT Austin, Rice"
        />
      </Field>
      <SubmitButton busy={busy}>Create free account</SubmitButton>
      <p className="text-ink-soft text-xs leading-relaxed">
        Free forever. No payment details, ever — Illuminate is a student-run nonprofit.
      </p>
    </form>
  );
}

function ForgotPasswordForm({
  firstFieldRef,
}: {
  firstFieldRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.");
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (result.error) return setError(result.error);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pen/10 text-pen mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </span>
        <p className="text-ink font-semibold mb-2">Check your inbox.</p>
        <p className="text-ink-soft text-sm leading-relaxed">
          If an Illuminate account uses <span className="text-ink font-medium">{email}</span>,
          a reset link is on its way. It expires in an hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <FormError message={error} />}
      <Field label="Email" htmlFor="reset-email">
        <TextInput
          id="reset-email"
          ref={firstFieldRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@school.edu"
        />
      </Field>
      <SubmitButton busy={busy}>
        <Mail className="w-4 h-4" /> Send reset link
      </SubmitButton>
    </form>
  );
}

/* ───────────────────────── navbar widgets ───────────────────────── */

export function Avatar({ user, className = "w-8 h-8" }: { user: User; className?: string }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        className={`${className} rounded-full object-cover border border-rule`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} rounded-full bg-pen-solid text-white font-mono text-xs font-semibold inline-flex items-center justify-center shrink-0`}
    >
      {initialsOf(user.name)}
    </span>
  );
}

/** Log In / Sign Up pair, shown when logged out. */
export function AuthButtons({ compact = false }: { compact?: boolean }) {
  const { openAuth } = useAuth();
  return (
    <>
      <button
        type="button"
        onClick={() => openAuth("login")}
        className={`items-center px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-ink transition-colors ${
          compact ? "inline-flex" : "hidden sm:inline-flex"
        }`}
      >
        Log in
      </button>
      <button
        type="button"
        onClick={() => openAuth("signup")}
        className="inline-flex items-center px-4 py-2 bg-marker hover:bg-marker-dim text-ink-solid font-mono text-xs font-semibold uppercase tracking-wide rounded-md transition-colors"
      >
        Sign up
      </button>
    </>
  );
}

/** Avatar + dropdown, shown when logged in. */
export function UserMenu() {
  const { user, logout, savedResources } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const items = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "My profile", to: "/account", icon: UserIcon },
    { label: "Saved resources", to: "/saved", icon: BookmarkCheck, badge: savedResources.length },
  ];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-rule hover:border-pen transition-colors"
      >
        <Avatar user={user} />
        <span className="hidden md:inline text-sm font-medium text-ink max-w-[8rem] truncate">
          {user.name.split(" ")[0]}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-paper border border-rule rounded-lg shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3.5 border-b border-rule bg-paper-dim">
            <p className="text-ink font-semibold text-sm truncate">{user.name}</p>
            <p className="text-ink-soft text-xs truncate">{user.email}</p>
            <p className="course-code text-[0.65rem] uppercase text-pen mt-1.5">
              {ROLE_LABEL[user.role]}
              {user.officerCategory ? ` · ${user.officerCategory}` : ""}
            </p>
          </div>
          <ul className="py-1.5">
            {items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-paper-dim transition-colors"
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {!!item.badge && (
                    <span className="course-code text-[0.65rem] text-pen">{item.badge}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-rule py-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-paper-dim transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders the right control for the current session state. */
export function AuthNavControls() {
  const { isAuthenticated, isReady } = useAuth();
  // Reserve the space until the persisted session is read, so the navbar
  // doesn't flash "Sign up" at a user who is already logged in.
  if (!isReady) return <span className="w-[104px] h-9" aria-hidden="true" />;
  return isAuthenticated ? <UserMenu /> : <AuthButtons />;
}

/* ───────────────────────── feature gating ───────────────────────── */

export type ProtectedFeatureProps = {
  children: React.ReactNode;
  /** Headline on the unlock card. */
  title?: string;
  /** Supporting line on the unlock card. */
  description?: string;
  /** Label on the primary button. */
  cta?: string;
  /** Blur radius applied to the preview underneath. */
  blur?: number;
  /** Caps the preview height so long gated sections don't scroll forever. */
  previewHeight?: string;
  className?: string;
};

/**
 * Wraps premium content. Signed-in users see it untouched; everyone else
 * gets a blurred, inert preview under a conversion card.
 */
export function ProtectedFeature({
  children,
  title = "Unlock full strategy guide & templates",
  description = "Create your free Illuminate account in 30 seconds.",
  cta = "Create a free account to unlock",
  blur = 4,
  previewHeight = "26rem",
  className = "",
}: ProtectedFeatureProps) {
  const { isAuthenticated, isReady, openAuth } = useAuth();

  if (isAuthenticated) return <>{children}</>;

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        inert
        className="overflow-hidden select-none pointer-events-none"
        style={{ filter: `blur(${blur}px)`, maxHeight: previewHeight }}
      >
        {children}
      </div>

      {/* Fade the bottom of the preview into the page */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="card-elevate w-full max-w-md bg-paper border border-rule rounded-xl p-7 text-center shadow-lg">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-pen/10 text-pen mb-4">
            <Lock className="w-5 h-5" />
          </span>
          <p className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-pen mb-2.5">
            Free account required
          </p>
          <h3 className="font-display font-extrabold text-2xl text-ink tracking-tight mb-2.5">
            {title}
          </h3>
          <p className="text-ink-soft text-sm leading-relaxed mb-6">{description}</p>
          <button
            type="button"
            onClick={() => openAuth("signup")}
            disabled={!isReady}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-pen-solid hover:bg-pen-solid-dim disabled:opacity-60 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" /> {cta}
          </button>
          <button
            type="button"
            onClick={() => openAuth("login")}
            className="mt-3 text-xs text-ink-soft hover:text-pen transition-colors"
          >
            Already have an account? Log in
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small inline "locked" chip for gated controls that stay visible. */
export function LockBadge({ label = "Free account" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 course-code text-[0.6rem] uppercase tracking-wide text-pen bg-pen/10 border border-pen/25 rounded px-1.5 py-0.5">
      <Lock className="w-3 h-3" /> {label}
    </span>
  );
}

/** Full-page guard for account-only routes (/account, /saved). */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady, openAuth } = useAuth();

  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-32 text-ink-soft">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="bg-paper py-24 sm:py-32">
        <div className="max-w-md mx-auto px-4 text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pen/10 text-pen mb-5">
            <AlertCircle className="w-6 h-6" />
          </span>
          <h1 className="font-display font-extrabold text-3xl text-ink tracking-tight mb-3">
            This page needs an account.
          </h1>
          <p className="text-ink-soft leading-relaxed mb-8">
            Log in or create a free Illuminate account to see your profile and everything
            you've saved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openAuth("signup")}
              className="inline-flex items-center gap-2 px-5 py-3 bg-pen-solid hover:bg-pen-solid-dim text-white font-semibold text-sm rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Create free account
            </button>
            <button
              type="button"
              onClick={() => openAuth("login")}
              className="px-5 py-3 border border-rule hover:border-pen text-ink font-semibold text-sm rounded-lg transition-colors"
            >
              Log in
            </button>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
