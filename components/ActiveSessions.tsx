
import React, { useState, useEffect } from 'react';
import { Session, Student, AppSettings } from '../types';
import Modal from './Modal';

interface ActiveSessionsProps {
  activeSessions: Session[];
  students: Student[];
  onCheckOut: (sessionId: string, notes?: string) => void;
  appSettings: AppSettings;
  syncStatus: 'online' | 'syncing' | 'offline' | 'error';
}

const ActiveSessions: React.FC<ActiveSessionsProps> = ({ activeSessions, students, onCheckOut, appSettings, syncStatus }) => {
  const [now, setNow] = useState(new Date());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (confirmingId) {
      const timeout = setTimeout(() => setConfirmingId(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [confirmingId]);

  const getStudent = (id: string) => students.find(s => s.id === id);

  const formatDuration = (checkIn: Date) => {
    const diff = now.getTime() - checkIn.getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${hours}h ${mins}m ${secs}s`;
  };

  const getTimeRemaining = (checkIn: Date, limitHours: number) => {
    const limitMs = limitHours * 3600000;
    const elapsedMs = now.getTime() - checkIn.getTime();
    const remainingMs = Math.max(0, limitMs - elapsedMs);
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const handleQuickOut = (sessionId: string) => {
    if (confirmingId === sessionId) {
      onCheckOut(sessionId);
      setConfirmingId(null);
    } else {
      setConfirmingId(sessionId);
    }
  };

  const triggerReviewOut = (session: Session) => {
    setSelectedSession(session); setSessionNotes(''); setIsReviewModalOpen(true);
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] dark:text-white tracking-tight mb-2 transition-colors">Active Students</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-lg transition-colors">{activeSessions.length} sessions currently running.</p>
        </div>
        <div className={`px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest border transition-colors ${
          syncStatus === 'online' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' :
          syncStatus === 'syncing' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30 animate-pulse' :
          'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
        }`}>
          {syncStatus === 'online' ? 'Live Updates Active' : syncStatus === 'syncing' ? 'Synchronizing...' : 'System Offline'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {activeSessions.map((session) => {
          const student = getStudent(session.studentId);
          const durationMins = Math.floor((now.getTime() - session.checkIn.getTime()) / 60000);
          const threshold = appSettings.notifications.thresholdMinutes;
          const autoCheckoutMins = appSettings.autoCheckoutHours * 60;
          const isOverdue = durationMins >= threshold;
          const isNearingLimit = appSettings.autoCheckoutEnabled && (autoCheckoutMins - durationMins <= 30) && (autoCheckoutMins - durationMins > 0);
          const isConfirming = confirmingId === session.id;

          return (
            <div key={session.id} className={`bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border transition-all hover:shadow-xl dark:hover:shadow-black/30 group relative overflow-hidden ${isOverdue ? 'border-rose-400 dark:border-rose-900 ring-4 ring-rose-500/5 bg-rose-50/10 dark:bg-rose-950/10' : isNearingLimit ? 'border-amber-400 dark:border-amber-900 ring-4 ring-amber-500/5' : 'border-slate-100 dark:border-slate-800'}`}>
              {isOverdue && <div className="absolute top-0 right-0 left-0 h-1.5 bg-rose-500 animate-pulse"></div>}
              {!isOverdue && isNearingLimit && <div className="absolute top-0 right-0 left-0 h-1.5 bg-amber-500 animate-pulse"></div>}

              <div className="flex items-center space-x-4 mb-6 md:mb-8">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-800 overflow-hidden shadow-inner flex items-center justify-center text-slate-300 relative">
                  {student?.photo ? (
                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-user text-xl md:text-2xl"></i>
                  )}
                  {isOverdue && <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center"><i className="fas fa-exclamation-triangle text-rose-600 text-xl animate-bounce"></i></div>}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-lg md:text-xl text-[#0f172a] dark:text-white leading-tight truncate transition-colors">{student?.name || 'Unknown'}</h3>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 transition-colors">{student?.id}</p>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Started At</span>
                  <span className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">{session.checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Duration</span>
                  <span className={`text-xs md:text-sm font-black transition-colors ${isOverdue ? 'text-rose-600 dark:text-rose-400' : isNearingLimit ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {formatDuration(session.checkIn)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm transition-colors ${
                      isOverdue ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400' : 
                      isNearingLimit ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400' : 
                      'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isOverdue ? `OVERDUE (${threshold}m+)` : isNearingLimit ? 'NEARING LIMIT' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button onClick={() => handleQuickOut(session.id)} className={`w-full py-4 md:py-5 text-white rounded-[1.2rem] md:rounded-[1.5rem] font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2 ${
                    isConfirming ? 'bg-amber-600 animate-pulse' : isOverdue ? 'bg-rose-600 hover:bg-rose-700' : isNearingLimit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#0f172a] dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500'
                  }`}>
                  <i className={`fas ${isConfirming ? 'fa-question-circle' : 'fa-bolt'}`}></i>
                  <span>{isConfirming ? 'Confirm Checkout?' : 'Quick Check-Out'}</span>
                </button>
                <button onClick={() => triggerReviewOut(session)} className="w-full py-3 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-colors">Add Notes & Review</button>
              </div>
            </div>
          );
        })}

        {activeSessions.length === 0 && (
          <div className="col-span-full py-20 md:py-40 text-center bg-white dark:bg-slate-900 rounded-3xl md:rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 transition-colors">
            <i className="fas fa-couch text-4xl md:text-6xl text-slate-100 dark:text-slate-800 mb-4 md:mb-6 transition-colors"></i>
            <h3 className="text-xl md:text-2xl font-black text-slate-300 dark:text-slate-700 px-6 transition-colors">The library is currently empty.</h3>
          </div>
        )}
      </div>

      <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="Session Review" footer={
          <><button onClick={() => setIsReviewModalOpen(false)} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300">Cancel</button>
            <button onClick={() => { if (selectedSession) onCheckOut(selectedSession.id, sessionNotes); setIsReviewModalOpen(false); }} className="px-6 py-2 bg-[#0f172a] dark:bg-indigo-600 text-white text-[10px] font-black rounded-xl shadow-lg uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all">Check-Out</button></>
        }>
        <div className="space-y-5">
          <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl transition-colors">
            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden"><img src={getStudent(selectedSession?.studentId || '')?.photo} className="w-full h-full object-cover" alt="" /></div>
            <div>
              <p className="font-black text-[#0f172a] dark:text-white text-sm transition-colors">{getStudent(selectedSession?.studentId || '')?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Duration: {selectedSession ? formatDuration(selectedSession.checkIn) : ''}</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Staff Observations</label>
            <textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder="Record any remarks about the session..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-4 focus:ring-amber-500/10 transition-all h-24 resize-none font-medium" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ActiveSessions;
