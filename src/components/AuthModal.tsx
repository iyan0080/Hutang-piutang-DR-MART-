import React, { useState, useEffect } from 'react';
import { 
  X, 
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
  LogIn
} from 'lucide-react';
import { authService } from '../lib/authService';
import { UserProfile, AUTHORIZED_TEAM_MEMBERS } from '../types';

export type AuthViewMode = 'login' | 'register' | 'change_password' | 'forgot_password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthViewMode;
  currentUser: UserProfile | null;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  currentUser,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<AuthViewMode>(initialMode);
  
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

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      setPassword('');
      setConfirmPassword('');
      if (currentUser && initialMode === 'change_password') {
        setEmail(currentUser.email);
      } else if (!email && AUTHORIZED_TEAM_MEMBERS.length > 0) {
        setEmail(AUTHORIZED_TEAM_MEMBERS[0].email);
      }
    }
  }, [isOpen, initialMode, currentUser]);

  if (!isOpen) return null;

  const handleQuickSelectTeam = (teamEmail: string) => {
    setEmail(teamEmail);
    setErrorMsg('');
  };

  const handleQuickDemoLogin = (teamEmail: string) => {
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      const user = authService.quickLogin(teamEmail);
      setIsLoading(false);
      setSuccessMsg(`Berhasil masuk sebagai ${user.displayName} (${user.role})`);
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 700);
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setErrorMsg('Email dan password wajib diisi.');
          setIsLoading(false);
          return;
        }

        const res = await authService.login(email, password);
        if (res.success && res.user) {
          setSuccessMsg('Login berhasil! Mengarahkan ke aplikasi...');
          setTimeout(() => {
            onAuthSuccess(res.user!);
            onClose();
          }, 600);
        } else {
          setErrorMsg(res.error || 'Gagal masuk. Periksa kembali email dan password Anda.');
        }
      } else if (mode === 'register') {
        if (!name.trim()) {
          setErrorMsg('Nama lengkap wajib diisi.');
          setIsLoading(false);
          return;
        }
        if (!email.trim()) {
          setErrorMsg('Email wajib diisi.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password minimal 6 karakter.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi password tidak cocok.');
          setIsLoading(false);
          return;
        }

        const res = await authService.register(name, email, password);
        if (res.success && res.user) {
          setSuccessMsg('Pendaftaran akun berhasil! Anda langsung masuk.');
          setTimeout(() => {
            onAuthSuccess(res.user!);
            onClose();
          }, 800);
        } else {
          setErrorMsg(res.error || 'Gagal mendaftar akun baru.');
        }
      } else if (mode === 'change_password') {
        if (password.length < 6) {
          setErrorMsg('Password baru minimal 6 karakter.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi password baru tidak cocok.');
          setIsLoading(false);
          return;
        }

        const res = await authService.changePassword(password);
        if (res.success) {
          setSuccessMsg('Kata sandi berhasil diperbarui dengan aman!');
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setErrorMsg(res.error || 'Gagal mengganti password.');
        }
      } else if (mode === 'forgot_password') {
        if (!email.trim()) {
          setErrorMsg('Masukkan alamat email untuk reset password.');
          setIsLoading(false);
          return;
        }
        const res = await authService.resetPassword(email);
        if (res.success) {
          setSuccessMsg('Instruksi reset password telah dikirim ke email Anda.');
        } else {
          setErrorMsg(res.error || 'Gagal mengirim email reset password.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-400/30">
              {mode === 'login' && <LogIn className="w-5 h-5" />}
              {mode === 'register' && <UserPlus className="w-5 h-5" />}
              {mode === 'change_password' && <KeyRound className="w-5 h-5" />}
              {mode === 'forgot_password' && <Mail className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'login' && 'Masuk Akun Pengelola'}
                {mode === 'register' && 'Pendaftaran Akun Baru'}
                {mode === 'change_password' && 'Ganti Kata Sandi (Password)'}
                {mode === 'forgot_password' && 'Reset Kata Sandi'}
              </h3>
              <p className="text-xs text-slate-300">
                {mode === 'login' && 'Akses pembukuan terpusat & multi-perangkat'}
                {mode === 'register' && 'Buat profil pengelola buku hutang piutang'}
                {mode === 'change_password' && 'Perbarui kata sandi untuk keamanan akun'}
                {mode === 'forgot_password' && 'Dapatkan tautan pemulihan kata sandi'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher for Login / Register / Change Password */}
        <div className="px-6 pt-4 pb-1 flex border-b border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 pb-2.5 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer ${
              mode === 'login'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 pb-2.5 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer ${
              mode === 'register'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Baru
          </button>
          <button
            type="button"
            onClick={() => { setMode('change_password'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 pb-2.5 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer ${
              mode === 'change_password'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ganti Password
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Status Notifications */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Demo Access for Authorized Team */}
          {mode === 'login' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Akses Cepat Tim Otoritas</span>
                </span>
                <span className="text-[10px] text-slate-400">1-Klik Masuk</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {AUTHORIZED_TEAM_MEMBERS.map((member) => (
                  <button
                    key={member.email}
                    type="button"
                    onClick={() => handleQuickDemoLogin(member.email)}
                    className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50/70 border border-slate-200 hover:border-teal-300 text-xs font-semibold text-slate-700 hover:text-teal-900 transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full ${member.role === 'Owner' ? 'bg-amber-500' : 'bg-teal-500'}`} />
                      <span className="truncate">{member.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 group-hover:text-teal-600 font-mono shrink-0 ml-2">
                      Masuk &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name Field (Register mode only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap / Nama Toko <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Contoh: Budi Prasetyo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Email Field (for Login, Register, Forgot Password) */}
          {mode !== 'change_password' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Active User Email info in Change Password */}
          {mode === 'change_password' && currentUser && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Akun Aktif:</span>
              <span className="font-bold text-slate-800 font-mono">{currentUser.email}</span>
            </div>
          )}

          {/* Password Field (Login, Register, Change Password) */}
          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {mode === 'change_password' ? 'Kata Sandi Baru' : 'Kata Sandi (Password)'} <span className="text-rose-500">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot_password')}
                    className="text-[11px] text-teal-700 hover:text-teal-800 font-semibold cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'change_password' ? 'Minimal 6 karakter' : 'Masukkan password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password (Register & Change Password) */}
          {(mode === 'register' || mode === 'change_password') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi kata sandi di atas"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  {mode === 'login' && <span>Masuk ke Akun</span>}
                  {mode === 'register' && <span>Daftarkan Akun Sekarang</span>}
                  {mode === 'change_password' && <span>Simpan Kata Sandi Baru</span>}
                  {mode === 'forgot_password' && <span>Kirim Link Reset Password</span>}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Bottom Switcher */}
          <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            {mode === 'login' && (
              <p>
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Daftar akun baru di sini
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p>
                Sudah memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Masuk di sini
                </button>
              </p>
            )}
            {(mode === 'change_password' || mode === 'forgot_password') && (
              <p>
                Kembali ke halaman{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Masuk Akun
                </button>
              </p>
            )}
          </div>

        </form>

      </div>
    </div>
  );
};
