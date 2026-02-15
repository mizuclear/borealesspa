export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  PENDING = 'PENDING',
  CANCELED = 'CANCELED',
  MAINTENANCE = 'MAINTENANCE',
  BLOCKED = 'BLOCKED'
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
}

export interface TimeSlot {
  time: string; // HH:mm
  display: string;
}

export interface DailyStats {
  revenue: number;
  occupancyRate: number;
  totalBookings: number;
}
