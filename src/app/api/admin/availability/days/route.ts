import { NextResponse, type NextRequest } from "next/server";
import { isBarber } from "@/lib/auth";
import { getOpenDays } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isBarber())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const serviceId = params.get("serviceId");
  const barberId = params.get("barberId") || null;
  if (!serviceId) return NextResponse.json({ error: "serviceId is required" }, { status: 400 });

  const days = await getOpenDays({ serviceId, barberId, staff: true });
  if (days === null) return NextResponse.json({ error: "Service not found" }, { status: 404 });
  return NextResponse.json({ days });
}
