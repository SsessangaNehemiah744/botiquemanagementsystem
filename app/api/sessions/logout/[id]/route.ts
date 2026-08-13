import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logAction } from "@/lib/logging";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { reason, notes, forcedBy } = body;
    const sessionId = params.id;

    // Get session
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (session) {
      // Update session
      await supabase.from("sessions").update({
        status: "force_logged_out",
        logout_time: new Date().toISOString(),
        forced_by: forcedBy,
        forced_reason: reason,
      }).eq("id", sessionId);

      // Add to blacklist
      await supabase.from("jwt_blacklist").insert({
        token_id: session.token_id,
        user_id: session.user_id,
        reason: "force_logout",
      });

      await logAction({
        user_id: forcedBy,
        action: "FORCE_LOGOUT",
        affected_type: "Session",
        affected_id: sessionId,
        affected_name: session.user_id,
        details: { reason, notes },
        status: "success",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to force logout" }, { status: 500 });
  }
}