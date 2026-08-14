import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { email, password } = await request.json();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Create session record
    const tokenId = crypto.randomUUID();
    const userAgent = request.headers.get("user-agent") || "unknown";
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    await supabase.from("sessions").insert({
      user_id: data.user.id,
      token_id: tokenId,
      login_time: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      status: "active",
      ip_address: ipAddress,
      user_agent: userAgent,
      device: userAgent.substring(0, 50),
    });

    // Log the login
    await supabase.from("system_logs").insert({
      user_id: data.user.id,
      user_name: data.user.email,
      action: "LOGIN_SUCCESS",
      affected_type: "User",
      affected_id: data.user.id,
      affected_name: data.user.email,
      status: "success",
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return NextResponse.json({ user: data.user, tokenId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}