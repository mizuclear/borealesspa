import React, { useState } from 'react';
import { Space } from '../types';
import { Button } from './Button';
import { Trash2, Plus, MapPin, Pencil, Check, X } from 'lucide-react';

interface SpaceManagerProps {
  spaces: Space[];
  onAddSpace: (space: Omit<Space, 'id'>) => Promise<void>;
  onUpdateSpace: (space: Space) => Promise<void>;
  onDeleteSpace: (id: string) => Promise<void>;
}

export const SpaceManager: React.FC<SpaceManagerProps> = ({ spaces, onAddSpace, onUpdateSpace, onDeleteSpace }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSpace, setNewSpace] = useState({ name: '', type: 'MASSAGE', capacity: 1 });
  const [loading, setLoading] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Space | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onAddSpace(newSpace);
    setLoading(false);
    setIsAdding(false);
    setNewSpace({ name: '', type: 'MASSAGE', capacity: 1 });
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('Êtes-vous sûr de vouloir supprimer cet espace ? Toutes les réservations associées seront perdues.')) {
          await onDeleteSpace(id);
      }
  }

  const startEditing = (space: Space) => {
      setEditingId(space.id);
      setEditForm({ ...space });
  };

  const cancelEditing = () => {
      setEditingId(null);
      setEditForm(null);
  };

  const saveEditing = async () => {
      if (editForm) {
          await onUpdateSpace(editForm);
          setEditingId(null);
          setEditForm(null);
      }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Gestion des Espaces</h2>
            <p className="text-slate-500 text-sm mt-1">Configurez les salles, cabines et zones de votre centre.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
          {isAdding ? 'Annuler' : <><Plus size={18} className="mr-2"/> Ajouter un espace</>}
        </Button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-teal-100 mb-8 animate-in slide-in-from-top-4 duration-300">
          <h3 className="font-semibold text-slate-800 mb-4">Nouvel Espace</h3>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'espace</label>
              <input
                required
                className="w-full rounded-lg border-slate-200 border p-2 text-sm focus:ring-teal-500"
                placeholder="ex: Cabine Duo"
                value={newSpace.name}
                onChange={e => setNewSpace({...newSpace, name: e.target.value})}
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                className="w-full rounded-lg border-slate-200 border p-2 text-sm focus:ring-teal-500"
                value={newSpace.type}
                onChange={e => setNewSpace({...newSpace, type: e.target.value})}
              >
                <option value="MASSAGE">Massage</option>
                <option value="SAUNA">Sauna</option>
                <option value="HAMMAM">Hammam</option>
                <option value="POOL">Piscine / Jacuzzi</option>
                <option value="RELAX">Relaxation</option>
                <option value="SPA">Spa / Espace Bien-être</option>
              </select>
            </div>
            <div className="w-full md:w-32">
                <label className="block text-sm font-medium text-slate-700 mb-1">Capacité</label>
                <input
                    type="number"
                    min="1"
                    className="w-full rounded-lg border-slate-200 border p-2 text-sm focus:ring-teal-500"
                    value={newSpace.capacity}
                    onChange={e => setNewSpace({...newSpace, capacity: Number(e.target.value)})}
                />
            </div>
            <Button type="submit" isLoading={loading}>Créer</Button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spaces.map(space => {
          const isEditing = editingId === space.id;
          
          if (isEditing && editForm) {
              return (
                  <div key={space.id} className="bg-white p-4 rounded-xl shadow-md border-2 border-teal-400 flex flex-col justify-between">
                      <div className="space-y-3">
                          <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase">Nom</label>
                              <input 
                                className="w-full border-b border-slate-300 focus:border-teal-500 outline-none py-1 text-sm font-medium text-slate-800"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                              />
                          </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
                              <select 
                                className="w-full border-b border-slate-300 focus:border-teal-500 outline-none py-1 text-sm text-slate-800 bg-transparent"
                                value={editForm.type}
                                onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                              >
                                <option value="MASSAGE">Massage</option>
                                <option value="SAUNA">Sauna</option>
                                <option value="HAMMAM">Hammam</option>
                                <option value="POOL">Piscine</option>
                                <option value="RELAX">Relaxation</option>
                                <option value="SPA">Spa</option>
                              </select>
                          </div>
                           <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase">Capacité</label>
                              <input 
                                type="number"
                                min="1"
                                className="w-full border-b border-slate-300 focus:border-teal-500 outline-none py-1 text-sm text-slate-800"
                                value={editForm.capacity}
                                onChange={(e) => setEditForm({...editForm, capacity: Number(e.target.value)})}
                              />
                          </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-100">
                          <button onClick={cancelEditing} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><X size={18}/></button>
                          <button onClick={saveEditing} className="p-2 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full"><Check size={18}/></button>
                      </div>
                  </div>
              )
          }

          return (
          <div key={space.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-teal-300 transition-colors">
            <div>
                <div className="flex items-start justify-between">
                    <div className="p-2 bg-slate-50 rounded-lg text-teal-600 mb-3">
                        <MapPin size={20} />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">{space.type}</span>
                        <button onClick={() => startEditing(space)} className="p-1 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors">
                            <Pencil size={14} />
                        </button>
                    </div>
                </div>
                <h4 className="font-bold text-slate-800">{space.name}</h4>
                <p className="text-sm text-slate-500 mt-1">Capacité: {space.capacity} pers.</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                <button 
                    onClick={() => handleDelete(space.id)}
                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                    <Trash2 size={16} /> Supprimer
                </button>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};
