
import React, { useState, useMemo, useEffect } from 'react';
import { Session, Student, AcademicLevel } from '../types';
import { ACADEMIC_LEVELS } from '../constants';

interface LeaderboardProps {
  history: Session[];
  students: Student[];
}

type SortKey = 'hours' | 'sessionsCount' | 'avgSession';
type RangeOption = 'all' | 'today' | 'week' | 'month' | 'custom';

const Leaderboard: React.FC<LeaderboardProps> = ({ history, students }) => {
  const [levelFilter, setLevelFilter] = useState<AcademicLevel | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('hours');
  const [rangeType, setRangeType] = useState<RangeOption>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Handle predefined range logic
  useEffect(() => {
    if (rangeType === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (rangeType === 'today') {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (rangeType === 'week') {
      const now = new Date();
      const first = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(first)).toISOString().split('T')[0];
      setStartDate(monday);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (rangeType === 'month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  }, [rangeType]);

  const leaderboardData = useMemo(() => {
    return students
      .map(student => {
        const studentSessions = history.filter(s => {
          const matchesStudent = s.studentId === student.id;
          if (!matchesStudent) return false;

          const sessionDate = new Date(s.checkIn);
          if (startDate && sessionDate < new Date(startDate)) return false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Ensure full end day is included
            if (sessionDate > end) return false;
          }
          return true;
        });

        const sessionsCount = studentSessions.length;
        const totalMinutes = studentSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const hours = (totalMinutes / 60).toFixed(1);
        
        return {
          ...student,
          hours: parseFloat(hours),
          sessionsCount,
          avgSession: sessionsCount > 0 ? Math.round(totalMinutes / sessionsCount) : 0
        };
      })
      .filter(s => {
        const matchesLevel = levelFilter === 'All' || s.level === levelFilter;
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesLevel && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'hours') return b.hours - a.hours;
        if (sortBy === 'sessionsCount') return b.sessionsCount - a.sessionsCount;
        if (sortBy === 'avgSession') return b.avgSession - a.avgSession;
        return 0;
      });
  }, [students, history, levelFilter, searchTerm, sortBy, startDate, endDate]);

  const clearDates = () => {
    setRangeType('all');
    setStartDate('');
    setEndDate('');
  };

  const getBadge = (index: number, hours: number, sessions: number) => {
    if (sortBy === 'sessionsCount') {
       if (index === 0 && sessions > 0) return { label: 'Most Frequent', icon: 'fa-calendar-check', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400' };
       if (index === 1 && sessions > 0) return { label: 'Regular', icon: 'fa-user-clock', color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-400' };
       if (index === 2 && sessions > 0) return { label: 'Active Member', icon: 'fa-check', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' };
    }

    if (index === 0 && hours > 0 && sortBy === 'hours') return { label: 'Grand Scholar', icon: 'fa-crown', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' };
    if (index === 1 && hours > 0 && sortBy === 'hours') return { label: 'High Achiever', icon: 'fa-medal', color: 'text-slate-400 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300' };
    if (index === 2 && hours > 0 && sortBy === 'hours') return { label: 'Rising Star', icon: 'fa-award', color: 'text-orange-400 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300' };
    
    if (hours > 50) return { label: 'Study Ninja', icon: 'fa-bolt', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400' };
    if (hours > 20) return { label: 'Dedicated', icon: 'fa-check-circle', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' };
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0f172a] dark:text-white transition-colors">Student Leaderboard</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Recognizing dedication and library participation.</p>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
                <select 
                  value={rangeType}
                  onChange={(e) => setRangeType(e.target.value as RangeOption)}
                  className="w-full pl-8 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white appearance-none cursor-pointer transition-colors h-[40px] shadow-sm"
                >
                  <option value="all">📅 All Time</option>
                  <option value="today">📅 Today</option>
                  <option value="week">📅 This Week</option>
                  <option value="month">📅 This Month</option>
                  <option value="custom">📅 Custom Range...</option>
                </select>
                <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
            </div>

            {rangeType === 'custom' && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                <div className="relative group">
                  <span className="absolute left-3 top-[-8px] bg-white dark:bg-slate-950 px-1 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10 transition-colors">From</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-3 pr-2 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors h-[40px]"
                  />
                </div>
                <div className="relative group">
                  <span className="absolute left-3 top-[-8px] bg-white dark:bg-slate-950 px-1 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10 transition-colors">To</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-3 pr-2 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors h-[40px]"
                  />
                </div>
              </div>
            )}
            
            {rangeType !== 'all' && (
              <button 
                onClick={clearDates}
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                title="Reset Range"
              >
                <i className="fas fa-times-circle text-lg"></i>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 sm:flex-none">
                <select 
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as any)}
                className="w-full pl-8 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white appearance-none cursor-pointer transition-colors h-[40px]"
                >
                <option value="All">All Levels</option>
                {ACADEMIC_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
                <i className="fas fa-filter absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
            </div>
            <div className="relative flex-1 sm:flex-none">
                <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="w-full pl-8 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white appearance-none cursor-pointer transition-colors h-[40px]"
                >
                <option value="hours">Sort: Hours</option>
                <option value="sessionsCount">Sort: Sessions</option>
                <option value="avgSession">Sort: Avg Duration</option>
                </select>
                <i className="fas fa-sort-amount-down absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
            </div>
            <div className="relative flex-1 sm:w-64">
              <input 
                type="text" 
                placeholder="Search students..."
                className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full transition-colors h-[40px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {leaderboardData.length > 0 ? (
          leaderboardData.map((student, index) => {
            const badge = getBadge(index, student.hours, student.sessionsCount);
            const isTopThree = index < 3 && (sortBy === 'hours' || sortBy === 'sessionsCount') && (student.hours > 0 || student.sessionsCount > 0);
            
            return (
              <div key={student.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between hover:shadow-md dark:hover:shadow-black/20 transition-all group">
                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                  <div className={`flex items-center justify-center w-8 text-lg font-black transition-colors ${
                    isTopThree ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="relative">
                    <img src={student.photo} alt={student.name} className={`w-14 h-14 rounded-2xl object-cover shadow-sm border-2 transition-colors ${
                        isTopThree ? 'border-indigo-100 dark:border-indigo-900' : 'border-white dark:border-slate-800'
                    }`} />
                    {isTopThree && (
                      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm border-2 border-white dark:border-slate-900 ${
                        index === 0 ? 'bg-amber-400 text-amber-900' : 
                        index === 1 ? 'bg-slate-300 text-slate-700' : 'bg-orange-300 text-orange-900'
                      }`}>
                        <i className={`fas ${sortBy === 'sessionsCount' ? 'fa-calendar-check' : 'fa-trophy'}`}></i>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">{student.name}</h3>
                      {badge && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center ${badge.color}`}>
                          <i className={`fas ${badge.icon} mr-1`}></i> {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{student.id} • {student.level}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:space-x-12 px-2 sm:px-0">
                  <div className={`text-center transition-all ${sortBy === 'hours' ? 'scale-110' : 'opacity-80'}`}>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Time</p>
                    <p className={`text-xl font-black transition-colors ${sortBy === 'hours' ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {student.hours}<span className="text-xs ml-0.5 text-indigo-400">h</span>
                    </p>
                  </div>
                  
                  <div className={`text-center transition-all ${sortBy === 'sessionsCount' ? 'scale-110' : 'opacity-80'}`}>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Sessions</p>
                    <p className={`text-xl font-black transition-colors ${sortBy === 'sessionsCount' ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {student.sessionsCount}
                    </p>
                  </div>

                  <div className={`text-center transition-all ${sortBy === 'avgSession' ? 'scale-110' : 'opacity-80'}`}>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Avg Length</p>
                    <p className={`text-xl font-black transition-colors ${sortBy === 'avgSession' ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {student.avgSession}<span className="text-xs ml-0.5 text-slate-400 font-bold uppercase">m</span>
                    </p>
                  </div>
                  <div className="hidden xl:block">
                    <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${sortBy === 'sessionsCount' ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-amber-500 dark:bg-amber-400'}`} 
                        style={{ width: `${Math.min((student.hours / 100) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-slate-900 py-24 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-300 dark:text-slate-700 transition-colors">
            <i className="fas fa-medal text-5xl mb-4 opacity-20"></i>
            <p className="font-bold text-slate-400 dark:text-slate-600">No student rankings found</p>
            <p className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-50">Try adjusting your filters or date range</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
