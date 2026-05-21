import { NextResponse, type NextRequest } from "next/server";
import {
  buildHubSpotPayload,
  fetchDealDetails,
  updateDealProperties,
} from "@/lib/hubspot";
import type { FeedbackFormData } from "@/lib/properties";

export const dynamic = "force-dynamic";

type Ctx = { params: { dealId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const details = await fetchDealDetails(params.dealId);
    return NextResponse.json({ deal: details });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[/api/deals/${params.dealId}] GET`, message);
    const status = message.includes("404") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const body = (await req.json()) as { formData: FeedbackFormData };
    if (!body?.formData) {
      return NextResponse.json({ error: "formData fehlt im Body" }, { status: 400 });
    }
    const properties = buildHubSpotPayload(body.formData);
    const result = await updateDealProperties(params.dealId, properties);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[/api/deals/${params.dealId}] PATCH`, message);
    const status =
      message.includes("401")
        ? 401
        : message.includes("404")
          ? 404
          : message.includes("400")
            ? 400
            : message.includes("429")
              ? 429
              : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
