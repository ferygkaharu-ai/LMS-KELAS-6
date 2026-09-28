import React, { useState, useEffect } from 'react';
import {
  User,
  TPItem,
  LearningModule,
  AssessmentSubmission,
  StudentProgress,
  ActivityLog,
  AppSettings,
} from './types';
import {
  db,
  COLLECTIONS,
  initAndSeedDatabase,
} from './lib/firebase';
import {
  INITIAL_STUDENTS,
  INITIAL_TEACHER,
  INITIAL_TPS,
  INITIAL_MODULES,
  INITIAL_SETTINGS,
} from './data/initialData';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import {
  collection,
  onSnapshot,
  doc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Target,
  Award,
  Sparkles,
  Users,
  CheckCircle,
  School,
  Lock,
  ArrowRight,
  Wifi,
  WifiOff,
} from 'lucide-react';

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Connection status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Firestore Realtime Collections State
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [users, setUsers] = useState<User[]>([...INITIAL_STUDENTS, INITIAL_TEACHER]);
  const [tps, setTps] = useState<TPItem[]>(INITIAL_TPS);
  const [modules, setModules] = useState<LearningModule[]>(INITIAL_MODULES);
  const [progressMap, setProgressMap] = useState<{ [studentId: string]: StudentProgress }>({});
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isDatabaseReady, setIsDatabaseReady] = useState<boolean>(false);

  // Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize and Seed Firestore on mount
  useEffect(() => {
    let isMounted = true;

    async function setup() {
      try {
        await initAndSeedDatabase();
        if (isMounted) setIsDatabaseReady(true);
      } catch (err) {
        console.warn('Seeding warning:', err);
        if (isMounted) setIsDatabaseReady(true);
      }
    }

    setup();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to Firestore Realtime Updates
  useEffect(() => {
    // 1. Settings listener
    const unsubSettings = onSnapshot(
      doc(db, COLLECTIONS.SETTINGS, 'default'),
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as AppSettings);
        }
      },
      (err) => console.warn('Settings listener error:', err)
    );

    // 2. Users listener
    const unsubUsers = onSnapshot(
      collection(db, COLLECTIONS.USERS),
      (snap) => {
        if (!snap.empty) {
          const list: User[] = [];
          snap.forEach((d) => list.push(d.data() as User));
          setUsers(list);

          // Update current logged in user if changed
          if (currentUser) {
            const updated = list.find((u) => u.id === currentUser.id);
            if (updated) setCurrentUser(updated);
          }
        }
      },
      (err) => console.warn('Users listener error:', err)
    );

    // 3. TPs listener
    const unsubTps = onSnapshot(
      collection(db, COLLECTIONS.TPS),
      (snap) => {
        if (!snap.empty) {
          const list: TPItem[] = [];
          snap.forEach((d) => list.push(d.data() as TPItem));
          // Sort by code (TP 6.1 s/d TP 6.6)
          list.sort((a, b) => a.code.localeCompare(b.code));
          setTps(list);
        }
      },
      (err) => console.warn('TPs listener error:', err)
    );

    // 4. Modules listener
    const unsubModules = onSnapshot(
      collection(db, COLLECTIONS.MODULES),
      (snap) => {
        if (!snap.empty) {
          const list: LearningModule[] = [];
          snap.forEach((d) => list.push(d.data() as LearningModule));
          list.sort((a, b) => a.tpCode.localeCompare(b.tpCode));
          setModules(list);
        }
      },
      (err) => console.warn('Modules listener error:', err)
    );

    // 5. Progress listener
    const unsubProgress = onSnapshot(
      collection(db, COLLECTIONS.PROGRESS),
      (snap) => {
        const map: { [id: string]: StudentProgress } = {};
        snap.forEach((d) => {
          map[d.id] = d.data() as StudentProgress;
        });
        setProgressMap(map);
      },
      (err) => console.warn('Progress listener error:', err)
    );

    // 6. Submissions listener
    const qSubs = query(collection(db, COLLECTIONS.SUBMISSIONS), limit(200));
    const unsubSubs = onSnapshot(
      qSubs,
      (snap) => {
        const list: AssessmentSubmission[] = [];
        snap.forEach((d) => list.push(d.data() as AssessmentSubmission));
        list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setSubmissions(list);
      },
      (err) => console.warn('Submissions listener error:', err)
    );

    // 7. Activity Logs listener
    const qLogs = query(collection(db, COLLECTIONS.ACTIVITY_LOGS), limit(100));
    const unsubLogs = onSnapshot(
      qLogs,
      (snap) => {
        const list: ActivityLog[] = [];
        snap.forEach((d) => list.push(d.data() as ActivityLog));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivityLogs(list);
      },
      (err) => console.warn('Logs listener error:', err)
    );

    return () => {
      unsubSettings();
      unsubUsers();
      unsubTps();
      unsubModules();
      unsubProgress();
      unsubSubs();
      unsubLogs();
    };
  }, [currentUser]);

  // Students list from users
  const studentsList = users.filter((u) => u.role === 'siswa');

  // Login handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Password updated handler
  const handlePasswordChanged = (newPassword: string) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, password: newPassword });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Poppins',sans-serif]">
      {/* Universal Navbar */}
      <Navbar
        currentUser={currentUser}
        isOnline={isOnline}
        onLogout={handleLogout}
        onChangePasswordClick={() => setIsPasswordModalOpen(true)}
        onLoginClick={() => setIsLoginModalOpen(true)}
      />

      {/* Main View Router */}
      {currentUser ? (
        currentUser.role === 'guru' ? (
          <TeacherDashboard
            currentUser={currentUser}
            students={studentsList.length > 0 ? studentsList : INITIAL_STUDENTS}
            tps={tps.length > 0 ? tps : INITIAL_TPS}
            modules={modules.length > 0 ? modules : INITIAL_MODULES}
            progressMap={progressMap}
            submissions={submissions}
            activityLogs={activityLogs}
            settings={settings}
            isOnline={isOnline}
            onRefreshData={() => {}}
            onChangePasswordClick={() => setIsPasswordModalOpen(true)}
            onLogout={handleLogout}
          />
        ) : (
          <StudentDashboard
            currentUser={currentUser}
            tps={tps.length > 0 ? tps : INITIAL_TPS}
            modules={modules.length > 0 ? modules : INITIAL_MODULES}
            progress={progressMap[currentUser.id]}
            submissions={submissions.filter((s) => s.studentId === currentUser.id)}
            onChangePasswordClick={() => setIsPasswordModalOpen(true)}
            onLogout={handleLogout}
            isOnline={isOnline}
          />
        )
      ) : (
        /* Portal Landing Page */
        <main className="flex-1 flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* Hero Banner */}
          <div className="bg-linear-to-r from-blue-700 via-indigo-600 to-sky-700 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
              <School className="w-80 h-80" />
            </div>

            <div className="relative z-10 max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-900 tracking-wide uppercase">
                  SD NEGERI 11 ANGGREK
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white">
                  Tahun Pelajaran 2026/2027
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                LMS IPAS KELAS VI • SEMESTER 1
              </h1>

              <p className="text-xs sm:text-base text-blue-100 font-medium leading-relaxed">
                Platform Pembelajaran Digital dan Pemantauan Kemajuan Belajar Siswa Berbasis ATP dan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) Kurikulum Merdeka.
              </p>

              <div className="pt-2 text-xs text-blue-200">
                Guru Pengampu: <strong className="text-white text-sm">{settings.teacherName}</strong>
              </div>

              {/* Login Call to Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-400/25 transition flex items-center space-x-2"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Masuk Sebagai Siswa (16 Akun)</span>
                </button>

                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold rounded-xl text-xs sm:text-sm backdrop-blur-xs transition flex items-center space-x-2"
                >
                  <ShieldCheck className="w-5 h-5 text-blue-300" />
                  <span>Login Guru Pengampu</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Click Access for Evaluator / Testing */}
          <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Akses Cepat 16 Akun Siswa (Klik Nama Siswa untuk Langsung Masuk):</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setiap akun memiliki username nama lengkap huruf besar dan password awal nama depan.
                </p>
              </div>
              <button
                onClick={() => {
                  const teacher = users.find((u) => u.role === 'guru') || INITIAL_TEACHER;
                  handleLoginSuccess(teacher);
                }}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Masuk Akun Guru Cepat</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2.5">
              {(studentsList.length > 0 ? studentsList : INITIAL_STUDENTS).map((std, idx) => (
                <button
                  key={std.id}
                  onClick={() => handleLoginSuccess(std)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 text-left transition flex items-center space-x-2.5 group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                    {idx + 1}
                  </div>
                  <div className="truncate">
                    <span className="font-extrabold text-xs text-slate-800 truncate block group-hover:text-blue-700">
                      {std.fullName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Pass: {std.password || std.initialPassword}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 6 TP Overview Cards */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <h2 className="font-extrabold text-base text-slate-900">
                Struktur 6 Tujuan Pembelajaran Semester 1 (ATP & KKTP)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tps.map((tp) => (
                <div
                  key={tp.code}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2 hover:border-blue-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-black text-xs rounded-lg">
                      {tp.code}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Semester 1 Ganjil
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-800 line-clamp-2">
                    "{tp.title}"
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {tp.materialSummary}
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Teknik Asesmen:</span>
                    <span className="font-bold text-slate-700">{tp.assessmentTechniques}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        users={users}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        currentUser={currentUser}
        onPasswordChanged={handlePasswordChanged}
      />

      {/* Universal Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 <strong>LMS IPAS KELAS VI</strong> • SD NEGERI 11 ANGGREK
          </span>
          <span>
            Guru Pengampu: <strong>FERY GUSTOMI KAHARU, S.Pd.</strong> • Terhubung Cloud Firestore
          </span>
        </div>
      </footer>
    </div>
  );
}
