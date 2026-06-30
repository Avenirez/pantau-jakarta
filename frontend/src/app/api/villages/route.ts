import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("villages")
      .select("id, name, districts(name), budgets(id)")
      .order("name");

    if (error) {
      throw error;
    }

    const formatted = data
      .filter((v: any) => v.budgets && v.budgets.length > 0)
      .map((v: any) => ({
        id: v.id,
        name: v.name,
        districtName: v.districts?.name || "",
      }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Database error: ${error.message}` },
      { status: 500 }
    );
  }
}
