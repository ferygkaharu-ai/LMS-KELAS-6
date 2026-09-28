import React, { useState } from 'react';
import { User } from '../types';
import { INITIAL_STUDENTS, INITIAL_TEACHER } from '../data/initialData';
import { LogIn, GraduationCap, ShieldCheck, AlertCircle, Key, User as UserIcon, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  users: User[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  users,
}) => {
  const [roleTab, setRoleTab] = useState<'siswa' | 'guru'>('siswa');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setErrorMsg('Username wajib diisi.');
      setIsLoading(false);
      return;
    }

    if (!password) {
      setErrorMsg('Password wajib diisi.');
      setIsLoading(false);
      return;
    }

    // Check user in database or fallback list
    let matchedUser = users.find(
      (u) =>
        u.role === roleTab &&
        u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    // Fallback if users not yet fetched from firestore
    if (!matchedUser) {
      if (roleTab === 'guru') {
        if (cleanUsername.toLowerCase() === INITIAL_TEACHER.username.toLowerCase()) {
          matchedUser = INITIAL_TEACHER;
        }
      } else {
        matchedUser = INITIAL_STUDENTS.find(
          (s) => s.username.toLowerCase() === cleanUsername.toLowerCase()
        );
      }
    }

    if (!matchedUser) {
      setErrorMsg(
        roleTab === 'siswa'
          ? 'Username siswa tidak ditemukan. Pastikan memasukkan nama lengkap terdaftar.'
          : 'Username guru tidak ditemukan.'
      );
      setIsLoading(false);
      return;
    }

    // Verify password
    if (matchedUser.password !== password) {
      setErrorMsg(
        roleTab === 'siswa'
          ? 'Password salah. Password awal adalah nama depan siswa huruf besar (atau password baru jika telah diganti).'
          : 'Password guru salah. Default: kelas6'
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onLoginSuccess(matchedUser);
    onClose();
  };

  const handleQuickStudentSelect = (std: User) => {
    setUsername(std.username);
    setPassword(std.password || std.initialPassword);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Masuk LMS IPAS</h2>
              <p className="text-xs text-blue-100">SD Negeri 11 Anggrek • Kelas VI</p>
            </div>
          </div>

          {/* Role switcher tabs */}
          <div className="flex rounded-xl bg-blue-900/40 p-1 mt-4">
            <button
              type="button"
              onClick={() => {
                setRoleTab('siswa');
                setUsername('');
                setPassword('');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                roleTab === 'siswa'
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Siswa (16 Akun)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleTab('guru');
                setUsername('Fery Gustomi Kaharu');
                setPassword('kelas6');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                roleTab === 'guru'
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Guru Pengampu</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username {roleTab === 'siswa' && '(NAMA LENGKAP HURUF BESAR)'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={
                  roleTab === 'siswa'
                    ? 'Contoh: ADELIA TIMOMODU'
                    : 'Fery Gustomi Kaharu'
                }
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                autoFocus
              />
            </div>
            {roleTab === 'siswa' && (
              <p className="text-[11px] text-slate-500 mt-1">
                Gunakan nama lengkap huruf kapital sesuai daftar absen kelas.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password {roleTab === 'siswa' && '(Default: Nama Depan)'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Quick Helper for Student Selection (Convenient for Classroom / Testing) */}
          {roleTab === 'siswa' && (
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Pilih Cepat Nama Siswa (16 Siswa):</span>
              </label>
              <select
                onChange={(e) => {
                  const found = (users.length > 0 ? users : INITIAL_STUDENTS).find(
                    (s) => s.username === e.target.value
                  );
                  if (found) handleQuickStudentSelect(found);
                }}
                defaultValue=""
                className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="" disabled>
                  -- Pilih nama siswa dari daftar --
                </option>
                {(users.filter((u) => u.role === 'siswa').length > 0
                  ? users.filter((u) => u.role === 'siswa')
                  : INITIAL_STUDENTS
                ).map((std, idx) => (
                  <option key={std.id} value={std.username}>
                    {idx + 1}. {std.username}
                  </option>
                ))}
              </select>
            </div>
          )}

          {roleTab === 'guru' && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
              <span className="font-bold">Info Akun Guru:</span>
              <p className="mt-0.5">Username: <code>Fery Gustomi Kaharu</code></p>
              <p>Password default: <code>kelas6</code></p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 transition flex items-center justify-center space-x-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Memeriksa...' : 'Masuk Sekarang'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
