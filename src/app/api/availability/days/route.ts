import { NextResponse, type NextRequest } from "next/server";
import { getOpenDays } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const serviceId = params.get("serviceId");
  const barberId = params.get("barberId") || null;

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
  }

  const days = await getOpenDays({ serviceId, barberId });
  if (days === null) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({ days });
}
