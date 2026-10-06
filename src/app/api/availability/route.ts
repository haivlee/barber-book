import { NextResponse, type NextRequest } from "next/server";
import { getSlotsForDay } from "@/lib/availability";
import { isValidDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const serviceId = params.get("serviceId");
  const barberId = params.get("barberId") || null;
  const date = params.get("date");

  if (!serviceId || !date || !isValidDateKey(date)) {
    return NextResponse.json(
      { error: "serviceId and date (yyyy-MM-dd) are required" },
      { status: 400 },
    );
  }

  const slots = await getSlotsForDay({ serviceId, barberId, dateKey: date });
  if (slots === null) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({ date, slots });
}
