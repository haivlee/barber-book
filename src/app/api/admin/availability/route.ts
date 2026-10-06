import { NextResponse, type NextRequest } from "next/server";
import { isBarber } from "@/lib/auth";
import { getSlotsForDay } from "@/lib/availability";
import { isValidDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isBarber())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const serviceId = params.get("serviceId");
  const barberId = params.get("barberId") || null;
  const date = params.get("date");
  if (!serviceId || !date || !isValidDateKey(date)) {
    return NextResponse.json({ error: "serviceId and date are required" }, { status: 400 });
  }

  const slots = await getSlotsForDay({ serviceId, barberId, dateKey: date, staff: true });
  if (slots === null) return NextResponse.json({ error: "Service not found" }, { status: 404 });
  return NextResponse.json({ date, slots });
}
