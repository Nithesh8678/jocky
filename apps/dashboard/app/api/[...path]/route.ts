import { NextRequest, NextResponse } from "next/server";
const upstream = process.env.API_INTERNAL_URL || "http://127.0.0.1:58000";
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, context);
}
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, context);
}
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, context);
}
async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (
    path.some(
      (s) => s === ".." || s === "." || s.includes("/") || s.includes("\\"),
    )
  )
    return NextResponse.json({ detail: "Invalid path" }, { status: 400 });
  if (path[0] === "agent")
    return NextResponse.json(
      { detail: "Agents use the dedicated API listener" },
      { status: 404 },
    );
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    if (
      origin &&
      origin !== (process.env.JOCKY_PUBLIC_URL || "http://127.0.0.1:3100")
    )
      return NextResponse.json({ detail: "Invalid origin" }, { status: 403 });
    if (Number(req.headers.get("content-length") || 0) > 1048576)
      return NextResponse.json({ detail: "Body too large" }, { status: 413 });
  }
  const isLogin = path.join("/") === "auth/login",
    isLogout = path.join("/") === "auth/logout";
  let token = req.cookies.get("jocky_access")?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = "Bearer " + token;
  let body = req.method === "GET" ? undefined : await req.text();
  if (body && Buffer.byteLength(body) > 1048576)
    return NextResponse.json({ detail: "Body too large" }, { status: 413 });
  if (isLogout)
    body = JSON.stringify({
      refresh_token: req.cookies.get("jocky_refresh")?.value || "",
    });
  try {
    const url =
      upstream +
      (path[0] === "health"
        ? "/health"
        : "/api/" + path.map(encodeURIComponent).join("/")) +
      req.nextUrl.search;
    let r = await fetch(url, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });
    let refreshed: any = null;
    if (
      r.status === 401 &&
      !isLogin &&
      !isLogout &&
      req.cookies.get("jocky_refresh")?.value
    ) {
      const refresh = await fetch(upstream + "/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: req.cookies.get("jocky_refresh")?.value,
        }),
      });
      if (refresh.ok) {
        refreshed = await refresh.json();
        headers.Authorization = "Bearer " + refreshed.access_token;
        r = await fetch(url, {
          method: req.method,
          headers,
          body,
          cache: "no-store",
        });
      }
    }
    let out: NextResponse;
    if (isLogin && r.ok) {
      const data = await r.json();
      refreshed = data;
      out = NextResponse.json({ user: data.user });
    } else {
      out = new NextResponse(await r.arrayBuffer(), {
        status: r.status,
        headers: {
          "Content-Type": r.headers.get("content-type") || "application/json",
          "Cache-Control": "no-store",
          ...(r.headers.get("content-disposition")
            ? { "Content-Disposition": r.headers.get("content-disposition")! }
            : {}),
          ...(r.headers.get("content-security-policy")
            ? {
                "Content-Security-Policy": r.headers.get(
                  "content-security-policy",
                )!,
              }
            : {}),
        },
      });
    }
    const secure = req.nextUrl.protocol === "https:";
    if (refreshed) {
      out.cookies.set("jocky_access", refreshed.access_token, {
        httpOnly: true,
        secure,
        sameSite: "strict",
        path: "/",
        maxAge: 1800,
      });
      out.cookies.set("jocky_refresh", refreshed.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "strict",
        path: "/api",
        maxAge: 604800,
      });
    }
    if (isLogout) {
      out.cookies.set("jocky_access", "", { path: "/", maxAge: 0 });
      out.cookies.set("jocky_refresh", "", { path: "/api", maxAge: 0 });
    }
    return out;
  } catch {
    return NextResponse.json(
      {
        detail:
          "JOCKY API is unavailable. Check the local services and API log.",
      },
      { status: 503 },
    );
  }
}
