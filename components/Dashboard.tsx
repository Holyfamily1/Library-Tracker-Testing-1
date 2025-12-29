
import React, { useMemo } from 'react';
import { Session, Patron, AppSettings } from '../types';
import { Link } from 'react-router-dom';

interface DashboardProps {
  activeSessions: Session[];
  todaySessions: Session[];
  students: Patron[];
  appSettings: AppSettings;
  syncStatus: 'online' | 'syncing' | 'offline' | 'error';
  syncError: string | null;
  lastSync: Date;
  onRefresh: () => void;
}

const StatCard = ({ title, value, bgColor, icon, trend, textColor = 'text-white' }: { 
  title: string, 
  value: string | number, 
  bgColor: string, 
  icon: string,
  trend?: { label: string, color: string },
  textColor?: string 
}) => (
  <div className={`${bgColor} rounded-[2.5rem] p-8 shadow-xl shadow-indigo-900/5 dark:shadow-black/20 flex flex-col justify-between min-h-[220px] transition-all hover:scale-[1.02] border border-white/5 group relative overflow-hidden`}>
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
    <div className="flex justify-between items-start">
      <div>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${textColor} opacity-60 mb-2`}>{title}</p>
        <h3 className={`text-5xl md:text-6xl font-black ${textColor} tracking-tighter`}>{value}</h3>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 ${textColor}`}>
        <i className={`fas ${icon} text-xl`}></i>
      </div>
    </div>
    {trend && (
      <div className="flex items-center space-x-2">
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-white/10 ${trend.color} uppercase tracking-widest`}>
          {trend.label}
        </span>
      </div>
    )}
  </div>
);

const CategoryStat = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
    <div className="flex items-center space-x-3">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-sm font-black text-[#0f172a] dark:text-white">{value}</span>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ 
  activeSessions, 
  todaySessions, 
  students, 
  appSettings, 
  syncStatus, 
  syncError, 
  lastSync, 
  onRefresh 
}) => {
  const getStudent = (id: string) => students.find(s => s.id === id);
  const capacity = appSettings.dailyCapacity;
  const remainingSeats = Math.max(0, capacity - activeSessions.length);
  const occupancyPercentage = Math.min((activeSessions.length / capacity) * 100, 100);

  // Advanced Metric Calculations
  const activeStudentsCount = useMemo(() => 
    activeSessions.filter(s => getStudent(s.studentId)?.category === 'Student').length
  , [activeSessions, students]);

  const activeOthersCount = activeSessions.length - activeStudentsCount;

  const todayVisits = todaySessions.length;
  
  const visitsByCategory = useMemo(() => {
    const stats = { Student: 0, Staff: 0, Visitor: 0 };
    todaySessions.forEach(session => {
      const cat = getStudent(session.studentId)?.category;
      if (cat === 'Student') stats.Student++;
      else if (cat?.includes('Staff')) stats.Staff++;
      else stats.Visitor++;
    });
    return stats;
  }, [todaySessions, students]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] dark:text-white tracking-tighter mb-2 transition-colors">Portal Dashboard</h2>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
               <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'} transition-colors`}></div>
               <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                 {syncStatus === 'online' ? 'Real-Time Engine Online' : syncStatus === 'syncing' ? 'Syncing...' : 'Connection Error'} 
                 <span className="mx-2 opacity-30">•</span> 
                 {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </p>
               <button onClick={onRefresh} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                 <i className="fas fa-sync-alt text-xs"></i>
               </button>
            </div>
            {syncError && (
              <p className="text-rose-500 text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/20 px-3 py-1 rounded-lg border border-rose-100 dark:border-rose-900/50">
                Data Error: {syncError}
              </p>
            )}
          </div>
        </div>
        {appSettings.aiInsightsEnabled && (
           <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex items-center space-x-3 max-w-sm transition-all hover:scale-105">
             <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 shrink-0">
                <i className="fas fa-brain"></i>
             </div>
             <p className="text-[10px] font-black text-amber-900 dark:text-amber-200 leading-tight uppercase tracking-tight">System AI: {occupancyPercentage > 80 ? 'Peak occupancy reached. Advise Level 100 students to use secondary study area.' : 'Current traffic is moderate. Optimal study conditions available.'}</p>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        <StatCard 
          title="Active Patrons" 
          value={activeSessions.length} 
          bgColor="bg-[#0f172a] dark:bg-indigo-600" 
          icon="fa-users"
          trend={{ label: 'Live Traffic', color: 'text-emerald-400' }}
        />
        <StatCard 
          title="Daily Total Visits" 
          value={todayVisits} 
          bgColor="bg-emerald-500" 
          icon="fa-door-open"
          textColor="text-[#064e3b]"
        />
        <StatCard 
          title="Active Students" 
          value={activeStudentsCount} 
          bgColor="bg-amber-500" 
          icon="fa-graduation-cap"
          textColor="text-[#451a03]"
        />
        <StatCard 
          title="Total Registered" 
          value={students.length} 
          bgColor="bg-white dark:bg-slate-900" 
          icon="fa-address-book"
          textColor="text-[#0f172a] dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-10">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
              <div>
                <h3 className="font-black text-2xl text-[#0f172a] dark:text-white uppercase tracking-tight">Active Sessions</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Currently Verified and Present
                </p>
              </div>
              <Link to="/active" className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-6 py-3 rounded-2xl hover:bg-indigo-100 transition-colors uppercase tracking-[0.2em] whitespace-nowrap">
                Manage Floor
              </Link>
            </div>
            
            <div className="space-y-5">
              {activeSessions.length > 0 ? (
                activeSessions.slice(0, 5).map((session) => {
                  const student = getStudent(session.studentId);
                  return (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xl transition-all group border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                      <div className="flex items-center space-x-5">
                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-600 shadow-sm overflow-hidden shrink-0">
                          {student?.photo ? (
                            <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            <i className="fas fa-user text-xl"></i>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-lg text-[#0f172a] dark:text-white leading-tight truncate">{student?.name || 'Unknown'}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{student?.id}</span>
                            <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                            <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase">{student?.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-black px-4 py-2 bg-white dark:bg-slate-700 rounded-xl uppercase tracking-widest text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-600">
                          {student?.category === 'Student' ? (student?.level || 'N/A') : 'Staff/Visitor'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fas fa-ghost text-slate-200 dark:text-slate-700 text-3xl"></i>
                  </div>
                  <p className="text-slate-400 font-black text-lg uppercase tracking-widest">Facility Empty</p>
                  <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase mt-1 tracking-tighter">No active sessions synchronized.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <h3 className="font-black text-2xl text-[#0f172a] dark:text-white mb-8 uppercase tracking-tight">Today's Traffic</h3>
            <div className="space-y-4">
              <CategoryStat label="Students" value={visitsByCategory.Student} color="bg-amber-500" />
              <CategoryStat label="Staff" value={visitsByCategory.Staff} color="bg-indigo-500" />
              <CategoryStat label="External Visitors" value={visitsByCategory.Visitor} color="bg-rose-500" />
            </div>
          </div>

          <div className="bg-[#fbbf24] rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-amber-500/10 transition-transform hover:scale-[1.01]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-[#1e1b4b] uppercase tracking-tight">Occupancy</h3>
              <i className="fas fa-chair text-[#1e1b4b]/40"></i>
            </div>
            <div className="flex items-end space-x-2 mb-6">
              <span className="text-6xl font-black text-[#1e1b4b] leading-none">{activeSessions.length}</span>
              <span className="text-sm text-[#1e1b4b]/60 mb-2 font-black uppercase tracking-widest">/ {capacity} seats</span>
            </div>
            <div className="w-full bg-[#1e1b4b]/10 h-3 rounded-full overflow-hidden mb-6">
              <div 
                className="bg-[#1e1b4b] h-full transition-all duration-1000 ease-out" 
                style={{ width: `${occupancyPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center bg-white/20 p-4 rounded-2xl border border-white/20">
              <span className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-widest">Remaining Slots</span>
              <span className="text-lg font-black text-[#1e1b4b]">
                {remainingSeats}
              </span>
            </div>
          </div>

          <div className="bg-[#0f172a] dark:bg-indigo-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl transition-colors">
            <h3 className="font-black text-xl mb-6 uppercase tracking-tight">Rapid Access</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/check-in" className="flex flex-col items-center justify-center p-6 bg-white/10 rounded-3xl hover:bg-white/20 transition-all border border-white/5 active:scale-95 group">
                <i className="fas fa-user-plus text-xl mb-3 group-hover:scale-125 transition-transform text-amber-500"></i>
                <span className="text-[8px] font-black uppercase tracking-widest text-center">Entry Portal</span>
              </Link>
              <Link to="/patrons" className="flex flex-col items-center justify-center p-6 bg-white/10 rounded-3xl hover:bg-white/20 transition-all border border-white/5 active:scale-95 group">
                <i className="fas fa-id-badge text-xl mb-3 group-hover:scale-125 transition-transform text-indigo-400"></i>
                <span className="text-[8px] font-black uppercase tracking-widest text-center">Registry</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
