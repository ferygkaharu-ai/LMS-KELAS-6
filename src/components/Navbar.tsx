import React from 'react';
import { User } from '../types';
import { BookOpen, Wifi, WifiOff, LogOut, KeyRound, UserCheck, Shield, School } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  isOnline: boolean;
  onLogout: () => void;
  onChangePasswordClick: () => void;
  onLoginClick: () => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isOnline,
  onLogout,
  onChangePasswordClick,
  onLoginClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  LMS IPAS KELAS VI
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Fase C • Sem. 1
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                SD NEGERI 11 ANGGREK • TP 2026/2027
              </p>
            </div>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Online / Offline Sync Badge */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
              }`}
              title={isOnline ? 'Terhubung ke Database Cloud Firestore' : 'Koneksi Terputus - Menyimpan Lokal'}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {/* User State */}
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-600">
                    {currentUser.role === 'guru' ? 'Guru Pengampu' : 'Siswa Kelas VI'}
                  </span>
                </div>

                <div className="relative flex items-center space-x-1">
                  {/* Change Password Button */}
                  <button
                    onClick={onChangePasswordClick}
                    title="Ganti Password"
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={onLogout}
                    title="Keluar / Logout"
                    className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-medium transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Keluar</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition"
              >
                <UserCheck className="w-4 h-4" />
                <span>Masuk / Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
