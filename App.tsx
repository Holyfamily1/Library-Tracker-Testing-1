
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Session, Patron, AppSettings, UserRole } from './types';
import { supabase, isSupabaseConfigured, verifyDatabaseConnection } from './lib/supabase';
import { MOCK_STUDENTS } from './constants';
import Dashboard from './components/Dashboard';
import CheckIn from './components/CheckIn';
import ActiveSessions from './components/ActiveSessions';
import Analytics from './components/Analytics';
import Leaderboard from './components/Leaderboard';
import History from './components/History';
import StudentManagement from './components/StudentManagement';
import Settings from './components/Settings';
import Auth from './components/Auth';
import ChatBot from './components/ChatBot';
import { sendOverdueAlert } from './services/notificationService';

export type SyncStatus = 'online' | 'syncing' | 'offline' | 'error';

const DEFAULT_SETTINGS: AppSettings = {
  dailyCapacity: 120,
  aiInsightsEnabled: true,
  autoCheckoutEnabled: false,
  autoCheckoutHours: 12,
  notifications: { 
    enabled: true, 
    email: 'bhfnmtclibrary@gmail.com', 
    thresholdMinutes: 180 
  },
  idConfig: {
    studentPrefix: 'ST',
    academicStaffPrefix: 'AS',
    nonAcademicStaffPrefix: 'NAS',
    visitorPrefix: 'EV',
    padding: 3
  }
};

const SidebarContent = ({ 
  onSignOut, 
  onItemClick, 
  role, 
  isDemo, 
  onLoginClick,
  syncStatus,
  isDarkMode,
  toggleTheme,
  user,
  isCollapsed,
  toggleCollapse
}: { 
  onSignOut: () => void, 
  onItemClick?: () => void, 
  role: UserRole, 
  isDemo: boolean,
  onLoginClick: () => void,
  syncStatus: SyncStatus,
  isDarkMode: boolean,
  toggleTheme: () => void,
  user: any,
  isCollapsed: boolean,
  toggleCollapse: () => void
}) => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'fa-th-large', roles: ['admin', 'librarian'] },
    { path: '/check-in', label: 'Check In/Out', icon: 'fa-user-check', roles: ['admin', 'librarian'] },
    { path: '/active', label: 'Active Patrons', icon: 'fa-users', roles: ['admin', 'librarian'] },
    { path: '/patrons', label: 'Patron Registry', icon: 'fa-address-book', roles: ['admin', 'librarian'] },
    { path: '/analytics', label: 'Analytics', icon: 'fa-chart-simple', roles: ['admin', 'librarian'] },
    { path: '/leaderboard', label: 'Leaderboard', icon: 'fa-trophy', roles: ['admin', 'librarian'] },
    { path: '/history', label: 'History', icon: 'fa-history', roles: ['admin', 'librarian'] },
    { path: '/settings', label: 'Settings', icon: 'fa-cog', roles: ['admin'] },
  ];

  const userInitial = user?.email ? user.email[0].toUpperCase() : 'G';

  const ToggleBtn = ({ className }: { className: string }) => (
    <button 
      onClick={toggleCollapse}
      className={`hidden md:flex absolute -right-4 w-8 h-8 bg-amber-500 text-slate-900 rounded-full items-center justify-center shadow-lg border-2 border-slate-950 z-[60] hover:bg-amber-400 transition-all hover:scale-110 active:scale-95 ${className}`}
    >
      <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-[10px]`}></i>
    </button>
  );

  return (
    <div className="flex flex-col h-full relative group/sidebar">
      <ToggleBtn className="top-10" />
      <ToggleBtn className="top-1/2 -translate-y-1/2" />
      <ToggleBtn className="bottom-24" />

      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all duration-300`}>
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-xl shadow-indigo-500/10 p-1.5 border border-slate-800 shrink-0">
            <img 
              src="logo.png" 
              alt="HF NMTC Logo" 
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.src = 'https://i.imgur.com/8N8H1nU.png'; }}
            />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-500 truncate">
              <h1 className="text-white font-black text-[10px] md:text-xs leading-none tracking-tight mb-1 whitespace-nowrap uppercase">Holy Family Library</h1>
              <p className="text-[7px] md:text-[8px] text-indigo-400 uppercase font-black tracking-widest whitespace-nowrap">NMTC Berekum</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg bg-slate-800 text-amber-500 flex items-center justify-center hover:bg-slate-700 transition-colors shrink-0"
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
          </button>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2' : 'px-3'}`}>
        <ul className="space-y-1">
          {navItems.filter(item => item.roles.includes(role)).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onItemClick}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive 
                      ? 'bg-amber-500 text-[#0f172a] font-black shadow-lg' 
                      : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                  }`}
                >
                  <i className={`fas ${item.icon} ${isCollapsed ? 'text-lg' : 'w-5 text-center'} ${isActive ? 'text-[#0f172a]' : 'text-slate-500 group-hover:text-white'}`}></i>
                  {!isCollapsed && <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`mt-auto border-t border-slate-800/50 bg-[#0c1221] transition-all duration-300 ${isCollapsed ? 'px-2 py-4' : 'px-6 py-5'}`}>
        <div className="flex flex-col space-y-4">
           <div className={`flex items-center ${isCollapsed ? 'justify-center p-1' : 'space-x-3 p-3'} bg-white/5 rounded-2xl border border-white/5 w-full`}>
             <div className={`w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0`}>
               {userInitial}
             </div>
             {!isCollapsed && (
               <div className="min-w-0 overflow-hidden">
                 <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest leading-none mb-1">Staff</p>
                 <p className="text-white text-xs font-bold truncate">
                   {isDemo ? 'Guest' : (user?.email?.split('@')[0] || 'Staff')}
                 </p>
               </div>
             )}
           </div>

           {!isCollapsed && (
             <div className="flex items-center space-x-2 px-1">
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {isDemo ? 'Offline' : `Cloud ${syncStatus}`}
                </span>
             </div>
           )}
          
          <button 
            onClick={isDemo ? onLoginClick : onSignOut}
            className={`flex items-center justify-center ${isCollapsed ? 'p-3' : 'w-full px-4 py-3'} ${isDemo ? 'bg-amber-500 text-slate-900' : 'bg-rose-50/5 text-rose-500 hover:bg-rose-500 hover:text-white'} rounded-xl transition-all text-[10px] font-black uppercase tracking-widest`}
          >
            <i className={`fas ${isDemo ? 'fa-sign-in-alt' : 'fa-power-off'}`}></i>
            {!isCollapsed && <span className="ml-2">{isDemo ? 'Login' : 'Logout'}</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole>('librarian');
  const [authLoading, setAuthLoading] = useState(true);
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [sessionHistory, setSessionHistory] = useState<Session[]>([]);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [demoMode, setDemoMode] = useState(!isSupabaseConfigured);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const activeSessionsRef = useRef<Session[]>([]);
  useEffect(() => { activeSessionsRef.current = activeSessions; }, [activeSessions]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const fetchData = useCallback(async (silent = false) => {
    if (demoMode || !isSupabaseConfigured) {
      if (patrons.length === 0) setPatrons(MOCK_STUDENTS);
      setSyncStatus('offline');
      return;
    }
    
    if (!silent) setSyncStatus('syncing');

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [patronRes, activeRes, historyRes, todayRes, settingsRes] = await Promise.all([
        supabase.from('patrons').select('*'),
        supabase.from('sessions').select('*').is('check_out', null),
        supabase.from('sessions').select('*').not('check_out', 'is', null).order('check_out', { ascending: false }).limit(100),
        supabase.from('sessions').select('*').gte('check_in', startOfDay.toISOString()),
        supabase.from('settings').select('*').eq('id', 'global_config').maybeSingle()
      ]);

      if (patronRes.error) throw patronRes.error;
      if (activeRes.error) throw activeRes.error;
      if (historyRes.error) throw historyRes.error;
      if (todayRes.error) throw todayRes.error;

      if (patronRes.data) {
        setPatrons(patronRes.data.map(p => ({
          ...p,
          firstName: p.first_name || '',
          surname: p.surname || '',
          name: p.name || `${p.first_name || ''} ${p.surname || ''}`.trim(),
          totalHours: p.total_hours || 0
        })));
      }

      if (activeRes.data) {
        setActiveSessions(activeRes.data.map(s => ({
          id: s.id,
          studentId: s.patron_id,
          checkIn: new Date(s.check_in),
          alertTriggered: s.alert_triggered
        })));
      }

      if (historyRes.data) {
        setSessionHistory(historyRes.data.map(s => ({
          id: s.id,
          studentId: s.patron_id,
          checkIn: new Date(s.check_in), 
          checkOut: new Date(s.check_out),
          duration: s.duration,
          notes: s.notes
        })));
      }

      if (todayRes.data) {
        setTodaySessions(todayRes.data.map(s => ({
          id: s.id,
          studentId: s.patron_id,
          checkIn: new Date(s.check_in),
          checkOut: s.check_out ? new Date(s.check_out) : undefined,
          duration: s.duration,
          notes: s.notes
        })));
      }

      if (settingsRes.data) {
        setAppSettings({
          dailyCapacity: settingsRes.data.daily_capacity ?? DEFAULT_SETTINGS.dailyCapacity,
          aiInsightsEnabled: settingsRes.data.ai_insights_enabled ?? DEFAULT_SETTINGS.aiInsightsEnabled,
          autoCheckoutEnabled: settingsRes.data.auto_checkout_enabled ?? DEFAULT_SETTINGS.autoCheckoutEnabled,
          autoCheckoutHours: settingsRes.data.auto_checkout_hours ?? DEFAULT_SETTINGS.autoCheckoutHours,
          notifications: {
            enabled: settingsRes.data.notif_enabled ?? DEFAULT_SETTINGS.notifications.enabled,
            email: settingsRes.data.notif_email ?? DEFAULT_SETTINGS.notifications.email,
            thresholdMinutes: settingsRes.data.notif_threshold_mins ?? DEFAULT_SETTINGS.notifications.thresholdMinutes
          },
          idConfig: settingsRes.data.id_config || DEFAULT_SETTINGS.idConfig
        });
      }

      setSyncStatus('online');
      setLastSync(new Date());
    } catch (error: any) {
      setSyncStatus('error');
      setSyncError(error.message);
    }
  }, [demoMode]);

  // REAL-TIME SUBSCRIPTION: This ensures all devices update immediately on any DB change
  useEffect(() => {
    if (demoMode || !isSupabaseConfigured) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrons' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchData(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [demoMode, fetchData]);

  const handleCheckOut = useCallback(async (sessionId: string, notes?: string) => {
    const sessionToClose = activeSessionsRef.current.find(s => s.id === sessionId);
    if (!sessionToClose) return;

    try {
      const checkOutTime = new Date();
      const duration = Math.round((checkOutTime.getTime() - sessionToClose.checkIn.getTime()) / 60000);
      
      if (!demoMode && isSupabaseConfigured) {
        const { error } = await supabase.from('sessions').update({ 
          check_out: checkOutTime.toISOString(), 
          duration: Math.max(1, duration),
          notes: notes || "Manual Checkout" 
        }).eq('id', sessionId);
        
        if (error) throw error;
        // The real-time listener will trigger the UI update
      } else {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        const closedSession = { ...sessionToClose, checkOut: checkOutTime, duration: Math.max(1, duration), notes: notes || "Manual Checkout" };
        setSessionHistory(prev => [closedSession, ...prev]);
        setTodaySessions(prev => prev.map(s => s.id === sessionId ? closedSession : s));
      }
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err.message);
    }
  }, [demoMode]);

  const handleCheckIn = async (studentId: string) => {
    if (activeSessions.some(s => s.studentId === studentId)) return;
    const now = new Date();
    
    try {
      if (!demoMode && isSupabaseConfigured) {
        const { error } = await supabase.from('sessions').insert([{ 
          patron_id: studentId, 
          check_in: now.toISOString() 
        }]);
        if (error) throw error;
      } else {
        const student = patrons.find(s => s.id === studentId);
        const tempId = `local-${Date.now()}`;
        const newSession = { id: tempId, studentId, studentName: student?.name, checkIn: now };
        setActiveSessions(prev => [...prev, newSession]);
        setTodaySessions(prev => [...prev, newSession]);
      }
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err.message);
    }
  };

  const saveGlobalSettings = async (newSettings: AppSettings) => {
    if (demoMode || !isSupabaseConfigured) {
      setAppSettings(newSettings);
      return;
    }

    try {
      const { error } = await supabase.from('settings').upsert({
        id: 'global_config',
        daily_capacity: newSettings.dailyCapacity,
        ai_insights_enabled: newSettings.aiInsightsEnabled,
        auto_checkout_enabled: newSettings.autoCheckoutEnabled,
        auto_checkout_hours: newSettings.autoCheckoutHours,
        notif_enabled: newSettings.notifications.enabled,
        notif_email: newSettings.notifications.email,
        notif_threshold_mins: newSettings.notifications.thresholdMinutes,
        id_config: newSettings.idConfig
      });
      if (error) throw error;
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err.message);
    }
  };

  useEffect(() => {
    const monitor = async () => {
      const current = activeSessionsRef.current;
      if (current.length === 0) return;
      
      const now = new Date();
      for (const session of current) {
        const durationMins = (now.getTime() - session.checkIn.getTime()) / 60000;
        if (durationMins < 0) continue;

        if (appSettings.autoCheckoutEnabled && durationMins >= (appSettings.autoCheckoutHours * 60)) {
          await handleCheckOut(session.id, "Auto-Checkout: System Time Limit Reached");
          continue;
        }

        if (appSettings.notifications.enabled && !session.alertTriggered && durationMins >= appSettings.notifications.thresholdMinutes) {
          const patron = patrons.find(p => p.id === session.studentId);
          if (patron) {
            await sendOverdueAlert(patron, Math.floor(durationMins), appSettings.notifications.email);
            if (!demoMode) await supabase.from('sessions').update({ alert_triggered: true }).eq('id', session.id);
          }
        }
      }
    };

    const interval = setInterval(monitor, 60000);
    return () => clearInterval(interval);
  }, [appSettings.autoCheckoutEnabled, appSettings.autoCheckoutHours, appSettings.notifications, patrons, handleCheckOut, demoMode]);

  useEffect(() => {
    const init = async () => {
      setAuthLoading(true);
      if (isSupabaseConfigured) {
        const health = await verifyDatabaseConnection();
        if (health.success) {
          const { data: { session: s } } = await supabase.auth.getSession();
          setSession(s);
          if (s?.user) setUserRole(s.user.user_metadata?.role || 'librarian');
          setDemoMode(false);
          await fetchData();
        } else {
          setDemoMode(true);
        }
      }
      setAuthLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setDemoMode(false);
        setUserRole(newSession.user.user_metadata?.role || 'librarian');
        fetchData();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  const handleSignOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setSession(null);
    setUserRole('librarian');
    setDemoMode(true);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-amber-500 font-black tracking-widest uppercase">Initializing Holy Family Portal...</div>;
  if (!session && !demoMode) return <Auth onAuthComplete={() => fetchData()} onClose={() => setDemoMode(true)} />;

  return (
    <HashRouter>
      <div className="flex bg-[#f8fafc] dark:bg-slate-950 min-h-screen transition-colors duration-300">
        <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#0f172a] text-slate-400 min-h-screen hidden md:flex flex-col sticky top-0 border-r border-slate-800 transition-all z-50`}>
          <SidebarContent 
            onSignOut={handleSignOut} 
            role={userRole} 
            isDemo={demoMode}
            onLoginClick={() => setDemoMode(false)}
            syncStatus={syncStatus}
            isDarkMode={isDarkMode}
            toggleTheme={() => setIsDarkMode(!isDarkMode)}
            user={session?.user}
            isCollapsed={isSidebarCollapsed}
            toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#0f172a] text-white">
            <span className="font-black text-xs">HF LIBRARY</span>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-amber-500"><i className="fas fa-bars"></i></button>
          </header>

          {isSidebarOpen && (
            <div className="md:hidden fixed inset-0 bg-black/60 z-[100]" onClick={() => setIsSidebarOpen(false)}>
              <div className="w-64 h-full bg-[#0f172a]" onClick={e => e.stopPropagation()}>
                <SidebarContent 
                  onSignOut={handleSignOut} 
                  onItemClick={() => setIsSidebarOpen(false)} 
                  role={userRole}
                  isDemo={demoMode}
                  onLoginClick={() => setDemoMode(false)}
                  syncStatus={syncStatus}
                  isDarkMode={isDarkMode}
                  toggleTheme={() => setIsDarkMode(!isDarkMode)}
                  user={session?.user}
                  isCollapsed={false}
                  toggleCollapse={() => {}}
                />
              </div>
            </div>
          )}

          <main className="flex-1 p-4 md:p-10 pb-32">
            <Routes>
              <Route path="/" element={<Dashboard activeSessions={activeSessions} todaySessions={todaySessions} students={patrons} appSettings={appSettings} syncStatus={syncStatus} syncError={syncError} lastSync={lastSync} onRefresh={() => fetchData()} />} />
              <Route path="/check-in" element={<CheckIn activeSessions={activeSessions} students={patrons} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} appSettings={appSettings} syncStatus={syncStatus} />} />
              <Route path="/active" element={<ActiveSessions activeSessions={activeSessions} students={patrons} onCheckOut={handleCheckOut} appSettings={appSettings} syncStatus={syncStatus} />} />
              <Route path="/patrons" element={<StudentManagement students={patrons} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} userRole={userRole} syncStatus={syncStatus} lastSync={lastSync} onRefresh={() => fetchData()} appSettings={appSettings} />} />
              <Route path="/analytics" element={<Analytics history={sessionHistory} students={patrons} />} />
              <Route path="/leaderboard" element={<Leaderboard history={sessionHistory} students={patrons} />} />
              <Route path="/history" element={<History history={sessionHistory} students={patrons} />} />
              <Route path="/settings" element={userRole === 'admin' ? <Settings appSettings={appSettings} onSettingsChange={saveGlobalSettings} currentUser={session?.user} onRefresh={() => fetchData()} syncStatus={syncStatus} /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <ChatBot students={patrons} activeSessions={activeSessions} history={sessionHistory} />
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
