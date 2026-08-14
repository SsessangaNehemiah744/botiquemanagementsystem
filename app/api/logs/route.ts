import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: logs, error } = await supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Logs error:", error.message);
      return NextResponse.json({ logs: [], total: 0 }, { status: 200 });
    }

    return NextResponse.json({ logs: logs || [], total: (logs || []).length });
  } catch (error) {
    return NextResponse.json({ logs: [], total: 0 }, { status: 200 });
  }
}