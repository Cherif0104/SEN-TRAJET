import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  isAssignableRole,
  profileRoleFor,
  type AssignableRole,
} from "@/lib/accountRoles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  SENTRAJET_SUPABASE_ANON_KEY,
  SENTRAJET_SUPABASE_URL,
} from "@/lib/supabaseConfig";

export const dynamic = "force-dynamic";

type AuthorizedAdmin = {
  id: string;
  client: ReturnType<typeof getSupabaseAdmin>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function hasDirectAdminClient(): boolean {
  try {
    getSupabaseAdmin();
    return true;
  } catch {
    return false;
  }
}

async function proxyToAccountFunction(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text();
    const upstream = await fetch(
      `${SENTRAJET_SUPABASE_URL}/functions/v1/admin-users`,
      {
        method: request.method,
        headers: {
          Authorization: authorization,
          apikey: SENTRAJET_SUPABASE_ANON_KEY,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body,
        cache: "no-store",
      },
    );
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return errorResponse("account_management_not_configured", 503);
  }
}

async function authorize(request: Request): Promise<AuthorizedAdmin | NextResponse> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return errorResponse("authentication_required", 401);

  let client: ReturnType<typeof getSupabaseAdmin>;
  try {
    client = getSupabaseAdmin();
  } catch {
    return errorResponse("account_management_not_configured", 503);
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token);

  if (userError || !user) return errorResponse("invalid_session", 401);

  const { data: roles, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (
    roleError ||
    !roles?.some((entry) => (entry as { role: string }).role === "super_admin")
  ) {
    return errorResponse("super_admin_required", 403);
  }

  return { id: user.id, client };
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

export async function GET(request: Request) {
  if (!hasDirectAdminClient()) return proxyToAccountFunction(request);
  const authorization = await authorize(request);
  if (authorization instanceof NextResponse) return authorization;

  const { client } = authorization;
  const {
    data: { users },
    error: usersError,
  } = await client.auth.admin.listUsers({ page: 1, perPage: 200 });

  if (usersError) return errorResponse("users_load_failed", 500);

  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) {
    return NextResponse.json(
      { users: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const [{ data: profileRows }, { data: roleRows }] = await Promise.all([
    client.from("profiles").select("id, full_name, role").in("id", userIds),
    client.from("user_roles").select("user_id, role").in("user_id", userIds),
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
    const userId = String(row.user_id);
    roles.set(userId, [...(roles.get(userId) ?? []), String(row.role)]);
  }

  return NextResponse.json(
    { users: users.map((user) => publicUser(user, profiles, roles)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasDirectAdminClient()) return proxyToAccountFunction(request);
  const authorization = await authorize(request);
  if (authorization instanceof NextResponse) return authorization;

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
    role?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const role = body?.role;

  if (!email || !email.includes("@")) {
    return errorResponse("invalid_email", 400);
  }
  if (password.length < 12) {
    return errorResponse("password_too_short", 400);
  }
  if (!fullName) return errorResponse("full_name_required", 400);
  if (!isAssignableRole(role)) return errorResponse("invalid_role", 400);

  const { client } = authorization;
  let createdUserId: string | null = null;

  try {
    const { data, error: createError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { app_role: role },
    });

    if (createError || !data.user) {
      const duplicate = createError?.message.toLowerCase().includes("already");
      return errorResponse(
        duplicate ? "email_already_exists" : "user_creation_failed",
        duplicate ? 409 : 500,
      );
    }

    createdUserId = data.user.id;
    await assignRole(client, createdUserId, role, fullName);

    return NextResponse.json(
      {
        user: {
          id: data.user.id,
          email,
          fullName,
          roles: [role],
          profileRole: profileRoleFor(role),
          createdAt: data.user.created_at,
          lastSignInAt: null,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    if (createdUserId) await client.auth.admin.deleteUser(createdUserId);
    return errorResponse("user_configuration_failed", 500);
  }
}

async function assignRole(
  client: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  role: AssignableRole,
  fullName: string,
) {
  const { error: profileError } = await client
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: fullName,
        role: profileRoleFor(role),
      },
      { onConflict: "id" },
    );
  if (profileError) throw profileError;

  const { error: deleteRoleError } = await client
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (deleteRoleError) throw deleteRoleError;

  const { error: roleError } = await client
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (roleError) throw roleError;
}

export async function DELETE(request: Request) {
  if (!hasDirectAdminClient()) return proxyToAccountFunction(request);
  const authorization = await authorize(request);
  if (authorization instanceof NextResponse) return authorization;

  const body = (await request.json().catch(() => null)) as { userId?: unknown } | null;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!userId) return errorResponse("invalid_user", 400);
  if (userId === authorization.id) {
    return errorResponse("cannot_delete_self", 400);
  }

  const { client } = authorization;
  const { data: targetRoles } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (
    targetRoles?.some((entry) => (entry as { role: string }).role === "super_admin")
  ) {
    return errorResponse(
      "cannot_delete_super_admin",
      400,
    );
  }

  const { error } = await client.auth.admin.deleteUser(userId);
  if (error) return errorResponse("user_deletion_failed", 500);

  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
