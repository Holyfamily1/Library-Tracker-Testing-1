
import React, { useState } from 'react';
import { AppSettings, UserRole } from '../types';
import { requestNotificationPermission } from '../services/notificationService';
import { supabase, verifyDatabaseConnection, isSupabaseConfigured } from '../lib/supabase';

interface SettingsProps {
  appSettings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  currentUser?: any;
  onRefresh?: () => void;
  syncStatus: string;
}

const Settings: React.FC<SettingsProps> = ({ appSettings, onSettingsChange, currentUser, onRefresh, syncStatus }) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('librarian');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const isMainAdmin = currentUser?.email === 'bhfnmtclibrary@gmail.com';

  const triggerSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 600);
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    onSettingsChange({ ...appSettings, [key]: value });
    triggerSave();
  };

  const updateNotifSetting = (key: string, value: any) => {
    onSettingsChange({
      ...appSettings,
      notifications: { ...appSettings.notifications, [key]: value }
    });
    triggerSave();
  };

  const updateIdConfig = (key: string, value: any) => {
    onSettingsChange({
      ...appSettings,
      idConfig: { ...appSettings.idConfig, [key]: value }
    });
    triggerSave();
  };

  const handleVerifyDB = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    const result = await verifyDatabaseConnection();
    setVerifyResult(result.message);
    setIsVerifying(false);
    if (onRefresh) onRefresh();
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null); setStaffSuccess(null); setIsCreatingStaff(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: newStaffEmail,
        password: newStaffPassword,
        options: { data: { role: newStaffRole } }
      });
      if (error) throw error;
      setStaffSuccess(`Account created for ${newStaffEmail}.`);
      setNewStaffEmail(''); setNewStaffPassword('');
    } catch (err: any) {
      setStaffError(err.message || 'Failed to create staff account');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] dark:text-white tracking-tight mb-2 transition-colors">System Control</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-lg transition-colors">Facility limits, alerts, and personnel access management.</p>
        </div>
        
        {saveStatus !== 'idle' && (
          <div className={`px-6 py-3 rounded-2xl flex items-center space-x-3 transition-all duration-500 ${saveStatus === 'saving' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'}`}>
            <i className={`fas ${saveStatus === 'saving' ? 'fa-spinner animate-spin' : 'fa-check-circle'}`}></i>
            <span className="text-xs font-black uppercase tracking-widest">
              {saveStatus === 'saving' ? 'Syncing...' : 'Configuration Saved'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-10">
        <div className="space-y-8">
          <div className="bg-[#0f172a] dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl border border-indigo-500/20 transition-colors">
            <h3 className="font-black text-xl mb-8 flex items-center">
              <i className="fas fa-database mr-4 text-emerald-400"></i>
              Supabase Link
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project ID</p>
                  <p className="text-sm font-bold text-emerald-400">bvnawmnrogumlwalvpff</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}></div>
              </div>
              <button onClick={handleVerifyDB} disabled={isVerifying} className="w-full py-4 bg-white text-[#0f172a] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center">
                {isVerifying ? <i className="fas fa-spinner animate-spin mr-2"></i> : <i className="fas fa-plug mr-2"></i>}
                {isVerifying ? 'Pinging Cloud...' : 'Verify Connection'}
              </button>
              {verifyResult && <p className="text-[10px] font-bold text-center text-indigo-300 uppercase italic transition-colors">{verifyResult}</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <h3 className="font-black text-xl text-[#0f172a] dark:text-white mb-8 flex items-center transition-colors">
              <i className="fas fa-building mr-4 text-indigo-600"></i>
              Library Ops
            </h3>
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Daily Seating Cap</label>
                <input type="number" value={appSettings.dailyCapacity} onChange={(e) => updateSetting('dailyCapacity', parseInt(e.target.value) || 0)} className="w-full mt-2 px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-lg font-black text-[#0f172a] dark:text-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-colors" />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                <div>
                  <p className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wider transition-colors">Auto-Checkout</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium transition-colors">Clear session at 8 PM.</p>
                </div>
                <button onClick={() => updateSetting('autoCheckoutEnabled', !appSettings.autoCheckoutEnabled)} className={`w-12 h-7 rounded-full transition-all flex items-center px-1 ${appSettings.autoCheckoutEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${appSettings.autoCheckoutEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-8">
          {isMainAdmin && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <h3 className="font-black text-xl text-[#0f172a] dark:text-white mb-8 flex items-center transition-colors">
                <i className="fas fa-id-card-clip mr-4 text-indigo-600"></i>
                ID Generation Format
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Student Prefix</label>
                    <input type="text" value={appSettings.idConfig.studentPrefix} onChange={e => updateIdConfig('studentPrefix', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Academic Staff Prefix</label>
                    <input type="text" value={appSettings.idConfig.academicStaffPrefix} onChange={e => updateIdConfig('academicStaffPrefix', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Non-Academic Prefix</label>
                    <input type="text" value={appSettings.idConfig.nonAcademicStaffPrefix} onChange={e => updateIdConfig('nonAcademicStaffPrefix', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Visitor Prefix</label>
                    <input type="text" value={appSettings.idConfig.visitorPrefix} onChange={e => updateIdConfig('visitorPrefix', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white" />
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Number Padding (Digits)</label>
                 <div className="flex items-center space-x-4 mt-2">
                   <input type="range" min="1" max="8" value={appSettings.idConfig.padding} onChange={e => updateIdConfig('padding', parseInt(e.target.value))} className="flex-1 accent-indigo-600" />
                   <span className="text-sm font-black text-indigo-600">{appSettings.idConfig.padding} digits</span>
                 </div>
                 <p className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">e.g. ST-{'1'.padStart(appSettings.idConfig.padding, '0')}</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
             <div className="flex justify-between items-center mb-10">
                <h3 className="font-black text-xl text-[#0f172a] dark:text-white flex items-center transition-colors">
                  <i className="fas fa-bell mr-4 text-rose-500"></i>
                  Alert Protocols
                </h3>
                <button onClick={() => requestNotificationPermission()} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl transition-colors">
                  Request OS Notifications
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wider transition-colors">Overdue Alerts</p>
                    <button onClick={() => updateNotifSetting('enabled', !appSettings.notifications.enabled)} className={`w-12 h-7 rounded-full transition-all flex items-center px-1 ${appSettings.notifications.enabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${appSettings.notifications.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                  <div className="pt-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Alert Threshold (Mins)</label>
                    <input type="number" value={appSettings.notifications.thresholdMinutes} onChange={(e) => updateNotifSetting('thresholdMinutes', parseInt(e.target.value) || 0)} className="w-full mt-2 px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-lg font-black text-[#0f172a] dark:text-white outline-none transition-colors" />
                  </div>
                </div>
                <div className="pt-4">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors">Admin Email for Logs</label>
                  <input type="email" value={appSettings.notifications.email} onChange={(e) => updateNotifSetting('email', e.target.value)} className="w-full mt-2 px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-base font-black text-[#0f172a] dark:text-white outline-none transition-colors" placeholder="admin@hfnmtc.edu.gh" />
                </div>
             </div>
          </div>

          {isMainAdmin && (
            <div className="bg-[#0f172a] dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl border border-indigo-500/20 transition-colors">
              <h3 className="font-black text-xl mb-8 flex items-center">
                <i className="fas fa-user-shield mr-4 text-amber-500"></i>
                Staff Provisioning
              </h3>
              <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <input type="email" required value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} placeholder="Email..." className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-amber-500 transition-all" />
                  <input type="password" required value={newStaffPassword} onChange={e => setNewStaffPassword(e.target.value)} placeholder="Password..." className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-amber-500 transition-all" />
                </div>
                <div className="flex flex-col justify-between space-y-4">
                  <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as UserRole)} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-amber-500 transition-all cursor-pointer">
                    <option value="librarian" className="bg-[#0f172a]">Librarian</option>
                    <option value="admin" className="bg-[#0f172a]">Admin</option>
                  </select>
                  <button disabled={isCreatingStaff} type="submit" className="w-full py-4 bg-amber-500 text-[#0f172a] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all active:scale-95">
                    {isCreatingStaff ? 'Processing...' : 'Provision Access'}
                  </button>
                </div>
              </form>
              {staffError && <p className="mt-4 text-xs font-bold text-rose-400 transition-colors">{staffError}</p>}
              {staffSuccess && <p className="mt-4 text-xs font-bold text-emerald-400 transition-colors">{staffSuccess}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
