import { Space, Booking, BookingStatus } from './types';

export const OPENING_HOUR = 8; // 8h00
export const CLOSING_HOUR = 21; // 21h00 (Extended for flexibility)
export const PIXELS_PER_MINUTE = 2.5; // Controls width of calendar
export const SLOT_INTERVAL = 15; // Minutes

// Empty defaults, data will come from Supabase
export const MOCK_SPACES: Space[] = [];
export const MOCK_BOOKINGS: Booking[] = [];
