import { useEffect, useState, type ReactNode } from "react";

type Screen = "dashboard" | "controls" | "analytics" | "settings" | "limit" | "filters" | "success";
type NavItem = "home" | "controls" | "analytics" | "settings";

const STORAGE_KEYS = {
  keywords: "screenDiet.v2.blockedKeywords",
  limit: "screenDiet.v2.dailyLimitMinutes",
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

function StatusBar() {
  return (
    <div className="flex h-11 items-center justify-between px-6 text-xs font-bold text-slate-900">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg aria-hidden="true" className="h-3 w-4" fill="currentColor" viewBox="0 0 18 12">
          <rect height="4" rx="1" width="3" y="8" />
          <rect height="7" rx="1" width="3" x="5" y="5" />
          <rect height="10" rx="1" width="3" x="10" y="2" />
          <rect height="12" rx="1" width="3" x="15" />
        </svg>
        <svg
          aria-hidden="true"
          className="h-3 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 20 14"
        >
          <path d="M2 5.5a11 11 0 0 1 16 0M5 9a7 7 0 0 1 10 0M9 12.5a1.5 1.5 0 0 1 2 0" />
        </svg>
        <span className="flex h-3.5 w-6 items-center rounded border border-slate-900/70 p-0.5 after:h-full after:w-4 after:rounded-sm after:bg-slate-900" />
      </div>
    </div>
  );
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="relative flex h-16 items-center border-b border-slate-100 bg-white px-5">
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
    <nav className="absolute inset-x-0 bottom-0 border-t border-slate-100 bg-white/95 px-4 pb-6 pt-2 backdrop-blur-xl">
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
}: {
  blockedCount: number;
  dailyLimit: number;
  goTo: (screen: Screen) => void;
}) {
  const usedMinutes = 68;
  const exceeded = usedMinutes > dailyLimit;
  const limitReached = usedMinutes >= dailyLimit;
  const difference = Math.abs(dailyLimit - usedMinutes);
  const usageRatio = usedMinutes / dailyLimit;
  const progressWidth =
    usageRatio <= 0.25 ? "w-1/4" : usageRatio <= 0.5 ? "w-1/2" : usageRatio <= 0.75 ? "w-3/4" : "w-full";

  function selectNav(item: NavItem) {
    goTo(item === "home" ? "dashboard" : item);
  }

  return (
    <div className="screen-enter min-h-full bg-slate-50">
      <div className="bg-white">
        <StatusBar />
        <header className="flex items-center gap-3 px-5 pb-5 pt-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            {icons.shield}
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-950">ScreenDiet</p>
            <p className="text-xs font-semibold text-slate-400">Alex&apos;s Profile</p>
          </div>
          <span className="ml-auto grid size-10 place-items-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">
            A
          </span>
        </header>
      </div>

      <main className="px-5 pb-28 pt-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Parent dashboard</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Good afternoon</h1>
          <p className="mt-1 text-sm text-slate-500">Here&apos;s Alex&apos;s day at a glance.</p>
        </div>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                {icons.clock}
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Daily Usage</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-400">Today, across all devices</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">{Math.min(100, Math.round(usageRatio * 100))}%</span>
          </div>
          <p className="mt-6 text-3xl font-extrabold tracking-tight text-slate-950">
            1h 08m{" "}
            <span className="text-sm font-bold text-slate-400">of {formatDuration(dailyLimit)}</span>
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${progressWidth} ${
                limitReached ? "bg-red-500" : "bg-emerald-500"
              }`}
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
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Today&apos;s overview</h2>
            <span className="text-xs font-semibold text-slate-400">Updated now</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
                {icons.chart}
              </span>
              <p className="mt-4 text-2xl font-extrabold text-slate-950">6</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Screen sessions</p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">Across 3 devices</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                {icons.filter}
              </span>
              <p className="mt-4 text-2xl font-extrabold text-slate-950">{blockedCount}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Active filters</p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">Protection is on</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-blue-600 shadow-sm">
              {icons.shield}
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-blue-950">Alex is protected</h2>
              <p className="mt-1 text-xs leading-5 text-blue-700">
                Screen time and content rules are active on all connected devices.
              </p>
            </div>
          </div>
        </section>
      </main>
      <BottomNav active="home" onSelect={selectNav} />
    </div>
  );
}

function MainSection({
  active,
  blockedCount,
  dailyLimit,
  goTo,
  notificationsEnabled,
  setNotificationsEnabled,
  setWeeklyReportsEnabled,
  weeklyReportsEnabled,
}: {
  active: "controls" | "analytics" | "settings";
  blockedCount: number;
  dailyLimit: number;
  goTo: (screen: Screen) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  setWeeklyReportsEnabled: (enabled: boolean) => void;
  weeklyReportsEnabled: boolean;
}) {
  function selectNav(item: NavItem) {
    goTo(item === "home" ? "dashboard" : item);
  }

  const pageDetails = {
    controls: {
      eyebrow: "Alex’s profile",
      title: "Controls",
      description: "Manage screen time and content protection in one place.",
    },
    analytics: {
      eyebrow: "Last 7 days",
      title: "Analytics",
      description: "See how Alex’s screen habits change throughout the week.",
    },
    settings: {
      eyebrow: "ScreenDiet",
      title: "Settings",
      description: "Choose which updates and reports you want to receive.",
    },
  }[active];

  return (
    <div className="screen-enter min-h-full bg-slate-50">
      <div className="bg-white">
        <StatusBar />
        <header className="px-5 pb-5 pt-2">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{pageDetails.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{pageDetails.title}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">{pageDetails.description}</p>
        </header>
      </div>

      <main className="px-5 pb-28 pt-6">
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
              <p className="text-sm font-semibold text-slate-400">Weekly screen time</p>
              <p className="mt-2 text-3xl font-extrabold">7h 42m</p>
              <span className="mt-3 inline-flex rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-extrabold text-emerald-300">
                12% less than last week
              </span>
            </section>
            <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex h-44 items-end justify-between gap-3">
                {[
                  ["M", "h-20"],
                  ["T", "h-28"],
                  ["W", "h-16"],
                  ["T", "h-36"],
                  ["F", "h-24"],
                  ["S", "h-32"],
                  ["S", "h-14"],
                ].map(([day, height], index) => (
                  <div className="flex flex-1 flex-col items-center gap-2" key={`${day}-${index}`}>
                    <span className={`w-full rounded-full ${index === 3 ? "bg-blue-600" : "bg-blue-100"} ${height}`} />
                    <span className="text-[10px] font-bold text-slate-400">{day}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-extrabold text-blue-900">Healthiest day: Sunday</p>
              <p className="mt-1 text-xs leading-5 text-blue-700">Only 38 minutes of screen time were used.</p>
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
                <p className="mt-1 text-xs leading-5 text-slate-500">Alert when Alex is close to the daily limit.</p>
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
      <BottomNav active={active} onSelect={selectNav} />
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
  onSave: (hours: number, minutes: number) => void;
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
      <StatusBar />
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
  onSave: (keywords: string[], added: string[], removed: string[]) => void;
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

  function saveChanges() {
    const added = draftBlocked.filter((item) => !initialBlocked.includes(item));
    const removed = initialBlocked.filter((item) => !draftBlocked.includes(item));
    onSave(draftBlocked, added, removed);
  }

  return (
    <div className="screen-enter flex min-h-full flex-col bg-slate-50">
      <StatusBar />
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
    <div className="screen-enter relative min-h-full overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="select-none blur-sm">
        <StatusBar />
        <div className="bg-white px-5 py-5">
          <div className="h-7 w-48 rounded-lg bg-slate-200" />
        </div>
        <div className="p-5">
          <div className="h-48 rounded-3xl bg-slate-900" />
          <div className="mt-4 h-44 rounded-3xl bg-white shadow-sm" />
          <div className="mt-4 h-44 rounded-3xl bg-white shadow-sm" />
        </div>
      </div>
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
      <div className="absolute inset-0 grid place-items-center p-6">
        <section
          aria-labelledby="success-title"
          aria-modal="true"
          className="modal-enter w-full rounded-3xl bg-white p-7 text-center shadow-2xl"
          role="dialog"
        >
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <span className="grid size-14 place-items-center rounded-full bg-emerald-100">{icons.check}</span>
          </div>
          <h1
            className="mt-6 text-2xl font-extrabold leading-tight tracking-tight text-slate-950"
            id="success-title"
          >
            Changes Saved Successfully!
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
          <button
            className="mt-7 w-full rounded-2xl bg-blue-600 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-200 transition active:scale-[.98]"
            onClick={() => goTo("dashboard")}
          >
            Back to Dashboard
          </button>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [dailyLimit, setDailyLimit] = useState(() => readStoredValue(STORAGE_KEYS.limit, 90));
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>(() =>
    readStoredValue(STORAGE_KEYS.keywords, ["brainrot", "gambling"]),
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    readStoredValue(STORAGE_KEYS.notifications, true),
  );
  const [weeklyReportsEnabled, setWeeklyReportsEnabled] = useState(() =>
    readStoredValue(STORAGE_KEYS.weeklyReports, true),
  );
  const [pendingLimit, setPendingLimit] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("Your settings are up to date.");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.keywords, JSON.stringify(blockedKeywords));
    } catch {
      // The prototype still works when browser storage is unavailable.
    }
  }, [blockedKeywords]);

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

  function saveLimit(hours: number, minutes: number) {
    const totalMinutes = hours * 60 + minutes;
    setDailyLimit(totalMinutes);
    setPendingLimit(totalMinutes);
    try {
      localStorage.setItem(STORAGE_KEYS.limit, JSON.stringify(totalMinutes));
    } catch {
      // The in-memory value remains available for this session.
    }
    setScreen("filters");
  }

  function saveFilters(keywords: string[], added: string[], removed: string[]) {
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

    try {
      localStorage.setItem(STORAGE_KEYS.keywords, JSON.stringify(keywords));
    } catch {
      // The in-memory list remains available for this session.
    }
    setSuccessMessage(updates.join(" "));
    setPendingLimit(null);
    setScreen("success");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 sm:grid sm:place-items-center sm:p-8">
      <div className="relative min-h-screen w-full overflow-hidden bg-white shadow-2xl sm:h-[844px] sm:min-h-0 sm:max-h-[calc(100vh-4rem)] sm:max-w-[390px] sm:rounded-[2.75rem] sm:border-[7px] sm:border-slate-900">
        <div className="h-full overflow-y-auto overscroll-contain">
          {screen === "dashboard" && (
            <Dashboard blockedCount={blockedKeywords.length} dailyLimit={dailyLimit} goTo={setScreen} />
          )}
          {(screen === "controls" || screen === "analytics" || screen === "settings") && (
            <MainSection
              active={screen}
              blockedCount={blockedKeywords.length}
              dailyLimit={dailyLimit}
              goTo={setScreen}
              notificationsEnabled={notificationsEnabled}
              setNotificationsEnabled={setNotificationsEnabled}
              setWeeklyReportsEnabled={setWeeklyReportsEnabled}
              weeklyReportsEnabled={weeklyReportsEnabled}
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
      </div>
    </div>
  );
}
