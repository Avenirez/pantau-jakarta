import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Query parameter 'name' is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim().toUpperCase();

    // Query Supabase for the village name
    const { data, error } = await supabase
      .from("villages")
      .select("id, name")
      .eq("name", cleanName)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: `Kelurahan '${name}' tidak ditemukan di database` },
        { status: 404 }
      );
    }

    return NextResponse.json({ id: data.id, name: data.name });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Database error: ${error.message}` },
      { status: 500 }
    );
  }
}
