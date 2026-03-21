import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Log } from '../types';
import { Loader2, Clock, Activity } from 'lucide-react';

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
          // If the table doesn't exist yet, it will throw an error. We catch it gracefully.
          console.error('Error fetching logs (Table might not exist yet):', error);
          setLogs([]);
      } else {
          setLogs(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'UPDATE': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'DELETE': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-stone-700 bg-stone-50 border-stone-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-brand-900 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-800">Journal d'activité</h2>
          <p className="text-stone-500 text-sm mt-1">Historique des 100 dernières actions sur la plateforme</p>
        </div>
        <button onClick={fetchLogs} className="p-2 text-stone-400 hover:text-brand-900 hover:bg-brand-50 rounded-lg transition-colors" title="Rafraîchir">
          <Activity size={20} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Activity size={48} className="text-stone-300 mb-4" />
            <h3 className="text-lg font-bold text-stone-700 mb-2">Aucun historique disponible</h3>
            <p className="text-stone-500 max-w-md mx-auto">
              Si vous venez d'ajouter cette fonctionnalité, n'oubliez pas d'exécuter la commande SQL dans Supabase pour créer la table <code>logs</code>.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-stone-50 transition-colors flex items-start gap-4">
                <div className="mt-1">
                  <Clock size={16} className="text-stone-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      {log.entity_type}
                    </span>
                    <span className="text-xs text-stone-400 ml-auto">
                      {formatTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-stone-700">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
