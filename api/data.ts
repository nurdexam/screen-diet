import { auth, pool } from "../auth.js";

type UserData = {
  childId?: unknown;
  profile?: { name?: unknown; age?: unknown };
  dailyLimit?: unknown;
  blockedKeywords?: unknown;
};

async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export const fetch = async (request: Request) => {
    if (request.method !== "GET" && request.method !== "PUT") {
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    }

    try {
      const user = await requireUser(request);
      if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
      const childIdFromUrl = new URL(request.url).searchParams.get("childId");
      const childIdFromBody = request.method === "PUT" ? (await request.clone().json().catch(() => ({})) as UserData).childId : null;
      const requestedChildId = typeof childIdFromBody === "string" ? childIdFromBody : childIdFromUrl;
      let children = await pool.query(
        "SELECT id, child_name AS name, child_age AS age FROM screen_diet_children WHERE parent_user_id = $1 ORDER BY created_at, id",
        [user.id],
      );
      if (!children.rowCount) {
        const legacy = await pool.query(
          "SELECT child_name AS name, child_age AS age FROM screen_diet_data WHERE user_id = $1",
          [user.id],
        );
        const child = legacy.rows[0] ?? { name: "Alex", age: 10 };
        await pool.query(
          `INSERT INTO screen_diet_children (id, parent_user_id, child_name, child_age)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [`legacy_${user.id}`, user.id, child.name, child.age],
        );
        children = await pool.query(
          "SELECT id, child_name AS name, child_age AS age FROM screen_diet_children WHERE parent_user_id = $1 ORDER BY created_at, id",
          [user.id],
        );
      }
      if (requestedChildId && !children.rows.some((child) => child.id === requestedChildId)) {
        return Response.json({ error: "Child profile not found." }, { status: 404 });
      }
      const selectedChild = children.rows.find((child) => child.id === requestedChildId) ?? children.rows[0];
      if (!selectedChild) return Response.json({ error: "No child profile is available." }, { status: 409 });
      const requestedZone = new URL(request.url).searchParams.get("timezone") ?? "UTC";
      let timezone = "UTC";
      try {
        timezone = new Intl.DateTimeFormat("en", { timeZone: requestedZone }).resolvedOptions().timeZone;
      } catch {
        return Response.json({ error: "Timezone is invalid." }, { status: 400 });
      }

      if (request.method === "PUT") {
        const body = (await request.json()) as UserData;
        const profileName = typeof body.profile?.name === "string" ? body.profile.name.trim() : null;
        const profileAge = Number(body.profile?.age);
        const dailyLimit = Number(body.dailyLimit);
        const keywords = Array.isArray(body.blockedKeywords)
          ? body.blockedKeywords
              .filter((item): item is string => typeof item === "string")
              .map((item) => item.trim().toLowerCase().slice(0, 50))
              .filter(Boolean)
              .slice(0, 100)
          : null;

        if (body.profile && (!profileName || !Number.isInteger(profileAge) || profileAge < 6 || profileAge > 12)) {
          return Response.json({ error: "Profile name or age is invalid." }, { status: 400 });
        }
        if (body.dailyLimit !== undefined && (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 1440)) {
          return Response.json({ error: "Daily limit must be between 1 and 1440 minutes." }, { status: 400 });
        }
        if (body.blockedKeywords !== undefined && !keywords) {
          return Response.json({ error: "Blocked keywords must be a list." }, { status: 400 });
        }

        await pool.query(
          `UPDATE screen_diet_children SET
             child_name = COALESCE($3, child_name),
             child_age = COALESCE($4, child_age),
             daily_limit_minutes = COALESCE($5, daily_limit_minutes),
             blocked_keywords = COALESCE($6::jsonb, blocked_keywords),
             updated_at = now()
           WHERE parent_user_id = $1 AND id = $2`,
          [user.id, selectedChild.id, profileName, body.profile ? profileAge : null, body.dailyLimit !== undefined ? dailyLimit : null, keywords ? JSON.stringify(keywords) : null],
        );
      }

      const result = await pool.query(
        `SELECT d.child_name, d.child_age, d.daily_limit_minutes, d.blocked_keywords,
          COALESCE(s.minutes_today, 0)::int AS used_minutes,
          COALESCE(s.sessions_today, 0)::int AS sessions_today,
          s.active_started_at
         FROM (SELECT $1::text AS child_id) u
         LEFT JOIN screen_diet_children d ON d.id = u.child_id AND d.parent_user_id = $2
         LEFT JOIN LATERAL (
           SELECT FLOOR(COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(COALESCE(s.ended_at, now()), b.end_at) - GREATEST(s.started_at, b.start_at))) / 60), 0)) AS minutes_today,
             COUNT(*)::int AS sessions_today,
             MAX(s.started_at) FILTER (WHERE s.ended_at IS NULL) AS active_started_at
           FROM screen_diet_sessions s
           CROSS JOIN LATERAL (
             SELECT (date_trunc('day', now() AT TIME ZONE $3) AT TIME ZONE $3) AS start_at,
               ((date_trunc('day', now() AT TIME ZONE $3) + interval '1 day') AT TIME ZONE $3) AS end_at
           ) b
           WHERE s.child_id = u.child_id AND s.started_at < b.end_at
             AND COALESCE(s.ended_at, now()) > b.start_at
         ) s ON true`,
        [selectedChild.id, user.id, timezone],
      );
      const row = result.rows[0];
      return Response.json({
        profile: { name: row.child_name ?? "Alex", age: row.child_age ?? 10 },
        selectedChildId: selectedChild.id,
        children: children.rows,
        dailyLimit: row.daily_limit_minutes ?? 90,
        blockedKeywords: row.blocked_keywords ?? ["gambling"],
        usedMinutes: row.used_minutes ?? 0,
        sessionsToday: row.sessions_today ?? 0,
        activeStartedAt: row.active_started_at ?? null,
      });
    } catch (error) {
      console.error("ScreenDiet data API error:", error);
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
      if (code === "42P01" || code === "42703") {
        return Response.json(
          { error: "The profile tables are missing or outdated in the database used by this deployment." },
          { status: 503 },
        );
      }
      if (code.startsWith("08") || code === "28P01" || code === "3D000") {
        return Response.json(
          { error: "The profile database connection failed. Check DATABASE_URL in the active deployment." },
          { status: 503 },
        );
      }
      return Response.json({ error: "Could not load or save your ScreenDiet data." }, { status: 500 });
    }
};

export default { fetch };
