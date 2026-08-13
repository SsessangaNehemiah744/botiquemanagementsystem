import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const status = url.searchParams.get("status");
    const userId = url.searchParams.get("userId");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const page = parseInt(url.searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("system_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) query = query.eq("action", action);
    if (status) query = query.eq("status", status);
    if (userId) query = query.eq("user_id", userId);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ logs: data || [], total: count || 0, page, limit });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 });
  }
}