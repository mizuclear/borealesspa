import React, { useState, useEffect } from 'react';
import { Calendar, LayoutDashboard, Settings, Sparkles, Plus, Search, MessageSquare, Menu, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Space, Booking } from './types';
import { PlanningGrid } from './components/PlanningGrid';
import { Dashboard } from './components/Dashboard';
import { Modal } from './components/Modal';
import { BookingForm } from './components/BookingForm';
import { Button } from './components/Button';
import { SpaceManager } from './components/SpaceManager';
import { generateSmartScheduleSuggestion, analyzeDailySentiment } from './services/geminiService';
import { supabase } from './supabaseClient';

enum View {
  DASHBOARD = 'DASHBOARD',
  CALENDAR = 'CALENDAR',
  SETTINGS = 'SETTINGS',
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.CALENDAR);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Data State
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [initialFormState, setInitialFormState] = useState<any>(null);

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Fetch Data from Supabase
  const fetchData = async () => {
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
            status: b.status
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
  }, [selectedDate]);

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
        status: data.status
    };

    const isSameDate = data.date === selectedDate;

    if (editingBooking) {
      if (isSameDate) {
          setBookings(prev => prev.map(b => b.id === editingBooking.id ? newBooking : b));
      } else {
          setBookings(prev => prev.filter(b => b.id !== editingBooking.id));
      }
      await supabase.from('bookings').update(dbBooking).eq('id', editingBooking.id);
    } else {
      if (isSameDate) {
          setBookings(prev => [...prev, newBooking]);
      }
      const { data: created, error } = await supabase.from('bookings').insert(dbBooking).select().single();
      if(created && isSameDate) {
          setBookings(prev => prev.map(b => b.id === tempId ? { ...newBooking, id: created.id } : b));
      }
    }
    
    setIsModalOpen(false);
    setEditingBooking(null);
  };

  const handleDeleteBooking = async (id: string) => {
      setBookings(prev => prev.filter(b => b.id !== id));
      await supabase.from('bookings').delete().eq('id', id);
      setIsModalOpen(false);
  };

  const handleAddSpace = async (space: Omit<Space, 'id'>) => {
      const { data, error } = await supabase.from('spaces').insert(space).select().single();
      if (data) {
          setSpaces(prev => [...prev, { ...space, id: data.id }]);
      }
  };

  const handleUpdateSpace = async (space: Space) => {
      setSpaces(prev => prev.map(s => s.id === space.id ? space : s));
      await supabase.from('spaces').update({
          name: space.name,
          type: space.type,
          capacity: space.capacity
      }).eq('id', space.id);
  };

  const handleDeleteSpace = async (id: string) => {
      setSpaces(prev => prev.filter(s => s.id !== id));
      await supabase.from('spaces').delete().eq('id', id);
  };

  const handleAiAction = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    
    if (aiPrompt.toLowerCase().includes('analyse') || aiPrompt.toLowerCase().includes('résumé')) {
        const sentiment = await analyzeDailySentiment(bookings);
        setAiResponse(sentiment);
    } else {
        const suggestion = await generateSmartScheduleSuggestion(aiPrompt, spaces, bookings);
        setAiResponse(suggestion);
    }
    setIsAiLoading(false);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const changeDate = (days: number) => {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + days);
      setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-xl transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                  <Sparkles size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">ZenSpace</span>
            </div>
            <button onClick={toggleSidebar} className="md:hidden text-slate-400 hover:text-white">
              <X size={20} />
            </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => { setCurrentView(View.CALENDAR); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === View.CALENDAR ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Calendar size={20} />
            <span className="font-medium">Planning</span>
          </button>
          
          <button 
             onClick={() => { setCurrentView(View.DASHBOARD); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === View.DASHBOARD ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Tableau de bord</span>
          </button>

          <button 
             onClick={() => { setCurrentView(View.SETTINGS); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === View.SETTINGS ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings size={20} />
            <span className="font-medium">Paramètres</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="bg-slate-800 rounded-lg p-4 cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => setShowAiPanel(!showAiPanel)}>
               <div className="flex items-center gap-3 mb-2">
                   <div className="bg-gradient-to-br from-purple-500 to-indigo-500 p-2 rounded-md">
                        <MessageSquare size={16} className="text-white" />
                   </div>
                   <span className="font-semibold text-sm">Assistant IA</span>
               </div>
               <p className="text-xs text-slate-400">Demander de l'aide...</p>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden w-full">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="md:hidden text-slate-500 hover:text-slate-700">
              <Menu size={24} />
            </button>
            <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                 <h2 className="text-lg font-bold text-slate-800 hidden md:block">
                    {currentView === View.CALENDAR && 'Planning'}
                    {currentView === View.DASHBOARD && 'Vue d\'ensemble'}
                    {currentView === View.SETTINGS && 'Configuration'}
                </h2>
                {currentView !== View.SETTINGS && (
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><ChevronLeft size={16}/></button>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none text-xs md:text-sm font-medium text-slate-700 px-2 outline-none w-28 md:w-auto"
                        />
                        <button onClick={() => changeDate(1)} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><ChevronRight size={16}/></button>
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Rechercher..." className="pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all outline-none w-48 lg:w-64" />
            </div>
            {currentView === View.CALENDAR && (
                <Button onClick={() => { setEditingBooking(null); setInitialFormState({date: selectedDate, startTime: '09:00', durationMinutes: 60, pax: 1}); setIsModalOpen(true); }} className="whitespace-nowrap">
                    <Plus size={18} className="md:mr-2" /> 
                    <span className="hidden md:inline">Réserver</span>
                </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50/50 relative">
          {isLoadingData ? (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-30">
                 <Loader2 className="animate-spin text-teal-600 w-10 h-10" />
             </div>
          ) : (
            <>
                {currentView === View.CALENDAR && (
                    <PlanningGrid 
                        spaces={spaces} 
                        bookings={bookings} 
                        onSlotClick={handleSlotClick} 
                        onBookingClick={handleBookingClick}
                    />
                )}
                {currentView === View.DASHBOARD && (
                    <Dashboard bookings={bookings} />
                )}
                {currentView === View.SETTINGS && (
                    <SpaceManager 
                        spaces={spaces} 
                        onAddSpace={handleAddSpace}
                        onUpdateSpace={handleUpdateSpace}
                        onDeleteSpace={handleDeleteSpace}
                    />
                )}
            </>
          )}

           {showAiPanel && (
               <div className="absolute right-0 bottom-0 md:right-6 md:bottom-6 w-full md:w-96 h-[50vh] md:h-auto md:max-h-[600px] bg-white md:rounded-xl shadow-2xl border-t md:border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 z-50">
                   <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                       <div className="flex items-center gap-2">
                            <Sparkles size={18} />
                            <span className="font-semibold">Assistant Gemini</span>
                       </div>
                       <button onClick={() => setShowAiPanel(false)} className="hover:bg-white/20 p-1 rounded"><X size={16} /></button>
                   </div>
                   <div className="p-4 flex-1 overflow-y-auto bg-slate-50 min-h-[200px]">
                        {aiResponse ? (
                            <div className="bg-white p-3 rounded-lg shadow-sm text-sm border border-slate-200 mb-4 whitespace-pre-wrap">
                                {aiResponse}
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 text-sm mt-8">
                                <p>Essayez de demander :</p>
                                <ul className="mt-2 space-y-2 text-xs">
                                    <li className="bg-white p-2 rounded cursor-pointer hover:text-purple-600" onClick={() => setAiPrompt("Trouve un créneau de 1h pour massage et sauna")}>"Trouve un créneau..."</li>
                                    <li className="bg-white p-2 rounded cursor-pointer hover:text-purple-600" onClick={() => setAiPrompt("Analyse le sentiment du planning d'aujourd'hui")}>"Analyse le planning..."</li>
                                </ul>
                            </div>
                        )}
                   </div>
                   <div className="p-3 border-t border-slate-100 bg-white">
                       <textarea 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Votre demande..." 
                            className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-16 md:h-20"
                       />
                       <div className="flex justify-end mt-2">
                           <Button size="sm" onClick={handleAiAction} isLoading={isAiLoading} className="bg-purple-600 hover:bg-purple-700">
                               Envoyer
                           </Button>
                       </div>
                   </div>
               </div>
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