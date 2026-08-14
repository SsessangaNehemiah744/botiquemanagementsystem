import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get pending users count
    const { data: pendingUsers } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("status", "INACTIVE");

    // Get recent sales
    const { data: recentSales } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    // Get recent system logs
    const { data: recentLogs } = await supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    // Get active sessions
    const { data: activeSessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "active");

    // Get all customers
    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // Get all products
    const { data: products } = await supabase
      .from("product_variants")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    return NextResponse.json({
      pendingUsers: pendingUsers || [],
      recentSales: recentSales || [],
      recentLogs: recentLogs || [],
      activeSessions: activeSessions || [],
      customers: customers || [],
      products: products || [],
      profiles: profiles || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}