/**
 * The shape of a free consultation, set once.
 *
 * Everything the booking page offers is computed from these and from each
 * host's weekly hours (consultation_hosts.weekly_hours). Change one here and
 * the next page load offers different times; nothing already booked moves.
 */

/** The office's clock. Hours are kept, and times are shown, in Pacific time. */
export const OFFICE_TIME_ZONE = 'America/Los_Angeles'

/** How long a consultation is. */
export const DURATION_MINUTES = 30

/** Offered start times fall on this grid within a host's hours. */
export const SLOT_STEP_MINUTES = 30

/**
 * Kept clear before and after anything on a host's calendar, so a consultation
 * never starts the minute a court call or another client ends.
 */
export const BUFFER_MINUTES = 15

/** Nothing sooner than this is offered, so the office sees a booking before it starts. */
export const MIN_NOTICE_HOURS = 12

/** How far ahead the booking page reaches. */
export const HORIZON_DAYS = 21

/** Upcoming bookings one email address or phone number may hold at once. */
export const MAX_UPCOMING_PER_PERSON = 2
