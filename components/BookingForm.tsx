import React, { useState, useEffect } from 'react';
import { BookingStatus, Space, Booking } from '../types';
import { Button } from './Button';
import { Clock, Calendar as CalendarIcon, AlertTriangle, Users, Info, Trash2 } from 'lucide-react';

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
};

const timeToMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

export const BookingForm: React.FC<BookingFormProps> = ({ spaces, onSubmit, onCancel, initialData, currentBookings, onDelete }) => {
  const [formData, setFormData] = useState({
    customerName: initialData?.customerName || '',
    serviceName: initialData?.serviceName || '',
    spaceId: initialData?.spaceId || spaces[0]?.id || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    startTime: initialData?.startTime || '09:00',
    durationMinutes: initialData?.durationMinutes || 60,
    breakMinutes: initialData?.breakMinutes || 0,
    pax: initialData?.pax || 1,
    status: initialData?.status || BookingStatus.CONFIRMED,
  });

  const [capacityInfo, setCapacityInfo] = useState<{
      currentLoad: number;
      max: number;
      remaining: number;
      isOver: boolean;
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    calculateCapacity();
  }, [formData.spaceId, formData.date, formData.startTime, formData.durationMinutes, formData.pax]);

  const calculateCapacity = () => {
      const space = spaces.find(s => s.id === formData.spaceId);
      if (!space) return;

      const newStart = timeToMins(formData.startTime);
      const newEnd = newStart + Number(formData.durationMinutes) + Number(formData.breakMinutes);

      // Filter concurrent bookings
      const concurrent = currentBookings.filter(b => {
          if (b.spaceId !== formData.spaceId) return false;
          if (b.date !== formData.date) return false;
          if (initialData && b.id === initialData.id) return false; // Exclude self if editing
          if (b.status === BookingStatus.CANCELED) return false;

          const bStart = timeToMins(b.startTime);
          const bEnd = bStart + b.durationMinutes + (b.breakMinutes || 0);

          return (newStart < bEnd && newEnd > bStart);
      });

      // Sum pax of concurrent bookings
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No blocking logic here, just submit. Overbooking is allowed.
    onSubmit({
        ...formData,
        durationMinutes: Number(formData.durationMinutes),
        breakMinutes: Number(formData.breakMinutes),
        pax: Number(formData.pax)
    });
  };

  const handleDelete = () => {
      if(window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette réservation ?")) {
          onDelete?.();
      }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {capacityInfo && (
          <div className={`p-3 rounded-lg text-sm border flex items-start gap-2 ${capacityInfo.isOver ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
              {capacityInfo.isOver ? <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} /> : <Info className="flex-shrink-0 mt-0.5" size={16} />}
              <div>
                  <p className="font-medium">
                      {capacityInfo.isOver ? "Surbooking détecté !" : "Disponibilité"}
                  </p>
                  <p>
                      {capacityInfo.currentLoad} pers. déjà prévues sur ce créneau (Max: {capacityInfo.max}). 
                      Il reste <strong>{capacityInfo.remaining} places</strong> avant réservation.
                  </p>
              </div>
          </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nom du client</label>
        <input
          type="text"
          name="customerName"
          required
          value={formData.customerName}
          onChange={handleChange}
          className="w-full rounded-lg border-slate-200 border p-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 transition-all"
          placeholder="ex: Jean Dupont"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Service / Soin</label>
          <input
            type="text"
            name="serviceName"
            required
            value={formData.serviceName}
            onChange={handleChange}
            className="w-full rounded-lg border-slate-200 border p-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 transition-all"
            placeholder="ex: Massage Suédois"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full rounded-lg border-slate-200 border p-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 transition-all"
          >
            {Object.values(BookingStatus).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Espace</label>
        <select
          name="spaceId"
          value={formData.spaceId}
          onChange={handleChange}
          className="w-full rounded-lg border-slate-200 border p-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 transition-all"
        >
          {spaces.map(space => (
            <option key={space.id} value={space.id}>{space.name} ({space.type} - Max {space.capacity})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <div className="relative">
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-200 border p-2.5 pl-9 text-sm focus:border-teal-500 focus:ring-teal-500 transition-all"
              />
              <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Heure Début</label>
          <input
            type="time"
            name="startTime"
            required
            value={formData.startTime}
            onChange={handleChange}
            className="w-full rounded-lg border-slate-200 border p-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Durée (min)</label>
          <input
            type="number"
            name="durationMinutes"
            required
            min="15"
            step="5"
            value={formData.durationMinutes}
            onChange={handleChange}
            className="w-full rounded-lg border-slate-200 border p-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 transition-all"
          />
        </div>
         <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nb. Pers.</label>
          <div className="relative">
            <input
                type="number"
                name="pax"
                required
                min="1"
                value={formData.pax}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-200 border p-2.5 pl-8 text-sm focus:border-teal-500 focus:ring-teal-500 transition-all"
            />
            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
         <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
             Pause <Clock size={12} className="text-slate-400"/>
          </label>
          <select
            name="breakMinutes"
            value={formData.breakMinutes}
            onChange={handleChange}
            className="w-full rounded-lg border-slate-200 border p-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 transition-all bg-slate-50"
          >
            <option value="0">Aucune</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1h</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-4">
        {onDelete ? (
            <Button type="button" variant="danger" onClick={handleDelete} className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none shadow-none">
                <Trash2 size={16} className="mr-2" /> Supprimer
            </Button>
        ) : (
            <div></div> // Spacer
        )}
        <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
            <Button 
                type="submit" 
                variant={capacityInfo?.isOver ? "danger" : "primary"}
            >
                {capacityInfo?.isOver ? "Forcer la réservation" : "Enregistrer"}
            </Button>
        </div>
      </div>
    </form>
  );
};
