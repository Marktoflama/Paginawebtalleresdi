/**
 * Booking rules. These constants are what you edit.
 *
 * The database enforces the same values from `private.booking_rules`
 * (seeded in supabase/migrations/20261007000002_rules.sql). If you change a
 * value here, change it there too: `tests/integration/booking.test.ts`
 * fails when the two drift apart. Hours and slot length are also pinned by
 * CHECK constraints in migration 0004 (08:00–18:00 starts, 1 h slots).
 */
export const BOOKING_RULES = {
  /** IANA time zone of the workshop. Slots are stored as wall-clock times in this zone. */
  timezone: "Europe/Madrid",
  /** Only addresses of this exact domain may sign up and book. */
  allowedDomain: "esdi.edu.es",
  /** ISO weekdays that have slots (1 = Monday … 7 = Sunday). */
  weekdays: [1, 2, 3, 4, 5] as readonly number[],
  /** First slot starts at this hour. */
  firstSlotHour: 8,
  /** Last slot ends at this hour. */
  lastSlotEndHour: 19,
  /** Length of a slot in minutes. */
  slotMinutes: 60,
  /** Maximum confirmed bookings per student per day. */
  maxPerDay: 1,
  /** Maximum confirmed bookings per student per ISO week (Monday to Sunday). */
  maxPerWeek: 2,
  /** A slot can be booked up to this many weeks ahead (today + weeksAhead × 7 days). */
  weeksAhead: 4,
} as const;

export type BookingRules = typeof BOOKING_RULES;
