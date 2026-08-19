import { NextResponse } from "next/server";
import {
  SENTRAJET_SUPABASE_ANON_KEY,
  SENTRAJET_SUPABASE_URL,
} from "@/lib/supabaseConfig";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
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
    const responseBody = await upstream.text();
    return new NextResponse(
      responseBody || JSON.stringify({ error: "account_service_unavailable" }),
      {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("content-type") ?? "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (failure) {
    console.error("Account service request failed", failure);
    return errorResponse("account_service_unavailable", 503);
  }
}

export async function GET(request: Request) {
  return proxyToAccountFunction(request);
}

export async function POST(request: Request) {
  return proxyToAccountFunction(request);
}

export async function DELETE(request: Request) {
  return proxyToAccountFunction(request);
}
