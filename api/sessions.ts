import { auth, pool } from "../auth.js";

export const fetch = async (request: Request) => {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });

    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });

      const action = new URL(request.url).searchParams.get("action");
      const childId = new URL(request.url).searchParams.get("childId");
      if (!childId) return Response.json({ error: "Select a child profile first." }, { status: 400 });
      const child = await pool.query(
        "SELECT 1 FROM screen_diet_children WHERE id = $1 AND parent_user_id = $2",
        [childId, session.user.id],
      );
      if (!child.rowCount) return Response.json({ error: "Child profile not found." }, { status: 404 });
      if (action === "start") {
        await pool.query(
          "INSERT INTO screen_diet_sessions (user_id, child_id) VALUES ($1, $2) ON CONFLICT (child_id) WHERE ended_at IS NULL DO NOTHING",
          [session.user.id, childId],
        );
      } else if (action === "stop") {
        await pool.query(
          "UPDATE screen_diet_sessions SET ended_at = now() WHERE user_id = $1 AND child_id = $2 AND ended_at IS NULL",
          [session.user.id, childId],
        );
      } else {
        return Response.json({ error: "Use action=start or action=stop." }, { status: 400 });
      }
      return Response.json({ ok: true });
    } catch (error) {
      console.error("ScreenDiet session API error:", error);
      return Response.json({ error: "Could not update the screen-time session." }, { status: 500 });
    }
};

export default { fetch };
