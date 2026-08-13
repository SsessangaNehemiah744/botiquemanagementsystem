import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("*, profiles(full_name, role)")
      .eq("status", "active")
      .order("last_activity", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();
    const enriched = (sessions || []).map((s: any) => {
      const lastActivity = new Date(s.last_activity);
      const diffMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / 60000);
      let liveStatus = "active";
      if (diffMinutes > 15) liveStatus = "inactive";
      else if (diffMinutes > 5) liveStatus = "idle";
      
      return { ...s, idleMinutes: diffMinutes, liveStatus };
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to get sessions" }, { status: 500 });
  }
}