import React, { useRef, useState, useEffect } from 'react';
import { Space, Booking, BookingStatus } from '../types';
import { OPENING_HOUR, CLOSING_HOUR, PIXELS_PER_MINUTE } from '../constants';
import { Plus, Users, Clock, Info, CheckCircle2, XCircle, UserCheck, UserX } from 'lucide-react';

interface PlanningGridProps {
  spaces: Space[];
  bookings: Booking[];
  onSlotClick: (spaceId: string, time: string) => void;
  onBookingClick: (booking: Booking) => void;
  highlightedBookingId?: string | null;
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

// Helper to get color based on status
const getStatusColor = (status: BookingStatus) => {
    switch (status) {
        case BookingStatus.CONFIRMED: return 'brand';
        case BookingStatus.CHECKED_IN: return 'sky'; // Distinct color for checked in
        case BookingStatus.PENDING: return 'amber';
        case BookingStatus.MAINTENANCE: return 'red';
        case BookingStatus.BLOCKED: return 'stone';
        case BookingStatus.NO_SHOW: return 'zinc'; // Dark grey/black for no-show
        case BookingStatus.CANCELED: return 'gray';
        default: return 'brand';
    }
};

export const PlanningGrid: React.FC<PlanningGridProps> = ({ spaces, bookings, onSlotClick, onBookingClick, highlightedBookingId }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalMinutes = (CLOSING_HOUR - OPENING_HOUR) * 60;
  const gridWidth = totalMinutes * PIXELS_PER_MINUTE;
  
  // Current time state
  const [currentTimePos, setCurrentTimePos] = useState<number | null>(null);

  useEffect(() => {
    if (highlightedBookingId) {
        const el = document.getElementById(`booking-${highlightedBookingId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }
  }, [highlightedBookingId]);

  useEffect(() => {
    const updateTime = () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        
        // Only show if within opening hours
        if (currentHour >= OPENING_HOUR && currentHour < CLOSING_HOUR) {
            const minutesFromStart = ((currentHour - OPENING_HOUR) * 60) + currentMin;
            setCurrentTimePos(minutesFromStart * PIXELS_PER_MINUTE);
        } else {
            setCurrentTimePos(null);
        }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const timeMarkers = [];
  for (let h = OPENING_HOUR; h <= CLOSING_HOUR; h++) {
    timeMarkers.push(h);
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Sticky Header */}
      <div className="flex border-b border-stone-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="w-48 md:w-64 flex-shrink-0 p-4 font-bold text-stone-800 flex items-center border-r border-stone-200 bg-stone-50/50 backdrop-blur-md">
          <span className="text-lg">Espaces</span>
          <span className="ml-auto text-xs font-normal text-stone-400 bg-white px-2 py-1 rounded-full border border-stone-100">
            {spaces.length} salles
          </span>
        </div>
        <div className="flex-1 overflow-hidden relative" ref={scrollRef}>
            <div style={{ width: `${gridWidth}px` }} className="h-14 relative flex items-end pb-2">
                {timeMarkers.map(hour => (
                    <div 
                        key={hour} 
                        className="absolute transform -translate-x-1/2 flex flex-col items-center group"
                        style={{ left: `${(hour - OPENING_HOUR) * 60 * PIXELS_PER_MINUTE}px` }}
                    >
                        <span className="text-xs font-semibold text-stone-400 group-hover:text-brand-900 transition-colors mb-1">{hour}h</span>
                        <div className="h-1.5 w-px bg-stone-200 group-hover:bg-brand-900 transition-colors"></div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Grid Body */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-auto hide-scrollbar relative bg-stone-50/30"
        onScroll={(e) => {
            if (scrollRef.current) {
                scrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
            }
        }}
      >
        <div className="min-w-max relative">
            
            {/* Global Current Time Line (Overlay) */}
            {currentTimePos !== null && (
                <div 
                    className="absolute top-0 bottom-0 z-30 border-l-2 border-red-500 pointer-events-none ml-48 md:ml-64"
                    style={{ left: `${currentTimePos}px` }} 
                >
                    <div className="absolute -top-1.5 -left-[5px] w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm" />
                    <div className="absolute top-2 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-80">
                        Maintenant
                    </div>
                </div>
            )}

            {spaces.map(space => {
                const spaceBookings = bookings.filter(b => b.spaceId === space.id && b.status !== BookingStatus.CANCELED);
                
                // --- Logic to calculate Full/Busy Zones ---
                const timePoints = new Set<number>();
                spaceBookings.forEach(b => {
                    const start = timeToMinutes(b.startTime);
                    const end = start + b.durationMinutes + (b.breakMinutes || 0);
                    timePoints.add(start);
                    timePoints.add(end);
                });
                
                const sortedPoints = Array.from(timePoints).sort((a, b) => a - b);
                const fullZones = [];
                for (let i = 0; i < sortedPoints.length - 1; i++) {
                    const p1 = sortedPoints[i];
                    const p2 = sortedPoints[i+1];
                    if (p2 <= p1) continue;
                    
                    const currentLoad = spaceBookings.reduce((sum, b) => {
                         const bStart = timeToMinutes(b.startTime);
                         const bEnd = bStart + b.durationMinutes + (b.breakMinutes || 0);
                         if (bStart < p2 && bEnd > p1) return sum + (b.pax || 1);
                         return sum;
                    }, 0);

                    if (currentLoad >= space.capacity) {
                        fullZones.push({
                            start: p1,
                            end: p2,
                            load: currentLoad,
                            isOver: currentLoad > space.capacity
                        });
                    }
                }

                // Calculate lanes based on pax
                const sortedBookings = [...spaceBookings].sort((a, b) => {
                    const startA = timeToMinutes(a.startTime);
                    const startB = timeToMinutes(b.startTime);
                    if (startA !== startB) return startA - startB;
                    return b.durationMinutes - a.durationMinutes;
                });

                const lanes: { end: number }[] = [];
                const bookingLanes = new Map<string, { startLane: number, laneCount: number }>();
                let maxLanesUsed = space.capacity;

                sortedBookings.forEach(booking => {
                    const start = timeToMinutes(booking.startTime);
                    const end = start + booking.durationMinutes + (booking.breakMinutes || 0);
                    const pax = booking.pax || 1;

                    let foundStartLane = -1;
                    let currentContiguous = 0;
                    let searchStartLane = 0;

                    for (let i = 0; i < 100; i++) { // arbitrary max to prevent infinite loop
                        if (!lanes[i] || lanes[i].end <= start) {
                            if (currentContiguous === 0) searchStartLane = i;
                            currentContiguous++;
                            if (currentContiguous === pax) {
                                foundStartLane = searchStartLane;
                                break;
                            }
                        } else {
                            currentContiguous = 0;
                        }
                    }

                    if (foundStartLane === -1) foundStartLane = maxLanesUsed;

                    for (let i = foundStartLane; i < foundStartLane + pax; i++) {
                        lanes[i] = { end };
                    }

                    maxLanesUsed = Math.max(maxLanesUsed, foundStartLane + pax);
                    bookingLanes.set(booking.id, { startLane: foundStartLane, laneCount: pax });
                });

                const effectiveCapacity = Math.max(space.capacity, maxLanesUsed);

                return (
                <div key={space.id} className="flex border-b border-stone-100 group min-h-[7rem] hover:bg-white transition-colors">
                    {/* Space Column */}
                    <div className="w-48 md:w-64 flex-shrink-0 p-4 border-r border-stone-200 bg-white sticky left-0 z-40 flex flex-col justify-center shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-start mb-1">
                             <span className="font-bold text-stone-700 text-sm truncate pr-2">{space.name}</span>
                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${
                                 space.type === 'MASSAGE' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                 space.type === 'POOL' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                 'bg-stone-50 text-stone-600 border-stone-100'
                             }`}>
                                 {space.type}
                             </span>
                        </div>
                        <div className="flex items-center text-stone-400 text-xs mt-1">
                            <Users size={12} className="mr-1.5" /> 
                            <span>Capacité: <strong className="text-stone-600">{space.capacity}</strong> pers.</span>
                        </div>
                    </div>
                    
                    {/* Time Grid for this Space */}
                    <div 
                        className="relative border-r border-stone-100 flex-1 bg-white"
                        style={{ width: `${gridWidth}px` }}
                    >
                        {/* Hoverable Empty Slots */}
                        <div className="absolute inset-0 flex z-10">
                            {Array.from({ length: (CLOSING_HOUR - OPENING_HOUR) * 4 }).map((_, i) => (
                                <div 
                                    key={`slot-${i}`}
                                    className="h-full flex-1 border-r border-transparent hover:bg-brand-50/50 hover:border-brand-200 transition-colors cursor-pointer group/slot flex items-center justify-center"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const actualMins = (OPENING_HOUR * 60) + (i * 15);
                                        onSlotClick(space.id, minutesToTime(actualMins));
                                    }}
                                >
                                    <Plus className="opacity-0 group-hover/slot:opacity-100 text-brand-400" size={20} />
                                </div>
                            ))}
                        </div>

                        {/* Vertical Guidelines */}
                        {timeMarkers.map(hour => (
                            <div 
                                key={`line-${hour}`} 
                                className="absolute top-0 bottom-0 border-l border-stone-100/60 pointer-events-none"
                                style={{ left: `${(hour - OPENING_HOUR) * 60 * PIXELS_PER_MINUTE}px` }}
                            />
                        ))}

                        {/* Full/Overload Zones (Subtle Background) */}
                        {fullZones.map((zone, idx) => {
                             const startMins = zone.start - (OPENING_HOUR * 60);
                             const width = (zone.end - zone.start) * PIXELS_PER_MINUTE;
                             const left = startMins * PIXELS_PER_MINUTE;
                             
                             return (
                                 <div
                                    key={`zone-${idx}`}
                                    className={`absolute top-1 bottom-1 pointer-events-none z-0 flex items-center justify-center rounded-sm transition-all
                                        ${zone.isOver ? 'bg-red-50' : 'bg-stone-100'}`}
                                    style={{
                                        left: `${left}px`,
                                        width: `${width}px`,
                                        // Subtle stripe pattern via CSS radial/linear gradient simulation
                                        backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.02) 75%, transparent 75%, transparent)',
                                        backgroundSize: '8px 8px'
                                    }}
                                 >
                                     <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border shadow-sm ${
                                         zone.isOver ? 'bg-white text-red-600 border-red-100' : 'bg-white text-stone-400 border-stone-200'
                                     }`}>
                                         {zone.isOver ? 'Surbooké' : 'Complet'}
                                     </div>
                                 </div>
                             );
                        })}

                        {/* Booking Cards */}
                        {sortedBookings.map((booking, index) => {
                             const myStart = timeToMinutes(booking.startTime);
                             const startMins = myStart - (OPENING_HOUR * 60);
                             const width = booking.durationMinutes * PIXELS_PER_MINUTE;
                             const breakWidth = (booking.breakMinutes || 0) * PIXELS_PER_MINUTE;
                             const left = startMins * PIXELS_PER_MINUTE;

                             // Color logic
                             const colorName = getStatusColor(booking.status);
                             const borderClass = colorName === 'brand' ? 'border-brand-900' : `border-${colorName}-500`;
                             const textClass = colorName === 'brand' ? 'text-brand-900' : `text-${colorName}-900`;
                             const bgClass = booking.status === BookingStatus.NO_SHOW ? 'bg-zinc-100' : 'bg-white';
                             
                             // Stacking Logic
                             const laneInfo = bookingLanes.get(booking.id) || { startLane: 0, laneCount: 1 };
                             
                             // Card layout variables
                             const topPercent = 5 + (laneInfo.startLane / effectiveCapacity) * 90;
                             const heightPercent = (laneInfo.laneCount / effectiveCapacity) * 90;
                             
                             const isHighlighted = booking.id === highlightedBookingId;

                             return (
                                <React.Fragment key={booking.id}>
                                    <div
                                        id={`booking-${booking.id}`}
                                        style={{ 
                                            left: `${left}px`, 
                                            width: `${width}px`,
                                            top: `${topPercent}%`,
                                            height: `${heightPercent}%`,
                                            zIndex: isHighlighted ? 50 : 10 + index
                                        }}
                                        className={`booking-card absolute flex flex-col justify-center px-3 py-1 cursor-pointer transition-all duration-300
                                            ${bgClass} border border-stone-200 border-l-4 rounded-r-md shadow-sm hover:shadow-md hover:scale-[1.01] hover:z-20
                                            ${borderClass} overflow-hidden group/card
                                            ${isHighlighted ? 'ring-4 ring-brand-500 shadow-2xl scale-105 animate-pulse' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onBookingClick(booking);
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-col min-w-0">
                                                <span className={`font-bold text-xs truncate ${textClass} ${booking.status === BookingStatus.NO_SHOW ? 'line-through opacity-70' : ''}`}>
                                                    {booking.customerName}
                                                    {booking.roomNumber && <span className="ml-1 text-stone-400 font-normal">({booking.roomNumber})</span>}
                                                </span>
                                                {/* Hide details if slot is too small vertically */}
                                                {heightPercent > 30 && width > 60 && (
                                                    <div className="text-[10px] text-stone-500 truncate mt-0.5 flex items-center gap-1">
                                                        {booking.serviceName && booking.serviceName !== 'Réservation' && (
                                                            <>
                                                                <span className="font-medium truncate">{booking.serviceName}</span>
                                                                <span className="text-stone-300 flex-shrink-0">•</span>
                                                            </>
                                                        )}
                                                        <span className="flex-shrink-0">{booking.startTime} - {minutesToTime(timeToMinutes(booking.startTime) + booking.durationMinutes)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                                                {booking.isPaid ? (
                                                    <CheckCircle2 size={10} className="text-emerald-500" title="Réglé" />
                                                ) : (
                                                    <XCircle size={10} className="text-red-400" title="Non réglé" />
                                                )}
                                                {booking.status === BookingStatus.CHECKED_IN && (
                                                    <UserCheck size={10} className="text-blue-500" title="Présent" />
                                                )}
                                                {booking.status === BookingStatus.NO_SHOW && (
                                                    <UserX size={10} className="text-stone-400" title="No-show" />
                                                )}
                                                {booking.pax > 1 && (
                                                    <div className="flex items-center bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-full text-[9px] flex-shrink-0 ml-0.5">
                                                        <Users size={8} className="mr-0.5" /> {booking.pax}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Hover Tooltip (Simple browser title for now, or could be a custom component) */}
                                        <div className="hidden group-hover/card:flex absolute inset-0 bg-white/50 backdrop-blur-[1px] items-center justify-center font-semibold text-xs text-stone-800 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                            Voir détails
                                        </div>
                                    </div>
                                    
                                    {/* Break / Cleaning Time */}
                                    {(booking.breakMinutes || 0) > 0 && (
                                        <div 
                                            className="absolute z-10 bg-stone-50 rounded-r border-y border-r border-stone-200/50 flex items-center justify-center"
                                            style={{
                                                left: `${left + width}px`,
                                                width: `${breakWidth}px`,
                                                top: `${topPercent + 10}%`, // Slightly smaller height
                                                height: `${heightPercent - 20}%`,
                                                backgroundImage: 'linear-gradient(135deg, #cbd5e1 25%, transparent 25%, transparent 50%, #cbd5e1 50%, #cbd5e1 75%, transparent 75%, transparent)',
                                                backgroundSize: '4px 4px'
                                            }}
                                            title="Temps de pause / Nettoyage"
                                        >
                                            <Clock size={10} className="text-stone-400 opacity-50" />
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        
                        {/* Hover Interaction Layer */}
                        <div className="absolute inset-0 opacity-0 hover:opacity-100 pointer-events-none z-10">
                            <div className="h-full w-px bg-brand-900/30 absolute top-0 bottom-0 shadow-[0_0_10px_rgba(45,46,131,0.3)] hidden group-hover:block" 
                                 style={{ left: 'var(--mouse-x, 0px)' }} />
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
      </div>
      
      {/* Legend Footer */}
      <div className="bg-stone-50 border-t border-stone-200 p-3 px-6 flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-3 text-[10px] text-stone-600 uppercase tracking-wider font-bold z-20 relative shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-brand-900 shadow-inner"></div> Confirmé</div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-inner"></div> Présent</div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-zinc-500 shadow-inner"></div> No-Show</div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-inner"></div> En attente</div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-inner"></div> Maintenance</div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-stone-100 border border-stone-300"></div> Complet</div>
      </div>
    </div>
  );
};