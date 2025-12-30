
import React, { useState, useEffect, useRef } from 'react';
import { Session, Student, AppSettings } from '../types';
import Modal from './Modal';
import { Html5Qrcode, QrCodeSuccessCallback } from 'html5-qrcode';

interface CheckInProps {
  activeSessions: Session[];
  students: Student[];
  onCheckIn: (studentId: string) => void | Promise<void>;
  onCheckOut: (sessionId: string, notes?: string) => void | Promise<void>;
  appSettings: AppSettings;
  syncStatus: 'online' | 'syncing' | 'offline' | 'error';
}

const CheckIn: React.FC<CheckInProps> = ({ activeSessions, students, onCheckIn, onCheckOut, appSettings, syncStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [manualId, setManualId] = useState('');
  const [now, setNow] = useState(new Date());
  const [isProcessingLocal, setIsProcessingLocal] = useState<string | null>(null);
  
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<{name: string, photo: string, action: 'IN' | 'OUT', id: string} | null>(null);
  const [scannerError, setScannerError] = useState<{title: string, message: string} | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);
  
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const scannerContainerId = "qr-reader-full-screen";

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!isMounted || !isScannerOpen) return;
      
      const container = document.getElementById(scannerContainerId);
      if (!container) return;

      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        qrScannerRef.current = html5QrCode;
        isProcessingRef.current = false;
        setScannerError(null);

        const config = { 
          fps: 15, 
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0 
        };

        const onScanSuccess: QrCodeSuccessCallback = async (decodedText) => {
          if (isProcessingRef.current) return;
          
          const trimmedCode = decodedText.trim().toUpperCase();
          const student = students.find(s => 
            s.id.toUpperCase() === trimmedCode
          );

          if (student) {
            isProcessingRef.current = true;
            setIsFlashActive(true);
            
            const activeSession = activeSessions.find(s => s.studentId === student.id);
            const action = activeSession ? 'OUT' : 'IN';
            
            setScanSuccess({ 
              name: student.name, 
              photo: student.photo || '', 
              action,
              id: student.id 
            });

            try {
              if (activeSession) {
                await onCheckOut(activeSession.id, "Badge Scanner Checkout");
              } else {
                await onCheckIn(student.id);
              }
            } catch (err) {
              console.error("Scanner operation failed:", err);
            }

            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);

            setTimeout(() => {
              if (isMounted) {
                stopScanner();
                setIsScannerOpen(false);
                setScanSuccess(null);
                setIsFlashActive(false);
                setIsTorchOn(false);
              }
            }, 2500);
          }
        };

        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          onScanSuccess, 
          () => {} 
        );

        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities();
          if (capabilities && (capabilities as any).torch) setHasTorch(true);
        } catch (e) {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.error("Scanner Initialization Error:", err);
        setScannerError({
          title: "Hardware Blocked",
          message: "Could not initiate camera. Please check browser permissions."
        });
      }
    };

    if (isScannerOpen) startScanner();
    else stopScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isScannerOpen, students, activeSessions, onCheckIn, onCheckOut]);

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
      } catch (e) {}
      qrScannerRef.current = null;
      setIsTorchOn(false);
      setHasTorch(false);
    }
  };

  const handleToggleTorch = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        const newState = !isTorchOn;
        await qrScannerRef.current.applyVideoConstraints({
          //@ts-ignore
          advanced: [{ torch: newState }]
        });
        setIsTorchOn(newState);
      } catch (err) {}
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentForSession = (studentId: string) => students.find(s => s.id === studentId);

  const getDuration = (checkIn: Date) => {
    const diff = now.getTime() - checkIn.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return { mins, display: `${hrs}h ${m}m` };
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId || syncStatus === 'syncing') return;
    
    const student = students.find(s => s.id.toUpperCase() === manualId.toUpperCase());
    if (student) {
      setIsProcessingLocal(student.id);
      await onCheckIn(student.id);
      setManualId('');
      setIsProcessingLocal(null);
    } else {
      alert('Student ID not found in the local registry.');
    }
  };

  const triggerCheckOut = (session: Session) => {
    setSelectedSession(session);
    setSessionNotes('');
    setIsCheckoutModalOpen(true);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <section className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Access Control</h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Manual ID Verification</p>
            </div>
            <button 
              onClick={() => setIsScannerOpen(true)} 
              disabled={syncStatus === 'syncing'}
              className="w-16 h-16 bg-amber-500 text-[#0f172a] rounded-2xl hover:bg-amber-400 transition-all flex items-center justify-center shadow-xl shadow-amber-500/30 active:scale-90 group relative disabled:opacity-50"
            >
              <i className="fas fa-qrcode text-2xl group-hover:scale-110 transition-transform"></i>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-600"></span>
              </span>
            </button>
          </div>

          <form onSubmit={handleManualCheckIn} className="flex space-x-3 mb-8">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                placeholder="INPUT ID..." 
                className="w-full pl-12 pr-5 py-5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-base font-black text-[#0f172a] dark:text-white focus:border-indigo-500 outline-none uppercase font-mono shadow-inner transition-all placeholder:text-slate-300" 
                value={manualId} 
                onChange={(e) => setManualId(e.target.value)} 
                disabled={syncStatus === 'syncing'}
              />
              <i className="fas fa-id-card absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 group-focus-within:text-indigo-500 transition-colors"></i>
            </div>
            <button 
              type="submit" 
              disabled={syncStatus === 'syncing' || !manualId}
              className="px-8 py-5 bg-[#0f172a] dark:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all shadow-xl active:scale-95 disabled:opacity-50 min-w-[120px]"
            >
              {syncStatus === 'syncing' ? <i className="fas fa-sync-alt animate-spin"></i> : 'Check In'}
            </button>
          </form>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 max-h-[380px]">
            <div className="space-y-4">
              <div className="relative group sticky top-0 z-10 bg-white dark:bg-slate-900 pb-2">
                <input 
                  type="text" 
                  placeholder="FILTER BY NAME..." 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-[#0f172a] dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700"></i>
              </div>

              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => {
                  const isActive = activeSessions.some(s => s.studentId === student.id);
                  const isSyncing = isProcessingLocal === student.id;
                  return (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                      <div className="flex items-center space-x-3">
                        <img src={student.photo} alt={student.name} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-xs text-[#0f172a] dark:text-white truncate max-w-[120px]">{student.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{student.id}</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          if (syncStatus === 'syncing') return;
                          setIsProcessingLocal(student.id);
                          if (isActive) {
                             triggerCheckOut(activeSessions.find(s => s.studentId === student.id)!);
                          } else {
                             await onCheckIn(student.id);
                          }
                          setIsProcessingLocal(null);
                        }}
                        disabled={syncStatus === 'syncing'}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          isActive 
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        } disabled:opacity-50`}
                      >
                        {isSyncing ? <i className="fas fa-sync-alt animate-spin"></i> : (isActive ? 'LOG OUT' : 'LOG IN')}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Patron not registered</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Current Occupancy</h3>
            <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg">
              {activeSessions.length} IN LIBRARY
            </span>
          </div>
          <div className="space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar pr-2">
            {activeSessions.length > 0 ? (
              activeSessions.map(session => {
                const student = getStudentForSession(session.studentId);
                const duration = getDuration(session.checkIn);
                return (
                  <div key={session.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <img src={student?.photo} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-xs text-[#0f172a] dark:text-white">{student?.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">IN: {session.checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => triggerCheckOut(session)} 
                        disabled={syncStatus === 'syncing'}
                        className="text-rose-500 hover:text-rose-600 transition-colors p-2 disabled:opacity-50"
                      >
                        <i className="fas fa-sign-out-alt"></i>
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{duration.display} elapsed</span>
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-emerald-500 uppercase">Live</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center">
                <i className="fas fa-couch text-4xl text-slate-100 dark:text-slate-800 mb-4"></i>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Library Floor Empty</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {isScannerOpen && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6">
          <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 border-slate-800 shadow-2xl">
            <div id={scannerContainerId} className="w-full h-full"></div>
            {isFlashActive && <div className="absolute inset-0 bg-white/40 animate-pulse z-30"></div>}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-64 border-2 border-amber-500/50 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-xl"></div>
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber-500/30 animate-scan"></div>
              </div>
            </div>

            {scanSuccess && (
              <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300">
                <div className="w-24 h-24 rounded-full bg-white mb-6 flex items-center justify-center shadow-xl">
                  <i className="fas fa-check text-4xl text-emerald-600"></i>
                </div>
                <h4 className="text-white text-2xl font-black text-center mb-2 uppercase tracking-tight">{scanSuccess.name}</h4>
                <div className="px-6 py-2 bg-white text-emerald-600 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-lg">
                  CHECKED {scanSuccess.action}
                </div>
              </div>
            )}

            {scannerError && (
              <div className="absolute inset-0 bg-rose-600/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-10 animate-in fade-in">
                <i className="fas fa-exclamation-triangle text-white text-5xl mb-6"></i>
                <h4 className="text-white text-xl font-black text-center mb-2">{scannerError.title}</h4>
                <p className="text-rose-100 text-center text-xs font-bold leading-relaxed">{scannerError.message}</p>
                <button onClick={() => setIsScannerOpen(false)} className="mt-8 px-8 py-3 bg-white text-rose-600 rounded-xl font-black text-xs uppercase tracking-widest">Close</button>
              </div>
            )}
          </div>

          <div className="mt-10 flex items-center space-x-6">
            <button onClick={() => setIsScannerOpen(false)} className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-all">
              <i className="fas fa-times text-xl"></i>
            </button>
            {hasTorch && (
              <button onClick={handleToggleTorch} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isTorchOn ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-white'}`}>
                <i className={`fas ${isTorchOn ? 'fa-lightbulb' : 'fa-lightbulb-slash'} text-xl`}></i>
              </button>
            )}
          </div>
          <p className="mt-6 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Position QR Code within the frame</p>
        </div>
      )}

      <Modal 
        isOpen={isCheckoutModalOpen} 
        onClose={() => setIsCheckoutModalOpen(false)} 
        title="Session Termination"
        footer={
          <div className="flex space-x-3 w-full">
            <button onClick={() => setIsCheckoutModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600">Cancel</button>
            <button 
              onClick={async () => {
                if (selectedSession) {
                  setIsProcessingLocal(selectedSession.id);
                  await onCheckOut(selectedSession.id, sessionNotes);
                }
                setIsCheckoutModalOpen(false);
                setIsProcessingLocal(null);
              }}
              disabled={syncStatus === 'syncing'}
              className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {syncStatus === 'syncing' ? <i className="fas fa-sync-alt animate-spin mr-2"></i> : 'Complete Checkout'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {selectedSession && (
            <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <img src={getStudentForSession(selectedSession.studentId)?.photo} className="w-12 h-12 rounded-xl object-cover" alt="" />
              <div>
                <p className="font-black text-sm text-[#0f172a] dark:text-white">{getStudentForSession(selectedSession.studentId)?.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration: {getDuration(selectedSession.checkIn).display}</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Notes (Optional)</label>
            <textarea 
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Record any specific observations..."
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500 transition-all h-32 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CheckIn;
