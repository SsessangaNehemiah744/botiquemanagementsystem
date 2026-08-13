import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logAction } from "@/lib/logging";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { email, password } = await request.json();

    // Check user status first
    const { data: userData } = await supabase
      .from("profiles")
      .select("status, role")
      .eq("email", email)
      .single();

    if (userData && userData.status === "INACTIVE") {
      await logAction({
        action: "LOGIN_FAILED",
        affected_type: "User",
        affected_name: email,
        details: { reason: "Account pending activation" },
        status: "failed",
      });
      return NextResponse.json(
        { error: "Your account is pending activation by a Manager." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      await logAction({
        action: "LOGIN_FAILED",
        affected_type: "User",
        affected_name: email,
        details: { reason: error.message },
        status: "failed",
      });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Create session record
    const tokenId = crypto.randomUUID();
    await supabase.from("sessions").insert({
      user_id: data.user.id,
      token_id: tokenId,
      status: "active",
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    await logAction({
      user_id: data.user.id,
      user_name: data.user.email,
      user_role: userData?.role || "unknown",
      action: "LOGIN_SUCCESS",
      affected_type: "User",
      affected_id: data.user.id,
      affected_name: data.user.email,
      status: "success",
    });

    return NextResponse.json({ user: data.user, tokenId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}