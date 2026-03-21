import React from 'react';
import { Booking, BookingStatus, Space } from '../types';
import { Button } from './Button';
import { User, MapPin, Clock, CreditCard, CheckCircle2, XCircle, UserCheck, UserX, Edit2, Trash2, Users, FileText } from 'lucide-react';

interface BookingPreviewProps {
  booking: Booking;
  space?: Space;
  onEdit: () => void;
  onClose: () => void;
  onUpdateStatus: (status: BookingStatus) => void;
  onTogglePayment: () => void;
  onDelete: () => void;
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

const STATUS_COLORS: Record<BookingStatus, string> = {
  [BookingStatus.CONFIRMED]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [BookingStatus.PENDING]: 'bg-amber-100 text-amber-700 border-amber-200',
  [BookingStatus.CANCELED]: 'bg-red-100 text-red-700 border-red-200',
  [BookingStatus.MAINTENANCE]: 'bg-stone-100 text-stone-700 border-stone-200',
  [BookingStatus.BLOCKED]: 'bg-stone-100 text-stone-700 border-stone-200',
  [BookingStatus.CHECKED_IN]: 'bg-blue-100 text-blue-700 border-blue-200',
  [BookingStatus.NO_SHOW]: 'bg-zinc-100 text-zinc-700 border-zinc-200'
};

export const BookingPreview: React.FC<BookingPreviewProps> = ({ 
  booking, 
  space, 
  onEdit, 
  onClose, 
  onUpdateStatus, 
  onTogglePayment, 
  onDelete 
}) => {
  
  const handleDelete = () => {
      if(window.confirm("Voulez-vous vraiment supprimer cette réservation ?")) {
          onDelete();
      }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header / Status */}
      <div className="flex items-center justify-between mb-6">
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[booking.status]}`}>
          {STATUS_LABELS[booking.status]}
        </div>
        <div className="flex gap-2">
            <button 
                onClick={onEdit}
                className="p-2 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                title="Modifier"
            >
                <Edit2 size={18} />
            </button>
            <button 
                onClick={handleDelete}
                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
            >
                <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* Main Info */}
      <div className="space-y-6 flex-1">
        <div>
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                {booking.customerName}
            </h2>
            {booking.roomNumber && (
                <p className="text-stone-500 font-medium mt-1">Appartement : {booking.roomNumber}</p>
            )}
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                <div className="flex items-center gap-2 text-stone-500 mb-1 text-xs font-bold uppercase tracking-wider">
                    <MapPin size={14} /> Espace
                </div>
                <div className="font-semibold text-stone-800">{space?.name || 'Inconnu'}</div>
                <div className="text-xs text-stone-500 mt-0.5">{booking.serviceName || 'Réservation'}</div>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                <div className="flex items-center gap-2 text-stone-500 mb-1 text-xs font-bold uppercase tracking-wider">
                    <Clock size={14} /> Horaire
                </div>
                <div className="font-semibold text-stone-800">{booking.startTime}</div>
                <div className="text-xs text-stone-500 mt-0.5">{booking.durationMinutes} min</div>
            </div>
        </div>

        <div className="flex items-center gap-6 py-2 border-y border-stone-100">
            <div className="flex items-center gap-2">
                <Users size={16} className="text-stone-400" />
                <span className="font-medium text-stone-700">{booking.pax} personne{booking.pax > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-stone-400" />
                <span className="font-medium text-stone-700">{booking.isPaid ? 'Réglé' : 'À régler'}</span>
            </div>
        </div>

        {booking.notes && (
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                <div className="flex items-center gap-2 text-amber-700 mb-2 text-xs font-bold uppercase tracking-wider">
                    <FileText size={14} /> Notes
                </div>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{booking.notes}</p>
            </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 pt-4 border-t border-stone-100">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Actions rapides</p>
          <div className="grid grid-cols-2 gap-3">
              <button
                  onClick={() => onUpdateStatus(booking.status === BookingStatus.CHECKED_IN ? BookingStatus.CONFIRMED : BookingStatus.CHECKED_IN)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold transition-all border ${
                      booking.status === BookingStatus.CHECKED_IN 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
              >
                  <UserCheck size={16} />
                  {booking.status === BookingStatus.CHECKED_IN ? 'Marquer Absent' : 'Marquer Présent'}
              </button>
              
              <button
                  onClick={() => onUpdateStatus(booking.status === BookingStatus.NO_SHOW ? BookingStatus.CONFIRMED : BookingStatus.NO_SHOW)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold transition-all border ${
                      booking.status === BookingStatus.NO_SHOW 
                      ? 'bg-zinc-100 text-zinc-700 border-zinc-200' 
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
              >
                  <UserX size={16} />
                  No-Show
              </button>

              <button
                  onClick={onTogglePayment}
                  className={`col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold transition-all border ${
                      booking.isPaid 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100/50'
                  }`}
              >
                  {booking.isPaid ? <CheckCircle2 size={16} /> : <CreditCard size={16} />}
                  {booking.isPaid ? 'Paiement validé (Annuler)' : 'Valider le paiement'}
              </button>
          </div>
      </div>
    </div>
  );
};
