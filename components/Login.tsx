import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import Cookies from 'js-cookie';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, this would be validated against a backend
    if (password === 'Boreales2026!') {
      Cookies.set('boreales_auth', 'true', { expires: 30 }); // Expires in 30 days
      onLogin();
    } else {
      setError('Mot de passe incorrect');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-brand-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg relative z-10 mb-4 overflow-hidden">
            <img 
              src="https://i.ibb.co/HTQmyZX1/BRS-Infos-pratiques-1.png" 
              alt="Logo Les Boréales" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-display font-bold text-white relative z-10">Les Boréales</h1>
          <p className="text-brand-200 mt-2 relative z-10 text-sm font-medium uppercase tracking-wider">Gestion Spa</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Mot de passe d'accès
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-stone-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-stone-300 focus:ring-brand-500 focus:border-brand-500'} rounded-xl bg-stone-50 focus:bg-white transition-colors`}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 animate-in slide-in-from-top-1">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-brand-900 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
            >
              Accéder au planning
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-stone-400">
        &copy; {new Date().getFullYear()} Les Boréales. Accès réservé.
      </p>
    </div>
  );
};
