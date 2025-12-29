
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types';

interface AuthProps {
  onAuthComplete: () => void;
  onClose?: () => void;
}

type AuthMode = 'login' | 'forgot-password';

const Auth: React.FC<AuthProps> = ({ onAuthComplete, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number>(0);

  // Extract project ref for visual confirmation
  const projectRef = isSupabaseConfigured ? (supabase as any).supabaseUrl.split('//')[1].split('.')[0] : null;

  // Handle countdown timer for rate limits
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => {
      setRetryAfter(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  const handleDemoBypass = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuthComplete();
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (retryAfter > 0 || loading) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    // If the backend is not configured, simulate a login for demo purposes
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setLoading(false);
        onAuthComplete();
      }, 800);
      return;
    }

    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        onAuthComplete();
      } else if (mode === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setMessage('Check your email for password reset instructions.');
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      
      const errorMessage = err.message || 'An authentication error occurred';
      
      // Specifically handle the Supabase rate limit "after X seconds" error
      if (errorMessage.includes('after')) {
        const match = errorMessage.match(/after (\d+) seconds/);
        if (match && match[1]) {
          const seconds = parseInt(match[1], 10);
          setRetryAfter(seconds);
          setError(`Security cooldown active. Please wait ${seconds}s before trying again.`);
        } else {
          setError(errorMessage);
        }
      } else if (errorMessage.includes('Invalid login credentials')) {
        setError("Login failed: The email or password provided is incorrect.");
      } else if (err.message === 'Failed to fetch') {
        setError("Connection failed. Please check your internet connection.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4 py-12 relative overflow-hidden">
      {/* Abstract Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-[#0f172a]/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-800 relative animate-in zoom-in-95 duration-500">
        
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-20 w-10 h-10 bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-md text-slate-400 rounded-full flex items-center justify-center transition-all group"
            title="Enter Preview Mode"
          >
            <i className="fas fa-times group-hover:rotate-90 transition-transform"></i>
          </button>
        )}

        <div className="bg-gradient-to-br from-indigo-950 to-[#0f172a] p-12 text-center relative">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-[2rem] rotate-3 mb-6 shadow-2xl shadow-indigo-500/10 p-4 border border-indigo-900/20">
            <img 
              src="logo.png" 
              alt="HF NMTC Logo" 
              className="w-full h-full object-contain -rotate-3"
              onError={(e) => { e.currentTarget.src = 'https://i.imgur.com/8N8H1nU.png'; }}
            />
          </div>
          <h1 className="brand-font text-3xl font-black text-white tracking-tight leading-tight">Staff Access</h1>
          <p className="text-indigo-400 text-[9px] mt-2 font-black uppercase tracking-[0.4em]">Holy Family Library System</p>
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
             <div className="flex items-center space-x-2 px-3 py-1 bg-black/20 rounded-full border border-white/5">
                <div className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  {isSupabaseConfigured ? `Cloud Active: ${projectRef}` : 'Development/Demo Mode'}
                </span>
             </div>
          </div>
        </div>
        
        <div className="p-10">
          <div className="mb-10 text-center">
            <h2 className="text-white font-black text-[10px] uppercase tracking-[0.3em]">Credentials Required</h2>
            <p className="text-slate-500 text-[10px] mt-2 uppercase font-bold tracking-tighter italic">Official HF NMTC Librarian Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-4 rounded-2xl text-xs font-bold flex flex-col items-start animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start">
                  <i className="fas fa-exclamation-circle mt-0.5 mr-3 flex-shrink-0"></i>
                  <span>{error}</span>
                </div>
                {(error.includes('credentials') || retryAfter > 0) && (
                  <button 
                    type="button" 
                    onClick={handleDemoBypass}
                    className="mt-3 text-amber-500 hover:text-amber-400 underline decoration-dotted transition-colors self-end"
                  >
                    Bypass to Demo Mode?
                  </button>
                )}
              </div>
            )}

            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-4 rounded-2xl text-xs font-bold flex items-start animate-in fade-in slide-in-from-top-2">
                <i className="fas fa-check-circle mt-0.5 mr-3 flex-shrink-0"></i>
                <span>{message}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="auth-email" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <input
                  id="auth-email"
                  type="email"
                  required
                  disabled={loading || retryAfter > 0}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-800 bg-slate-900/50 text-white text-sm font-bold focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                  placeholder="e.g. staff@hfnmtc.edu.gh"
                />
                <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
              </div>
            </div>

            {mode !== 'forgot-password' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="auth-password" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                  <button 
                    type="button"
                    disabled={loading || retryAfter > 0}
                    onClick={() => setMode('forgot-password')}
                    className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider disabled:opacity-50"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative group">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading || retryAfter > 0}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-slate-800 bg-slate-900/50 text-white text-sm font-bold focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                    placeholder="••••••••"
                  />
                  <i className="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
                  <button 
                    type="button" 
                    disabled={loading || retryAfter > 0}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2 disabled:opacity-50"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || retryAfter > 0}
              className={`w-full font-black py-5 rounded-2xl active:scale-[0.98] transition-all shadow-xl flex items-center justify-center space-x-3 disabled:opacity-50 group ${
                retryAfter > 0 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/20'
              }`}
            >
              {loading ? (
                <i className="fas fa-circle-notch animate-spin text-xl"></i>
              ) : retryAfter > 0 ? (
                <>
                  <i className="fas fa-clock"></i>
                  <span className="uppercase tracking-widest">Retry in {retryAfter}s</span>
                </>
              ) : (
                <>
                  <i className={`fas ${mode === 'login' ? 'fa-fingerprint' : 'fa-paper-plane'} group-hover:scale-110 transition-transform`}></i>
                  <span className="uppercase tracking-widest">
                    {mode === 'login' ? 'Authenticate' : 'Recover Account'}
                  </span>
                </>
              )}
            </button>
            
            <button 
              type="button"
              onClick={handleDemoBypass}
              className="w-full text-center text-[10px] font-black text-slate-600 hover:text-amber-500 uppercase tracking-widest transition-colors mt-2"
            >
              Bypass Login (Preview Mode)
            </button>

            {mode === 'forgot-password' && (
              <button 
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors mt-2"
              >
                Back to Login
              </button>
            )}
          </form>
        </div>

        <div className="bg-black/20 p-8 text-center border-t border-white/5">
          <div className="flex items-center justify-center space-x-3 text-[10px] text-slate-500 uppercase tracking-widest font-black">
            <i className="fas fa-lock text-amber-500"></i>
            <span>Verified NMTC Berekum Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
