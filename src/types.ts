export type UserRole = 'guru' | 'siswa';

export interface User {
  id: string;
  username: string; // Exact uppercase full name for students
  fullName: string;
  role: UserRole;
  password: string;
  initialPassword: string;
  avatar?: string;
  lastLogin?: string;
  isOnline?: boolean;
}

export type KKTPCategory = 'BB' | 'MB' | 'BSH' | 'SB';

export interface TPItem {
  code: string; // e.g. "TP 6.1"
  title: string; // Exact verbatim text
  materialSummary: string;
  activityDescription: string;
  indicators: string[];
  assessmentTechniques: string;
  kktpRubric?: {
    bb: string;
    mb: string;
    bsh: string;
    sb: string;
  };
}

export interface ModuleSection {
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
  bulletPoints?: string[];
  illustration?: string;
}

export interface LearningModule {
  id: string;
  tpCode: string;
  title: string;
  tpTitle: string;
  coreMaterial: string;
  explanation: ModuleSection[];
  examples: string[];
  illustrations?: { label: string; url?: string; description: string }[];
  activities: {
    title: string;
    instructions: string;
    taskPrompt: string;
  };
  summary: string;
  reflectionPrompts: string[];
  isAvailable: boolean;
  updatedAt: string;
}

export type QuestionType =
  | 'pg' // Pilihan Ganda (Single select)
  | 'mcma' // Pilihan Ganda Kompleks (Multiple select checkboxes)
  | 'kategori' // Pilihan Ganda Kompleks Kategori (Tabel pernyataan Benar/Salah atau Kategori)
  | 'benar_salah' // Benar / Salah tunggal
  | 'menjodohkan' // Matching pairs
  | 'uraian' // Essay
  | 'tugas'; // Task / Assignment

export interface CategoryStatement {
  id: string;
  statement: string;
  correctAnswer: 'Benar' | 'Salah' | string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface AssessmentQuestion {
  id: string;
  tpCode: string;
  assessmentType: 'formatif_1' | 'formatif_2' | 'formatif_3' | 'sumatif' | 'latihan';
  number: number;
  questionType: QuestionType;
  prompt: string;
  options?: string[]; // For PG & MCMA
  correctAnswer?: string | string[]; // For PG & Benar/Salah (string), MCMA (string[])
  statements?: CategoryStatement[]; // For 'kategori'
  matchingPairs?: MatchingPair[]; // For 'menjodohkan'
  rubricGuide?: string; // For 'uraian' & 'tugas'
  maxScore: number;
}

export interface StudentAnswer {
  questionId: string;
  questionNumber: number;
  questionType: QuestionType;
  answerText?: string;
  selectedOptions?: string[];
  categoryAnswers?: { [statementId: string]: string };
  matchingAnswers?: { [leftId: string]: string };
  isCorrect?: boolean;
  earnedScore?: number;
  maxScore: number;
  teacherFeedback?: string;
}

export interface AssessmentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  tpCode: string;
  assessmentType:
    | 'formatif_1'
    | 'formatif_2'
    | 'formatif_3'
    | 'sumatif'
    | 'latihan'
    | 'tugas'
    | 'refleksi'
    | 'aktivitas'
    | 'materi';
  answers: StudentAnswer[];
  totalScore: number;
  maxScore: number;
  finalGrade: number; // 0 - 100
  kktpCategory: KKTPCategory;
  submittedAt: string;
  status: 'selesai' | 'dinilai' | 'belum_lengkap';
  teacherNotes?: string;
  gradedByTeacher?: boolean;
  reflectionAnswers?: {
    understood: string;
    difficult: string;
    newLearned: string;
    actionPlan: string;
  };
  taskAttachmentText?: string;
}

export interface TPProgressDetail {
  tpCode: string;
  materialCompleted: boolean;
  activityCompleted: boolean;
  latihanScore?: number;
  formatif1Score?: number;
  formatif2Score?: number;
  formatif3Score?: number;
  sumatifScore?: number;
  tugasSubmitted: boolean;
  refleksiSubmitted: boolean;
  progressPercent: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  finalScore: number;
  kktpCategory: KKTPCategory;
}

export interface StudentProgress {
  studentId: string;
  studentName: string;
  tpProgress: { [tpCode: string]: TPProgressDetail };
  overallProgressPercent: number;
  completedTPCount: number;
  averageScore: number;
  kktpCategory: KKTPCategory;
  lastActive: string;
}

export interface ActivityLog {
  id: string;
  studentId: string;
  studentName: string;
  tpCode: string;
  activity: string;
  timestamp: string;
  status: 'Membuka' | 'Selesai' | 'Menyimpan' | 'Mengirim' | 'Dinilai';
  score?: number;
}

export interface AppSettings {
  schoolName: string;
  subject: string;
  className: string;
  phase: string;
  semester: string;
  academicYear: string;
  teacherName: string;
  kktpRanges: {
    bb: { min: number; max: number; label: string };
    mb: { min: number; max: number; label: string };
    bsh: { min: number; max: number; label: string };
    sb: { min: number; max: number; label: string };
  };
  tp66IndicatorText: string;
  tp66TechniqueText: string;
}
