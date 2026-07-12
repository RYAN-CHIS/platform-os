import { brandDb } from "@/lib/brand-db-adapter";
import { NextResponse } from "next/server";

export async function GET() {
  const settings = await brandDb.siteSetting.findMany();
  return NextResponse.json(settings);
}
