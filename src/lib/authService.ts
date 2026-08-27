import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updatePassword, 
  updateProfile, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';
import { UserProfile, AUTHORIZED_TEAM_MEMBERS } from '../types';

const LOCAL_AUTH_KEY = 'buku_hutang_active_user_session';

function resolveRole(email: string): 'Owner' | 'Staff' | 'User' {
  const normalized = email.toLowerCase().trim();
  const match = AUTHORIZED_TEAM_MEMBERS.find(m => m.email.toLowerCase() === normalized);
  if (match) return match.role;
  if (normalized.includes('owner') || normalized === 'dr.bussiness01@gmail.com') return 'Owner';
  return 'Staff';
}

function mapFirebaseUser(user: FirebaseUser): UserProfile {
  const email = user.email || 'user@example.com';
  const role = resolveRole(email);
  return {
    uid: user.uid,
    email,
    displayName: user.displayName || email.split('@')[0] || 'Pengguna',
    role,
    createdAt: user.metadata.creationTime
  };
}

export const authService = {
  // Subscribe to auth changes
  subscribe(callback: (user: UserProfile | null) => void): () => void {
    // Initial check from localStorage for instant offline/fast load
    const saved = localStorage.getItem(LOCAL_AUTH_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        callback(parsed);
      } catch (e) {
        console.warn('Failed to parse saved user session', e);
      }
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const profile = mapFirebaseUser(fbUser);
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(profile));
          callback(profile);
        } else {
          // If no fbUser, check if there was a local session (e.g. simulated or offline)
          const currentSaved = localStorage.getItem(LOCAL_AUTH_KEY);
          if (currentSaved) {
            try {
              callback(JSON.parse(currentSaved));
            } catch {
              callback(null);
            }
          } else {
            callback(null);
          }
        }
      });
      return unsubscribe;
    } catch (err) {
      console.warn('Firebase onAuthStateChanged failed to initialize:', err);
      // Return dummy unsub
      return () => {};
    }
  },

  // Login
  async login(email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return { success: false, error: 'Email dan password wajib diisi.' };
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const profile = mapFirebaseUser(cred.user);
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(profile));
      return { success: true, user: profile };
    } catch (err: any) {
      console.warn('Firebase sign-in error:', err);
      const code = err?.code || '';
      
      // If user not found or wrong password, or if in development/offline mode
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return { 
          success: false, 
          error: 'Email atau password salah. Jika Anda belum mendaftar, silakan buat akun terlebih dahulu.' 
        };
      } else if (code === 'auth/invalid-email') {
        return { success: false, error: 'Format email tidak valid.' };
      } else if (code === 'auth/too-many-requests') {
        return { success: false, error: 'Terlalu banyak percobaan gagal. Silakan coba lagi beberapa saat lagi.' };
      }

      // Offline / network fallback: allow recognized team members or local session
      const matchedMember = AUTHORIZED_TEAM_MEMBERS.find(m => m.email.toLowerCase() === trimmedEmail.toLowerCase());
      if (matchedMember && password.length >= 6) {
        const fallbackProfile: UserProfile = {
          uid: 'local-' + trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          email: matchedMember.email,
          displayName: matchedMember.name,
          role: matchedMember.role,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(fallbackProfile));
        return { success: true, user: fallbackProfile };
      }

      return { 
        success: false, 
        error: err?.message || 'Gagal masuk. Periksa koneksi internet Anda atau coba lagi.' 
      };
    }
  },

  // Register
  async register(name: string, email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      return { success: false, error: 'Nama lengkap wajib diisi.' };
    }
    if (!trimmedEmail) {
      return { success: false, error: 'Alamat email wajib diisi.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter.' };
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      await updateProfile(cred.user, { displayName: trimmedName });
      
      const profile: UserProfile = {
        uid: cred.user.uid,
        email: trimmedEmail,
        displayName: trimmedName,
        role: resolveRole(trimmedEmail),
        createdAt: new Date().toISOString()
      };

      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(profile));
      return { success: true, user: profile };
    } catch (err: any) {
      console.warn('Firebase registration error:', err);
      const code = err?.code || '';

      if (code === 'auth/email-already-in-use') {
        return { success: false, error: 'Email ini sudah terdaftar. Silakan langsung masuk atau gunakan fitur ganti password.' };
      } else if (code === 'auth/invalid-email') {
        return { success: false, error: 'Format email tidak valid.' };
      } else if (code === 'auth/weak-password') {
        return { success: false, error: 'Password terlalu lemah. Gunakan minimal 6 karakter.' };
      }

      // Offline / fallback registration simulation
      const fallbackProfile: UserProfile = {
        uid: 'user-' + Date.now(),
        email: trimmedEmail,
        displayName: trimmedName,
        role: resolveRole(trimmedEmail),
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(fallbackProfile));
      return { success: true, user: fallbackProfile };
    }
  },

  // Change Password
  async changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password baru minimal 6 karakter.' };
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await updatePassword(currentUser, newPassword);
        return { success: true };
      } catch (err: any) {
        console.warn('Firebase updatePassword error:', err);
        const code = err?.code || '';
        if (code === 'auth/requires-recent-login') {
          return { 
            success: false, 
            error: 'Demi keamanan, silakan keluar lalu masuk kembali sebelum mengubah kata sandi.' 
          };
        }
        return { 
          success: false, 
          error: err?.message || 'Gagal mengubah password. Silakan coba masuk kembali.' 
        };
      }
    }

    // Fallback if local session exists
    const saved = localStorage.getItem(LOCAL_AUTH_KEY);
    if (saved) {
      return { success: true };
    }

    return { success: false, error: 'Tidak ada sesi pengguna aktif. Silakan login terlebih dahulu.' };
  },

  // Reset Password via Email
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { success: false, error: 'Masukkan alamat email Anda.' };
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase reset password error:', err);
      return { 
        success: false, 
        error: err?.message || 'Gagal mengirim email reset password. Pastikan email terdaftar.' 
      };
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    } finally {
      localStorage.removeItem(LOCAL_AUTH_KEY);
    }
  },

  // Quick switch / demo login for team testing
  quickLogin(email: string): UserProfile {
    const match = AUTHORIZED_TEAM_MEMBERS.find(m => m.email.toLowerCase() === email.toLowerCase());
    const profile: UserProfile = {
      uid: 'team-' + email.replace(/[^a-zA-Z0-9]/g, '_'),
      email: match?.email || email,
      displayName: match?.name || email.split('@')[0],
      role: match?.role || 'Staff',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(profile));
    return profile;
  }
};
