import React, { useState, useMemo } from 'react';
import {
  User,
  TPItem,
  LearningModule,
  AssessmentSubmission,
  StudentProgress,
  ActivityLog,
  AppSettings,
  KKTPCategory,
} from '../types';
import {
  db,
  COLLECTIONS,
  logActivity,
  getKKTPCategory,
  getKKTPLabel,
  recalculateAndSaveStudentProgress,
} from '../lib/firebase';
import {
  exportToExcel,
  downloadRekapNilaiPdf,
  downloadAnalisisTpPdf,
  downloadNilaiIndividuPdf,
  downloadHasilPekerjaanPdf,
  downloadProgressSiswaPdf,
} from '../lib/exportUtils';
import { AIModuleUploader } from './AIModuleUploader';
import { doc, updateDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import {
  LayoutDashboard,
  Users,
  Target,
  BookOpen,
  Activity,
  FileCheck2,
  FileSpreadsheet,
  Award,
  PieChart,
  BarChart3,
  UserCheck,
  TableProperties,
  TrendingUp,
  Download,
  FileDown,
  Settings,
  RotateCcw,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Clock,
  Sparkles,
  Printer,
  Shield,
  Save,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface TeacherDashboardProps {
  currentUser: User;
  students: User[];
  tps: TPItem[];
  modules: LearningModule[];
  progressMap: { [studentId: string]: StudentProgress };
  submissions: AssessmentSubmission[];
  activityLogs: ActivityLog[];
  settings: AppSettings;
  isOnline: boolean;
  onRefreshData: () => void;
  onChangePasswordClick: () => void;
  onLogout: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  students,
  tps,
  modules,
  progressMap,
  submissions,
  activityLogs,
  settings,
  isOnline,
  onRefreshData,
  onChangePasswordClick,
  onLogout,
}) => {
  // Navigation Menu (17 items)
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTP, setFilterTP] = useState('ALL');
  const [filterKKTP, setFilterKKTP] = useState('ALL');

  // Selected Student for Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  // Selected Submission for Teacher Grading Modal
  const [gradingSubmission, setGradingSubmission] = useState<AssessmentSubmission | null>(null);
  const [manualGrade, setManualGrade] = useState<number>(0);
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');

  // Selected TP for Deep Dive Analysis
  const [selectedAnalysisTP, setSelectedAnalysisTP] = useState<string>('TP 6.1');

  // Manual Rubric editing for TP 6.6
  const [tp66IndicatorText, setTp66IndicatorText] = useState(settings.tp66IndicatorText || '');
  const [tp66TechniqueText, setTp66TechniqueText] = useState(settings.tp66TechniqueText || '');

  // Reset confirmation state
  const [resetModalState, setResetModalState] = useState<{
    isOpen: boolean;
    type: 'password' | 'progress' | 'tp' | 'all';
    targetStudentId?: string;
    targetTPCode?: string;
    studentName?: string;
  }>({ isOpen: false, type: 'password' });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Dashboard Aggregates (Real Firestore Data)
  const stats = useMemo(() => {
    const totalStudents = students.length;
    let completedAnyCount = 0;
    let totalScoreSum = 0;
    let scoredCount = 0;
    let bb = 0;
    let mb = 0;
    let bsh = 0;
    let sb = 0;
    let totalProgressSum = 0;

    students.forEach((s) => {
      const p = progressMap[s.id];
      if (p) {
        totalProgressSum += p.overallProgressPercent;
        if (p.completedTPCount > 0) completedAnyCount++;
        if (p.averageScore > 0) {
          totalScoreSum += p.averageScore;
          scoredCount++;
          if (p.kktpCategory === 'SB') sb++;
          else if (p.kktpCategory === 'BSH') bsh++;
          else if (p.kktpCategory === 'MB') mb++;
          else bb++;
        } else {
          bb++;
        }
      } else {
        bb++;
      }
    });

    const classAverage = scoredCount > 0 ? Math.round(totalScoreSum / scoredCount) : 0;
    const avgProgress = totalStudents > 0 ? Math.round(totalProgressSum / totalStudents) : 0;

    return {
      totalStudents,
      totalTPs: 6,
      submittedCount: completedAnyCount,
      unsubmittedCount: totalStudents - completedAnyCount,
      classAverage,
      avgProgress,
      distribution: { bb, mb, bsh, sb },
    };
  }, [students, progressMap]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.username.toLowerCase().includes(searchQuery.toLowerCase());

      const p = progressMap[s.id];
      const matchKKTP = filterKKTP === 'ALL' || (p && p.kktpCategory === filterKKTP);

      return matchSearch && matchKKTP;
    });
  }, [students, progressMap, searchQuery, filterKKTP]);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchSearch = sub.studentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTP = filterTP === 'ALL' || sub.tpCode === filterTP;
      return matchSearch && matchTP;
    });
  }, [submissions, searchQuery, filterTP]);

  // Handle Teacher Grading Submission
  const handleSaveTeacherGrade = async () => {
    if (!gradingSubmission) return;

    try {
      const subRef = doc(db, COLLECTIONS.SUBMISSIONS, gradingSubmission.id);
      const grade = Math.min(100, Math.max(0, Number(manualGrade)));
      const category = getKKTPCategory(grade);

      await updateDoc(subRef, {
        finalGrade: grade,
        kktpCategory: category,
        status: 'dinilai',
        teacherNotes: teacherFeedback,
        gradedByTeacher: true,
      });

      await logActivity(
        gradingSubmission.studentId,
        gradingSubmission.studentName,
        gradingSubmission.tpCode,
        `Guru memberikan nilai: ${grade} (${category})`,
        'Dinilai',
        grade
      );

      await recalculateAndSaveStudentProgress(gradingSubmission.studentId);
      showNotice('success', `Nilai ${gradingSubmission.studentName} berhasil diperbarui menjadi ${grade}!`);
      setGradingSubmission(null);
      onRefreshData();
    } catch (err: any) {
      showNotice('error', 'Gagal menyimpan nilai: ' + err.message);
    }
  };

  // Handle Save Manual Rubric for TP 6.6
  const handleSaveTP66Rubric = async () => {
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'default');
      await updateDoc(settingsRef, {
        tp66IndicatorText,
        tp66TechniqueText,
      });

      // Also update in TP doc
      const tpRef = doc(db, COLLECTIONS.TPS, 'TP 6.6');
      const lines = tp66IndicatorText.split('\n').filter(Boolean);
      await updateDoc(tpRef, {
        indicators: lines,
        assessmentTechniques: tp66TechniqueText,
      });

      showNotice('success', 'Indikator dan rubrik penilaian TP 6.6 berhasil disimpan ke database!');
      onRefreshData();
    } catch (e: any) {
      showNotice('error', 'Gagal menyimpan rubrik: ' + e.message);
    }
  };

  // Reset Actions Handler
  const handleExecuteReset = async () => {
    const { type, targetStudentId, targetTPCode } = resetModalState;

    try {
      if (type === 'password' && targetStudentId) {
        // Reset single student password to initial first name
        const student = students.find((s) => s.id === targetStudentId);
        if (student) {
          const userRef = doc(db, COLLECTIONS.USERS, student.id);
          await updateDoc(userRef, {
            password: student.initialPassword,
          });
          await logActivity(
            student.id,
            student.fullName,
            'SYSTEM',
            `Guru mereset password siswa ke default (${student.initialPassword})`,
            'Menyimpan'
          );
          showNotice('success', `Password siswa ${student.fullName} berhasil direset ke: ${student.initialPassword}`);
        }
      } else if (type === 'progress' && targetStudentId) {
        // Reset single student progress
        const student = students.find((s) => s.id === targetStudentId);
        if (student) {
          const progRef = doc(db, COLLECTIONS.PROGRESS, student.id);
          await setDoc(progRef, {
            studentId: student.id,
            studentName: student.fullName,
            tpProgress: {},
            overallProgressPercent: 0,
            completedTPCount: 0,
            averageScore: 0,
            kktpCategory: 'BB',
            lastActive: new Date().toISOString(),
          });
          await recalculateAndSaveStudentProgress(student.id);
          showNotice('success', `Progress belajar ${student.fullName} berhasil direset.`);
        }
      } else if (type === 'all') {
        // Full Reset of all 16 students progress
        const batch = writeBatch(db);
        students.forEach((student) => {
          const progRef = doc(db, COLLECTIONS.PROGRESS, student.id);
          batch.set(progRef, {
            studentId: student.id,
            studentName: student.fullName,
            tpProgress: {},
            overallProgressPercent: 0,
            completedTPCount: 0,
            averageScore: 0,
            kktpCategory: 'BB',
            lastActive: new Date().toISOString(),
          });
        });
        await batch.commit();
        showNotice('success', 'Seluruh data progress belajar 16 siswa telah berhasil direset.');
      }

      setResetModalState({ isOpen: false, type: 'password' });
      onRefreshData();
    } catch (e: any) {
      showNotice('error', 'Gagal melakukan reset: ' + e.message);
    }
  };

  // Nav menus list (17 items as required by prompt)
  const navItems = [
    { id: 'dashboard', label: '1. Dashboard Utama', icon: LayoutDashboard },
    { id: 'siswa', label: '2. Data Siswa (16 Siswa)', icon: Users },
    { id: 'tujuan', label: '3. Tujuan Pembelajaran (ATP)', icon: Target },
    { id: 'modul', label: '4. Modul / Materi & AI', icon: BookOpen },
    { id: 'aktivitas', label: '5. Aktivitas Siswa', icon: Activity },
    { id: 'pekerjaan', label: '6. Hasil Pekerjaan & Kuis', icon: FileCheck2 },
    { id: 'daftar_nilai', label: '7. Daftar Nilai', icon: FileSpreadsheet },
    { id: 'penilaian', label: '8. Input & Edit Penilaian', icon: Award },
    { id: 'analisis_nilai', label: '9. Analisis Nilai Kelas', icon: PieChart },
    { id: 'analisis_tp', label: '10. Analisis Per TP (6 TP)', icon: BarChart3 },
    { id: 'analisis_siswa', label: '11. Analisis Per Siswa', icon: UserCheck },
    { id: 'rekap', label: '12. Rekap Nilai Kelas', icon: TableProperties },
    { id: 'progress', label: '13. Progress Siswa', icon: TrendingUp },
    { id: 'export_excel', label: '14. Export Excel (10 Sheet)', icon: FileSpreadsheet },
    { id: 'download_pdf', label: '15. Download PDF Rapor & Rekap', icon: FileDown },
    { id: 'pengaturan', label: '16. Pengaturan & Rubrik TP 6.6', icon: Settings },
    { id: 'reset_data', label: '17. Reset Data & Password', icon: RotateCcw },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-18 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs max-w-sm flex items-start space-x-2 animate-in slide-in-from-top ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Teacher Top Identity Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-6 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white tracking-wide">
                DASHBOARD GURU PENGAMPU
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900">
                SD NEGERI 11 ANGGREK
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center space-x-2">
              <span>{settings.teacherName}</span>
              <Shield className="w-5 h-5 text-blue-400 shrink-0" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
              Mata Pelajaran: {settings.subject} • Kelas {settings.className} • Fase {settings.phase} • Semester {settings.semester} • TP {settings.academicYear}
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportToExcel(students, progressMap, submissions, tps, settings)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => downloadRekapNilaiPdf(students, progressMap, settings)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid with Teacher Sidebar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sticky top-20">
              <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider px-3 mb-2 block">
                Menu Pengelolaan Guru
              </span>
              <nav className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMenu(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* 1. DASHBOARD UTAMA */}
            {activeMenu === 'dashboard' && (
              <div className="space-y-6">
                {/* Real Firestore KPI Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-semibold">Total Siswa Terdaftar</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalStudents} Siswa</div>
                    <span className="text-[10px] text-blue-600 font-bold">16 Akun Lengkap</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-semibold">Tujuan Pembelajaran</span>
                    <div className="text-2xl font-black text-blue-700 mt-1">6 TP</div>
                    <span className="text-[10px] text-slate-500">TP 6.1 s/d TP 6.6</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-semibold">Rata-rata Kelas</span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{stats.classAverage}</div>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      {getKKTPCategory(stats.classAverage)}
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-semibold">Progress Kelas</span>
                    <div className="text-2xl font-black text-indigo-600 mt-1">{stats.avgProgress}%</div>
                    <span className="text-[10px] text-slate-500">Ketercapaian materi</span>
                  </div>
                </div>

                {/* KKTP Distribution Real Breakdown */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Distribusi Ketercapaian KKTP Siswa Kelas VI (Real Database)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-emerald-800 font-bold block">SB (Sangat Berkembang)</span>
                      <span className="text-2xl font-black text-emerald-700">{stats.distribution.sb}</span>
                      <span className="text-[10px] text-emerald-600 block">Nilai 81 – 100</span>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <span className="text-blue-800 font-bold block">BSH (Sesuai Harapan)</span>
                      <span className="text-2xl font-black text-blue-700">{stats.distribution.bsh}</span>
                      <span className="text-[10px] text-blue-600 block">Nilai 61 – 80</span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-amber-800 font-bold block">MB (Mulai Berkembang)</span>
                      <span className="text-2xl font-black text-amber-700">{stats.distribution.mb}</span>
                      <span className="text-[10px] text-amber-600 block">Nilai 41 – 60</span>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-rose-800 font-bold block">BB (Belum Berkembang)</span>
                      <span className="text-2xl font-black text-rose-700">{stats.distribution.bb}</span>
                      <span className="text-[10px] text-rose-600 block">Nilai 0 – 40</span>
                    </div>
                  </div>
                </div>

                {/* TP Progress Overview Matrix */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Ringkasan Nilai Rata-rata Setiap TP Semester 1
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {tps.map((tp) => {
                      let tpScoreSum = 0;
                      let count = 0;
                      students.forEach((s) => {
                        const score = progressMap[s.id]?.tpProgress?.[tp.code]?.finalScore;
                        if (score) {
                          tpScoreSum += score;
                          count++;
                        }
                      });
                      const tpAvg = count > 0 ? Math.round(tpScoreSum / count) : 0;

                      return (
                        <div key={tp.code} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-blue-700">{tp.code}</span>
                            <span className="font-bold text-slate-700">{tpAvg} / 100</span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-1">{tp.materialSummary}</p>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${tpAvg}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. DATA SISWA (16 SISWA) */}
            {activeMenu === 'siswa' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Daftar 16 Akun Siswa Kelas VI
                    </h3>
                    <p className="text-xs text-slate-500">
                      Klik salah satu siswa untuk melihat detail riwayat, nilai tiap TP, jawaban kuis, dan tugas.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama siswa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Table of 16 students */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-12 text-center">No</th>
                        <th className="p-3">Nama Lengkap Siswa</th>
                        <th className="p-3">Username</th>
                        <th className="p-3 text-center">Progress</th>
                        <th className="p-3 text-center">TP Selesai</th>
                        <th className="p-3 text-center">Rata-rata</th>
                        <th className="p-3 text-center">Kategori</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((s, idx) => {
                        const p = progressMap[s.id];
                        return (
                          <tr key={s.id} className="hover:bg-blue-50/40">
                            <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">{s.fullName}</td>
                            <td className="p-3 font-mono text-slate-600">{s.username}</td>
                            <td className="p-3 text-center font-bold text-blue-700">
                              {p?.overallProgressPercent || 0}%
                            </td>
                            <td className="p-3 text-center">
                              {p?.completedTPCount || 0} / 6 TP
                            </td>
                            <td className="p-3 text-center font-black text-emerald-700">
                              {p?.averageScore || 0}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded font-black text-[10px] bg-slate-100">
                                {p ? p.kktpCategory : 'BB'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setSelectedStudent(s)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition"
                                >
                                  Detail
                                </button>
                                <button
                                  onClick={() =>
                                    setResetModalState({
                                      isOpen: true,
                                      type: 'password',
                                      targetStudentId: s.id,
                                      studentName: s.fullName,
                                    })
                                  }
                                  title="Reset Password ke Awal (Nama Depan)"
                                  className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. TUJUAN PEMBELAJARAN (ATP) & INDIKATOR */}
            {activeMenu === 'tujuan' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Tujuan Pembelajaran IPAS Kelas VI Semester 1 (ATP Resmi)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Gunakan rumusan resmi TP 6.1 hingga TP 6.6 tanpa mengubah redaksi.
                  </p>
                </div>

                <div className="space-y-4">
                  {tps.map((tp) => (
                    <div key={tp.code} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-blue-600 text-white font-extrabold rounded-lg">
                          {tp.code}
                        </span>
                        <span className="font-semibold text-slate-600">Teknik: {tp.assessmentTechniques}</span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">"{tp.title}"</p>
                      <p className="text-slate-600"><strong>Materi:</strong> {tp.materialSummary}</p>
                      <div>
                        <strong className="text-slate-700 block mb-1">Indikator KKTP:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                          {tp.indicators.map((ind, i) => (
                            <li key={i}>{ind}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. MODUL / MATERI & AI GENERATOR */}
            {activeMenu === 'modul' && (
              <div className="space-y-6">
                {/* AI Document Processor & Uploader */}
                <AIModuleUploader
                  tps={tps}
                  currentModules={modules}
                  onModuleSaved={() => {
                    onRefreshData();
                    showNotice('success', 'Modul berhasil diperbarui!');
                  }}
                />

                {/* Existing Modules List */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Modul Digital yang Aktif di Sistem
                  </h3>
                  <div className="space-y-3 text-xs">
                    {modules.map((m) => (
                      <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-blue-700">{m.tpCode}</span>
                          <span className="text-[10px] text-slate-400">
                            Diperbarui: {new Date(m.updatedAt).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900">{m.title}</h4>
                        <p className="text-slate-600 mt-1 line-clamp-2">{m.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. AKTIVITAS SISWA (REAL-TIME LOG) */}
            {activeMenu === 'aktivitas' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span>Log Aktivitas Pembelajaran Siswa (Sinkronisasi Multi-Perangkat)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Memantau kegiatan belajar seluruh siswa secara langsung saat mereka membuka modul, mengerjakan kuis, atau mengirim tugas dari HP/laptop masing-masing.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-3">Waktu</th>
                        <th className="p-3">Nama Siswa</th>
                        <th className="p-3">TP</th>
                        <th className="p-3">Aktivitas</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activityLogs.slice(0, 30).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{log.studentName}</td>
                          <td className="p-3 font-semibold text-blue-700">{log.tpCode}</td>
                          <td className="p-3 text-slate-700">{log.activity}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3 text-center font-black text-emerald-700">
                            {log.score !== undefined ? log.score : '-'}
                          </td>
                        </tr>
                      ))}
                      {activityLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            Belum ada aktivitas yang tercatat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. HASIL PEKERJAAN & KUIS */}
            {activeMenu === 'pekerjaan' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Hasil Pekerjaan & Asesmen Siswa
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tinjau jawaban lengkap, periksa uraian, berikan skor, dan tulis catatan penilaian.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={filterTP}
                      onChange={(e) => setFilterTP(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="ALL">Semua TP</option>
                      {tps.map((tp) => (
                        <option key={tp.code} value={tp.code}>
                          {tp.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-3">Nama Siswa</th>
                        <th className="p-3">TP</th>
                        <th className="p-3">Jenis Asesmen</th>
                        <th className="p-3 text-center">Nilai</th>
                        <th className="p-3 text-center">Kategori</th>
                        <th className="p-3">Waktu</th>
                        <th className="p-3 text-center">Aksi Penilaian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{sub.studentName}</td>
                          <td className="p-3 font-semibold text-blue-700">{sub.tpCode}</td>
                          <td className="p-3 font-medium uppercase text-slate-600">
                            {sub.assessmentType.replace('_', ' ')}
                          </td>
                          <td className="p-3 text-center font-black text-emerald-700">
                            {sub.finalGrade}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded font-black text-[10px] bg-slate-100">
                              {sub.kktpCategory}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">
                            {new Date(sub.submittedAt).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setGradingSubmission(sub);
                                setManualGrade(sub.finalGrade);
                                setTeacherFeedback(sub.teacherNotes || '');
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition"
                            >
                              Tinjau & Nilai
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredSubmissions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400">
                            Belum ada submission yang sesuai kriteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. DAFTAR NILAI */}
            {activeMenu === 'daftar_nilai' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Daftar Nilai Semester 1 (TP 6.1 – TP 6.6)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Matriks capaian hasil belajar seluruh siswa.
                    </p>
                  </div>
                  <button
                    onClick={() => downloadRekapNilaiPdf(students, progressMap, settings)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak PDF</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-3 w-10 text-center">No</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3 text-center">TP 6.1</th>
                        <th className="p-3 text-center">TP 6.2</th>
                        <th className="p-3 text-center">TP 6.3</th>
                        <th className="p-3 text-center">TP 6.4</th>
                        <th className="p-3 text-center">TP 6.5</th>
                        <th className="p-3 text-center">TP 6.6</th>
                        <th className="p-3 text-center bg-blue-50">Rata-rata</th>
                        <th className="p-3 text-center">Kategori</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((s, idx) => {
                        const p = progressMap[s.id];
                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">{s.fullName}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.1']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.2']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.3']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.4']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.5']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.6']?.finalScore || 0}</td>
                            <td className="p-3 text-center font-black text-blue-900 bg-blue-50/50">
                              {p?.averageScore || 0}
                            </td>
                            <td className="p-3 text-center font-bold">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px]">
                                {p ? p.kktpCategory : 'BB'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 8. PENILAIAN CEPAT GURU */}
            {activeMenu === 'penilaian' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Form Input & Perubahan Nilai Cepat
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Guru dapat memasukkan nilai tugas presentasi, observasi laboratorium, atau mengubah nilai siswa secara manual. Semua perubahan disimpan langsung ke Firestore.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {students.map((s) => {
                    const p = progressMap[s.id];
                    return (
                      <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{s.fullName}</span>
                          <span className="font-black text-blue-700">Rata-rata: {p?.averageScore || 0}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {tps.map((tp) => {
                            const val = p?.tpProgress?.[tp.code]?.finalScore || 0;
                            return (
                              <div key={tp.code} className="text-center">
                                <span className="text-[10px] text-slate-500 font-bold block">{tp.code}</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  defaultValue={val}
                                  onBlur={async (e) => {
                                    const newScore = Math.min(100, Math.max(0, Number(e.target.value)));
                                    if (newScore !== val) {
                                      const progRef = doc(db, COLLECTIONS.PROGRESS, s.id);
                                      const currentDetail = p?.tpProgress?.[tp.code] || {};
                                      await setDoc(
                                        progRef,
                                        {
                                          tpProgress: {
                                            [tp.code]: {
                                              ...currentDetail,
                                              finalScore: newScore,
                                              kktpCategory: getKKTPCategory(newScore),
                                            },
                                          },
                                        },
                                        { merge: true }
                                      );
                                      await recalculateAndSaveStudentProgress(s.id);
                                      showNotice('success', `Nilai ${s.fullName} (${tp.code}) diubah menjadi ${newScore}`);
                                      onRefreshData();
                                    }
                                  }}
                                  className="w-full text-center py-1 bg-white border border-slate-300 rounded font-bold"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 9 & 10. ANALISIS NILAI & ANALISIS PER TP */}
            {(activeMenu === 'analisis_nilai' || activeMenu === 'analisis_tp') && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Analisis Ketercapaian per Tujuan Pembelajaran
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Statistik nilai tertinggi, terendah, rata-rata, dan persentase ketercapaian KKTP.
                    </p>
                  </div>
                  <div className="flex rounded-xl bg-slate-100 p-1">
                    {tps.map((tp) => (
                      <button
                        key={tp.code}
                        onClick={() => setSelectedAnalysisTP(tp.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          selectedAnalysisTP === tp.code
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tp.code}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analysis TP Card */}
                {(() => {
                  let completedCount = 0;
                  let scores: number[] = [];
                  let bb = 0;
                  let mb = 0;
                  let bsh = 0;
                  let sb = 0;

                  students.forEach((s) => {
                    const tpDet = progressMap[s.id]?.tpProgress?.[selectedAnalysisTP];
                    if (tpDet) {
                      if (tpDet.isCompleted) completedCount++;
                      if (tpDet.finalScore > 0) {
                        scores.push(tpDet.finalScore);
                        if (tpDet.kktpCategory === 'SB') sb++;
                        else if (tpDet.kktpCategory === 'BSH') bsh++;
                        else if (tpDet.kktpCategory === 'MB') mb++;
                        else bb++;
                      } else {
                        bb++;
                      }
                    } else {
                      bb++;
                    }
                  });

                  const highest = scores.length > 0 ? Math.max(...scores) : 0;
                  const lowest = scores.length > 0 ? Math.min(...scores) : 0;
                  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                  const pct = Math.round((completedCount / students.length) * 100);

                  return (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                          <span className="text-[11px] text-blue-800 font-semibold">Siswa Tuntas</span>
                          <div className="text-xl font-black text-blue-900">{completedCount} / {students.length}</div>
                          <span className="text-[10px] text-blue-600 font-bold">{pct}% Tuntas</span>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                          <span className="text-[11px] text-emerald-800 font-semibold">Nilai Tertinggi</span>
                          <div className="text-xl font-black text-emerald-900">{highest}</div>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                          <span className="text-[11px] text-amber-800 font-semibold">Nilai Rata-rata</span>
                          <div className="text-xl font-black text-amber-900">{avg}</div>
                        </div>
                        <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                          <span className="text-[11px] text-rose-800 font-semibold">Nilai Terendah</span>
                          <div className="text-xl font-black text-rose-900">{lowest}</div>
                        </div>
                      </div>

                      {/* Students List for this TP */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 font-bold text-slate-700">
                            <tr>
                              <th className="p-3 w-10 text-center">No</th>
                              <th className="p-3">Nama Siswa</th>
                              <th className="p-3 text-center">Formatif 1</th>
                              <th className="p-3 text-center">Formatif 2</th>
                              <th className="p-3 text-center">Formatif 3</th>
                              <th className="p-3 text-center">Sumatif</th>
                              <th className="p-3 text-center font-bold">Nilai Akhir</th>
                              <th className="p-3 text-center">Kategori</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {students.map((s, i) => {
                              const tpDet = progressMap[s.id]?.tpProgress?.[selectedAnalysisTP];
                              return (
                                <tr key={s.id} className="hover:bg-slate-50">
                                  <td className="p-3 text-center text-slate-400 font-bold">{i + 1}</td>
                                  <td className="p-3 font-bold text-slate-900">{s.fullName}</td>
                                  <td className="p-3 text-center">{tpDet?.formatif1Score || 0}</td>
                                  <td className="p-3 text-center">{tpDet?.formatif2Score || 0}</td>
                                  <td className="p-3 text-center">{tpDet?.formatif3Score || 0}</td>
                                  <td className="p-3 text-center">{tpDet?.sumatifScore || 0}</td>
                                  <td className="p-3 text-center font-black text-blue-900">
                                    {tpDet?.finalScore || 0}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="px-2 py-0.5 rounded font-black text-[10px] bg-slate-100">
                                      {tpDet ? tpDet.kktpCategory : 'BB'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 11. ANALISIS PER SISWA */}
            {activeMenu === 'analisis_siswa' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Analisis Capaian Belajar Individu Siswa
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih siswa untuk melihat profil capaian lengkap dan mencetak lembar rapor individu.
                    </p>
                  </div>
                  <select
                    onChange={(e) => {
                      const found = students.find((s) => s.id === e.target.value);
                      if (found) setSelectedStudent(found);
                    }}
                    value={selectedStudent?.id || students[0]?.id}
                    className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display detail of selected student */}
                {(() => {
                  const student = selectedStudent || students[0];
                  const prog = progressMap[student.id];

                  return (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-base font-black text-slate-900">{student.fullName}</h4>
                          <p className="text-xs text-slate-500 font-mono">Username: {student.username}</p>
                          <div className="mt-2 flex items-center space-x-3 text-xs">
                            <span className="font-bold text-blue-700">
                              Progress: {prog?.overallProgressPercent || 0}%
                            </span>
                            <span>•</span>
                            <span className="font-bold text-emerald-700">
                              Rata-rata: {prog?.averageScore || 0} ({prog ? prog.kktpCategory : 'BB'})
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => downloadNilaiIndividuPdf(student, prog, settings)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Cetak Rapor Siswa PDF</span>
                        </button>
                      </div>

                      {/* TP details table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 font-bold text-slate-700">
                            <tr>
                              <th className="p-3">Kode TP</th>
                              <th className="p-3">Tujuan Pembelajaran</th>
                              <th className="p-3 text-center">Formatif 1</th>
                              <th className="p-3 text-center">Formatif 2</th>
                              <th className="p-3 text-center">Formatif 3</th>
                              <th className="p-3 text-center">Sumatif</th>
                              <th className="p-3 text-center">Nilai TP</th>
                              <th className="p-3 text-center">Kategori</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tps.map((tp) => {
                              const tpDet = prog?.tpProgress?.[tp.code];
                              return (
                                <tr key={tp.code} className="hover:bg-slate-50">
                                  <td className="p-3 font-bold text-blue-700">{tp.code}</td>
                                  <td className="p-3 font-medium text-slate-800">{tp.title}</td>
                                  <td className="p-3 text-center">{tpDet?.formatif1Score || 0}</td>
                                  <td className="p-3 text-center">{tpDet?.formatif2Score || 0}</td>
                                  <td className="p-3 text-center">{tpDet?.formatif3Score || 0}</td>
                                  <td className="p-3 text-center">{tpDet?.sumatifScore || 0}</td>
                                  <td className="p-3 text-center font-black text-blue-900">
                                    {tpDet?.finalScore || 0}
                                  </td>
                                  <td className="p-3 text-center font-bold">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px]">
                                      {tpDet ? tpDet.kktpCategory : 'BB'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 12. REKAP KELAS */}
            {activeMenu === 'rekap' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Rekap Nilai Kelas VI Semester 1
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tabel rekapitulasi nilai 16 siswa lengkap dengan kalkulasi otomatis.
                    </p>
                  </div>
                  <button
                    onClick={() => downloadRekapNilaiPdf(students, progressMap, settings)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
                  >
                    Download PDF Rekap
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-3 w-10 text-center">No</th>
                        <th className="p-3">Nama Siswa</th>
                        <th className="p-3 text-center">TP 6.1</th>
                        <th className="p-3 text-center">TP 6.2</th>
                        <th className="p-3 text-center">TP 6.3</th>
                        <th className="p-3 text-center">TP 6.4</th>
                        <th className="p-3 text-center">TP 6.5</th>
                        <th className="p-3 text-center">TP 6.6</th>
                        <th className="p-3 text-center bg-blue-50">Rata-rata</th>
                        <th className="p-3 text-center">Kategori</th>
                        <th className="p-3 text-center">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((s, idx) => {
                        const p = progressMap[s.id];
                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">{s.fullName}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.1']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.2']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.3']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.4']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.5']?.finalScore || 0}</td>
                            <td className="p-3 text-center">{p?.tpProgress?.['TP 6.6']?.finalScore || 0}</td>
                            <td className="p-3 text-center font-black text-blue-900 bg-blue-50/50">
                              {p?.averageScore || 0}
                            </td>
                            <td className="p-3 text-center font-bold">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px]">
                                {p ? p.kktpCategory : 'BB'}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-blue-700">
                              {p?.overallProgressPercent || 0}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 13. PROGRESS SISWA */}
            {activeMenu === 'progress' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Pemantauan Progress Belajar Seluruh Siswa
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Visualisasi penyelesaian materi, aktivitas, asesmen formatif, sumatif, dan refleksi 16 siswa.
                  </p>
                </div>

                <div className="space-y-4">
                  {students.map((s) => {
                    const p = progressMap[s.id];
                    const percent = p?.overallProgressPercent || 0;
                    return (
                      <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{s.fullName}</span>
                          <span className="font-black text-blue-700">{percent}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-blue-500 to-indigo-600 rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 14. EXPORT EXCEL (10 SHEETS) */}
            {activeMenu === 'export_excel' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>Export Data Lengkap ke Microsoft Excel (.xlsx)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Menghasilkan file Excel nyata dengan 10 Sheet otomatis terisi data Firestore:
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-slate-700">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">1. DATA SISWA</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">2. REKAP NILAI</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">3. TP 6.1</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">4. TP 6.2</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">5. TP 6.3</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">6. TP 6.4</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">7. TP 6.5</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">8. TP 6.6</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">9. HASIL PEKERJAAN</div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold">10. ANALISIS TP</div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => exportToExcel(students, progressMap, submissions, tps, settings)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>Unduh File Excel Sekarang (.XLSX)</span>
                  </button>
                </div>
              </div>
            )}

            {/* 15. DOWNLOAD PDF (5 REPORTS) */}
            {activeMenu === 'download_pdf' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <FileDown className="w-5 h-5 text-blue-600" />
                    <span>Download Laporan Resmi Format PDF (Kop Sekolah Lengkap)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Semua PDF memuat identitas SD NEGERI 11 ANGGREK, Kelas VI, Fase C, Semester 1, Fery Gustomi Kaharu, S.Pd., dan tanggal cetak otomatis.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">1. Download Rekap Nilai PDF</h4>
                      <p className="text-slate-600 mt-1">Tabel nilai seluruh siswa untuk 6 TP lengkap dengan kategori KKTP.</p>
                    </div>
                    <button
                      onClick={() => downloadRekapNilaiPdf(students, progressMap, settings)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
                    >
                      Unduh Rekap Nilai PDF
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">2. Download Analisis TP PDF</h4>
                      <p className="text-slate-600 mt-1">Laporan statistik ketercapaian per TP, ketuntasan, dan rentang nilai.</p>
                    </div>
                    <button
                      onClick={() => downloadAnalisisTpPdf(students, progressMap, settings)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition"
                    >
                      Unduh Analisis TP PDF
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">3. Download Nilai Individu PDF</h4>
                      <p className="text-slate-600 mt-1">Lembar rapor perseorangan untuk dibagikan kepada siswa/wali murid.</p>
                    </div>
                    <button
                      onClick={() => downloadNilaiIndividuPdf(students[0], progressMap[students[0].id], settings)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition"
                    >
                      Unduh Rapor Siswa PDF
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">4. Download Hasil Pekerjaan PDF</h4>
                      <p className="text-slate-600 mt-1">Rekap seluruh pengiriman tugas dan kuis formatif/sumatif.</p>
                    </div>
                    <button
                      onClick={() => downloadHasilPekerjaanPdf(submissions, settings)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl transition"
                    >
                      Unduh Hasil Pekerjaan PDF
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3 sm:col-span-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">5. Download Progress Siswa PDF</h4>
                      <p className="text-slate-600 mt-1">Laporan kemajuan pembelajaran siswa dalam format siap cetak.</p>
                    </div>
                    <button
                      onClick={() => downloadProgressSiswaPdf(students, progressMap, settings)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition w-fit"
                    >
                      Unduh Progress Siswa PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 16. PENGATURAN & RUBRIK TP 6.6 */}
            {activeMenu === 'pengaturan' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Pengaturan Sistem & Input Rubrik Manual TP 6.6
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sesuai instruksi Bagian K: "Sediakan kolom agar guru dapat memasukkan indikator/rubrik TP 6.6 secara manual."
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Indikator Ketercapaian TP 6.6 (Ketik per baris):
                    </label>
                    <textarea
                      rows={5}
                      value={tp66IndicatorText}
                      onChange={(e) => setTp66IndicatorText(e.target.value)}
                      placeholder="Ketik indikator KKTP untuk TP 6.6..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Teknik Asesmen TP 6.6:
                    </label>
                    <input
                      type="text"
                      value={tp66TechniqueText}
                      onChange={(e) => setTp66TechniqueText(e.target.value)}
                      placeholder="Contoh: Tes Tertulis, Presentasi, dan Laporan Telaah Biografi"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveTP66Rubric}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Indikator & Rubrik TP 6.6</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 17. RESET DATA & PASSWORD */}
            {activeMenu === 'reset_data' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-rose-700 flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>Pusat Reset Data Pembelajaran & Password Siswa</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Setiap reset memerlukan konfirmasi ganda demi keamanan data siswa.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-2">
                    <h4 className="font-bold text-rose-900">Reset Seluruh Progress Belajar</h4>
                    <p className="text-slate-600">Mengosongkan capaian belajar dan nilai 16 siswa kembali ke 0%.</p>
                    <button
                      onClick={() =>
                        setResetModalState({
                          isOpen: true,
                          type: 'all',
                          studentName: 'SELURUH 16 SISWA',
                        })
                      }
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition"
                    >
                      Reset Seluruh Data Siswa
                    </button>
                  </div>

                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2">
                    <h4 className="font-bold text-amber-900">Reset Password Siswa Terpilih</h4>
                    <p className="text-slate-600">Mengembalikan kata sandi siswa ke password awal (Nama Depan).</p>
                    <select
                      onChange={(e) => {
                        const s = students.find((x) => x.id === e.target.value);
                        if (s) {
                          setResetModalState({
                            isOpen: true,
                            type: 'password',
                            targetStudentId: s.id,
                            studentName: s.fullName,
                          });
                        }
                      }}
                      defaultValue=""
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="" disabled>-- Pilih Siswa yang Lupa Password --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {resetModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-slate-900">Konfirmasi Tindakan Reset</h3>
            </div>
            <p className="text-xs text-slate-700">
              Apakah Anda yakin ingin melakukan <strong>{resetModalState.type.toUpperCase()}</strong> untuk{' '}
              <strong className="text-rose-700">{resetModalState.studentName}</strong>?
            </p>
            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setResetModalState({ isOpen: false, type: 'password' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteReset}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                Ya, Konfirmasi Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Reviewing and Grading Submissions */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Pemeriksaan Hasil: {gradingSubmission.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  {gradingSubmission.tpCode} • {gradingSubmission.assessmentType.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>
            </div>

            {/* Answer items */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-700 block">Jawaban yang Dikirim Siswa:</span>
              {gradingSubmission.answers.map((ans, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Soal Nomor {ans.questionNumber} ({ans.questionType})</span>
                    <span className="font-bold text-blue-700">Skor: {ans.earnedScore || 0} / {ans.maxScore}</span>
                  </div>
                  <p className="text-slate-700 font-mono bg-white p-2 rounded border border-slate-100">
                    {ans.answerText || 'Tidak ada jawaban teks'}
                  </p>
                </div>
              ))}

              {gradingSubmission.taskAttachmentText && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="font-bold text-blue-900 block mb-1">Lampiran Tugas:</span>
                  <p className="text-slate-800 whitespace-pre-line">{gradingSubmission.taskAttachmentText}</p>
                </div>
              )}
            </div>

            {/* Input score and feedback */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nilai Akhir (0 - 100):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={manualGrade}
                  onChange={(e) => setManualGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-base text-blue-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Guru untuk Siswa:</label>
                <input
                  type="text"
                  value={teacherFeedback}
                  onChange={(e) => setTeacherFeedback(e.target.value)}
                  placeholder="Beri motivasi atau evaluasi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setGradingSubmission(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
              <button
                onClick={handleSaveTeacherGrade}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Simpan Penilaian Guru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Siswa */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedStudent.fullName}</h3>
                <p className="text-xs text-slate-500 font-mono">Username: {selectedStudent.username}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex justify-between">
                <span>Rata-rata Nilai:</span>
                <strong className="text-blue-900">{progressMap[selectedStudent.id]?.averageScore || 0}</strong>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between">
                <span>Kategori KKTP:</span>
                <strong className="text-emerald-900">{getKKTPLabel(progressMap[selectedStudent.id]?.kktpCategory || 'BB')}</strong>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between">
                <span>Progress Belajar:</span>
                <strong className="text-amber-900">{progressMap[selectedStudent.id]?.overallProgressPercent || 0}%</strong>
              </div>

              <div className="pt-2">
                <span className="font-bold text-slate-700 block mb-1">Capaian Tiap TP:</span>
                <div className="space-y-1">
                  {tps.map((tp) => {
                    const tpDet = progressMap[selectedStudent.id]?.tpProgress?.[tp.code];
                    return (
                      <div key={tp.code} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="font-semibold">{tp.code}</span>
                        <span>Nilai: <strong>{tpDet?.finalScore || 0}</strong> ({tpDet ? tpDet.kktpCategory : 'BB'})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
