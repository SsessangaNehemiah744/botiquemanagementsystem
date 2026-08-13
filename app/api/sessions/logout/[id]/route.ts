import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { reason, notes, forcedBy } = body;
    
    // AWAIT the params
    const { id: sessionId } = await params;

    // Get session
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (session) {
      await supabase.from("sessions").update({
        status: "force_logged_out",
        logout_time: new Date().toISOString(),
        forced_by: forcedBy,
        forced_reason: reason,
      }).eq("id", sessionId);

      await supabase.from("jwt_blacklist").insert({
        token_id: session.token_id,
        user_id: session.user_id,
        reason: "force_logout",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to force logout" }, { status: 500 });
  }
}