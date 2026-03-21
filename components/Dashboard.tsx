import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Booking, BookingStatus } from '../types';
import { Users, CalendarCheck, Activity, UserX, CheckCircle } from 'lucide-react';

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
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN).length;
    const noShows = bookings.filter(b => b.status === BookingStatus.NO_SHOW).length;
    const occupancy = Math.round((bookings.reduce((acc, curr) => acc + curr.durationMinutes, 0) / (12 * 60 * 6)) * 100);

    return { total, confirmed, noShows, occupancy };
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
          const hour = parseInt(b.startTime.split(':')[0]);
          if (hour >= 8 && hour < 20) {
              dist[hour - 8].count += 1;
          }
      });
      return dist;
  }, [bookings]);

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 flex items-center justify-between transition-transform hover:scale-[1.02]">
      <div>
        <p className="text-sm text-stone-500 font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-stone-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Réservations" value={stats.total} icon={CalendarCheck} color="bg-blue-500" />
        <StatCard title="Présents / Confirmés" value={stats.confirmed} icon={CheckCircle} color="bg-brand-900" />
        <StatCard title="No-Shows" value={stats.noShows} icon={UserX} color="bg-stone-500" />
        <StatCard title="Taux d'occupation" value={`${stats.occupancy}%`} icon={Activity} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 flex flex-col">
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 flex flex-col">
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