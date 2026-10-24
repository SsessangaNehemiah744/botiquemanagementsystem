import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: customers, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(customers || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await request.json();
    const { full_name, phone, email, address } = body;

    if (typeof full_name !== "string" || !full_name.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    const normalizedName = full_name.trim().replace(/\s+/g, " ").toLowerCase();
    const normalizedPhone = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    const { data: existingCustomers, error: lookupError } = await supabase
      .from("customers")
      .select("full_name, phone, email");

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    const customerExists = (existingCustomers || []).some((existingCustomer) => {
      const existingName = String(existingCustomer.full_name || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
      const existingPhone = String(existingCustomer.phone || "").replace(/\D/g, "");
      const existingEmail = String(existingCustomer.email || "").trim().toLowerCase();

      return (
        existingName === normalizedName ||
        (!!normalizedPhone && existingPhone === normalizedPhone) ||
        (!!normalizedEmail && existingEmail === normalizedEmail)
      );
    });

    if (customerExists) {
      return NextResponse.json(
        { error: "The customer already exists in list" },
        { status: 409 }
      );
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({ full_name: full_name.trim(), phone: phone || null, email: email || null, address: address || null })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await request.json();
    const { id, full_name, phone, email, address } = body;

    const { data: customer, error } = await supabase
      .from("customers")
      .update({ full_name, phone: phone || null, email: email || null, address: address || null })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(customer);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}