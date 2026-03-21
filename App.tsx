import React, { useState, useEffect } from 'react';
import { Calendar, LayoutDashboard, Settings, Plus, Search, Menu, X, Loader2, ChevronLeft, ChevronRight, LogOut, History } from 'lucide-react';
import { Space, Booking } from './types';
import { PlanningGrid } from './components/PlanningGrid';
import { Dashboard } from './components/Dashboard';
import { Modal } from './components/Modal';
import { BookingForm } from './components/BookingForm';
import { Button } from './components/Button';
import { SpaceManager } from './components/SpaceManager';
import { Login } from './components/Login';
import { Logs } from './components/Logs';
import { supabase } from './supabaseClient';
import Cookies from 'js-cookie';

enum View {
  DASHBOARD = 'DASHBOARD',
  CALENDAR = 'CALENDAR',
  SETTINGS = 'SETTINGS',
  LOGS = 'LOGS',
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<View>(View.CALENDAR);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Data State
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [initialFormState, setInitialFormState] = useState<any>(null);

  // Check Auth on Mount
  useEffect(() => {
    const authCookie = Cookies.get('boreales_auth');
    if (authCookie === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsLoadingData(false); // Stop loading if not authenticated
    }
  }, []);

  const handleLogout = () => {
    Cookies.remove('boreales_auth');
    setIsAuthenticated(false);
  };

  // Fetch Data from Supabase
  const fetchData = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingData(true);
    try {
        const { data: spacesData, error: spacesError } = await supabase.from('spaces').select('*').order('name');
        
        // Fetch bookings ONLY for selected date to optimize
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('*')
            .eq('date', selectedDate);

        if (spacesError) throw spacesError;
        if (bookingsError) throw bookingsError;

        const mappedSpaces = spacesData?.map((s: any) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            capacity: s.capacity
        })) || [];

        const mappedBookings = bookingsData?.map((b: any) => ({
            id: b.id,
            spaceId: b.space_id,
            customerName: b.customer_name,
            serviceName: b.service_name,
            date: b.date,
            startTime: b.start_time,
            durationMinutes: b.duration_minutes,
            breakMinutes: b.break_minutes,
            pax: b.pax || 1,
            status: b.status,
            isPaid: b.is_paid || false,
            roomNumber: b.room_number
        })) || [];

        setSpaces(mappedSpaces);
        setBookings(mappedBookings);

    } catch (error) {
        console.error("Supabase load error", error);
        setSpaces([]);
        setBookings([]);
    } finally {
        setIsLoadingData(false);
    }
  };

  useEffect(() => {
      fetchData();
  }, [selectedDate, isAuthenticated]);

  // Logging Helper
  const logAction = async (action: 'CREATE' | 'UPDATE' | 'DELETE', entity_type: 'BOOKING' | 'SPACE', entity_id: string, details: string) => {
    try {
      await supabase.from('logs').insert({
        action,
        entity_type,
        entity_id,
        details
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  };

  // Handlers
  const handleSlotClick = (spaceId: string, time: string) => {
    setEditingBooking(null);
    setInitialFormState({ spaceId, startTime: time, durationMinutes: 60, date: selectedDate, pax: 1 });
    setIsModalOpen(true);
  };

  const handleBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setInitialFormState(booking);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    // Optimistic Update
    const tempId = Math.random().toString(36).substr(2, 9);
    const newBooking = { ...data, id: editingBooking ? editingBooking.id : tempId };
    
    // Prepare DB object (snake_case)
    const dbBooking = {
        space_id: data.spaceId,
        customer_name: data.customerName,
        service_name: data.serviceName,
        date: data.date,
        start_time: data.startTime,
        duration_minutes: data.durationMinutes,
        break_minutes: data.breakMinutes,
        pax: data.pax,
        status: data.status,
        is_paid: data.isPaid,
        room_number: data.roomNumber
    };

    const isSameDate = data.date === selectedDate;

    if (editingBooking) {
      if (isSameDate) {
          setBookings(prev => prev.map(b => b.id === editingBooking.id ? newBooking : b));
      } else {
          setBookings(prev => prev.filter(b => b.id !== editingBooking.id));
      }
      await supabase.from('bookings').update(dbBooking).eq('id', editingBooking.id);
      await logAction('UPDATE', 'BOOKING', editingBooking.id, `Réservation modifiée: ${data.customerName} (${data.serviceName})`);
    } else {
      if (isSameDate) {
          setBookings(prev => [...prev, newBooking]);
      }
      const { data: created, error } = await supabase.from('bookings').insert(dbBooking).select().single();
      if(created && isSameDate) {
          setBookings(prev => prev.map(b => b.id === tempId ? { ...newBooking, id: created.id } : b));
          await logAction('CREATE', 'BOOKING', created.id, `Nouvelle réservation: ${data.customerName} (${data.serviceName})`);
      }
    }
    
    setIsModalOpen(false);
    setEditingBooking(null);
  };

  const handleDeleteBooking = async (id: string) => {
      const booking = bookings.find(b => b.id === id);
      setBookings(prev => prev.filter(b => b.id !== id));
      await supabase.from('bookings').delete().eq('id', id);
      if (booking) {
          await logAction('DELETE', 'BOOKING', id, `Réservation supprimée: ${booking.customerName}`);
      }
      setIsModalOpen(false);
  };

  const handleAddSpace = async (space: Omit<Space, 'id'>) => {
      const { data, error } = await supabase.from('spaces').insert(space).select().single();
      if (data) {
          setSpaces(prev => [...prev, { ...space, id: data.id }]);
          await logAction('CREATE', 'SPACE', data.id, `Nouvel espace: ${space.name}`);
      }
  };

  const handleUpdateSpace = async (space: Space) => {
      setSpaces(prev => prev.map(s => s.id === space.id ? space : s));
      await supabase.from('spaces').update({
          name: space.name,
          type: space.type,
          capacity: space.capacity
      }).eq('id', space.id);
      await logAction('UPDATE', 'SPACE', space.id, `Espace modifié: ${space.name}`);
  };

  const handleDeleteSpace = async (id: string) => {
      const space = spaces.find(s => s.id === id);
      setSpaces(prev => prev.filter(s => s.id !== id));
      await supabase.from('spaces').delete().eq('id', id);
      if (space) {
          await logAction('DELETE', 'SPACE', id, `Espace supprimé: ${space.name}`);
      }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const changeDate = (days: number) => {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + days);
      setSelectedDate(date.toISOString().split('T')[0]);
  };

  const searchResults = bookings.filter(b => 
      searchQuery && (
          b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
          b.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.roomNumber && b.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      )
  );

  const handleSelectSearchResult = (booking: Booking) => {
      setCurrentView(View.CALENDAR);
      setHighlightedBookingId(booking.id);
      setSearchQuery('');
      setIsSearchOpen(false);
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
          setHighlightedBookingId(null);
      }, 3000);
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-stone-50 text-stone-800 font-sans overflow-hidden">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-stone-900 text-white flex flex-col shadow-xl transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://i.ibb.co/HTQmyZX1/BRS-Infos-pratiques-1.png" 
                    alt="Logo Les Boréales" 
                    className="w-full h-full object-cover"
                  />
              </div>
              <span className="font-serif font-bold text-xl tracking-tight">Les Boréales</span>
            </div>
            <button onClick={toggleSidebar} className="md:hidden text-stone-400 hover:text-white">
              <X size={20} />
            </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => { setCurrentView(View.CALENDAR); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === View.CALENDAR ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/50' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}
          >
            <Calendar size={20} />
            <span className="font-medium">Planning</span>
          </button>
          
          <button 
             onClick={() => { setCurrentView(View.DASHBOARD); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === View.DASHBOARD ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/50' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Tableau de bord</span>
          </button>

          <button 
             onClick={() => { setCurrentView(View.SETTINGS); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === View.SETTINGS ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/50' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}
          >
            <Settings size={20} />
            <span className="font-medium">Paramètres</span>
          </button>

          <button 
             onClick={() => { setCurrentView(View.LOGS); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === View.LOGS ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/50' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}
          >
            <History size={20} />
            <span className="font-medium">Historique (Logs)</span>
          </button>
        </nav>

        <div className="p-4 border-t border-stone-800">
          <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-stone-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={20} />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden w-full">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-[60]">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="md:hidden text-stone-500 hover:text-stone-700">
              <Menu size={24} />
            </button>
            <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                 <h2 className="text-lg font-bold text-stone-800 hidden md:block">
                    {currentView === View.CALENDAR && 'Planning'}
                    {currentView === View.DASHBOARD && 'Vue d\'ensemble'}
                    {currentView === View.SETTINGS && 'Configuration'}
                    {currentView === View.LOGS && 'Journal d\'activité'}
                </h2>
                {(currentView === View.CALENDAR || currentView === View.DASHBOARD) && (
                    <div className="flex items-center bg-stone-100 rounded-lg p-1">
                        <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white rounded-md text-stone-500 transition-all"><ChevronLeft size={16}/></button>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none text-xs md:text-sm font-medium text-stone-700 px-2 outline-none w-28 md:w-auto"
                        />
                        <button onClick={() => changeDate(1)} className="p-1 hover:bg-white rounded-md text-stone-500 transition-all"><ChevronRight size={16}/></button>
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden lg:block z-50">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher un client..." 
                  value={searchQuery}
                  onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                  className="pl-10 pr-4 py-2 bg-stone-100 rounded-full text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-brand-900 transition-all outline-none w-48 lg:w-64" 
                />
                {isSearchOpen && searchQuery && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden max-h-64 overflow-y-auto">
                        {searchResults.length > 0 ? (
                            <div className="py-1">
                                {searchResults.map(b => (
                                    <div 
                                        key={b.id} 
                                        className="px-4 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-0"
                                        onClick={() => handleSelectSearchResult(b)}
                                    >
                                        <div className="font-bold text-sm text-stone-800">{b.customerName}</div>
                                        <div className="text-xs text-stone-500">
                                            {b.serviceName} 
                                            {b.roomNumber && ` (${b.roomNumber})`} • {b.startTime}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-3 text-sm text-stone-500 text-center">Aucun résultat</div>
                        )}
                    </div>
                )}
            </div>
            {currentView === View.CALENDAR && (
                <Button onClick={() => { setEditingBooking(null); setInitialFormState({date: selectedDate, startTime: '09:00', durationMinutes: 60, pax: 1}); setIsModalOpen(true); }} className="whitespace-nowrap">
                    <Plus size={18} className="md:mr-2" /> 
                    <span className="hidden md:inline">Réserver</span>
                </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-stone-50/50 relative flex flex-col">
          {isLoadingData ? (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-30">
                 <Loader2 className="animate-spin text-brand-900 w-10 h-10" />
             </div>
          ) : (
            <>
                {currentView === View.CALENDAR && (
                    <div className="flex-1 p-2 md:p-6 overflow-hidden">
                        <PlanningGrid 
                            spaces={spaces} 
                            bookings={bookings} 
                            onSlotClick={handleSlotClick} 
                            onBookingClick={handleBookingClick}
                            highlightedBookingId={highlightedBookingId}
                        />
                    </div>
                )}
                {currentView === View.DASHBOARD && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        <Dashboard bookings={bookings} />
                    </div>
                )}
                {currentView === View.SETTINGS && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        <SpaceManager 
                            spaces={spaces} 
                            onAddSpace={handleAddSpace}
                            onUpdateSpace={handleUpdateSpace}
                            onDeleteSpace={handleDeleteSpace}
                        />
                    </div>
                )}
                {currentView === View.LOGS && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        <Logs />
                    </div>
                )}
            </>
          )}
        </div>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBooking ? "Modifier Réservation" : "Nouvelle Réservation"}
      >
        <BookingForm
            spaces={spaces}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsModalOpen(false)}
            initialData={initialFormState}
            currentBookings={bookings}
            onDelete={editingBooking ? () => handleDeleteBooking(editingBooking.id) : undefined}
        />
      </Modal>
    </div>
  );
};

export default App;