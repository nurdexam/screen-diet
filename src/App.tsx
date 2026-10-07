import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { authClient } from "./auth-client";

type Screen = "dashboard" | "profile" | "controls" | "analytics" | "settings" | "limit" | "filters" | "success";
type NavItem = "home" | "controls" | "analytics" | "settings";
type ChildProfile = { name: string; age: number };
type ChildAccount = ChildProfile & { id: string };

const STORAGE_KEYS = {
  notifications: "screenDiet.v2.notifications",
  weeklyReports: "screenDiet.v2.weeklyReports",
};

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} minutes`;
  if (!minutes) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours}h ${minutes}m`;
}

type ServerData = {
  profile: ChildProfile;
  children: ChildAccount[];
  selectedChildId: string;
  dailyLimit: number;
  blockedKeywords: string[];
  usedMinutes: number;
  sessionsToday: number;
  activeStartedAt: string | null;
};

async function saveServerData(childId: string, update: Partial<Pick<ServerData, "profile" | "dailyLimit" | "blockedKeywords">>) {
  const response = await fetch("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...update, childId }),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(result?.error ?? "Could not save your data.");
  }
}

function dataUrl(childId?: string) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const params = new URLSearchParams({ timezone });
  if (childId) params.set("childId", childId);
  return `/api/data?${params.toString()}`;
}

function AuthScreen({ startupError, onRetry }: { startupError?: string; onRetry?: () => void }) {
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = creatingAccount
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) setError(result.error.message || "Authentication failed.");
    } catch {
      setError("Could not connect. Check the Vercel API and Neon configuration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-slate-50 px-5 py-8">
      <form className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl" onSubmit={submit}>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-600 text-white">{icons.shield}</div>
        <h1 className="mt-4 text-center text-2xl font-extrabold text-slate-950">ScreenDiet</h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          {creatingAccount ? "Create a parent account" : "Sign in to your parent account"}
        </p>
        {startupError && (
          <div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900" role="alert">
            {startupError}
            {onRetry && <button className="mt-2 block font-extrabold text-blue-700" onClick={onRetry} type="button">Retry connection</button>}
          </div>
        )}
        {creatingAccount && (
          <label className="mt-6 block text-sm font-bold text-slate-700">
            Name
            <input autoComplete="name" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4" maxLength={80} onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
        )}
        <label className="mt-5 block text-sm font-bold text-slate-700">
          Email
          <input autoComplete="email" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Password
          <input autoComplete={creatingAccount ? "new-password" : "current-password"} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
        <button className="mt-6 min-h-12 w-full rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white disabled:bg-slate-300" disabled={busy} type="submit">
          {busy ? "Please wait…" : creatingAccount ? "Create account" : "Sign in"}
        </button>
        <button className="mt-4 w-full py-2 text-sm font-bold text-blue-700" onClick={() => { setError(""); setCreatingAccount(!creatingAccount); }} type="button">
          {creatingAccount ? "Already have an account? Sign in" : "New to ScreenDiet? Create an account"}
        </button>
      </form>
    </div>
  );
}

function Icon({
  children,
  className = "size-6",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

const icons = {
  arrow: (
    <Icon className="size-5">
      <path d="m15 18-6-6 6-6" />
    </Icon>
  ),
  chart: (
    <Icon>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </Icon>
  ),
  check: (
    <Icon className="size-10">
      <path d="m5 12 4.5 4.5L19 7" />
    </Icon>
  ),
  chevron: (
    <Icon className="size-5">
      <path d="m9 18 6-6-6-6" />
    </Icon>
  ),
  clock: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Icon>
  ),
  controls: (
    <Icon>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </Icon>
  ),
  filter: (
    <Icon>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Icon>
  ),
  home: (
    <Icon>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </Icon>
  ),
  shield: (
    <Icon className="size-7">
      <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  ),
  x: (
    <Icon className="size-4">
      <path d="m7 7 10 10M17 7 7 17" />
    </Icon>
  ),
};

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="relative pt-5 flex h-16 items-center border-b border-slate-100 bg-white px-5">
      <button
        aria-label="Back to dashboard"
        className="absolute left-4 grid size-10 place-items-center rounded-full text-slate-700 transition hover:bg-slate-50 active:scale-95"
        onClick={onBack}
      >
        {icons.arrow}
      </button>
      <h1 className="mx-auto text-base font-extrabold text-slate-950">{title}</h1>
    </header>
  );
}

function BottomNav({
  active,
  onSelect,
}: {
  active: NavItem;
  onSelect: (item: NavItem) => void;
}) {
  const items: [NavItem, string, ReactNode][] = [
    ["home", "Home", icons.home],
    ["controls", "Controls", icons.controls],
    ["analytics", "Analytics", icons.chart],
    ["settings", "Settings", icons.settings],
  ];

  return (
    <nav className="relative z-30 w-full shrink-0 border-t border-slate-100 bg-white/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="flex justify-between">
        {items.map(([id, label, icon]) => (
          <button
            aria-current={active === id ? "page" : undefined}
            className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95 ${
              active === id ? "text-blue-600" : "text-slate-400"
            }`}
            key={id}
            onClick={() => onSelect(id)}
          >
            <span className={active === id ? "rounded-xl bg-blue-50 px-3 py-1" : "px-3 py-1"}>{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Dashboard({
  blockedCount,
  dailyLimit,
  goTo,
  profileName,
  usedMinutes,
  sessionsToday,
  isSessionActive,
  onSessionToggle,
}: {
  blockedCount: number;
  dailyLimit: number;
  goTo: (screen: Screen) => void;
  profileName: string;
  usedMinutes: number;
  sessionsToday: number;
  isSessionActive: boolean;
  onSessionToggle: () => void;
}) {
  const exceeded = usedMinutes > dailyLimit;
  const limitReached = usedMinutes >= dailyLimit;
  const difference = Math.abs(dailyLimit - usedMinutes);
  const usageRatio = dailyLimit > 0 ? usedMinutes / dailyLimit : 1;
  const usagePercent = Math.min(100, Math.round(usageRatio * 100));


  return (
    <div className="screen-enter flex min-h-full flex-col bg-slate-50">
      <div className="bg-white pt-5">
        <header className="flex items-center gap-3 px-5 pb-5 pt-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            {icons.shield}
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-950">ScreenDiet</p>
            <p className="text-xs font-semibold text-slate-400">{profileName}&apos;s Profile</p>
          </div>
          <button
            aria-label={`Open ${profileName}'s profile`}
            className="ml-auto grid size-10 place-items-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700 transition hover:bg-blue-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-95"
            onClick={() => goTo("profile")}
            type="button"
          >
            {profileName.trim().charAt(0).toUpperCase() || "A"}
          </button>
        </header>
      </div>

      <main className="flex-1 px-5 pb-6 pt-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Parent dashboard</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Good afternoon</h1>
          <p className="mt-1 text-sm text-slate-500">Here&apos;s {profileName}&apos;s day at a glance.</p>
        </div>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                {icons.clock}
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Daily Usage</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-400">Today, recorded by the timer</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">{usagePercent}%</span>
          </div>
          <p className="mt-6 text-3xl font-extrabold tracking-tight text-slate-950">
            {formatDuration(usedMinutes)}{" "}
            <span className="text-sm font-bold text-slate-400">of {formatDuration(dailyLimit)}</span>
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              aria-hidden="true"
              className={`h-full rounded-full transition-[width] duration-300 ${
                limitReached ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <span
            className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ${
              limitReached
                ? "bg-red-50 text-red-600 ring-red-100"
                : "bg-emerald-50 text-emerald-700 ring-emerald-100"
            }`}
          >
            {exceeded ? `Exceeded by ${difference} min` : limitReached ? "Daily limit reached" : `${difference} min remaining`}
          </span>
          <button
            className={`mt-3 block w-full rounded-2xl px-4 py-3 text-sm font-extrabold transition active:scale-[.98] ${
              isSessionActive ? "bg-red-50 text-red-600" : "bg-blue-600 text-white"
            }`}
            onClick={onSessionToggle}
            type="button"
          >
            {isSessionActive ? "Stop screen-time session" : "Start screen-time session"}
          </button>
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Today&apos;s overview</h2>
            <span className="text-xs font-semibold text-slate-400">Updated now</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              aria-label="View screen sessions and weekly analytics"
              className="rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 active:scale-[.98]"
              onClick={() => goTo("analytics")}
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
                {icons.chart}
              </span>
              <p className="mt-4 text-2xl font-extrabold text-slate-950">{sessionsToday}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Screen sessions</p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">Recorded sessions today</p>
            </button>
            <button
              aria-label="View and edit active filters"
              className="rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-amber-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 active:scale-[.98]"
              onClick={() => goTo("filters")}
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                {icons.filter}
              </span>
              <p className="mt-4 text-2xl font-extrabold text-slate-950">{blockedCount}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Active filters</p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">Protection is on</p>
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-blue-600 shadow-sm">
              {icons.shield}
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-blue-950">{profileName} is protected</h2>
              <p className="mt-1 text-xs leading-5 text-blue-700">
                Screen time and content rules are active on all connected devices.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProfileScreen({
  goTo,
  profile,
  children,
  selectedChildId,
  onSelectChild,
  onAddChild,
  onDeleteChild,
  onSave,
  email,
  onSignOut,
}: {
  goTo: (screen: Screen) => void;
  profile: ChildProfile;
  children: ChildAccount[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  onAddChild: (profile: ChildProfile) => Promise<ChildAccount | null>;
  onDeleteChild: (childId: string) => Promise<boolean>;
  onSave: (profile: ChildProfile) => Promise<boolean>;
  email: string;
  onSignOut: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [saved, setSaved] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildAge, setNewChildAge] = useState(10);
  const [childBusy, setChildBusy] = useState(false);
  const initial = profile.name.trim().charAt(0).toUpperCase() || "A";

  useEffect(() => {
    setName(profile.name);
    setAge(profile.age);
  }, [profile.name, profile.age]);
  const actions: {
    screen: Extract<Screen, "controls" | "analytics" | "settings">;
    title: string;
    description: string;
    icon: ReactNode;
  }[] = [
    {
      screen: "controls",
      title: "Screen time & filters",
      description: `${profile.name}’s daily limit and blocked keywords.`,
      icon: icons.controls,
    },
    {
      screen: "analytics",
      title: "Weekly report",
      description: `Review ${profile.name}’s screen time and activity for the week.`,
      icon: icons.chart,
    },
    {
      screen: "settings",
      title: "App settings",
      description: "Manage alerts and weekly report preferences.",
      icon: icons.settings,
    },
  ];

  async function saveProfile() {
    const cleanName = name.trim();
    if (!cleanName) return;
    const updated = { name: cleanName, age };
    if (!(await onSave(updated))) return;
    setName(cleanName);
    setEditing(false);
    setSaved(true);
  }

  async function createChild() {
    setChildBusy(true);
    const child = await onAddChild({ name: newChildName, age: newChildAge });
    setChildBusy(false);
    if (child) {
      setAddingChild(false);
      setNewChildName("");
      setNewChildAge(10);
    }
  }

  async function removeSelectedChild() {
    if (children.length <= 1) return;
    const confirmed = window.confirm(`Delete ${profile.name}’s profile and its saved screen-time history?`);
    if (!confirmed) return;
    setChildBusy(true);
    await onDeleteChild(selectedChildId);
    setChildBusy(false);
  }

  function cancelEditing() {
    setName(profile.name);
    setAge(profile.age);
    setEditing(false);
  }

  return (
    <div className="screen-enter min-h-full bg-slate-50">
      <TopBar onBack={() => goTo("dashboard")} title="Profile" />
      <main className="px-5 pb-10 pt-7">
        <section className="mb-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Children</h2>
              <p className="mt-1 text-xs text-slate-500">Manage profiles from your parent account.</p>
            </div>
            <button
              className="min-h-10 rounded-xl bg-blue-600 px-3 text-xs font-extrabold text-white"
              onClick={() => setAddingChild(!addingChild)}
              type="button"
            >
              {addingChild ? "Cancel" : "+ Add child"}
            </button>
          </div>
          <label className="mt-4 block text-xs font-bold text-slate-600" htmlFor="active-child">Selected child</label>
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800"
            id="active-child"
            onChange={(event) => onSelectChild(event.target.value)}
            value={selectedChildId}
          >
            {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
          {addingChild && (
            <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
              <label className="block text-xs font-bold text-slate-600" htmlFor="new-child-name">Child name</label>
              <input
                autoComplete="off"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                id="new-child-name"
                maxLength={30}
                onChange={(event) => setNewChildName(event.target.value)}
                placeholder="Name"
                value={newChildName}
              />
              <label className="block text-xs font-bold text-slate-600" htmlFor="new-child-age">Age</label>
              <select
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                id="new-child-age"
                onChange={(event) => setNewChildAge(Number(event.target.value))}
                value={newChildAge}
              >
                {Array.from({ length: 7 }, (_, index) => index + 6).map((value) => <option key={value} value={value}>{value} years old</option>)}
              </select>
              <button
                className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white disabled:bg-slate-300"
                disabled={!newChildName.trim() || childBusy}
                onClick={() => void createChild()}
                type="button"
              >
                {childBusy ? "Saving…" : "Create child profile"}
              </button>
            </div>
          )}
        </section>
        <section className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-blue-100 text-3xl font-extrabold text-blue-700">
            {initial}
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-slate-950">{profile.name}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Child profile · {profile.age} years old</p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <span aria-hidden="true" className="size-2 rounded-full bg-emerald-500" />
            Protection is active
          </span>
          {!editing && (
            <button
              className="mt-5 min-h-11 w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              onClick={() => {
                setSaved(false);
                setEditing(true);
              }}
              type="button"
            >
              Edit profile
            </button>
          )}
        </section>

        {editing && (
          <section aria-labelledby="edit-profile-title" className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900" id="edit-profile-title">Edit profile</h3>
            <label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="profile-name">
              Name
            </label>
            <input
              autoComplete="given-name"
              className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              id="profile-name"
              maxLength={30}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
            <label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="profile-age">
              Age
            </label>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              id="profile-age"
              onChange={(event) => setAge(Number(event.target.value))}
              value={age}
            >
              {Array.from({ length: 7 }, (_, index) => index + 6).map((value) => (
                <option key={value} value={value}>{value} years old</option>
              ))}
            </select>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                onClick={cancelEditing}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!name.trim()}
                onClick={saveProfile}
                type="button"
              >
                Save profile
              </button>
            </div>
          </section>
        )}
        {saved && <p className="mt-3 text-center text-sm font-semibold text-emerald-700" role="status">Profile saved.</p>}
        {children.length > 1 && (
          <button
            className="mt-5 min-h-11 w-full rounded-2xl border border-red-100 bg-red-50 px-4 text-sm font-extrabold text-red-600 disabled:opacity-50"
            disabled={childBusy}
            onClick={() => void removeSelectedChild()}
            type="button"
          >
            Remove {profile.name}&apos;s profile
          </button>
        )}

        <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Parent account</p>
          <p className="mt-2 break-all text-sm font-bold text-slate-800">{email}</p>
          <button className="mt-4 min-h-11 w-full rounded-2xl border border-red-100 bg-red-50 px-4 text-sm font-extrabold text-red-600 transition hover:bg-red-100" onClick={onSignOut} type="button">
            Sign out
          </button>
        </section>

        <h3 className="mb-3 mt-7 text-sm font-extrabold text-slate-900">Profile shortcuts</h3>
        <div className="space-y-3">
          {actions.map((action) => (
            <button
              className="flex min-h-20 w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[.99]"
              key={action.screen}
              onClick={() => goTo(action.screen)}
              type="button"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                {action.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-slate-900">{action.title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{action.description}</span>
              </span>
              <span className="text-blue-600">{icons.chevron}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function MainSection({
  active,
  profileName,
  blockedCount,
  dailyLimit,
  goTo,
  notificationsEnabled,
  setNotificationsEnabled,
  setWeeklyReportsEnabled,
  weeklyReportsEnabled,
  usedMinutes,
  sessionsToday,
}: {
  active: "controls" | "analytics" | "settings";
  profileName: string;
  blockedCount: number;
  dailyLimit: number;
  goTo: (screen: Screen) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  setWeeklyReportsEnabled: (enabled: boolean) => void;
  weeklyReportsEnabled: boolean;
  usedMinutes: number;
  sessionsToday: number;
}) {

  const pageDetails = {
    controls: {
      eyebrow: `${profileName}’s profile`,
      title: "Controls",
      description: "Manage screen time and content protection in one place.",
    },
    analytics: {
      eyebrow: "Recorded today",
      title: "Analytics",
      description: `Review ${profileName}’s recorded screen time and sessions.`,
    },
    settings: {
      eyebrow: "ScreenDiet",
      title: "Settings",
      description: "Choose which updates and reports you want to receive.",
    },
  }[active];

  return (
    <div className="screen-enter flex min-h-full flex-col bg-slate-50">
      <div className="bg-white pt-5">
        <header className="px-5  pb-5 pt-2">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{pageDetails.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{pageDetails.title}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">{pageDetails.description}</p>
        </header>
      </div>

      <main className="flex-1 px-5 pb-6 pt-6">
        {active === "controls" && (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                  {icons.clock}
                </span>
                <div>
                  <h2 className="font-extrabold text-slate-900">Daily Screen Time</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Current limit: {formatDuration(dailyLimit)}
                  </p>
                </div>
              </div>
              <button
                className="mt-5 flex w-full items-center justify-between rounded-2xl bg-slate-100 px-4 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200 active:scale-[.98]"
                onClick={() => goTo("limit")}
              >
                Set daily limit <span className="text-blue-600">{icons.chevron}</span>
              </button>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                  {icons.filter}
                </span>
                <div>
                  <h2 className="font-extrabold text-slate-900">Content Filters</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {blockedCount} {blockedCount === 1 ? "keyword" : "keywords"} currently blocked
                  </p>
                </div>
              </div>
              <button
                className="mt-5 flex w-full items-center justify-between rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-200 transition active:scale-[.98]"
                onClick={() => goTo("filters")}
              >
                Manage content filters {icons.chevron}
              </button>
            </section>
          </div>
        )}

        {active === "analytics" && (
          <>
            <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-300">
              <p className="text-sm font-semibold text-slate-400">Today&apos;s recorded screen time</p>
              <p className="mt-2 text-3xl font-extrabold">{formatDuration(usedMinutes)}</p>
              <span className="mt-3 inline-flex rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-extrabold text-emerald-300">
                {sessionsToday} {sessionsToday === 1 ? "session" : "sessions"} today
              </span>
            </section>
            <section className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-extrabold text-blue-900">Sessions are saved to your account</p>
              <p className="mt-1 text-xs leading-5 text-blue-700">Start and stop the dashboard timer to record time. Weekly comparisons will be available once daily history is added.</p>
            </section>
          </>
        )}

        {active === "settings" && (
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <span className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                {icons.settings}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-extrabold text-slate-900">Limit notifications</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Alert when {profileName} is close to the daily limit.</p>
              </div>
              <button
                aria-label="Toggle limit notifications"
                aria-pressed={notificationsEnabled}
                className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${
                  notificationsEnabled ? "bg-blue-600" : "bg-slate-300"
                }`}
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              >
                <span
                  className={`block size-5 rounded-full bg-white shadow transition ${
                    notificationsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-3 p-5">
              <span className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                {icons.chart}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-extrabold text-slate-900">Weekly reports</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Receive a summary every Monday.</p>
              </div>
              <button
                aria-label="Toggle weekly reports"
                aria-pressed={weeklyReportsEnabled}
                className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${
                  weeklyReportsEnabled ? "bg-blue-600" : "bg-slate-300"
                }`}
                onClick={() => setWeeklyReportsEnabled(!weeklyReportsEnabled)}
              >
                <span
                  className={`block size-5 rounded-full bg-white shadow transition ${
                    weeklyReportsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function LimitScreen({
  dailyLimit,
  goTo,
  onSave,
}: {
  dailyLimit: number;
  goTo: (screen: Screen) => void;
  onSave: (hours: number, minutes: number) => Promise<boolean>;
}) {
  const [hours, setHours] = useState(Math.floor(dailyLimit / 60));
  const [minutes, setMinutes] = useState(dailyLimit % 60);
  const presets = [
    ["30m", 0, 30],
    ["1h", 1, 0],
    ["1.5h", 1, 30],
    ["2h", 2, 0],
  ] as const;
  const selectedMinutes = hours * 60 + minutes;

  function setSafeHours(value: string) {
    setHours(Math.min(23, Math.max(0, Number(value) || 0)));
  }

  function setSafeMinutes(value: string) {
    setMinutes(Math.min(59, Math.max(0, Number(value) || 0)));
  }

  return (
    <div className="screen-enter flex min-h-full flex-col bg-slate-50">
      <TopBar onBack={() => goTo("dashboard")} title="Daily Screen Time Limit" />
      <main className="flex-1 px-5 pb-28 pt-7">
        <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-blue-100 text-blue-600">
          <Icon className="size-8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l4 2" />
          </Icon>
        </div>
        <div className="mt-5 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Set a healthy limit</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
            Choose a preset or enter the exact amount of daily screen time.
          </p>
        </div>

        <section className="mt-8">
          <h3 className="text-sm font-extrabold text-slate-800">Quick selection</h3>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {presets.map(([label, presetHours, presetMinutes]) => {
              const active = selectedMinutes === presetHours * 60 + presetMinutes;
              return (
                <button
                  aria-pressed={active}
                  className={`rounded-full py-3 text-xs font-extrabold transition active:scale-95 ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "border border-slate-200 bg-white text-slate-500"
                  }`}
                  key={label}
                  onClick={() => {
                    setHours(presetHours);
                    setMinutes(presetMinutes);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-800">Custom time</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-500">
              Hours
              <input
                aria-label="Hours"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-extrabold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                inputMode="numeric"
                max="23"
                min="0"
                onChange={(event) => setSafeHours(event.target.value)}
                type="number"
                value={hours}
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Minutes
              <input
                aria-label="Minutes"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-extrabold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                inputMode="numeric"
                max="59"
                min="0"
                onChange={(event) => setSafeMinutes(event.target.value)}
                type="number"
                value={minutes}
              />
            </label>
          </div>
          <p className="mt-4 text-center text-xs font-semibold text-slate-400">
            Daily allowance: {hours}h {minutes.toString().padStart(2, "0")}m
          </p>
        </section>
      </main>
      <div className="absolute inset-x-0 bottom-0 border-t border-slate-100 bg-white/95 p-5 pb-7 backdrop-blur-xl">
        <button
          className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-200 transition active:scale-[.98] disabled:bg-slate-300 disabled:shadow-none"
          disabled={selectedMinutes === 0}
          onClick={() => onSave(hours, minutes)}
        >
          Save Limit
        </button>
      </div>
    </div>
  );
}

function FilterScreen({
  blocked,
  goTo,
  onSave,
  pendingLimit,
}: {
  blocked: string[];
  goTo: (screen: Screen) => void;
  onSave: (keywords: string[], added: string[], removed: string[]) => Promise<boolean>;
  pendingLimit: number | null;
}) {
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [initialBlocked] = useState(blocked);
  const [draftBlocked, setDraftBlocked] = useState(blocked);

  function addKeyword() {
    const cleanKeyword = keyword.trim().toLowerCase();
    if (!cleanKeyword) {
      setMessage("Enter a keyword first.");
      return;
    }
    if (draftBlocked.includes(cleanKeyword)) {
      setMessage(`“${cleanKeyword}” is already blocked.`);
      return;
    }
    setDraftBlocked([...draftBlocked, cleanKeyword]);
    setKeyword("");
    setMessage(`“${cleanKeyword}” added.`);
  }

  function removeKeyword(keywordToRemove: string) {
    setDraftBlocked(draftBlocked.filter((item) => item !== keywordToRemove));
    setMessage(`“${keywordToRemove}” removed.`);
  }

  async function saveChanges() {
    const added = draftBlocked.filter((item) => !initialBlocked.includes(item));
    const removed = initialBlocked.filter((item) => !draftBlocked.includes(item));
    await onSave(draftBlocked, added, removed);
  }

  return (
    <div className="screen-enter flex min-h-full flex-col bg-slate-50">
      <TopBar onBack={() => goTo("dashboard")} title="Keyword Blocklist" />
      <main className="flex-1 px-5 pb-28 pt-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Active protection</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Block unwanted content</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add words or topics to hide related searches, websites, and videos.
          </p>
        </div>

        {pendingLimit !== null && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-emerald-600">
              <Icon className="size-4">
                <path d="m6 12 4 4 8-8" />
              </Icon>
            </span>
            <p className="text-xs font-bold">Screen time saved: {formatDuration(pendingLimit)} per day.</p>
          </div>
        )}

        <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm">
          <label className="text-sm font-extrabold text-slate-800" htmlFor="keyword">
            Add a keyword
          </label>
          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              id="keyword"
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addKeyword();
              }}
              placeholder="Enter keyword..."
              value={keyword}
            />
            <button
              className="shrink-0 rounded-2xl bg-blue-600 px-4 text-xs font-extrabold text-white shadow-md shadow-blue-200 transition active:scale-95"
              onClick={addKeyword}
            >
              Add Keyword
            </button>
          </div>
          {message && (
            <p className="mt-3 text-xs font-semibold text-blue-600" role="status">
              {message}
            </p>
          )}
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800">Active blocked keywords</h3>
            <span className="text-xs font-bold text-slate-400">{draftBlocked.length} active</span>
          </div>
          <div className="mt-3 min-h-32 rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
            {draftBlocked.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {draftBlocked.map((item) => (
                  <span
                    className="flex items-center gap-2 rounded-full bg-white py-2 pl-4 pr-2 text-sm font-extrabold text-blue-700 shadow-sm ring-1 ring-blue-100"
                    key={item}
                  >
                    {item}
                    <button
                      aria-label={`Remove ${item}`}
                      className="grid size-7 place-items-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-100 active:scale-90"
                      onClick={() => removeKeyword(item)}
                    >
                      {icons.x}
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-9 text-center text-sm font-semibold text-slate-400">No blocked keywords yet.</p>
            )}
          </div>
        </section>
      </main>
      <div className="absolute inset-x-0 bottom-0 border-t border-slate-100 bg-white/95 p-5 pb-7 backdrop-blur-xl">
        <button
          className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-200 transition active:scale-[.98]"
          onClick={saveChanges}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

function SuccessScreen({
  goTo,
  message,
}: {
  goTo: (screen: Screen) => void;
  message: string;
}) {
  return (
    <div className="screen-enter flex min-h-full flex-col bg-slate-50">
      <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
        <span className="grid size-10 place-items-center rounded-2xl bg-blue-600 text-white">
          {icons.shield}
        </span>
        <span className="text-lg font-extrabold tracking-tight text-slate-950">ScreenDiet</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <section aria-labelledby="success-title" aria-live="polite" className="w-full max-w-sm">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <span className="grid size-14 place-items-center rounded-full bg-emerald-100">{icons.check}</span>
          </div>
          <h1
            className="mt-6 text-2xl font-extrabold leading-tight tracking-tight text-slate-950"
            id="success-title"
          >
            Changes saved successfully
          </h1>
          <p className="mt-3 break-words text-sm leading-6 text-slate-600">{message}</p>
          <button
            className="mt-8 min-h-12 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[.98]"
            onClick={() => goTo("dashboard")}
            type="button"
          >
            Back to Dashboard
          </button>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const { data: authSession, isPending: authPending, error: authError, refetch: retryAuth } = authClient.useSession();
  const [authCheckTimedOut, setAuthCheckTimedOut] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [profile, setProfile] = useState<ChildProfile>({ name: "Alex", age: 10 });
  const [children, setChildren] = useState<ChildAccount[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [dailyLimit, setDailyLimit] = useState(90);
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>(["gambling"]);
  const [usedMinutes, setUsedMinutes] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [activeStartedAt, setActiveStartedAt] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    readStoredValue(STORAGE_KEYS.notifications, true),
  );
  const [weeklyReportsEnabled, setWeeklyReportsEnabled] = useState(() =>
    readStoredValue(STORAGE_KEYS.weeklyReports, true),
  );
  const [pendingLimit, setPendingLimit] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("Your settings are up to date.");

  useEffect(() => {
    if (!authPending || authSession) {
      setAuthCheckTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setAuthCheckTimedOut(true), 8_000);
    return () => window.clearTimeout(timer);
  }, [authPending, authSession]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notificationsEnabled));
      localStorage.setItem(STORAGE_KEYS.weeklyReports, JSON.stringify(weeklyReportsEnabled));
    } catch {
      // Settings remain available for the current session.
    }
  }, [notificationsEnabled, weeklyReportsEnabled]);

  useEffect(() => {
    if (screen === "dashboard") setPendingLimit(null);
  }, [screen]);

  useEffect(() => {
    if (!authSession?.user.id) {
      setDataLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(dataUrl(selectedChildId));
        const result = (await response.json()) as ServerData & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load account data.");
        if (!active) return;
        setChildren(result.children);
        setSelectedChildId(result.selectedChildId);
        setProfile(result.profile);
        setDailyLimit(result.dailyLimit);
        setBlockedKeywords(result.blockedKeywords);
        setUsedMinutes(result.usedMinutes);
        setSessionsToday(result.sessionsToday);
        setActiveStartedAt(result.activeStartedAt);
        setApiError("");
      } catch (error) {
        if (active) setApiError(error instanceof Error ? error.message : "Could not load account data.");
      } finally {
        if (active) setDataLoading(false);
      }
    };
    setDataLoading(true);
    void load();
    return () => { active = false; };
  }, [authSession?.user.id, selectedChildId]);

  useEffect(() => {
    if (!authSession?.user.id || !activeStartedAt) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(dataUrl(selectedChildId));
        if (!response.ok) return;
        const result = (await response.json()) as ServerData;
        setUsedMinutes(result.usedMinutes);
        setSessionsToday(result.sessionsToday);
        setActiveStartedAt(result.activeStartedAt);
      } catch {
        // A missed refresh is corrected on the next polling interval.
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [authSession?.user.id, activeStartedAt, selectedChildId]);

  async function saveProfile(updated: ChildProfile) {
    try {
      await saveServerData(selectedChildId, { profile: updated });
      setProfile(updated);
      setChildren((current) => current.map((child) => child.id === selectedChildId ? { ...child, ...updated } : child));
      setApiError("");
      return true;
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Profile could not be saved.");
      return false;
    }
  }

  async function saveLimit(hours: number, minutes: number) {
    const totalMinutes = hours * 60 + minutes;
    try {
      await saveServerData(selectedChildId, { dailyLimit: totalMinutes });
      setDailyLimit(totalMinutes);
      setPendingLimit(totalMinutes);
      setApiError("");
      setScreen("filters");
      return true;
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Daily limit could not be saved.");
      return false;
    }
  }

  async function saveFilters(keywords: string[], added: string[], removed: string[]) {
    try {
      await saveServerData(selectedChildId, { blockedKeywords: keywords, ...(pendingLimit !== null ? { dailyLimit: pendingLimit } : {}) });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Filters could not be saved.");
      return false;
    }
    setBlockedKeywords(keywords);
    const updates: string[] = [];

    if (pendingLimit !== null) {
      updates.push(`Daily limit updated to ${formatDuration(pendingLimit)}.`);
    }
    if (added.length) {
      updates.push(`Added to active filters: ${added.map((item) => `“${item}”`).join(", ")}.`);
    }
    if (removed.length) {
      updates.push(`Removed from active filters: ${removed.map((item) => `“${item}”`).join(", ")}.`);
    }
    if (!updates.length) {
      updates.push("No settings were changed. Your active filters are already up to date.");
    }

    setSuccessMessage(updates.join(" "));
    setPendingLimit(null);
    setApiError("");
    setScreen("success");
    return true;
  }

  async function toggleSession() {
    try {
      if (!selectedChildId) throw new Error("Select a child profile first.");
      const action = activeStartedAt ? "stop" : "start";
      const response = await fetch(`/api/sessions?action=${action}&childId=${encodeURIComponent(selectedChildId)}`, { method: "POST" });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error ?? "Could not update the timer.");
      }
      const refresh = await fetch(dataUrl(selectedChildId));
      if (refresh.ok) {
        const result = (await refresh.json()) as ServerData;
        setUsedMinutes(result.usedMinutes);
        setSessionsToday(result.sessionsToday);
        setActiveStartedAt(result.activeStartedAt);
      }
      setApiError("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not update the timer.");
    }
  }

  async function addChild(child: ChildProfile): Promise<ChildAccount | null> {
    try {
      const response = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(child),
      });
      const result = (await response.json().catch(() => null)) as { child?: ChildAccount; error?: string } | null;
      if (!response.ok || !result?.child) throw new Error(result?.error ?? "Could not create child profile.");
      setChildren((current) => [...current, result.child!]);
      setSelectedChildId(result.child.id);
      setApiError("");
      return result.child;
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not create child profile.");
      return null;
    }
  }

  async function deleteChild(childId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/children?childId=${encodeURIComponent(childId)}`, { method: "DELETE" });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not delete child profile.");
      const remaining = children.filter((child) => child.id !== childId);
      setChildren(remaining);
      if (selectedChildId === childId) setSelectedChildId(remaining[0]?.id ?? "");
      setApiError("");
      return true;
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not delete child profile.");
      return false;
    }
  }

  if (authPending && !authCheckTimedOut) {
    return <div className="grid min-h-[100dvh] place-items-center text-sm font-semibold text-slate-500">Checking your session…</div>;
  }
  if (!authSession) {
    const startupError = authError
      ? "The account service is unavailable. Check the API deployment and server logs, then try again."
      : authCheckTimedOut
        ? "The account service did not respond. Check that the API server is running, then try again."
        : undefined;
    return <AuthScreen startupError={startupError} onRetry={() => { void retryAuth(); setAuthCheckTimedOut(false); }} />;
  }
  if (dataLoading) {
    return <div className="grid min-h-[100dvh] place-items-center text-sm font-semibold text-slate-500">Loading your ScreenDiet profile…</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-slate-100 sm:grid sm:place-items-center sm:p-8">
      <div className="relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[844px] sm:max-h-[calc(100dvh-4rem)] sm:max-w-[390px] sm:rounded-[2.75rem] sm:border-[7px] sm:border-slate-900">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {apiError && <p className="mx-4 mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{apiError}</p>}
          {screen === "dashboard" && (
            <Dashboard blockedCount={blockedKeywords.length} dailyLimit={dailyLimit} goTo={setScreen} profileName={profile.name} usedMinutes={usedMinutes} sessionsToday={sessionsToday} isSessionActive={Boolean(activeStartedAt)} onSessionToggle={toggleSession} />
          )}
          {screen === "profile" && (
            <ProfileScreen
              key={selectedChildId}
              goTo={setScreen}
              profile={profile}
              children={children}
              selectedChildId={selectedChildId}
              onSelectChild={setSelectedChildId}
              onAddChild={addChild}
              onDeleteChild={deleteChild}
              onSave={saveProfile}
              email={authSession.user.email}
              onSignOut={() => { void authClient.signOut(); }}
            />
          )}
          {(screen === "controls" || screen === "analytics" || screen === "settings") && (
            <MainSection
              active={screen}
              profileName={profile.name}
              blockedCount={blockedKeywords.length}
              dailyLimit={dailyLimit}
              goTo={setScreen}
              notificationsEnabled={notificationsEnabled}
              setNotificationsEnabled={setNotificationsEnabled}
              setWeeklyReportsEnabled={setWeeklyReportsEnabled}
              weeklyReportsEnabled={weeklyReportsEnabled}
              usedMinutes={usedMinutes}
              sessionsToday={sessionsToday}
            />
          )}
          {screen === "limit" && (
            <LimitScreen dailyLimit={dailyLimit} goTo={setScreen} onSave={saveLimit} />
          )}
          {screen === "filters" && (
            <FilterScreen
              blocked={blockedKeywords}
              goTo={setScreen}
              onSave={saveFilters}
              pendingLimit={pendingLimit}
            />
          )}
          {screen === "success" && <SuccessScreen goTo={setScreen} message={successMessage} />}
        </div>
        {(screen === "dashboard" || screen === "controls" || screen === "analytics" || screen === "settings") && (
          <BottomNav
            active={screen === "dashboard" ? "home" : screen}
            onSelect={(item) => setScreen(item === "home" ? "dashboard" : item)}
          />
        )}
      </div>
    </div>
  );
}
