import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // Get user profile for full name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user_id)
      .single();

    console.log("Logging out user:", profile?.full_name || user_id);

    // Update active sessions to ended
    const { error: sessionError } = await supabase
      .from("sessions")
      .update({
        status: "ended",
        logout_time: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .eq("status", "active");

    if (sessionError) {
      console.error("Session update error:", sessionError.message);
    }

    // Log the logout
    const { error: logError } = await supabase
      .from("system_logs")
      .insert({
        user_id: user_id,
        user_name: profile?.full_name || "Unknown",
        user_role: profile?.role || "unknown",
        action: "LOGOUT",
        affected_type: "Session",
        affected_id: user_id,
        affected_name: profile?.full_name || "Unknown",
        status: "success",
      });

    if (logError) {
      console.error("Log insert error:", logError.message);
    } else {
      console.log("Logout recorded successfully for:", profile?.full_name);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Logout API error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}