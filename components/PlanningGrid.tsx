import React, { useRef } from 'react';
import { Space, Booking, BookingStatus } from '../types';
import { OPENING_HOUR, CLOSING_HOUR, PIXELS_PER_MINUTE } from '../constants';
import { Plus, Users } from 'lucide-react';

interface PlanningGridProps {
  spaces: Space[];
  bookings: Booking[];
  onSlotClick: (spaceId: string, time: string) => void;
  onBookingClick: (booking: Booking) => void;
}

const timeToMinutes = (time: string): number => {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const PlanningGrid: React.FC<PlanningGridProps> = ({ spaces, bookings, onSlotClick, onBookingClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalMinutes = (CLOSING_HOUR - OPENING_HOUR) * 60;
  const gridWidth = totalMinutes * PIXELS_PER_MINUTE;

  const timeMarkers = [];
  for (let h = OPENING_HOUR; h <= CLOSING_HOUR; h++) {
    timeMarkers.push(h);
  }

  const handleGridClick = (e: React.MouseEvent, spaceId: string) => {
    if ((e.target as HTMLElement).closest('.booking-block')) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    
    const rawMins = clickX / PIXELS_PER_MINUTE;
    const snappedMins = Math.round(rawMins / 15) * 15;
    const actualMins = (OPENING_HOUR * 60) + snappedMins;
    
    onSlotClick(spaceId, minutesToTime(actualMins));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="w-40 md:w-56 flex-shrink-0 p-4 font-semibold text-slate-700 flex items-center border-r border-slate-200 text-sm md:text-base bg-slate-50">
          Espaces
        </div>
        <div className="flex-1 overflow-hidden relative" ref={scrollRef}>
            <div style={{ width: `${gridWidth}px` }} className="h-12 relative flex items-center">
                {timeMarkers.map(hour => (
                    <div 
                        key={hour} 
                        className="absolute text-xs text-slate-400 font-medium transform -translate-x-1/2 flex flex-col items-center"
                        style={{ left: `${(hour - OPENING_HOUR) * 60 * PIXELS_PER_MINUTE}px` }}
                    >
                        <span>{hour}h</span>
                        <div className="h-1.5 w-px bg-slate-300 mt-1"></div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Grid Body */}
      <div className="flex-1 overflow-y-auto overflow-x-auto hide-scrollbar relative">
        <div className="min-w-max">
            {spaces.map(space => {
                const spaceBookings = bookings.filter(b => b.spaceId === space.id);
                
                return (
                <div key={space.id} className="flex border-b border-slate-100 group hover:bg-slate-50 transition-colors min-h-[5rem]">
                    <div className="w-40 md:w-56 flex-shrink-0 p-3 border-r border-slate-200 bg-white sticky left-0 z-20 flex flex-col justify-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-start">
                             <span className="font-semibold text-slate-700 text-sm truncate">{space.name}</span>
                             <div className="flex items-center text-slate-400 text-xs gap-1 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                <Users size={10} /> {space.capacity}
                             </div>
                        </div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">{space.type}</span>
                    </div>
                    
                    <div 
                        className="relative h-20 border-r border-slate-100 bg-[linear-gradient(90deg,transparent_29px,#f1f5f9_30px)] bg-[length:75px_100%]"
                        style={{ width: `${gridWidth}px` }}
                        onClick={(e) => handleGridClick(e, space.id)}
                    >
                        {/* Hour Vertical Lines */}
                        {timeMarkers.map(hour => (
                            <div 
                                key={`line-${hour}`} 
                                className="absolute top-0 bottom-0 border-l border-slate-100 border-dashed pointer-events-none"
                                style={{ left: `${(hour - OPENING_HOUR) * 60 * PIXELS_PER_MINUTE}px` }}
                            />
                        ))}

                        {/* Bookings */}
                        {spaceBookings.map((booking, index) => {
                             // Naive stacking logic
                             const myStart = timeToMinutes(booking.startTime);
                             
                             // Visual Calculations
                             const startMins = myStart - (OPENING_HOUR * 60);
                             const width = booking.durationMinutes * PIXELS_PER_MINUTE;
                             const breakWidth = (booking.breakMinutes || 0) * PIXELS_PER_MINUTE;
                             const left = startMins * PIXELS_PER_MINUTE;

                             let bgClass = "bg-teal-100 border-teal-300 text-teal-800 shadow-sm";
                             if (booking.status === BookingStatus.MAINTENANCE) bgClass = "bg-red-100 border-red-300 text-red-800";
                             if (booking.status === BookingStatus.PENDING) bgClass = "bg-amber-100 border-amber-300 text-amber-800";
                             if (booking.status === BookingStatus.BLOCKED) bgClass = "bg-slate-200 border-slate-400 text-slate-800";

                             const laneIndex = index % Math.max(1, space.capacity);
                             const heightPercent = space.capacity > 1 ? Math.max(30, 90 / space.capacity) : 80;
                             const topPercent = space.capacity > 1 ? (laneIndex * (95 / space.capacity)) : 10;
                             
                             return (
                                <React.Fragment key={booking.id}>
                                    <div
                                        style={{ 
                                            left: `${left}px`, 
                                            width: `${width}px`,
                                            top: `${topPercent}%`,
                                            height: `${heightPercent}%`,
                                            zIndex: 10 + index
                                        }}
                                        className={`booking-block absolute rounded-md border text-xs px-2 flex flex-col justify-center overflow-hidden whitespace-nowrap cursor-pointer hover:shadow-md hover:brightness-95 transition-all ${bgClass}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onBookingClick(booking);
                                        }}
                                        title={`${booking.customerName} - ${booking.serviceName}`}
                                    >
                                        <div className="font-semibold truncate text-[11px] leading-tight flex justify-between items-center">
                                            <span>{booking.serviceName}</span>
                                            {booking.pax > 1 && <span className="text-[9px] bg-white/30 px-1 rounded flex items-center"><Users size={8} className="mr-0.5"/> {booking.pax}</span>}
                                        </div>
                                        {heightPercent > 40 && <div className="truncate opacity-80 text-[10px]">{booking.customerName}</div>}
                                    </div>
                                    
                                    {booking.breakMinutes && booking.breakMinutes > 0 && (
                                        <div 
                                            className="absolute z-0 bg-slate-100 rounded-r-md border-y border-r border-slate-200/50"
                                            style={{
                                                left: `${left + width}px`,
                                                width: `${breakWidth}px`,
                                                top: `${topPercent}%`,
                                                height: `${heightPercent}%`,
                                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #cbd5e1 2px, #cbd5e1 4px)'
                                            }}
                                            title="Temps de pause / Nettoyage"
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                        
                        {/* Hover Plus */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none flex items-center justify-center">
                            <Plus className="text-slate-300 w-6 h-6" />
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};
