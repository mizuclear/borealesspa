import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Booking, BookingStatus } from '../types';
import { Users, CalendarCheck, Activity, UserX, CheckCircle, CreditCard, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface DashboardProps {
  bookings: Booking[];
}

const COLORS = ['#4c4eab', '#f59e0b', '#ef4444', '#64748b', '#6268c0', '#1e293b'];

const STATUS_LABELS: Record<string, string> = {
  [BookingStatus.CONFIRMED]: 'Confirmé',
  [BookingStatus.PENDING]: 'En attente',
  [BookingStatus.MAINTENANCE]: 'Maint.',
  [BookingStatus.BLOCKED]: 'Bloqué',
  [BookingStatus.CANCELED]: 'Annulé',
  [BookingStatus.CHECKED_IN]: 'Présent',
  [BookingStatus.NO_SHOW]: 'No-Show'
};

export const Dashboard: React.FC<DashboardProps> = ({ bookings }) => {
  const stats = useMemo(() => {
    const validBookings = bookings.filter(b => b.status !== BookingStatus.CANCELED && b.status !== BookingStatus.BLOCKED && b.status !== BookingStatus.MAINTENANCE);
    const total = validBookings.length;
    const confirmed = validBookings.filter(b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN).length;
    const noShows = validBookings.filter(b => b.status === BookingStatus.NO_SHOW).length;
    const occupancy = Math.round((validBookings.reduce((acc, curr) => acc + curr.durationMinutes, 0) / (12 * 60 * 6)) * 100);
    
    const totalPax = validBookings.reduce((acc, curr) => acc + curr.pax, 0);
    const paidCount = validBookings.filter(b => b.isPaid).length;
    const unpaidCount = total - paidCount;
    const avgDuration = total > 0 ? Math.round(validBookings.reduce((acc, curr) => acc + curr.durationMinutes, 0) / total) : 0;

    return { total, confirmed, noShows, occupancy, totalPax, paidCount, unpaidCount, avgDuration };
  }, [bookings]);

  const typeData = useMemo(() => {
     const counts: Record<string, number> = {};
     bookings.forEach(b => {
         counts[b.status] = (counts[b.status] || 0) + 1;
     });
     return Object.keys(counts).map(key => ({ name: STATUS_LABELS[key] || key, value: counts[key] }));
  }, [bookings]);

  const timeDistribution = useMemo(() => {
      const dist = Array(12).fill(0).map((_, i) => ({ hour: `${8 + i}h`, count: 0 }));
      bookings.forEach(b => {
          if (b.status === BookingStatus.CANCELED || b.status === BookingStatus.BLOCKED || b.status === BookingStatus.MAINTENANCE) return;
          const hour = parseInt(b.startTime.split(':')[0]);
          if (hour >= 8 && hour < 20) {
              dist[hour - 8].count += 1;
          }
      });
      return dist;
  }, [bookings]);

  const StatCard = ({ title, value, subtitle, icon: Icon, color, bgIconColor }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between transition-transform hover:scale-[1.02] hover:shadow-md">
      <div>
        <p className="text-sm text-stone-500 font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-stone-800">{value}</h3>
        {subtitle && <p className="text-xs text-stone-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${bgIconColor || 'bg-stone-50'}`}>
        <Icon size={24} className={color} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
            title="Total Réservations" 
            value={stats.total} 
            icon={CalendarCheck} 
            color="text-blue-600" 
            bgIconColor="bg-blue-50" 
        />
        <StatCard 
            title="Total Clients (Pax)" 
            value={stats.totalPax} 
            icon={Users} 
            color="text-brand-600" 
            bgIconColor="bg-brand-50" 
        />
        <StatCard 
            title="Taux d'occupation" 
            value={`${stats.occupancy}%`} 
            icon={Activity} 
            color="text-orange-600" 
            bgIconColor="bg-orange-50" 
        />
        <StatCard 
            title="Durée moyenne" 
            value={`${stats.avgDuration} min`} 
            icon={Clock} 
            color="text-purple-600" 
            bgIconColor="bg-purple-50" 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard 
            title="Présents / Confirmés" 
            value={stats.confirmed} 
            subtitle={`${stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}% du total`}
            icon={CheckCircle} 
            color="text-emerald-600" 
            bgIconColor="bg-emerald-50" 
        />
        <StatCard 
            title="No-Shows" 
            value={stats.noShows} 
            subtitle={`${stats.total > 0 ? Math.round((stats.noShows / stats.total) * 100) : 0}% du total`}
            icon={UserX} 
            color="text-red-600" 
            bgIconColor="bg-red-50" 
        />
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-center transition-transform hover:scale-[1.02] hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-stone-500 font-medium">État des paiements</p>
                <div className="p-2 rounded-xl bg-stone-50">
                    <CreditCard size={20} className="text-stone-600" />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-lg font-bold text-stone-800">{stats.paidCount}</span>
                </div>
                <div className="h-4 w-px bg-stone-200"></div>
                <div className="flex items-center gap-2">
                    <XCircle size={16} className="text-red-400" />
                    <span className="text-lg font-bold text-stone-800">{stats.unpaidCount}</span>
                </div>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5 mt-3 overflow-hidden flex">
                <div className="bg-emerald-500 h-1.5" style={{ width: `${stats.total > 0 ? (stats.paidCount / stats.total) * 100 : 0}%` }}></div>
                <div className="bg-red-400 h-1.5" style={{ width: `${stats.total > 0 ? (stats.unpaidCount / stats.total) * 100 : 0}%` }}></div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
          <h4 className="text-lg font-semibold text-stone-800 mb-6">Répartition par Statut</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-sm text-stone-600">
              {typeData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></span>
                      {entry.name}
                  </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
          <h4 className="text-lg font-semibold text-stone-800 mb-6">Activité Horaire</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" fill="#4c4eab" radius={[4, 4, 0, 0]} name="Réservations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};