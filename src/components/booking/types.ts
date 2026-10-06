export type ServiceOption = {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
};

export type BarberOption = {
  id: string;
  slug: string;
  name: string;
  title: string;
  weekdays: number[];
};

export type SlotOption = {
  time: string;
  startAt: string;
  barberIds: string[];
};

export const ANY_BARBER = "any";
