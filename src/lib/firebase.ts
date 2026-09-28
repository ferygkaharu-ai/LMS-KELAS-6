import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
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
  INITIAL_SETTINGS,
  INITIAL_TEACHER,
  INITIAL_STUDENTS,
  INITIAL_TPS,
  INITIAL_MODULES,
} from '../data/initialData';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Target provisioned Firestore Database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Collection names
export const COLLECTIONS = {
  SETTINGS: 'app_settings',
  USERS: 'users',
  TPS: 'tps',
  MODULES: 'modules',
  SUBMISSIONS: 'submissions',
  PROGRESS: 'progress',
  ACTIVITY_LOGS: 'activity_logs',
};

// Calculate KKTP category from score (0-100)
export function getKKTPCategory(score: number): KKTPCategory {
  if (score >= 81) return 'SB';
  if (score >= 61) return 'BSH';
  if (score >= 41) return 'MB';
  return 'BB';
}

export function getKKTPLabel(category: KKTPCategory): string {
  switch (category) {
    case 'SB':
      return 'Sangat Berkembang (SB)';
    case 'BSH':
      return 'Berkembang Sesuai Harapan (BSH)';
    case 'MB':
      return 'Mulai Berkembang (MB)';
    case 'BB':
      return 'Belum Berkembang (BB)';
    default:
      return 'Belum Berkembang (BB)';
  }
}

// Auto-seed initial data to Cloud Firestore if database is empty
export async function initAndSeedDatabase(): Promise<void> {
  try {
    // 1. Check or initialize settings
    const settingsDocRef = doc(db, COLLECTIONS.SETTINGS, 'default');
    const settingsSnap = await getDoc(settingsDocRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsDocRef, INITIAL_SETTINGS);
    }

    // 2. Check or initialize users (teacher + 16 students)
    const usersCol = collection(db, COLLECTIONS.USERS);
    const usersSnap = await getDocs(usersCol);
    if (usersSnap.empty) {
      const batch = writeBatch(db);
      // Teacher
      batch.set(doc(db, COLLECTIONS.USERS, INITIAL_TEACHER.id), INITIAL_TEACHER);
      // 16 Students
      INITIAL_STUDENTS.forEach((student) => {
        batch.set(doc(db, COLLECTIONS.USERS, student.id), student);
      });
      await batch.commit();
    }

    // 3. Check or initialize TPs (TP 6.1 s/d TP 6.6)
    const tpsCol = collection(db, COLLECTIONS.TPS);
    const tpsSnap = await getDocs(tpsCol);
    if (tpsSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_TPS.forEach((tp) => {
        batch.set(doc(db, COLLECTIONS.TPS, tp.code), tp);
      });
      await batch.commit();
    }

    // 4. Check or initialize Modules
    const modulesCol = collection(db, COLLECTIONS.MODULES);
    const modulesSnap = await getDocs(modulesCol);
    if (modulesSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_MODULES.forEach((mod) => {
        batch.set(doc(db, COLLECTIONS.MODULES, mod.tpCode), mod);
      });
      await batch.commit();
    }

    // 5. Initialize default progress records for each student if not exists
    const progressCol = collection(db, COLLECTIONS.PROGRESS);
    const progressSnap = await getDocs(progressCol);
    if (progressSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_STUDENTS.forEach((student) => {
        const tpProgressMap: { [key: string]: any } = {};
        INITIAL_TPS.forEach((tp, index) => {
          tpProgressMap[tp.code] = {
            tpCode: tp.code,
            materialCompleted: false,
            activityCompleted: false,
            latihanScore: 0,
            formatif1Score: 0,
            formatif2Score: 0,
            formatif3Score: 0,
            sumatifScore: 0,
            tugasSubmitted: false,
            refleksiSubmitted: false,
            progressPercent: 0,
            isUnlocked: index === 0, // First TP is unlocked initially, subsequent require previous completion
            isCompleted: false,
            finalScore: 0,
            kktpCategory: 'BB',
          };
        });

        const initialProg: StudentProgress = {
          studentId: student.id,
          studentName: student.fullName,
          tpProgress: tpProgressMap,
          overallProgressPercent: 0,
          completedTPCount: 0,
          averageScore: 0,
          kktpCategory: 'BB',
          lastActive: new Date().toISOString(),
        };

        batch.set(doc(db, COLLECTIONS.PROGRESS, student.id), initialProg);
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error during Firestore database initialization/seeding:', err);
  }
}

// Log student activity
export async function logActivity(
  studentId: string,
  studentName: string,
  tpCode: string,
  activity: string,
  status: 'Membuka' | 'Selesai' | 'Menyimpan' | 'Mengirim' | 'Dinilai',
  score?: number
) {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logData: ActivityLog = {
      id: logId,
      studentId,
      studentName,
      tpCode,
      activity,
      timestamp: new Date().toISOString(),
      status,
      score,
    };
    await setDoc(doc(db, COLLECTIONS.ACTIVITY_LOGS, logId), logData);
  } catch (e) {
    console.warn('Failed to save activity log:', e);
  }
}

// Update student progress based on activities & scores
export async function recalculateAndSaveStudentProgress(studentId: string): Promise<void> {
  try {
    // Fetch all submissions for this student
    const q = query(collection(db, COLLECTIONS.SUBMISSIONS), where('studentId', '==', studentId));
    const subsSnap = await getDocs(q);
    const submissions: AssessmentSubmission[] = [];
    subsSnap.forEach((d) => submissions.push(d.data() as AssessmentSubmission));

    const progressDocRef = doc(db, COLLECTIONS.PROGRESS, studentId);
    const progressDocSnap = await getDoc(progressDocRef);
    let currentProg: StudentProgress;

    if (progressDocSnap.exists()) {
      currentProg = progressDocSnap.data() as StudentProgress;
    } else {
      // Find student info
      const studentUser = INITIAL_STUDENTS.find((s) => s.id === studentId);
      currentProg = {
        studentId,
        studentName: studentUser?.fullName || 'Siswa',
        tpProgress: {},
        overallProgressPercent: 0,
        completedTPCount: 0,
        averageScore: 0,
        kktpCategory: 'BB',
        lastActive: new Date().toISOString(),
      };
    }

    const tps = ['TP 6.1', 'TP 6.2', 'TP 6.3', 'TP 6.4', 'TP 6.5', 'TP 6.6'];
    let totalCompletedTPs = 0;
    let sumTPScore = 0;
    let scoredTPCount = 0;
    let totalPercentageSum = 0;

    for (let i = 0; i < tps.length; i++) {
      const tp = tps[i];
      const prevTP = i > 0 ? tps[i - 1] : null;
      const isPrevCompleted = prevTP ? currentProg.tpProgress[prevTP]?.isCompleted : true;

      const tpSubs = submissions.filter((s) => s.tpCode === tp);
      const f1 = tpSubs.find((s) => s.assessmentType === 'formatif_1');
      const f2 = tpSubs.find((s) => s.assessmentType === 'formatif_2');
      const f3 = tpSubs.find((s) => s.assessmentType === 'formatif_3');
      const sumatif = tpSubs.find((s) => s.assessmentType === 'sumatif');
      const tugas = tpSubs.find((s) => s.assessmentType === 'tugas');
      const refleksi = tpSubs.find((s) => s.assessmentType === 'refleksi');

      // Previous state
      const prevDetail = currentProg.tpProgress[tp] || {
        tpCode: tp,
        materialCompleted: false,
        activityCompleted: false,
        latihanScore: 0,
        formatif1Score: 0,
        formatif2Score: 0,
        formatif3Score: 0,
        sumatifScore: 0,
        tugasSubmitted: false,
        refleksiSubmitted: false,
        progressPercent: 0,
        isUnlocked: i === 0 || isPrevCompleted,
        isCompleted: false,
        finalScore: 0,
        kktpCategory: 'BB',
      };

      // Weight breakdown for 100% progress:
      // Material read: 15%
      // Activity done: 10%
      // Formatif 1: 15%
      // Formatif 2: 15%
      // Formatif 3: 15%
      // Tugas: 10%
      // Sumatif: 15%
      // Refleksi: 5%
      let percent = 0;
      if (prevDetail.materialCompleted) percent += 15;
      if (prevDetail.activityCompleted) percent += 10;
      if (f1) percent += 15;
      if (f2) percent += 15;
      if (f3) percent += 15;
      if (tugas) percent += 10;
      if (sumatif) percent += 15;
      if (refleksi) percent += 5;

      // Final score formula: 40% Formatif Avg + 40% Sumatif + 20% Tugas
      const formatifScores = [f1?.finalGrade, f2?.finalGrade, f3?.finalGrade].filter(
        (v) => v !== undefined && v !== null
      ) as number[];
      const avgFormatif = formatifScores.length > 0 ? formatifScores.reduce((a, b) => a + b, 0) / formatifScores.length : 0;
      const sumatifVal = sumatif ? sumatif.finalGrade : 0;
      const tugasVal = tugas ? tugas.finalGrade : 0;

      let tpFinalScore = 0;
      if (formatifScores.length > 0 || sumatif || tugas) {
        if (sumatif && tugas && formatifScores.length > 0) {
          tpFinalScore = Math.round(avgFormatif * 0.4 + sumatifVal * 0.4 + tugasVal * 0.2);
        } else if (sumatif && formatifScores.length > 0) {
          tpFinalScore = Math.round(avgFormatif * 0.5 + sumatifVal * 0.5);
        } else if (formatifScores.length > 0) {
          tpFinalScore = Math.round(avgFormatif);
        } else if (sumatif) {
          tpFinalScore = Math.round(sumatifVal);
        }
      }

      const isCompleted = percent >= 80 || (f1 !== undefined && sumatif !== undefined);
      if (isCompleted) totalCompletedTPs++;

      if (tpFinalScore > 0) {
        sumTPScore += tpFinalScore;
        scoredTPCount++;
      }
      totalPercentageSum += percent;

      currentProg.tpProgress[tp] = {
        ...prevDetail,
        formatif1Score: f1?.finalGrade || prevDetail.formatif1Score || 0,
        formatif2Score: f2?.finalGrade || prevDetail.formatif2Score || 0,
        formatif3Score: f3?.finalGrade || prevDetail.formatif3Score || 0,
        sumatifScore: sumatif?.finalGrade || prevDetail.sumatifScore || 0,
        tugasSubmitted: !!tugas || prevDetail.tugasSubmitted,
        refleksiSubmitted: !!refleksi || prevDetail.refleksiSubmitted,
        progressPercent: Math.min(100, percent),
        isUnlocked: i === 0 || isPrevCompleted,
        isCompleted,
        finalScore: tpFinalScore,
        kktpCategory: getKKTPCategory(tpFinalScore),
      };
    }

    currentProg.completedTPCount = totalCompletedTPs;
    currentProg.overallProgressPercent = Math.round(totalPercentageSum / tps.length);
    currentProg.averageScore = scoredTPCount > 0 ? Math.round(sumTPScore / scoredTPCount) : 0;
    currentProg.kktpCategory = getKKTPCategory(currentProg.averageScore);
    currentProg.lastActive = new Date().toISOString();

    await setDoc(progressDocRef, currentProg);
  } catch (error) {
    console.error('Error recalculating student progress:', error);
  }
}
