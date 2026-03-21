import React, { useState, useEffect } from 'react';
import { BookingStatus, Space, Booking } from '../types';
import { Button } from './Button';
import { Calendar as CalendarIcon, AlertTriangle, Users, Trash2, ChevronRight, Check, User, MapPin, ArrowRight, CreditCard, UserCheck, UserX } from 'lucide-react';

interface BookingFormProps {
  spaces: Space[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  currentBookings: Booking[];
  onDelete?: () => void;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.CONFIRMED]: 'Confirmé',
  [BookingStatus.PENDING]: 'En attente',
  [BookingStatus.CANCELED]: 'Annulé',
  [BookingStatus.MAINTENANCE]: 'Maintenance',
  [BookingStatus.BLOCKED]: 'Bloqué',
  [BookingStatus.CHECKED_IN]: 'Présent',
  [BookingStatus.NO_SHOW]: 'No-Show'
};

// Helper functions for time conversion
const timeToMins = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

const minsToTime = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};

const STEPS = [
    { id: 1, title: 'Client', icon: User },
    { id: 2, title: 'Créneau', icon: MapPin },
    { id: 3, title: 'Validation', icon: Check },
];

export const BookingForm: React.FC<BookingFormProps> = ({ spaces, onSubmit, onCancel, initialData, currentBookings, onDelete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const isEditing = !!initialData?.id;
  
  // Initialize form state
  const [formData, setFormData] = useState({
    customerName: initialData?.customerName || '',
    serviceName: initialData?.serviceName || '',
    spaceId: initialData?.spaceId || (spaces.length > 0 ? spaces[0].id : ''),
    date: initialData?.date || new Date().toISOString().split('T')[0],
    startTime: initialData?.startTime || '09:00',
    endTime: '', // Calculated via useEffect on mount
    durationMinutes: initialData?.durationMinutes || 60,
    breakMinutes: initialData?.breakMinutes || 0,
    pax: initialData?.pax || 1,
    status: initialData?.status || BookingStatus.CONFIRMED,
    isPaid: initialData?.isPaid || false,
    roomNumber: initialData?.roomNumber || '',
  });

  // Calculate initial EndTime if not present or on load
  useEffect(() => {
    const startMins = timeToMins(formData.startTime);
    const endMins = startMins + Number(formData.durationMinutes);
    setFormData(prev => ({ ...prev, endTime: minsToTime(endMins) }));
  }, []); // Run once on mount

  const [capacityInfo, setCapacityInfo] = useState<{
      currentLoad: number;
      max: number;
      remaining: number;
      isOver: boolean;
  } | null>(null);

  // --- Handlers for synchronized time fields ---

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStart = e.target.value;
      const startMins = timeToMins(newStart);
      const endMins = startMins + Number(formData.durationMinutes);
      setFormData(prev => ({
          ...prev,
          startTime: newStart,
          endTime: minsToTime(endMins)
      }));
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEnd = e.target.value;
      const endMins = timeToMins(newEnd);
      const startMins = timeToMins(formData.startTime);
      
      let duration = endMins - startMins;
      // Force minimum duration of 15 mins to avoid issues
      if (duration < 15) duration = 15; 

      setFormData(prev => ({
          ...prev,
          endTime: newEnd,
          durationMinutes: duration
      }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const duration = Number(e.target.value);
      const startMins = timeToMins(formData.startTime);
      const endMins = startMins + duration;
      
      setFormData(prev => ({
          ...prev,
          durationMinutes: duration,
          endTime: minsToTime(endMins)
      }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePayment = () => {
      setFormData(prev => ({ ...prev, isPaid: !prev.isPaid }));
  };

  const setStatus = (status: BookingStatus) => {
      setFormData(prev => ({ ...prev, status }));
  };

  // --- Capacity Calculation ---
  useEffect(() => {
    try {
        calculateCapacity();
    } catch (e) {
        console.error("Error calculating capacity", e);
    }
  }, [formData.spaceId, formData.date, formData.startTime, formData.durationMinutes, formData.pax]);

  const calculateCapacity = () => {
      if (!formData.spaceId) return;
      const space = spaces.find(s => s.id === formData.spaceId);
      if (!space) return;

      const newStart = timeToMins(formData.startTime);
      const newEnd = newStart + Number(formData.durationMinutes) + Number(formData.breakMinutes);

      const concurrent = currentBookings.filter(b => {
          if (b.spaceId !== formData.spaceId) return false;
          if (b.date !== formData.date) return false;
          if (initialData && b.id === initialData.id) return false;
          if (b.status === BookingStatus.CANCELED) return false;

          const bStart = timeToMins(b.startTime);
          const bEnd = bStart + b.durationMinutes + (b.breakMinutes || 0);

          return (newStart < bEnd && newEnd > bStart);
      });

      const currentLoad = concurrent.reduce((sum, b) => sum + (b.pax || 1), 0);
      const newPax = Number(formData.pax);
      const totalLoad = currentLoad + newPax;

      setCapacityInfo({
          currentLoad,
          max: space.capacity,
          remaining: Math.max(0, space.capacity - currentLoad),
          isOver: totalLoad > space.capacity
      });
  };

  // Manual Trigger for Submission to prevent ghost submissions
  const triggerSubmit = () => {
    onSubmit({
        ...formData,
        serviceName: formData.serviceName || 'Réservation', // Default if empty
        durationMinutes: Number(formData.durationMinutes),
        breakMinutes: Number(formData.breakMinutes),
        pax: Number(formData.pax),
        roomNumber: formData.roomNumber
    });
  };

  const handleDelete = () => {
      if(window.confirm("Supprimer cette réservation ?")) {
          onDelete?.();
      }
  }

  const nextStep = () => {
      if (currentStep === 1) {
          if (!formData.customerName) return; // Only customerName is required
      }
      if (currentStep === 2) {
          if (!formData.spaceId) {
             alert("Veuillez sélectionner un espace.");
             return;
          }
      }
      setCurrentStep(p => Math.min(STEPS.length, p + 1));
  };

  const prevStep = () => {
      setCurrentStep(p => Math.max(1, p - 1));
  };

  // Robust Enter key handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault(); // Always prevent default form submit
          // Only allow navigation on earlier steps
          if (currentStep < STEPS.length) {
             nextStep();
          }
          // On last step, do nothing. User must click confirm.
      }
  };

  if (spaces.length === 0) {
      return (
          <div className="text-center py-8 text-stone-500">
              <p>Aucun espace configuré.</p>
              <p className="text-sm mt-2">Veuillez créer des espaces dans les paramètres.</p>
              <Button variant="secondary" onClick={onCancel} className="mt-4">Fermer</Button>
          </div>
      );
  }

  return (
    <form 
        onSubmit={(e) => e.preventDefault()} 
        onKeyDown={handleKeyDown} 
        className="flex flex-col h-full"
        autoComplete="off"
    >
      {/* Compact Progress Bar - Added pt-5 to prevent top clipping */}
      <div className="mb-8 pt-5 px-4">
          <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-stone-100 -z-10 rounded-full"></div>
              <div 
                className="absolute left-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-brand-900 -z-10 rounded-full transition-all duration-300" 
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              ></div>
              
              {STEPS.map((step) => {
                  const Icon = step.icon;
                  const isActive = step.id === currentStep;
                  const isCompleted = step.id < currentStep;

                  return (
                      <div key={step.id} className="flex flex-col items-center relative group">
                          <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                              ${isActive ? 'bg-brand-900 border-brand-900 text-white shadow-lg shadow-brand-200 scale-125' : 
                                isCompleted ? 'bg-brand-900 border-brand-900 text-white' : 'bg-white border-stone-200 text-stone-300'}
                          `}>
                              {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                          </div>
                          <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-brand-900' : 'text-stone-300'}`}>
                             {step.title}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      <div className="flex-1 min-h-[320px]">
        {/* Step 1: Info Client */}
        {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="group">
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 ml-1">Client</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-brand-900 transition-colors" size={18}/>
                        <input
                            type="text"
                            name="customerName"
                            required
                            value={formData.customerName}
                            onChange={handleChange}
                            className="w-full rounded-xl bg-stone-50 border-transparent focus:bg-white border-2 focus:border-brand-900 focus:ring-0 py-3 pl-10 pr-4 text-sm transition-all"
                            placeholder="Nom complet"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide">Prestation</label>
                            <span className="text-[10px] text-stone-400 italic font-medium">Optionnel</span>
                        </div>
                        <input
                            type="text"
                            name="serviceName"
                            value={formData.serviceName}
                            onChange={handleChange}
                            className="w-full rounded-xl bg-stone-50 border-transparent focus:bg-white border-2 focus:border-brand-900 focus:ring-0 py-3 px-4 text-sm transition-all"
                            placeholder="Ex: Massage..."
                        />
                    </div>
                    <div className="group">
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide">N° Chambre</label>
                            <span className="text-[10px] text-stone-400 italic font-medium">Optionnel</span>
                        </div>
                        <input
                            type="text"
                            name="roomNumber"
                            value={formData.roomNumber}
                            onChange={handleChange}
                            className="w-full rounded-xl bg-stone-50 border-transparent focus:bg-white border-2 focus:border-brand-900 focus:ring-0 py-3 px-4 text-sm transition-all"
                            placeholder="Ex: 104"
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Step 2: Date, Space & Times */}
        {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 ml-1">Espace</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {spaces.map(space => (
                            <div 
                                key={space.id}
                                onClick={() => setFormData(prev => ({ ...prev, spaceId: space.id }))}
                                className={`cursor-pointer px-3 py-2 rounded-lg border-2 transition-all ${formData.spaceId === space.id ? 'bg-brand-50/50 border-brand-900' : 'bg-stone-50 border-transparent hover:bg-stone-100'}`}
                            >
                                <div className={`font-semibold text-xs ${formData.spaceId === space.id ? 'text-brand-900' : 'text-stone-700'}`}>{space.name}</div>
                                <div className="text-[10px] text-stone-500 mt-0.5">{space.type}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                     <div className="group">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 ml-1">Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                name="date"
                                required
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full rounded-xl bg-stone-50 border-transparent focus:bg-white border-2 focus:border-brand-900 focus:ring-0 py-2.5 pl-9 pr-2 text-sm transition-all"
                            />
                            <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        </div>
                    </div>
                    <div>
                         {/* Linked Duration Field */}
                         <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 ml-1">Durée (min)</label>
                         <input
                            type="number"
                            name="durationMinutes"
                            required
                            min="15"
                            step="5"
                            value={formData.durationMinutes}
                            onChange={handleDurationChange}
                            className="w-full rounded-xl bg-stone-50 border-transparent focus:bg-white border-2 focus:border-brand-900 focus:ring-0 py-2.5 px-3 text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Time Range with End Time */}
                <div className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Début</label>
                        <input
                            type="time"
                            name="startTime"
                            required
                            value={formData.startTime}
                            onChange={handleStartTimeChange}
                            className="w-full bg-transparent font-bold text-lg text-stone-700 outline-none p-0 border-none focus:ring-0"
                        />
                    </div>
                    <ArrowRight size={20} className="text-stone-300" />
                    <div className="flex-1 text-right">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Fin</label>
                        <input
                            type="time"
                            name="endTime"
                            required
                            value={formData.endTime}
                            onChange={handleEndTimeChange}
                            className="w-full bg-transparent font-bold text-lg text-stone-700 outline-none p-0 border-none focus:ring-0 text-right"
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Step 3: Details & Confirmation */}
        {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* Capacity Alert */}
                {capacityInfo && (
                    <div className={`p-3 rounded-lg text-xs border flex items-center gap-3 ${capacityInfo.isOver ? 'bg-red-50 border-red-100 text-red-700' : 'bg-brand-50 border-brand-100 text-brand-900'}`}>
                        {capacityInfo.isOver ? <AlertTriangle className="flex-shrink-0" size={18} /> : <Check className="flex-shrink-0" size={18} />}
                        <div>
                            <span className="font-bold block">{capacityInfo.isOver ? "Surbooking !" : "Créneau disponible"}</span>
                            <span className="opacity-80">Charge: {capacityInfo.currentLoad}/{capacityInfo.max} pers.</span>
                        </div>
                    </div>
                )}

                {/* Info Row */}
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 flex justify-between items-center text-sm">
                    <span className="text-stone-500">Horaire prévu</span>
                    <span className="font-bold text-stone-800">{formData.startTime} - {formData.endTime} ({formData.durationMinutes} min)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 ml-1">Personnes</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="pax"
                                required
                                min="1"
                                value={formData.pax}
                                onChange={handleChange}
                                className="w-full rounded-xl bg-stone-50 border-transparent focus:bg-white border-2 focus:border-brand-900 focus:ring-0 py-2.5 pl-9 pr-3 text-sm"
                            />
                            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 ml-1">Pause (Nettoyage)</label>
                        <select
                            name="breakMinutes"
                            value={formData.breakMinutes}
                            onChange={handleChange}
                            className="w-full rounded-xl bg-stone-50 border-transparent focus:bg-white border-2 focus:border-brand-900 focus:ring-0 py-2.5 px-3 text-sm"
                        >
                            <option value="0">Aucune</option>
                            <option value="15">15 min</option>
                            <option value="30">30 min</option>
                            <option value="60">1h</option>
                        </select>
                    </div>
                </div>

                {/* Status & Payment Row (Also in Quick Actions but detailed here) */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 ml-1">Statut</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full rounded-xl bg-stone-50 border-transparent focus:bg-white border-2 focus:border-brand-900 focus:ring-0 py-2.5 px-3 text-sm"
                        >
                            {Object.values(BookingStatus).map(s => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Toggle */}
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 ml-1">Règlement</label>
                        <button
                            type="button"
                            onClick={togglePayment}
                            className={`w-full rounded-xl border-2 flex items-center justify-between px-3 py-2.5 transition-all ${formData.isPaid ? 'bg-brand-50 border-brand-900 text-brand-900' : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-300'}`}
                        >
                            <span className="text-sm font-medium">{formData.isPaid ? 'Réglé' : 'À régler'}</span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.isPaid ? 'bg-brand-900 text-white' : 'bg-stone-200'}`}>
                                <CreditCard size={12} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="pt-4 mt-2 flex items-center justify-between">
        
        {/* Left Side: Delete */}
        <div>
            {onDelete && (
                <button type="button" onClick={handleDelete} className="text-stone-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50" title="Supprimer">
                    <Trash2 size={18} />
                </button>
            )}
        </div>

        {/* Right Side: Navigation */}
        <div className="flex gap-2">
            {currentStep === 1 ? (
                <Button type="button" variant="ghost" onClick={onCancel} className="text-stone-500">
                    Annuler
                </Button>
            ) : (
                <Button type="button" variant="secondary" onClick={prevStep}>
                    Retour
                </Button>
            )}

            {currentStep < STEPS.length ? (
                <Button 
                    type="button" 
                    variant="primary" 
                    onClick={nextStep}
                    disabled={currentStep === 1 && !formData.customerName}
                    className="pl-5 pr-4"
                >
                    Suivant <ChevronRight size={16} className="ml-1" />
                </Button>
            ) : (
                <Button 
                    type="button" // Changed to explicit button type to prevent form submit race conditions
                    onClick={triggerSubmit}
                    variant={capacityInfo?.isOver ? "danger" : "primary"}
                    className="shadow-lg shadow-brand-900/30"
                >
                    {capacityInfo?.isOver ? "Forcer" : "Confirmer"}
                </Button>
            )}
        </div>
      </div>
    </form>
  );
};