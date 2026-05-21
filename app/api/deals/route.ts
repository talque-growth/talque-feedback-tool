import { NextResponse } from "next/server";
import { fetchDeals } from "@/lib/hubspot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const deals = await fetchDeals();
    return NextResponse.json({ deals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/deals]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
