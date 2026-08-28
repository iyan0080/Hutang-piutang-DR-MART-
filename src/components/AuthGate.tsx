import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Building2,
  ArrowRight,
  UserPlus,
  LogIn,
  BookOpen,
  Check
} from 'lucide-react';
import { authService } from '../lib/authService';
import { UserProfile, AUTHORIZED_TEAM_MEMBERS } from '../types';

interface AuthGateProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleQuickDemoLogin = (teamEmail: string) => {
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      const user = authService.quickLogin(teamEmail);
      setIsLoading(false);
      setSuccessMsg(`Berhasil masuk sebagai ${user.displayName} (${user.role})`);
      setTimeout(() => {
        onAuthSuccess(user);
      }, 500);
    }, 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setErrorMsg('Email dan kata sandi wajib diisi.');
          setIsLoading(false);
          return;
        }

        const res = await authService.login(email, password);
        if (res.success && res.user) {
          setSuccessMsg('Login berhasil! Membuka buku catatan keuangan...');
          setTimeout(() => {
            onAuthSuccess(res.user!);
          }, 500);
        } else {
          setErrorMsg(res.error || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
        }
      } else if (mode === 'register') {
        if (!name.trim()) {
          setErrorMsg('Nama lengkap pengelola wajib diisi.');
          setIsLoading(false);
          return;
        }
        if (!email.trim()) {
          setErrorMsg('Email wajib diisi.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Kata sandi minimal 6 karakter.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi kata sandi tidak cocok.');
          setIsLoading(false);
          return;
        }

        const res = await authService.register(name, email, password);
        if (res.success && res.user) {
          setSuccessMsg('Pendaftaran akun berhasil! Anda langsung masuk ke aplikasi.');
          setTimeout(() => {
            onAuthSuccess(res.user!);
          }, 600);
        } else {
          setErrorMsg(res.error || 'Gagal mendaftar akun baru.');
        }
      } else if (mode === 'forgot_password') {
        if (!email.trim()) {
          setErrorMsg('Masukkan alamat email untuk reset kata sandi.');
          setIsLoading(false);
          return;
        }
        const res = await authService.resetPassword(email);
        if (res.success) {
          setSuccessMsg('Instruksi pemulihan kata sandi telah dikirim ke email Anda.');
        } else {
          setErrorMsg(res.error || 'Gagal mengirim email pemulihan kata sandi.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan pada sistem otentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-teal-500 selection:text-white">
      
      {/* Background Decorative Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md z-10">
        
        {/* Brand & Security Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-xl shadow-teal-500/20 mb-3.5">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Buku Hutang & Piutang Digital
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Sistem pencatatan keuangan bisnis terintegrasi Cloud Firebase
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Wajib Login Terlebih Dahulu</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/70 border-b border-slate-800/80 m-2.5 rounded-2xl">
            <button
              type="button"
              id="tab-auth-login"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk (Login)</span>
            </button>
            <button
              type="button"
              id="tab-auth-register"
              onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Akun Baru</span>
            </button>
          </div>

          <div className="p-6">
            
            {/* Quick Demo Access for Authorized Team */}
            {mode === 'login' && (
              <div className="mb-5 p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Akses Cepat Tim Otoritas</span>
                  </span>
                  <span className="text-[10px] text-teal-400 font-semibold bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-500/30">
                    1-Klik Masuk
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {AUTHORIZED_TEAM_MEMBERS.map((member) => (
                    <button
                      key={member.email}
                      type="button"
                      onClick={() => handleQuickDemoLogin(member.email)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-teal-950/50 border border-slate-800 hover:border-teal-500/40 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-2 h-2 rounded-full ${member.role === 'Owner' ? 'bg-amber-400' : 'bg-teal-400'}`} />
                        <span className="truncate">{member.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 group-hover:text-teal-300 font-mono shrink-0 ml-2">
                        {member.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status Notifications */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Lengkap / Nama Bisnis <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Budi Santoso / Dr. Mart"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alamat Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                  />
                </div>
              </div>

              {mode !== 'forgot_password' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Kata Sandi (Password) <span className="text-rose-400">*</span>
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot_password'); setErrorMsg(''); setSuccessMsg(''); }}
                        className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
                      >
                        Lupa Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ulangi Kata Sandi <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              {mode === 'forgot_password' && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
                  >
                    ← Kembali ke Halaman Masuk
                  </button>
                </div>
              )}

              <button
                type="submit"
                id="btn-auth-submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-900/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login' && 'Masuk ke Aplikasi'}
                      {mode === 'register' && 'Buat Akun & Masuk'}
                      {mode === 'forgot_password' && 'Kirim Email Reset Password'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          </div>

          {/* Footer Info */}
          <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Data transaksi tersimpan aman dan terenkripsi di Google Cloud Firestore.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
