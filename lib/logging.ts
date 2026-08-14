import { createClient } from "@supabase/supabase-js";

interface LogEntry {
  user_id?: string;
  user_name?: string;
  user_role?: string;
  action: string;
  affected_type?: string;
  affected_id?: string;
  affected_name?: string;
  details?: Record<string, unknown>;
  status?: "success" | "failed";
  ip_address?: string;
  user_agent?: string;
}

export async function logAction(entry: LogEntry): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let fullName = entry.user_name;
    let userRole = entry.user_role;

    // If user_id provided but no name, fetch from profiles
    if (entry.user_id && !fullName) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", entry.user_id)
        .single();
      if (profile) {
        fullName = profile.full_name;
        userRole = profile.role;
      }
    }

    await supabase.from("system_logs").insert({
      user_id: entry.user_id || null,
      user_name: fullName || null,
      user_role: userRole || null,
      action: entry.action,
      affected_type: entry.affected_type || null,
      affected_id: entry.affected_id || null,
      affected_name: entry.affected_name || null,
      details: entry.details || null,
      status: entry.status || "success",
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
    });
  } catch (error) {
    console.error("Logging error:", error);
  }
}