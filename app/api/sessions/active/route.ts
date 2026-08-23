import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get active sessions WITHOUT join first
    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "active")
      .order("login_time", { ascending: false });

    if (error) {
      console.error("Sessions error:", error.message);
      return NextResponse.json([], { status: 200 });
    }

    console.log("Active sessions found:", sessions?.length || 0);

    // Get profiles separately for each user
    const enriched = await Promise.all(
      (sessions || []).map(async (session: any) => {
        let profile = { full_name: "Unknown", role: "unknown" };
        
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", session.user_id)
            .single();
          
          if (profileData) {
            profile = profileData;
          }
        } catch (profileError) {
          console.error("Profile fetch error:", profileError);
        }

        const now = new Date();
        const lastActivity = new Date(session.last_activity || session.login_time);
        const diffMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / 60000);
        let liveStatus = "active";
        if (diffMinutes > 15) liveStatus = "inactive";
        else if (diffMinutes > 5) liveStatus = "idle";

        return {
          id: session.id,
          user_id: session.user_id,
          login_time: session.login_time,
          last_activity: session.last_activity,
          idleMinutes: diffMinutes,
          liveStatus,
          profiles: profile,
        };
      })
    );

    console.log("Returning sessions:", enriched);
    return NextResponse.json(enriched);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json([], { status: 200 });
  }
}