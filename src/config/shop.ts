export const shop = {
  name: "Brass & Blade",
  tagline: "Barber Co.",
  description:
    "Classic cuts, hot-towel shaves and beard work in the heart of Brooklyn. See open times live and book your chair in under a minute.",
  timeZone: "America/New_York",
  address: {
    line1: "214 Grand Street",
    line2: "Brooklyn, NY 11211",
    mapsUrl: "https://maps.google.com/?q=214+Grand+Street+Brooklyn+NY",
  },
  phone: "(718) 555-0142",
  email: "hello@brassandblade.co",
  instagram: "https://instagram.com/brassandblade",
  // 0 = Sunday ... 6 = Saturday. Display only; bookable times come from each barber's hours.
  openingHours: [
    { day: 1, label: "Monday", open: null, close: null },
    { day: 2, label: "Tuesday", open: "10:00", close: "19:00" },
    { day: 3, label: "Wednesday", open: "10:00", close: "19:00" },
    { day: 4, label: "Thursday", open: "10:00", close: "20:00" },
    { day: 5, label: "Friday", open: "10:00", close: "20:00" },
    { day: 6, label: "Saturday", open: "09:00", close: "18:00" },
    { day: 0, label: "Sunday", open: "11:00", close: "16:00" },
  ],
  booking: {
    slotIntervalMin: 15,
    minLeadTimeMin: 30,
    maxDaysAhead: 30,
  },
} as const;

export type Shop = typeof shop;
