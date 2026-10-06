import { PrismaClient } from "@prisma/client";
import { addDaysKey, shopDateTime, todayKey, weekdayOf } from "../src/lib/time";
import { newBookingCode } from "../src/lib/booking-code";

const db = new PrismaClient();

const services = [
  {
    slug: "signature-cut",
    name: "Signature Cut",
    description: "Consultation, precision scissor or clipper cut, wash and style.",
    durationMin: 45,
    priceCents: 4500,
  },
  {
    slug: "skin-fade",
    name: "Skin Fade",
    description: "Seamless fade down to the skin, sharp line-up and finish.",
    durationMin: 45,
    priceCents: 5000,
  },
  {
    slug: "beard-trim",
    name: "Beard Trim & Shape",
    description: "Sculpted beard, hot towel, razor-clean neckline and beard oil.",
    durationMin: 30,
    priceCents: 3000,
  },
  {
    slug: "hot-towel-shave",
    name: "Hot Towel Shave",
    description: "Traditional straight-razor shave with hot towels and balm.",
    durationMin: 45,
    priceCents: 4500,
  },
  {
    slug: "cut-and-beard",
    name: "Cut & Beard",
    description: "Our full service: signature cut plus beard trim and shape.",
    durationMin: 75,
    priceCents: 7000,
  },
];

type Hours = Record<number, [string, string] | null>;

const barbers: {
  slug: string;
  name: string;
  title: string;
  bio: string;
  hours: Hours;
}[] = [
  {
    slug: "marcus",
    name: "Marcus Reed",
    title: "Master Barber & Owner",
    bio: "Fifteen years behind the chair. Known for classic tapers and the best hot-towel shave in the borough.",
    hours: {
      0: null,
      1: null,
      2: ["10:00", "18:00"],
      3: ["10:00", "18:00"],
      4: ["12:00", "20:00"],
      5: ["12:00", "20:00"],
      6: ["09:00", "17:00"],
    },
  },
  {
    slug: "diego",
    name: "Diego Alvarez",
    title: "Senior Barber",
    bio: "Fade specialist with an eye for detail. If you want it crisp, Diego is your guy.",
    hours: {
      0: ["11:00", "16:00"],
      1: null,
      2: ["11:00", "19:00"],
      3: null,
      4: ["10:00", "18:00"],
      5: ["10:00", "20:00"],
      6: ["09:00", "18:00"],
    },
  },
  {
    slug: "ava",
    name: "Ava Chen",
    title: "Barber & Beard Specialist",
    bio: "Precision scissor work and beard sculpting. Calm chair, sharp results.",
    hours: {
      0: ["11:00", "16:00"],
      1: null,
      2: null,
      3: ["10:00", "19:00"],
      4: ["10:00", "20:00"],
      5: ["10:00", "18:00"],
      6: ["10:00", "18:00"],
    },
  },
];

const sampleCustomers = [
  { name: "James Carter", phone: "(917) 555-0123", email: "james.carter@example.com" },
  { name: "Andre Wallace", phone: "(646) 555-0188", email: null },
  { name: "Sam Patel", phone: "(347) 555-0110", email: "sam.p@example.com" },
  { name: "Leo Martins", phone: "(718) 555-0175", email: null },
  { name: "Noah Kim", phone: "(917) 555-0199", email: "noah.kim@example.com" },
];

async function main() {
  await db.booking.deleteMany();
  await db.workingHours.deleteMany();
  await db.barber.deleteMany();
  await db.service.deleteMany();

  const createdServices = await Promise.all(
    services.map((s, i) => db.service.create({ data: { ...s, sortOrder: i } })),
  );

  const createdBarbers = [];
  for (const [i, b] of barbers.entries()) {
    const barber = await db.barber.create({
      data: {
        slug: b.slug,
        name: b.name,
        title: b.title,
        bio: b.bio,
        sortOrder: i,
        workingHours: {
          create: Object.entries(b.hours)
            .filter(([, h]) => h !== null)
            .map(([weekday, h]) => ({
              weekday: Number(weekday),
              startTime: h![0],
              endTime: h![1],
            })),
        },
      },
    });
    createdBarbers.push({ ...barber, hours: b.hours });
  }

  // A handful of upcoming bookings so availability and the dashboard look lived-in.
  const plan: { dayOffset: number; barberIdx: number; serviceIdx: number; status: string }[] = [
    { dayOffset: 1, barberIdx: 0, serviceIdx: 0, status: "CONFIRMED" },
    { dayOffset: 1, barberIdx: 1, serviceIdx: 1, status: "PENDING" },
    { dayOffset: 2, barberIdx: 2, serviceIdx: 2, status: "PENDING" },
    { dayOffset: 2, barberIdx: 0, serviceIdx: 4, status: "CONFIRMED" },
    { dayOffset: 3, barberIdx: 1, serviceIdx: 3, status: "CONFIRMED" },
    { dayOffset: 4, barberIdx: 2, serviceIdx: 0, status: "PENDING" },
  ];

  let made = 0;
  const today = todayKey();
  for (const [i, p] of plan.entries()) {
    const barber = createdBarbers[p.barberIdx];
    const service = createdServices[p.serviceIdx];
    // Walk forward to the next day this barber works.
    let dateKey = addDaysKey(today, p.dayOffset);
    for (let guard = 0; guard < 7 && !barber.hours[weekdayOf(dateKey)]; guard++) {
      dateKey = addDaysKey(dateKey, 1);
    }
    const hours = barber.hours[weekdayOf(dateKey)];
    if (!hours) continue;
    const [startH] = hours[0].split(":").map(Number);
    const startHHMM = `${String(startH + 1 + (i % 3)).padStart(2, "0")}:00`;
    const startAt = shopDateTime(dateKey, startHHMM);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
    const customer = sampleCustomers[i % sampleCustomers.length];
    await db.booking.create({
      data: {
        code: newBookingCode(),
        barberId: barber.id,
        serviceId: service.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        startAt,
        endAt,
        status: p.status,
        decidedAt: p.status === "CONFIRMED" ? new Date() : null,
      },
    });
    made++;
  }

  console.log(
    `Seeded ${createdServices.length} services, ${createdBarbers.length} barbers, ${made} bookings.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
