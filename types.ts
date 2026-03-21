export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  PENDING = 'PENDING',
  CANCELED = 'CANCELED',
  MAINTENANCE = 'MAINTENANCE',
  BLOCKED = 'BLOCKED',
  CHECKED_IN = 'CHECKED_IN',
  NO_SHOW = 'NO_SHOW'
}

export interface Space {
  id: string;
  name: string;
  type: 'SAUNA' | 'MASSAGE' | 'POOL' | 'RELAX' | 'HAMMAM' | 'SPA' | string;
  capacity: number;
}

export interface Booking {
  id: string;
  spaceId: string;
  customerName: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm format
  durationMinutes: number;
  breakMinutes?: number; 
  pax: number; // Number of people
  status: BookingStatus;
  notes?: string;
  isPaid: boolean;
}

export interface TimeSlot {
  time: string; // HH:mm
  display: string;
}

export interface DailyStats {
  occupancyRate: number;
  totalBookings: number;
}

export interface Log {
  id: string;
  created_at: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: 'BOOKING' | 'SPACE';
  entity_id: string;
  details: string;
}