import { auth, pool } from "../auth.js";

type ChildInput = { name?: unknown; age?: unknown; childId?: unknown };

export const fetch = async (request: Request) => {
  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
    const parentId = session.user.id;

    if (request.method === "GET") {
      const result = await pool.query(
        "SELECT id, child_name AS name, child_age AS age FROM screen_diet_children WHERE parent_user_id = $1 ORDER BY created_at, id",
        [parentId],
      );
      return Response.json({ children: result.rows });
    }

    if (request.method === "POST") {
      const body = (await request.json()) as ChildInput;
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 30) : "";
      const age = Number(body.age);
      if (!name || !Number.isInteger(age) || age < 6 || age > 12) {
        return Response.json({ error: "Enter a name and an age from 6 to 12." }, { status: 400 });
      }
      const id = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO screen_diet_children (id, parent_user_id, child_name, child_age)
         VALUES ($1, $2, $3, $4)
         RETURNING id, child_name AS name, child_age AS age`,
        [id, parentId, name, age],
      );
      return Response.json({ child: result.rows[0] }, { status: 201 });
    }

    const body = (await request.json().catch(() => ({}))) as ChildInput;
    const childId = new URL(request.url).searchParams.get("childId") ?? body.childId;
    if (typeof childId !== "string" || !childId) {
      return Response.json({ error: "A child profile is required." }, { status: 400 });
    }
    const deleted = await pool.query(
      `DELETE FROM screen_diet_children
       WHERE id = $1 AND parent_user_id = $2
         AND (SELECT COUNT(*) FROM screen_diet_children WHERE parent_user_id = $2) > 1
       RETURNING id`,
      [childId, parentId],
    );
    if (!deleted.rowCount) {
      const owned = await pool.query(
        "SELECT 1 FROM screen_diet_children WHERE id = $1 AND parent_user_id = $2",
        [childId, parentId],
      );
      return owned.rowCount
        ? Response.json({ error: "Keep at least one child profile." }, { status: 409 })
        : Response.json({ error: "Child profile not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("ScreenDiet children API error:", error);
    return Response.json({ error: "Could not update child profiles." }, { status: 500 });
  }
};

export default { fetch };
