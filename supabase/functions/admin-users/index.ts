import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Cache-Control": "no-store",
};

const assignableRoles = [
  "super_admin",
  "manager",
  "commercial",
  "ops",
  "finance",
  "rh",
  "fleet_manager",
  "driver",
  "partner",
  "provider",
  "client",
] as const;

type AssignableRole = (typeof assignableRoles)[number];

const resourceRole = {
  driver: { table: "drivers", role: "driver" },
  client: { table: "clients", role: "client" },
  partner: { table: "partner_organizations", role: "partner" },
} as const;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function profileRoleFor(role: AssignableRole): string {
  if (["manager", "ops", "finance", "rh", "fleet_manager"].includes(role)) {
    return "admin";
  }
  return role === "provider" ? "partner" : role;
}

async function authorize(request: Request, admin: SupabaseClient) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return { error: response({ error: "authentication_required" }, 401) };

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user) return { error: response({ error: "invalid_session" }, 401) };

  const { data: roles, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (
    roleError ||
    !roles?.some((entry) => String(entry.role) === "super_admin")
  ) {
    return { error: response({ error: "super_admin_required" }, 403) };
  }
  return { user };
}

function publicUser(
  user: User,
  profiles: Map<string, { full_name: string | null; role: string | null }>,
  roles: Map<string, string[]>,
) {
  const profile = profiles.get(user.id);
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? "",
    profileRole: profile?.role ?? null,
    roles: roles.get(user.id) ?? [],
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

async function listUsers(admin: SupabaseClient) {
  const {
    data: { users },
    error,
  } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return response({ error: "users_load_failed" }, 500);
  if (!users.length) return response({ users: [] });

  const ids = users.map((user) => user.id);
  const [{ data: profileRows }, { data: roleRows }] = await Promise.all([
    admin.from("profiles").select("id, full_name, role").in("id", ids),
    admin.from("user_roles").select("user_id, role").in("user_id", ids),
  ]);
  const profiles = new Map(
    (profileRows ?? []).map((row) => [
      String(row.id),
      {
        full_name: row.full_name as string | null,
        role: row.role as string | null,
      },
    ]),
  );
  const roles = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const id = String(row.user_id);
    roles.set(id, [...(roles.get(id) ?? []), String(row.role)]);
  }
  return response({
    users: users.map((user) => publicUser(user, profiles, roles)),
  });
}

async function assignRole(
  admin: SupabaseClient,
  userId: string,
  role: AssignableRole,
  fullName: string,
) {
  const { error: profileError } = await admin.from("profiles").upsert(
    { id: userId, full_name: fullName, role: profileRoleFor(role) },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const { error: deleteError } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error: roleError } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (roleError) throw roleError;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    return response({ error: "account_management_not_configured" }, 503);
  }
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authorization = await authorize(request, admin);
  if ("error" in authorization) return authorization.error;

  if (request.method === "GET") return listUsers(admin);

  if (request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const role = body.role;
    const resourceType =
      typeof body.resourceType === "string" && body.resourceType in resourceRole
        ? (body.resourceType as keyof typeof resourceRole)
        : null;
    const resourceId = typeof body.resourceId === "string" ? body.resourceId : null;
    if (!email || !email.includes("@")) return response({ error: "invalid_email" }, 400);
    if (password.length < 12) return response({ error: "password_too_short" }, 400);
    if (!fullName) return response({ error: "full_name_required" }, 400);
    if (
      typeof role !== "string" ||
      !assignableRoles.includes(role as AssignableRole)
    ) {
      return response({ error: "invalid_role" }, 400);
    }
    if (
      resourceType &&
      (!resourceId || resourceRole[resourceType].role !== role)
    ) {
      return response({ error: "invalid_resource_link" }, 400);
    }

    let createdId: string | null = null;
    try {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: { app_role: role },
      });
      if (error || !data.user) {
        const duplicate = error?.message.toLowerCase().includes("already");
        return response(
          { error: duplicate ? "email_already_exists" : "user_creation_failed" },
          duplicate ? 409 : 500,
        );
      }
      createdId = data.user.id;
      await assignRole(admin, createdId, role as AssignableRole, fullName);
      if (resourceType && resourceId) {
        const { error: linkError } = await admin
          .from(resourceRole[resourceType].table)
          .update({ user_id: createdId })
          .eq("id", resourceId);
        if (linkError) throw linkError;
      }
      return response(
        {
          user: {
            id: data.user.id,
            email,
            fullName,
            roles: [role],
            profileRole: profileRoleFor(role as AssignableRole),
            createdAt: data.user.created_at,
            lastSignInAt: null,
          },
        },
        201,
      );
    } catch {
      if (createdId) await admin.auth.admin.deleteUser(createdId);
      return response({ error: "user_configuration_failed" }, 500);
    }
  }

  if (request.method === "DELETE") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return response({ error: "invalid_user" }, 400);
    if (userId === authorization.user.id) {
      return response({ error: "cannot_delete_self" }, 400);
    }
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roles?.some((entry) => String(entry.role) === "super_admin")) {
      return response({ error: "cannot_delete_super_admin" }, 400);
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    return error
      ? response({ error: "user_deletion_failed" }, 500)
      : response({ success: true });
  }

  return response({ error: "method_not_allowed" }, 405);
});
