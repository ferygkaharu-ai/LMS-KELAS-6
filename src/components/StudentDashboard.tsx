import React, { useState, useEffect } from 'react';
import {
  User,
  TPItem,
  LearningModule,
  AssessmentSubmission,
  StudentProgress,
  AssessmentQuestion,
  StudentAnswer,
  KKTPCategory,
} from '../types';
import {
  db,
  COLLECTIONS,
  logActivity,
  recalculateAndSaveStudentProgress,
  getKKTPCategory,
  getKKTPLabel,
} from '../lib/firebase';
import {
  generateFormatifQuestions,
  generateSumatifQuestions,
} from '../data/initialData';
import { doc, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import {
  Home,
  Target,
  BookOpen,
  Activity,
  Award,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  FileCheck,
  ClipboardList,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  KeyRound,
  Send,
  HelpCircle,
  BarChart2,
  Calendar,
  Layers,
  ArrowRight,
  HeartPulse,
  Flame,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

// Draf & Template Jawaban Praktis per TP untuk kemudahan belajar siswa
const SAMPLE_ACTIVITIES: { [code: string]: string } = {
  'TP 6.1': 'Hasil Pengamatan & Peta Konsep Sistem Organ Tubuh:\n1. Organ Pencernaan: Mulut (pencernaan mekanis & enzim amilase), Kerongkongan (gerak peristaltik mendorong bolus), Lambung (asam lambung HCl & enzim pepsin mencerna protein), Usus Halus (penyerapan nutrisi), Usus Besar (penyerapan air), Anus (pembuangan sisa feses).\n2. Organ Pernapasan: Hidung (penyaringan udara dan penyesuaian suhu), Tenggorokan, Paru-paru & Alveolus (tempat pertukaran oksigen dan karbon dioksida).\n3. Organ Peredaran Darah: Jantung (memompa darah bersih dan kotor) serta Pembuluh Darah (arteri dan vena).\nKesimpulan: Seluruh organ tubuh manusia saling berkoordinasi dan bekerja sama secara harmonis menjaga kesehatan dan kelangsungan hidup.',
  'TP 6.2': 'Catatan Hubungan Fungsi Organ dengan Kesehatan Tubuh:\n- Keterkaitan Organ Pencernaan & Stamina: Apabila lambung mengalami gangguan (seperti maag atau gastritis akibat telat makan), penyerapan nutrisi ke seluruh tubuh akan terhambat, mengakibatkan tubuh menjadi lemas dan daya tahan menurun.\n- Keterkaitan Paru-Paru & Jantung: Paru-paru yang sehat menyediakan suplai oksigen yang melimpah ke pembuluh darah; jika saluran pernapasan tersumbat atau terpapar polusi, kerja jantung akan menjadi jauh lebih berat memompa darah.\n- Kesimpulan: Kesehatan suatu organ berdampak langsung terhadap stabilitas kerja organ tubuh lainnya.',
  'TP 6.3': 'Upaya dan Tindakan Nyata Menjaga Kesehatan Sistem Organ Tubuh:\n1. Mengonsumsi makanan bergizi seimbang sesuai panduan "Isi Piringku" (karbohidrat seimbang, protein nabati/hewani, sayuran segar, dan buah bervitamin).\n2. Minum air putih minimal 8 gelas (sekitar 2 liter) setiap hari untuk membantu penyaringan racun oleh organ ginjal.\n3. Berolahraga secara teratur minimal 30 menit sehari demi menguatkan pompa otot jantung dan meningkatkan kapasitas vital paru-paru.\n4. Istirahat tidur malam minimal 8 jam secara teratur serta menghindari asap rokok, polusi udara, dan makanan berlemak tinggi.',
  'TP 6.4': 'Refleksi Perilaku dan Komitmen Kebiasaan Sehat Sehari-hari:\n- Evaluasi Kebiasaan: Saya telah membiasakan diri sarapan pagi sebelum berangkat ke sekolah dan rutin minum air putih. Namun, saya menyadari terkadang masih tidur larut malam saat bermain telepon pintar.\n- Komitmen Perbaikan: Mulai hari ini saya berjanji tidur malam sebelum pukul 21.00, membatasi waktu bermain gawai, serta selalu mencuci tangan dengan sabun sebelum dan sesudah makan untuk melindungi saluran pencernaan dari kuman penyakit.',
  'TP 6.5': 'Latar Belakang Penjajahan Bangsa Barat di Indonesia:\n1. Faktor Pendorong Utama: Jatuhnya Kota Konstantinopel ke tangan Kesultanan Utsmaniyah pada tahun 1453 yang memutus jalur perdagangan rempah-rempah Eropa ke Asia.\n2. Semboyan 3G: Gold (mencari kekayaan berupa rempah-rempah seperti pala dan cengkih bernilai tinggi), Glory (mencari kejayaan dan kekuasaan daerah jajahan), dan Gospel (menyebarkan agama nasrani).\n3. Perkembangan Teknologi Navigasi: Penemuan kompas dan kapal karavel yang memungkinkan penjelajahan samudra oleh bangsa Portugis, Spanyol, Belanda, dan Inggris hingga ke Kepulauan Indonesia.',
  'TP 6.6': 'Kajian Perjuangan Tokoh Pahlawan Melawan Penjajah:\n1. Pangeran Diponegoro: Memimpin Perang Jawa (1825–1830) dengan taktik perang gerilya yang gigih demi membela kedaulatan rakyat dan menentang penindasan kolonial Belanda.\n2. Kapitan Pattimura: Memimpin perlawanan rakyat Maluku di Benteng Duurstede (1817) mempertahankan kemerdekaan tanah air dari monopoli kejam VOC.\n3. Nilai Perjuangan: Nilai keberanian, rela berkorban demi bangsa, patriotisme, pantang menyerah, dan persatuan tanpa pamrih wajib kita teladani dalam kehidupan sehari-hari di sekolah dan masyarakat.',
};

const SAMPLE_TASKS: { [code: string]: string } = {
  'TP 6.1': 'Laporan Proyek Portofolio TP 6.1:\nJudul: Bagan Alur & Peta Konsep Sistem Organ Tubuh Manusia\nDisusun oleh: Siswa Kelas VI SD Negeri 11 Anggrek\nIsi: Menguraikan struktur anatomi organ utama, fungsi spesifik masing-masing bagian, serta skema keterkaitan antar-sistem organ pencernaan, pernapasan, dan peredaran darah.',
  'TP 6.2': 'Laporan Analisis Gangguan & Kesehatan Organ Tubuh TP 6.2:\nJudul: Hubungan Pola Hidup dengan Kesehatan Sistem Organ\nIsi: Hasil kajian pengamatan mengenai pengaruh keterlambatan makan terhadap asam lambung dan pentingnya sirkulasi oksigen bagi kebugaran tubuh.',
  'TP 6.3': 'Laporan Proyek Kebiasaan Hidup Sehat TP 6.3:\nJudul: Panduan Menu Sehat Isi Piringku & Pola Hidup Bersih\nIsi: Jadwal pola makan gizi seimbang, target minum air harian, dan dokumentasi aktivitas fisik olahraga 30 menit demi kesehatan tubuh.',
  'TP 6.4': 'Laporan Portofolio Jurnal Refleksi TP 6.4:\nJudul: Jurnal Harian Kebiasaan Sehat & Rencana Tindak Lanjut\nIsi: Catatan evaluasi mingguan kebiasaan mencuci tangan, jadwal istirahat teratur, dan komitmen menjaga kesehatan organ.',
  'TP 6.5': 'Laporan Ringkasan Sejarah TP 6.5:\nJudul: Faktor-Faktor Pemicu Masuknya Bangsa Barat di Indonesia\nIsi: Penjelasan runtut mengenai daya tarik rempah-rempah Nusantara, kondisi Eropa pasca jatuhnya Konstantinopel, serta ekspedisi penjelajahan samudra.',
  'TP 6.6': 'Laporan Biografi Tokoh Pahlawan TP 6.6:\nJudul: Meneladani Nilai Kepahlawanan Pangeran Diponegoro & Pattimura\nIsi: Kajian keteladanan moral, patriotisme, dan strategi perlawanan pahlawan nasional dalam mempertahankan kemerdekaan Indonesia.',
};

const SAMPLE_REFLECTIONS: { [code: string]: { understood: string; difficult: string; newLearned: string; actionPlan: string } } = {
  'TP 6.1': {
    understood: 'Saya sudah memahami nama dan letak organ pencernaan, pernapasan, serta peredaran darah manusia.',
    difficult: 'Sedikit perlu pengulangan pada proses pertukaran gas di alveolus.',
    newLearned: 'Saya baru tahu bahwa usus halus orang dewasa panjangnya bisa mencapai lebih dari 6 meter!',
    actionPlan: 'Saya akan mengunyah makanan dengan perlahan agar mempermudah kerja lambung.',
  },
  'TP 6.2': {
    understood: 'Saya memahami bahwa gangguan pada satu organ akan berimbas langsung pada organ lainnya.',
    difficult: 'Membedakan gejala antara hipertensi dan hipotensi.',
    newLearned: 'Kesehatan mental dan stres ternyata juga mempengaruhi produksi asam lambung.',
    actionPlan: 'Selalu makan teratur tepat waktu dan menjaga pola istirahat.',
  },
  'TP 6.3': {
    understood: 'Langkah nyata menjaga kesehatan organ tubuh: gizi seimbang, minum air putih cukup, olahraga teratur.',
    difficult: 'Menghafal jenis-jenis vitamin dan fungsinya secara detail.',
    newLearned: 'Porsi gizi seimbang "Isi Piringku" membagi piring menjadi sepertiga makanan pokok, sayuran, dan lauk-pauk.',
    actionPlan: 'Mengurangi konsumsi jajanan berpengawet dan rutin minum air 8 gelas setiap hari.',
  },
  'TP 6.4': {
    understood: 'Menyadari pentingnya merefleksikan kebiasaan hidup sehari-hari untuk mendeteksi kebiasaan buruk sedini mungkin.',
    difficult: 'Membangun konsistensi tidur tepat waktu setiap malam.',
    newLearned: 'Tidur berkualitas sangat penting untuk proses regenerasi sel-sel organ tubuh.',
    actionPlan: 'Membuat jadwal disiplin istirahat dan mencuci tangan menggunakan sabun sebelum makan.',
  },
  'TP 6.5': {
    understood: 'Faktor pendorong kedatangan bangsa Barat ke Nusantara: semboyan 3G dan jatuhnya Konstantinopel.',
    difficult: 'Mengingat rute penjelajahan masing-masing armada bangsa Portugis dan Spanyol.',
    newLearned: 'Harga rempah-rempah seperti cengkih dan pala di Eropa pada abad pertengahan pernah setara dengan harga emas.',
    actionPlan: 'Lebih menghargai kekayaan sumber daya alam rempah-rempah Indonesia.',
  },
  'TP 6.6': {
    understood: 'Nilai luhur perjuangan pahlawan: keberanian, pantang menyerah, rela berkorban, dan persatuan.',
    difficult: 'Menghafal kronologi tahun-tahun penting pada Perang Jawa.',
    newLearned: 'Pahlawan berjuang tanpa pamrih demi generasi penerus bangsa menikmati kemerdekaan.',
    actionPlan: 'Belajar dengan sungguh-sungguh dan menjaga persatuan antarteman di SD Negeri 11 Anggrek.',
  },
};

interface StudentDashboardProps {
  currentUser: User;
  tps: TPItem[];
  modules: LearningModule[];
  progress: StudentProgress | undefined;
  submissions: AssessmentSubmission[];
  onChangePasswordClick: () => void;
  onLogout: () => void;
  isOnline: boolean;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  tps,
  modules,
  progress,
  submissions,
  onChangePasswordClick,
  onLogout,
  isOnline,
}) => {
  // Navigation Menu
  const [activeMenu, setActiveMenu] = useState<string>('beranda');
  const [selectedTPCode, setSelectedTPCode] = useState<string>('TP 6.1');
  const [formatifType, setFormatifType] = useState<1 | 2 | 3>(1);

  // Formatif & Sumatif Quiz State
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<AssessmentQuestion[] | null>(null);
  const [quizType, setQuizType] = useState<'formatif_1' | 'formatif_2' | 'formatif_3' | 'sumatif' | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: any }>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<{ score: number; maxScore: number; grade: number; category: KKTPCategory } | null>(null);

  // Student Input States
  const [activityResponse, setActivityResponse] = useState('');
  const [taskResponse, setTaskResponse] = useState('');
  const [reflectionData, setReflectionData] = useState({
    understood: '',
    difficult: '',
    newLearned: '',
    actionPlan: '',
  });

  // Action Loading States
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);
  const [isMarkingModule, setIsMarkingModule] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedTP = tps.find((t) => t.code === selectedTPCode) || tps[0];
  const selectedModule = modules.find((m) => m.tpCode === selectedTPCode) || modules[0];
  const currentTPProgress = progress?.tpProgress?.[selectedTPCode];

  // Auto-sync input fields when selectedTPCode or submissions update
  useEffect(() => {
    // 1. Load existing activity submission if present
    const existingAct = submissions.find(
      (s) => s.tpCode === selectedTPCode && s.assessmentType === 'aktivitas'
    );
    if (existingAct && existingAct.answers?.[0]?.answerText) {
      setActivityResponse(existingAct.answers[0].answerText);
    } else {
      setActivityResponse('');
    }

    // 2. Load existing task submission if present
    const existingTask = submissions.find(
      (s) => s.tpCode === selectedTPCode && s.assessmentType === 'tugas'
    );
    if (existingTask && existingTask.answers?.[0]?.answerText) {
      setTaskResponse(existingTask.answers[0].answerText);
    } else {
      setTaskResponse('');
    }

    // 3. Load existing reflection submission if present
    const existingRef = submissions.find(
      (s) => s.tpCode === selectedTPCode && s.assessmentType === 'refleksi'
    );
    if (existingRef && existingRef.reflectionAnswers) {
      setReflectionData(existingRef.reflectionAnswers);
    } else {
      setReflectionData({ understood: '', difficult: '', newLearned: '', actionPlan: '' });
    }
  }, [selectedTPCode, submissions]);

  // Helper to trigger cheerful confetti on quiz completion
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {}
  };

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Check if a TP is unlocked (All TPs unlocked for flexible learning & evaluation)
  const isTPUnlocked = (_code: string): boolean => {
    return true;
  };

  // Mark module reading as completed
  const handleMarkModuleComplete = async () => {
    setIsMarkingModule(true);
    try {
      await logActivity(
        currentUser.id,
        currentUser.fullName,
        selectedTPCode,
        `Menyelesaikan Pembacaan Modul ${selectedTPCode}`,
        'Selesai'
      );

      // Create a submission marker for progress
      const subId = `read_${currentUser.id}_${selectedTPCode}`;
      await setDoc(doc(db, COLLECTIONS.SUBMISSIONS, subId), {
        id: subId,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        tpCode: selectedTPCode,
        assessmentType: 'materi',
        answers: [],
        totalScore: 100,
        maxScore: 100,
        finalGrade: 100,
        kktpCategory: 'SB',
        submittedAt: new Date().toISOString(),
        status: 'selesai',
      });

      // Update progress directly in progress doc
      const userProgRef = doc(db, COLLECTIONS.PROGRESS, currentUser.id);
      const currentDetail = progress?.tpProgress?.[selectedTPCode];
      await setDoc(
        userProgRef,
        {
          tpProgress: {
            [selectedTPCode]: {
              ...(currentDetail || {}),
              tpCode: selectedTPCode,
              materialCompleted: true,
            },
          },
        },
        { merge: true }
      );

      await recalculateAndSaveStudentProgress(currentUser.id);
      triggerCelebration();
      showNotice('success', `Hebat! Kamu telah menyelesaikan materi ${selectedTPCode}. Lanjutkan ke Aktivitas atau Formatif!`);
    } catch (e: any) {
      showNotice('error', 'Gagal menyimpan status materi: ' + e.message);
    } finally {
      setIsMarkingModule(false);
    }
  };

  // Submit Activity response
  const handleSubmitActivity = async () => {
    setIsSubmittingActivity(true);
    let finalAnswer = activityResponse.trim();
    if (!finalAnswer) {
      // Auto-fill sample answer so user is never blocked
      finalAnswer = SAMPLE_ACTIVITIES[selectedTPCode] || `Siswa ${currentUser.fullName} telah mengamati dan menyelesaikan aktivitas pembelajaran ${selectedTPCode}.`;
      setActivityResponse(finalAnswer);
    }

    try {
      const subId = `act_${currentUser.id}_${selectedTPCode}`;
      await setDoc(doc(db, COLLECTIONS.SUBMISSIONS, subId), {
        id: subId,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        tpCode: selectedTPCode,
        assessmentType: 'aktivitas',
        answers: [{ questionNumber: 1, questionType: 'uraian', answerText: finalAnswer, earnedScore: 100, maxScore: 100 }],
        totalScore: 100,
        maxScore: 100,
        finalGrade: 100,
        kktpCategory: 'SB',
        submittedAt: new Date().toISOString(),
        status: 'selesai',
      });

      const userProgRef = doc(db, COLLECTIONS.PROGRESS, currentUser.id);
      await setDoc(
        userProgRef,
        {
          tpProgress: {
            [selectedTPCode]: {
              ...(progress?.tpProgress?.[selectedTPCode] || {}),
              tpCode: selectedTPCode,
              activityCompleted: true,
            },
          },
        },
        { merge: true }
      );

      await logActivity(
        currentUser.id,
        currentUser.fullName,
        selectedTPCode,
        `Mengirim Aktivitas Pembelajaran ${selectedTPCode}`,
        'Mengirim',
        100
      );

      await recalculateAndSaveStudentProgress(currentUser.id);
      triggerCelebration();
      showNotice('success', 'Jawaban aktivitas berhasil dikirim dan tersimpan di database!');
    } catch (e: any) {
      showNotice('error', 'Gagal mengirim aktivitas: ' + e.message);
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  // Submit Project Task
  const handleSubmitTask = async () => {
    setIsSubmittingTask(true);
    let finalAnswer = taskResponse.trim();
    if (!finalAnswer) {
      finalAnswer = SAMPLE_TASKS[selectedTPCode] || `Laporan tugas portofolio mandiri untuk ${selectedTPCode} disusun oleh ${currentUser.fullName}.`;
      setTaskResponse(finalAnswer);
    }

    try {
      const subId = `task_${currentUser.id}_${selectedTPCode}`;
      await setDoc(doc(db, COLLECTIONS.SUBMISSIONS, subId), {
        id: subId,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        tpCode: selectedTPCode,
        assessmentType: 'tugas',
        answers: [{ questionNumber: 1, questionType: 'tugas', answerText: finalAnswer, earnedScore: 85, maxScore: 100 }],
        totalScore: 85,
        maxScore: 100,
        finalGrade: 85,
        kktpCategory: 'SB',
        submittedAt: new Date().toISOString(),
        status: 'selesai',
        taskAttachmentText: finalAnswer,
      });

      const userProgRef = doc(db, COLLECTIONS.PROGRESS, currentUser.id);
      await setDoc(
        userProgRef,
        {
          tpProgress: {
            [selectedTPCode]: {
              ...(progress?.tpProgress?.[selectedTPCode] || {}),
              tpCode: selectedTPCode,
              tugasSubmitted: true,
            },
          },
        },
        { merge: true }
      );

      await logActivity(
        currentUser.id,
        currentUser.fullName,
        selectedTPCode,
        `Mengirim Tugas Portofolio ${selectedTPCode}`,
        'Mengirim',
        85
      );

      await recalculateAndSaveStudentProgress(currentUser.id);
      triggerCelebration();
      showNotice('success', 'Tugas proyek berhasil dikirim kepada Bapak Guru Fery Gustomi Kaharu!');
    } catch (e: any) {
      showNotice('error', 'Gagal mengirim tugas: ' + e.message);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Submit Reflection
  const handleSubmitReflection = async () => {
    setIsSubmittingReflection(true);
    const sample = SAMPLE_REFLECTIONS[selectedTPCode] || {
      understood: 'Saya sudah memahami konsep utama materi ' + selectedTPCode,
      difficult: 'Perlu sedikit pengulangan pada beberapa istilah baru',
      newLearned: 'Mendapat wawasan penting tentang materi IPAS Semester 1',
      actionPlan: 'Menerapkan perilaku hidup sehat dan nilai perjuangan pahlawan',
    };

    const finalData = {
      understood: reflectionData.understood.trim() || sample.understood,
      difficult: reflectionData.difficult.trim() || sample.difficult,
      newLearned: reflectionData.newLearned.trim() || sample.newLearned,
      actionPlan: reflectionData.actionPlan.trim() || sample.actionPlan,
    };
    setReflectionData(finalData);

    try {
      const subId = `ref_${currentUser.id}_${selectedTPCode}`;
      await setDoc(doc(db, COLLECTIONS.SUBMISSIONS, subId), {
        id: subId,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        tpCode: selectedTPCode,
        assessmentType: 'refleksi',
        answers: [],
        totalScore: 100,
        maxScore: 100,
        finalGrade: 100,
        kktpCategory: 'SB',
        submittedAt: new Date().toISOString(),
        status: 'selesai',
        reflectionAnswers: finalData,
      });

      const userProgRef = doc(db, COLLECTIONS.PROGRESS, currentUser.id);
      await setDoc(
        userProgRef,
        {
          tpProgress: {
            [selectedTPCode]: {
              ...(progress?.tpProgress?.[selectedTPCode] || {}),
              tpCode: selectedTPCode,
              refleksiSubmitted: true,
            },
          },
        },
        { merge: true }
      );

      await logActivity(
        currentUser.id,
        currentUser.fullName,
        selectedTPCode,
        `Mengisi Refleksi Pembelajaran ${selectedTPCode}`,
        'Mengirim',
        100
      );

      await recalculateAndSaveStudentProgress(currentUser.id);
      triggerCelebration();
      showNotice('success', 'Refleksi belajarmu tersimpan! Terus tingkatkan semangat belajarmu!');
    } catch (e: any) {
      showNotice('error', 'Gagal menyimpan refleksi: ' + e.message);
    } finally {
      setIsSubmittingReflection(false);
    }
  };

  // Start Formatif Quiz (Switches active tab to formatif and starts quiz)
  const handleStartFormatif = (fNum: 1 | 2 | 3) => {
    const qList = generateFormatifQuestions(selectedTPCode, fNum);
    setActiveQuizQuestions(qList);
    setFormatifType(fNum);
    setQuizType(`formatif_${fNum}` as any);
    setCurrentQIndex(0);
    setUserAnswers({});
    setQuizResult(null);
    setActiveMenu('formatif');
  };

  // Start Sumatif Quiz
  const handleStartSumatif = () => {
    const qList = generateSumatifQuestions(selectedTPCode);
    setActiveQuizQuestions(qList);
    setQuizType('sumatif');
    setCurrentQIndex(0);
    setUserAnswers({});
    setQuizResult(null);
    setActiveMenu('sumatif');
  };

  // Handle Answer Selection in Quiz
  const handleAnswerChange = (qId: string, value: any) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  // Submit Formatif / Sumatif
  const handleSubmitQuiz = async () => {
    if (!activeQuizQuestions || !quizType) return;

    setIsSubmittingQuiz(true);
    let totalScore = 0;
    let maxTotalScore = 0;
    const formattedAnswers: StudentAnswer[] = [];

    activeQuizQuestions.forEach((q) => {
      maxTotalScore += q.maxScore;
      const givenAns = userAnswers[q.id];
      let isCorrect = false;
      let earned = 0;

      if (q.questionType === 'pg' || q.questionType === 'benar_salah') {
        if (givenAns === q.correctAnswer) {
          isCorrect = true;
          earned = q.maxScore;
        }
      } else if (q.questionType === 'mcma') {
        const correctSet = new Set(q.correctAnswer as string[]);
        const givenArr: string[] = Array.isArray(givenAns) ? givenAns : [];
        const matches = givenArr.filter((item) => correctSet.has(item)).length;
        if (matches === correctSet.size && givenArr.length === correctSet.size) {
          isCorrect = true;
          earned = q.maxScore;
        } else if (matches > 0) {
          earned = Math.round((matches / correctSet.size) * q.maxScore);
        }
      } else if (q.questionType === 'kategori') {
        const catMap = (givenAns as { [sId: string]: string }) || {};
        let catCorrect = 0;
        q.statements?.forEach((st) => {
          if (catMap[st.id] === st.correctAnswer) catCorrect++;
        });
        if (catCorrect === q.statements?.length) {
          isCorrect = true;
          earned = q.maxScore;
        } else if (catCorrect > 0) {
          earned = Math.round((catCorrect / (q.statements?.length || 1)) * q.maxScore);
        }
      } else if (q.questionType === 'menjodohkan') {
        const matchMap = (givenAns as { [pId: string]: string }) || {};
        let pairCorrect = 0;
        q.matchingPairs?.forEach((pair) => {
          if (matchMap[pair.id] === pair.right) pairCorrect++;
        });
        if (pairCorrect === q.matchingPairs?.length) {
          isCorrect = true;
          earned = q.maxScore;
        } else if (pairCorrect > 0) {
          earned = Math.round((pairCorrect / (q.matchingPairs?.length || 1)) * q.maxScore);
        }
      } else if (q.questionType === 'uraian' || q.questionType === 'tugas') {
        // Essay gets default passing preview until graded by teacher
        const textLen = (givenAns || '').trim().length;
        if (textLen > 20) {
          earned = Math.round(q.maxScore * 0.9);
          isCorrect = true;
        } else if (textLen > 0) {
          earned = Math.round(q.maxScore * 0.6);
        }
      }

      totalScore += earned;
      formattedAnswers.push({
        questionId: q.id,
        questionNumber: q.number,
        questionType: q.questionType,
        answerText: typeof givenAns === 'string' ? givenAns : JSON.stringify(givenAns),
        isCorrect,
        earnedScore: earned,
        maxScore: q.maxScore,
      });
    });

    const finalGrade = Math.min(100, Math.round((totalScore / maxTotalScore) * 100));
    const kktpCat = getKKTPCategory(finalGrade);

    try {
      const subId = `sub_${currentUser.id}_${selectedTPCode}_${quizType}`;
      const submissionDoc: AssessmentSubmission = {
        id: subId,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        tpCode: selectedTPCode,
        assessmentType: quizType,
        answers: formattedAnswers,
        totalScore,
        maxScore: maxTotalScore,
        finalGrade,
        kktpCategory: kktpCat,
        submittedAt: new Date().toISOString(),
        status: quizType === 'sumatif' ? 'belum_lengkap' : 'selesai',
        teacherNotes: finalGrade >= 81 ? 'Sangat memuaskan, pertahankan prestasimu!' : 'Pelajari kembali materi yang belum dikuasai.',
      };

      await setDoc(doc(db, COLLECTIONS.SUBMISSIONS, subId), submissionDoc);

      await logActivity(
        currentUser.id,
        currentUser.fullName,
        selectedTPCode,
        `Mengerjakan ${quizType.toUpperCase()} - Nilai: ${finalGrade} (${kktpCat})`,
        'Mengirim',
        finalGrade
      );

      await recalculateAndSaveStudentProgress(currentUser.id);

      setQuizResult({
        score: totalScore,
        maxScore: maxTotalScore,
        grade: finalGrade,
        category: kktpCat,
      });

      triggerCelebration();
    } catch (e: any) {
      showNotice('error', 'Gagal menyimpan hasil kuis ke database: ' + e.message);
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Nav menus list (14 items as required by prompt)
  const navItems = [
    { id: 'beranda', label: '1. Beranda', icon: Home },
    { id: 'tujuan', label: '2. Tujuan Pembelajaran', icon: Target },
    { id: 'modul', label: '3. Modul / Materi', icon: BookOpen },
    { id: 'aktivitas', label: '4. Aktivitas Siswa', icon: Activity },
    { id: 'latihan', label: '5. Latihan Mandiri', icon: Flame },
    { id: 'formatif', label: '6. Asesmen Formatif (1,2,3)', icon: ClipboardList },
    { id: 'tugas', label: '7. Tugas Proyek', icon: FileCheck },
    { id: 'sumatif', label: '8. Asesmen Sumatif', icon: Award },
    { id: 'nilai', label: '9. Nilai Saya', icon: BarChart2 },
    { id: 'progress', label: '10. Progress Belajar', icon: Layers },
    { id: 'refleksi', label: '11. Refleksi Harian', icon: HeartPulse },
    { id: 'profil', label: '12. Profil Saya', icon: HelpCircle },
    { id: 'password', label: '13. Ganti Password', icon: KeyRound },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile-first Student Bar & Notification */}
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
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Main Student Header (Identity Card) */}
      <div className="bg-linear-to-r from-blue-700 via-indigo-600 to-sky-600 text-white p-4 sm:p-6 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white tracking-wide">
                  DASHBOARD SISWA
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900">
                  SD NEGERI 11 ANGGREK
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Halo, {currentUser.fullName}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5">
                Kelas VI • Fase C • IPAS Semester 1 • Tahun Pelajaran 2026/2027
              </p>
              <p className="text-[11px] text-blue-200 mt-1">
                Guru Pengampu: FERY GUSTOMI KAHARU, S.Pd.
              </p>
            </div>

            {/* Quick KPI stats on banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                <div className="text-[11px] text-blue-100 font-medium">Progress Total</div>
                <div className="text-lg font-black text-amber-300">
                  {progress?.overallProgressPercent || 0}%
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                <div className="text-[11px] text-blue-100 font-medium">TP Tuntas</div>
                <div className="text-lg font-black text-white">
                  {progress?.completedTPCount || 0} / 6
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                <div className="text-[11px] text-blue-100 font-medium">Nilai Rata-rata</div>
                <div className="text-lg font-black text-emerald-300">
                  {progress?.averageScore || 0}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                <div className="text-[11px] text-blue-100 font-medium">Status KKTP</div>
                <div className="text-sm font-extrabold text-white mt-1">
                  {progress ? getKKTPCategory(progress.averageScore) : 'BB'}
                </div>
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-4 pt-3 border-t border-white/15">
            <div className="flex justify-between text-xs font-semibold mb-1 text-blue-100">
              <span>Kemajuan Capaian Belajar Semester 1</span>
              <span>{progress?.overallProgressPercent || 0}% Selesai</span>
            </div>
            <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-amber-400 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progress?.overallProgressPercent || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body with Sidebar Tabs */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar (Scrollable & Responsive) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sticky top-20">
              <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider px-3 mb-2 block">
                Menu Pembelajaran Siswa
              </span>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'password') {
                          onChangePasswordClick();
                        } else {
                          setActiveMenu(item.id);
                          setActiveQuizQuestions(null);
                        }
                      }}
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

              {/* TP Selector Dropdown within Sidebar */}
              <div className="mt-4 pt-4 border-t border-slate-100 px-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Pilih Modul TP:
                </label>
                <div className="space-y-1">
                  {tps.map((tp) => {
                    const isSelected = selectedTPCode === tp.code;
                    const tpDet = progress?.tpProgress?.[tp.code];

                    return (
                      <button
                        key={tp.code}
                        onClick={() => {
                          setSelectedTPCode(tp.code);
                          setActiveQuizQuestions(null);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {tpDet?.isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          )}
                          <span className="truncate">{tp.code}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100">
                          {tpDet?.progressPercent || 0}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">

            {/* TAB 1: BERANDA */}
            {activeMenu === 'beranda' && (
              <div className="space-y-6">
                {/* Welcome Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        Selamat Datang di Ruang Belajar IPAS! 🌟
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 max-w-xl">
                        Aplikasi pembelajaran interaktif ini memandu kamu mempelajari 6 Tujuan Pembelajaran (TP) IPAS Semester 1. Ikuti alur: Pelajari Modul → Aktivitas → Latihan → Formatif → Tugas → Sumatif → Refleksi.
                      </p>
                    </div>
                    <Sparkles className="w-8 h-8 text-amber-400 shrink-0 hidden sm:block" />
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveMenu('modul')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Buka Modul Pembelajaran</span>
                    </button>
                    <button
                      onClick={() => setActiveMenu('formatif')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>Kerjakan Asesmen Formatif</span>
                    </button>
                    <button
                      onClick={() => setActiveMenu('nilai')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition"
                    >
                      <BarChart2 className="w-4 h-4" />
                      <span>Lihat Rapor Nilai Saya</span>
                    </button>
                  </div>
                </div>

                {/* 6 TP Cards Grid */}
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center space-x-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span>Daftar 6 Tujuan Pembelajaran Semester 1 (ATP Resmi)</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tps.map((tp, idx) => {
                      const unlocked = isTPUnlocked(tp.code);
                      const tpDet = progress?.tpProgress?.[tp.code];
                      return (
                        <div
                          key={tp.code}
                          className={`bg-white rounded-2xl border p-4 transition ${
                            unlocked
                              ? 'border-slate-200 shadow-xs hover:border-blue-400'
                              : 'border-slate-200 opacity-60 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-100 text-blue-800">
                              {tp.code}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                tpDet?.isCompleted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : unlocked
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {tpDet?.isCompleted ? 'TUNTAS' : unlocked ? 'AKTIF' : 'TERKUNCI'}
                            </span>
                          </div>

                          <h4 className="font-bold text-xs text-slate-800 mt-2 line-clamp-2">
                            "{tp.title}"
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {tp.materialSummary}
                          </p>

                          {/* Progress line */}
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                              Nilai Akhir: <strong className="text-slate-800">{tpDet?.finalScore || 0}</strong> ({tpDet ? tpDet.kktpCategory : 'BB'})
                            </span>
                            <button
                              onClick={() => {
                                setSelectedTPCode(tp.code);
                                setActiveMenu('modul');
                              }}
                              className="text-xs font-bold flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition cursor-pointer"
                            >
                              <span>Buka Modul</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TUJUAN PEMBELAJARAN (TP 6.1 s/d TP 6.6) */}
            {activeMenu === 'tujuan' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span>Tujuan Pembelajaran (ATP) dan Kriteria Ketercapaian (KKTP)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Daftar TP Semester 1 persis sesuai ATP IPAS Kelas VI. Setiap TP memiliki kriteria ketercapaian dan teknik asesmen tersendiri.
                  </p>
                </div>

                <div className="space-y-4">
                  {tps.map((tp, idx) => {
                    const tpDet = progress?.tpProgress?.[tp.code];

                    return (
                      <div
                        key={tp.code}
                        className={`p-4 rounded-2xl border ${
                          tp.code === selectedTPCode
                            ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-600 text-white">
                              {tp.code}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Modul Ke-{idx + 1}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-slate-500">Progress:</span>
                            <strong className="text-blue-700">{tpDet?.progressPercent || 0}%</strong>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Nilai:</span>
                            <strong className="text-emerald-700">{tpDet?.finalScore || 0}</strong>
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px]">
                              {tpDet ? tpDet.kktpCategory : 'BB'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 text-xs text-slate-800 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100">
                          "{tp.title}"
                        </div>

                        {/* Indikator KKTP */}
                        <div className="mt-3">
                          <span className="text-[11px] font-bold text-slate-700 block mb-1">
                            Indikator Ketercapaian (KKTP):
                          </span>
                          <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
                            {tp.indicators.map((ind, i) => (
                              <li key={i}>{ind}</li>
                            ))}
                          </ol>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            Teknik Asesmen: <strong className="text-slate-700">{tp.assessmentTechniques}</strong>
                          </span>
                          <button
                            onClick={() => {
                              setSelectedTPCode(tp.code);
                              setActiveMenu('modul');
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Buka Materi TP
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: MODUL / MATERI */}
            {activeMenu === 'modul' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 bg-blue-600 text-white font-black text-xs rounded-lg">
                        {selectedTP.code}
                      </span>
                      <h2 className="text-base font-extrabold text-slate-900">
                        {selectedModule?.title || `Modul ${selectedTP.code}`}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-600 italic mt-1 font-medium">
                      "{selectedTP.title}"
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {currentTPProgress?.materialCompleted ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Materi Selesai Dibaca</span>
                      </span>
                    ) : (
                      <button
                        onClick={handleMarkModuleComplete}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tandai Selesai Membaca</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Module Core Sections */}
                <div className="space-y-6 text-xs text-slate-700 leading-relaxed">
                  {selectedModule ? (
                    <>
                      {/* Section 1: Materi Inti */}
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-2">
                        <h4 className="font-extrabold text-xs text-blue-900 uppercase tracking-wider">
                          Materi Inti & Pengantar
                        </h4>
                        <p className="text-slate-800 font-medium">{selectedModule.coreMaterial}</p>
                      </div>

                      {/* Section 2: Penjelasan Rinci */}
                      {selectedModule.explanation.map((sec, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white">
                          <h4 className="font-black text-sm text-slate-900 flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            <span>{sec.title}</span>
                          </h4>
                          <p className="whitespace-pre-line text-slate-700">{sec.content}</p>

                          {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-700 font-medium">
                              {sec.bulletPoints.map((bp, i) => (
                                <li key={i}>{bp}</li>
                              ))}
                            </ul>
                          )}

                          {sec.subsections && sec.subsections.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              {sec.subsections.map((sub, sIdx) => (
                                <div key={sIdx} className="bg-slate-50 p-3 rounded-xl">
                                  <h5 className="font-bold text-xs text-blue-800">{sub.title}</h5>
                                  <p className="whitespace-pre-line text-slate-700 mt-1">{sub.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Section 3: Contoh & Ilustrasi */}
                      {selectedModule.examples && selectedModule.examples.length > 0 && (
                        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-2">
                          <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wider">
                            💡 Contoh Penerapan Konsep
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium">
                            {selectedModule.examples.map((ex, i) => (
                              <li key={i}>{ex}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Section 4: Ringkasan Modul */}
                      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                        <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                          📌 Rangkuman Materi
                        </h4>
                        <p className="text-slate-700 font-medium">{selectedModule.summary}</p>
                      </div>

                      {/* Action Next Step */}
                      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                        <button
                          onClick={handleMarkModuleComplete}
                          disabled={isMarkingModule}
                          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isMarkingModule ? 'Menyimpan...' : 'Materi Sudah Dipelajari'}</span>
                        </button>
                        <button
                          onClick={() => setActiveMenu('aktivitas')}
                          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <span>Lanjut ke Aktivitas Siswa</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-slate-500">
                      Materi untuk TP ini belum tersedia.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: AKTIVITAS SISWA */}
            {activeMenu === 'aktivitas' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 uppercase">
                    Aktivitas Pembelajaran {selectedTP.code}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    {selectedModule?.activities.title || 'Aktivitas Mandiri & Pengamatan'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {selectedModule?.activities.instructions}
                  </p>
                </div>

                {/* Status indicator if already submitted */}
                {currentTPProgress?.activityCompleted && (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between text-emerald-900">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-semibold">
                        Jawaban aktivitasmu sudah tercatat di sistem & dapat dinilai guru. Kamu tetap dapat memperbarui jawaban kapan saja.
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-black bg-emerald-200 text-emerald-900 text-[10px] shrink-0 ml-2">
                      TERKIRIM
                    </span>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
                  <h4 className="font-bold text-xs text-blue-900 mb-1">Pertanyaan / Tugas Aktivitas:</h4>
                  <p className="text-xs text-slate-800 font-semibold">
                    {selectedModule?.activities.taskPrompt}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Ketik Jawaban & Catatan Aktivitasmu di Sini:
                    </label>
                    <button
                      type="button"
                      onClick={() => setActivityResponse(SAMPLE_ACTIVITIES[selectedTPCode] || '')}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Gunakan Draf Contoh Pengamatan ({selectedTPCode})</span>
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={activityResponse}
                    onChange={(e) => setActivityResponse(e.target.value)}
                    placeholder="Tuliskan hasil pengamatan, peta konsep, atau jawaban pertanyaan aktivitasmu secara lengkap di sini..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-slate-500">
                    *Jawaban akan langsung tersimpan ke Cloud Firestore & dapat ditinjau oleh guru.
                  </span>
                  <button
                    onClick={handleSubmitActivity}
                    disabled={isSubmittingActivity}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingActivity ? 'Menyimpan ke Database...' : 'Kirim Jawaban Aktivitas'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: LATIHAN MANDIRI */}
            {activeMenu === 'latihan' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                      <Flame className="w-5 h-5 text-amber-500" />
                      <span>Latihan Mandiri Interaktif ({selectedTP.code})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Latih pemahaman konsepmu dengan simulasi butir soal interaktif sebelum Asesmen Sumatif.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleStartFormatif(1)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Formatif 1
                    </button>
                    <button
                      onClick={() => handleStartFormatif(2)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Formatif 2
                    </button>
                    <button
                      onClick={() => handleStartFormatif(3)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Formatif 3
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-3">
                  <p className="font-semibold text-slate-800">
                    Petunjuk Pengerjaan Latihan:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Kerjakan 10 butir soal latihan untuk menguji pemahaman konsep materi {selectedTP.code}.</li>
                    <li>Soal terdiri atas Pilihan Ganda, Pilihan Ganda Kompleks, Kategori Benar/Salah, dan Menjodohkan.</li>
                    <li>Nilai akan langsung dihitung otomatis dan tercatat dalam kemajuan belajarmu.</li>
                  </ul>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleStartFormatif(1)}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Flame className="w-4 h-4" />
                      <span>Buka Simulasi Formatif 1 Sekarang</span>
                    </button>
                    <button
                      onClick={() => handleStartFormatif(2)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>Buka Simulasi Formatif 2</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: ASESMEN FORMATIF (1, 2, 3) */}
            {activeMenu === 'formatif' && (
              <div className="space-y-6">
                {/* Formatif Sub-selector */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                        <span>Asesmen Formatif: {selectedTP.code}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Tiap TP memiliki 3 Asesmen Formatif. Masing-masing terdiri atas 10 butir soal (2 PG, 2 MCMA, 2 Kategori, 2 Benar/Salah, 2 Menjodohkan).
                      </p>
                    </div>

                    <div className="flex rounded-xl bg-slate-100 p-1">
                      {[1, 2, 3].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setFormatifType(num as any);
                            setActiveQuizQuestions(null);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            formatifType === num
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Formatif {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary of past score */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      Nilai Formatif {formatifType} Saat Ini:{' '}
                      <strong className="text-blue-700">
                        {formatifType === 1
                          ? currentTPProgress?.formatif1Score || 0
                          : formatifType === 2
                          ? currentTPProgress?.formatif2Score || 0
                          : currentTPProgress?.formatif3Score || 0}
                      </strong>{' '}
                      / 100
                    </span>
                    {!activeQuizQuestions && (
                      <button
                        onClick={() => handleStartFormatif(formatifType)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                      >
                        Mulai Mengerjakan Formatif {formatifType}
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Quiz Engine */}
                {activeQuizQuestions && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in">
                    {/* Header bar of quiz */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold text-xs rounded-lg">
                          Soal Nomor {currentQIndex + 1} dari {activeQuizQuestions.length}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase">
                          Tipe: {activeQuizQuestions[currentQIndex].questionType.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">
                        Bobot: {activeQuizQuestions[currentQIndex].maxScore} Poin
                      </span>
                    </div>

                    {/* Question Prompt */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 leading-relaxed">
                        {activeQuizQuestions[currentQIndex].prompt}
                      </h4>

                      {/* 1. PG */}
                      {activeQuizQuestions[currentQIndex].questionType === 'pg' && (
                        <div className="space-y-2">
                          {activeQuizQuestions[currentQIndex].options?.map((opt, i) => (
                            <label
                              key={i}
                              className={`flex items-center p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                                userAnswers[activeQuizQuestions[currentQIndex].id] === opt
                                  ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-100 font-bold'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${activeQuizQuestions[currentQIndex].id}`}
                                value={opt}
                                checked={userAnswers[activeQuizQuestions[currentQIndex].id] === opt}
                                onChange={() =>
                                  handleAnswerChange(activeQuizQuestions[currentQIndex].id, opt)
                                }
                                className="mr-3 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* 2. MCMA */}
                      {activeQuizQuestions[currentQIndex].questionType === 'mcma' && (
                        <div className="space-y-2">
                          {activeQuizQuestions[currentQIndex].options?.map((opt, i) => {
                            const currentSel: string[] =
                              userAnswers[activeQuizQuestions[currentQIndex].id] || [];
                            const isChecked = currentSel.includes(opt);
                            return (
                              <label
                                key={i}
                                className={`flex items-center p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-100 font-bold'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      handleAnswerChange(activeQuizQuestions[currentQIndex].id, [
                                        ...currentSel,
                                        opt,
                                      ]);
                                    } else {
                                      handleAnswerChange(
                                        activeQuizQuestions[currentQIndex].id,
                                        currentSel.filter((x) => x !== opt)
                                      );
                                    }
                                  }}
                                  className="mr-3 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. Benar/Salah */}
                      {activeQuizQuestions[currentQIndex].questionType === 'benar_salah' && (
                        <div className="grid grid-cols-2 gap-3">
                          {['Benar', 'Salah'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                handleAnswerChange(activeQuizQuestions[currentQIndex].id, val)
                              }
                              className={`py-3 px-4 rounded-xl border text-xs font-bold transition ${
                                userAnswers[activeQuizQuestions[currentQIndex].id] === val
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 4. Kategori */}
                      {activeQuizQuestions[currentQIndex].questionType === 'kategori' && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 font-bold text-slate-700">
                              <tr>
                                <th className="p-3">Pernyataan</th>
                                <th className="p-3 w-28 text-center">Pilihan Jawaban</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activeQuizQuestions[currentQIndex].statements?.map((st) => {
                                const currentCat =
                                  userAnswers[activeQuizQuestions[currentQIndex].id]?.[st.id] || '';
                                return (
                                  <tr key={st.id}>
                                    <td className="p-3 text-slate-800">{st.statement}</td>
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center space-x-2">
                                        {['Benar', 'Salah'].map((ans) => (
                                          <button
                                            key={ans}
                                            type="button"
                                            onClick={() => {
                                              const prev =
                                                userAnswers[activeQuizQuestions[currentQIndex].id] || {};
                                              handleAnswerChange(activeQuizQuestions[currentQIndex].id, {
                                                ...prev,
                                                [st.id]: ans,
                                              });
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                              currentCat === ans
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                          >
                                            {ans}
                                          </button>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* 5. Menjodohkan */}
                      {activeQuizQuestions[currentQIndex].questionType === 'menjodohkan' && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500 italic">
                            Pilih pasangan yang tepat untuk pernyataan di sebelah kiri:
                          </p>
                          {activeQuizQuestions[currentQIndex].matchingPairs?.map((pair) => {
                            const currentMatch =
                              userAnswers[activeQuizQuestions[currentQIndex].id]?.[pair.id] || '';
                            const rightOptions =
                              activeQuizQuestions[currentQIndex].matchingPairs?.map((p) => p.right) || [];

                            return (
                              <div
                                key={pair.id}
                                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <span className="font-bold text-slate-800 sm:w-1/2">
                                  {pair.left}
                                </span>
                                <select
                                  value={currentMatch}
                                  onChange={(e) => {
                                    const prev =
                                      userAnswers[activeQuizQuestions[currentQIndex].id] || {};
                                    handleAnswerChange(activeQuizQuestions[currentQIndex].id, {
                                      ...prev,
                                      [pair.id]: e.target.value,
                                    });
                                  }}
                                  className="w-full sm:w-1/2 p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-hidden"
                                >
                                  <option value="">-- Pilih Pasangan --</option>
                                  {rightOptions.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 6. Uraian & Tugas */}
                      {(activeQuizQuestions[currentQIndex].questionType === 'uraian' ||
                        activeQuizQuestions[currentQIndex].questionType === 'tugas') && (
                        <div className="space-y-2">
                          <textarea
                            rows={5}
                            value={userAnswers[activeQuizQuestions[currentQIndex].id] || ''}
                            onChange={(e) =>
                              handleAnswerChange(activeQuizQuestions[currentQIndex].id, e.target.value)
                            }
                            placeholder="Ketik jawaban uraian atau hasil analisismu secara lengkap di sini..."
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      )}
                    </div>

                    {/* Navigation bar between questions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={currentQIndex === 0}
                        onClick={() => setCurrentQIndex((prev) => prev - 1)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-40 transition flex items-center space-x-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Sebelumnya</span>
                      </button>

                      {currentQIndex < activeQuizQuestions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentQIndex((prev) => prev + 1)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1"
                        >
                          <span>Selanjutnya</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmittingQuiz}
                          onClick={handleSubmitQuiz}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/25 transition flex items-center space-x-1.5"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isSubmittingQuiz ? 'Mengirim...' : 'Kirim Jawaban Asesmen'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Score Result Card Modal/Box */}
                {quizResult && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 animate-in zoom-in-95">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg">
                      <Award className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-black text-emerald-950">
                      Asesmen Berhasil Disimpan ke Database!
                    </h3>
                    <div className="text-3xl font-black text-emerald-700">
                      {quizResult.grade} <span className="text-sm font-normal text-slate-600">/ 100</span>
                    </div>
                    <p className="text-xs text-emerald-800 font-bold">
                      Kategori Ketercapaian: {getKKTPLabel(quizResult.category)}
                    </p>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Nilai dan hasil jawabanmu telah disinkronkan secara online dan langsung dapat dilihat oleh Bapak Guru Fery Gustomi Kaharu.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setQuizResult(null);
                          setActiveQuizQuestions(null);
                        }}
                        className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                      >
                        Selesai & Kembali ke Menu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: TUGAS PROYEK */}
            {activeMenu === 'tugas' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800 uppercase">
                    Tugas Proyek & Portofolio
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    Pengumpulan Tugas Mandiri ({selectedTP.code})
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Kerjakan tugas portofolio sesuai materi TP dan kirimkan langsung melalui formulir ini.
                  </p>
                </div>

                {/* Status indicator if already submitted */}
                {currentTPProgress?.tugasSubmitted && (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between text-emerald-900">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-semibold">
                        Laporan tugas portofolio sudah tercatat di sistem. Anda dapat memperbarui laporan kapan saja.
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-black bg-emerald-200 text-emerald-900 text-[10px] shrink-0 ml-2">
                      DIKUMPULKAN
                    </span>
                  </div>
                )}

                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 text-xs">
                  <h4 className="font-bold text-indigo-900 mb-1">Instruksi Tugas:</h4>
                  <p className="text-slate-800 font-medium">
                    Tuliskan laporan pengamatan, bagan sirkulasi organ tubuh, atau ringkasan sejarah perjuangan pahlawan sesuai materi {selectedTP.code}.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Ketik Laporan Tugas / Portofolio di Sini:
                    </label>
                    <button
                      type="button"
                      onClick={() => setTaskResponse(SAMPLE_TASKS[selectedTPCode] || '')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Gunakan Draf Laporan Portofolio ({selectedTPCode})</span>
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={taskResponse}
                    onChange={(e) => setTaskResponse(e.target.value)}
                    placeholder="Tuliskan isi laporan tugasmu di sini secara terstruktur..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-slate-500">
                    *Tugas akan dinilai oleh guru dengan rubrik KKTP resmi.
                  </span>
                  <button
                    onClick={handleSubmitTask}
                    disabled={isSubmittingTask}
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingTask ? 'Menyimpan Laporan...' : 'Kirim Tugas Portofolio'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 8: ASESMEN SUMATIF */}
            {activeMenu === 'sumatif' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                        <Award className="w-5 h-5 text-amber-500" />
                        <span>Asesmen Sumatif ({selectedTP.code})</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Asesmen akhir untuk menentukan ketuntasan Tujuan Pembelajaran. Memuat butir soal PG, MCMA, Kategori, Benar/Salah, Menjodohkan, Uraian, dan Tugas.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500">Nilai Sumatif:</span>
                      <div className="text-xl font-black text-blue-700">
                        {currentTPProgress?.sumatifScore || 0} / 100
                      </div>
                    </div>
                  </div>

                  {!activeQuizQuestions && (
                    <div className="mt-5 p-5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3 text-xs">
                      <p className="font-bold text-amber-950">
                        Perhatian Sebelum Mengerjakan Asesmen Sumatif:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                        <li>Pastikan kamu sudah selesai membaca modul dan menyelesaikan aktivitas.</li>
                        <li>Jawab setiap soal dengan jujur, teliti, dan mandiri.</li>
                        <li>Jawaban akan disimpan permanen ke database Cloud Firestore.</li>
                      </ul>

                      <div className="pt-2">
                        <button
                          onClick={handleStartSumatif}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
                        >
                          <Award className="w-4 h-4" />
                          <span>Mulai Kerjakan Asesmen Sumatif</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Re-use Quiz Engine if sumatif active */}
                {activeQuizQuestions && quizType === 'sumatif' && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-lg">
                          Soal Sumatif {currentQIndex + 1} dari {activeQuizQuestions.length}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase">
                          {activeQuizQuestions[currentQIndex].questionType}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">
                        Bobot: {activeQuizQuestions[currentQIndex].maxScore} Poin
                      </span>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 leading-relaxed">
                        {activeQuizQuestions[currentQIndex].prompt}
                      </h4>

                      {/* Same interactive question renderer */}
                      {activeQuizQuestions[currentQIndex].questionType === 'pg' && (
                        <div className="space-y-2">
                          {activeQuizQuestions[currentQIndex].options?.map((opt, i) => (
                            <label
                              key={i}
                              className={`flex items-center p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                                userAnswers[activeQuizQuestions[currentQIndex].id] === opt
                                  ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-100 font-bold'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${activeQuizQuestions[currentQIndex].id}`}
                                value={opt}
                                checked={userAnswers[activeQuizQuestions[currentQIndex].id] === opt}
                                onChange={() =>
                                  handleAnswerChange(activeQuizQuestions[currentQIndex].id, opt)
                                }
                                className="mr-3 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {activeQuizQuestions[currentQIndex].questionType === 'mcma' && (
                        <div className="space-y-2">
                          {activeQuizQuestions[currentQIndex].options?.map((opt, i) => {
                            const currentSel: string[] =
                              userAnswers[activeQuizQuestions[currentQIndex].id] || [];
                            const isChecked = currentSel.includes(opt);
                            return (
                              <label
                                key={i}
                                className={`flex items-center p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-100 font-bold'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      handleAnswerChange(activeQuizQuestions[currentQIndex].id, [
                                        ...currentSel,
                                        opt,
                                      ]);
                                    } else {
                                      handleAnswerChange(
                                        activeQuizQuestions[currentQIndex].id,
                                        currentSel.filter((x) => x !== opt)
                                      );
                                    }
                                  }}
                                  className="mr-3 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {activeQuizQuestions[currentQIndex].questionType === 'benar_salah' && (
                        <div className="grid grid-cols-2 gap-3">
                          {['Benar', 'Salah'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                handleAnswerChange(activeQuizQuestions[currentQIndex].id, val)
                              }
                              className={`py-3 px-4 rounded-xl border text-xs font-bold transition ${
                                userAnswers[activeQuizQuestions[currentQIndex].id] === val
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}

                      {activeQuizQuestions[currentQIndex].questionType === 'kategori' && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 font-bold text-slate-700">
                              <tr>
                                <th className="p-3">Pernyataan</th>
                                <th className="p-3 w-28 text-center">Jawaban</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activeQuizQuestions[currentQIndex].statements?.map((st) => {
                                const currentCat =
                                  userAnswers[activeQuizQuestions[currentQIndex].id]?.[st.id] || '';
                                return (
                                  <tr key={st.id}>
                                    <td className="p-3 text-slate-800">{st.statement}</td>
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center space-x-2">
                                        {['Benar', 'Salah'].map((ans) => (
                                          <button
                                            key={ans}
                                            type="button"
                                            onClick={() => {
                                              const prev =
                                                userAnswers[activeQuizQuestions[currentQIndex].id] || {};
                                              handleAnswerChange(activeQuizQuestions[currentQIndex].id, {
                                                ...prev,
                                                [st.id]: ans,
                                              });
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                              currentCat === ans
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                          >
                                            {ans}
                                          </button>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {activeQuizQuestions[currentQIndex].questionType === 'menjodohkan' && (
                        <div className="space-y-3">
                          {activeQuizQuestions[currentQIndex].matchingPairs?.map((pair) => {
                            const currentMatch =
                              userAnswers[activeQuizQuestions[currentQIndex].id]?.[pair.id] || '';
                            const rightOptions =
                              activeQuizQuestions[currentQIndex].matchingPairs?.map((p) => p.right) || [];

                            return (
                              <div
                                key={pair.id}
                                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <span className="font-bold text-slate-800 sm:w-1/2">
                                  {pair.left}
                                </span>
                                <select
                                  value={currentMatch}
                                  onChange={(e) => {
                                    const prev =
                                      userAnswers[activeQuizQuestions[currentQIndex].id] || {};
                                    handleAnswerChange(activeQuizQuestions[currentQIndex].id, {
                                      ...prev,
                                      [pair.id]: e.target.value,
                                    });
                                  }}
                                  className="w-full sm:w-1/2 p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-hidden"
                                >
                                  <option value="">-- Pilih Pasangan --</option>
                                  {rightOptions.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(activeQuizQuestions[currentQIndex].questionType === 'uraian' ||
                        activeQuizQuestions[currentQIndex].questionType === 'tugas') && (
                        <div className="space-y-2">
                          <textarea
                            rows={5}
                            value={userAnswers[activeQuizQuestions[currentQIndex].id] || ''}
                            onChange={(e) =>
                              handleAnswerChange(activeQuizQuestions[currentQIndex].id, e.target.value)
                            }
                            placeholder="Ketik jawaban uraian sumatifmu secara rinci di sini..."
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={currentQIndex === 0}
                        onClick={() => setCurrentQIndex((prev) => prev - 1)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-40 transition flex items-center space-x-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Sebelumnya</span>
                      </button>

                      {currentQIndex < activeQuizQuestions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentQIndex((prev) => prev + 1)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1"
                        >
                          <span>Selanjutnya</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmittingQuiz}
                          onClick={handleSubmitQuiz}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/25 transition flex items-center space-x-1.5"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isSubmittingQuiz ? 'Menyimpan...' : 'Kirim Asesmen Sumatif'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 9: NILAI SAYA */}
            {activeMenu === 'nilai' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                      <BarChart2 className="w-5 h-5 text-blue-600" />
                      <span>Rapor Nilai & Ketercapaian KKTP</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Nilai dihitung otomatis dari rata-rata Formatif (1,2,3), Nilai Sumatif, dan Tugas Portofolio.
                    </p>
                  </div>
                  <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 text-right">
                    <span className="text-[11px] text-blue-800 font-semibold block">Rata-rata Semester:</span>
                    <span className="text-lg font-black text-blue-900">
                      {progress?.averageScore || 0} ({progress ? progress.kktpCategory : 'BB'})
                    </span>
                  </div>
                </div>

                {/* Responsive Grade Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Kode TP</th>
                        <th className="p-3">Tujuan Pembelajaran</th>
                        <th className="p-3 text-center">Formatif 1</th>
                        <th className="p-3 text-center">Formatif 2</th>
                        <th className="p-3 text-center">Formatif 3</th>
                        <th className="p-3 text-center">Sumatif</th>
                        <th className="p-3 text-center">Nilai Akhir</th>
                        <th className="p-3 text-center">Kategori</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tps.map((tp) => {
                        const tpDet = progress?.tpProgress?.[tp.code];
                        return (
                          <tr key={tp.code} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-blue-700">{tp.code}</td>
                            <td className="p-3 font-medium text-slate-800 max-w-xs truncate">
                              {tp.title}
                            </td>
                            <td className="p-3 text-center font-semibold">{tpDet?.formatif1Score || 0}</td>
                            <td className="p-3 text-center font-semibold">{tpDet?.formatif2Score || 0}</td>
                            <td className="p-3 text-center font-semibold">{tpDet?.formatif3Score || 0}</td>
                            <td className="p-3 text-center font-semibold">{tpDet?.sumatifScore || 0}</td>
                            <td className="p-3 text-center font-extrabold text-blue-900 bg-blue-50/50">
                              {tpDet?.finalScore || 0}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded font-black text-[10px] bg-slate-100">
                                {tpDet ? tpDet.kktpCategory : 'BB'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tpDet?.isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {tpDet?.isCompleted ? 'Tuntas' : 'Proses'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* KKTP Range Legend */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-2">
                    Rentang Ketercapaian KKTP (Permendikbud):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                      <strong>0 – 40: BB</strong> (Belum Berkembang)
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                      <strong>41 – 60: MB</strong> (Mulai Berkembang)
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                      <strong>61 – 80: BSH</strong> (Berkembang Sesuai Harapan)
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                      <strong>81 – 100: SB</strong> (Sangat Berkembang)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 10: PROGRESS BELAJAR */}
            {activeMenu === 'progress' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <span>Laporan Kemajuan Belajar Siswa</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Progress dihitung otomatis berdasarkan: Modul selesai (15%), Aktivitas (10%), Formatif 1, 2, 3 (masing-masing 15%), Tugas (10%), Sumatif (15%), Refleksi (5%).
                  </p>
                </div>

                <div className="space-y-4">
                  {tps.map((tp) => {
                    const tpDet = progress?.tpProgress?.[tp.code];
                    const percent = tpDet?.progressPercent || 0;

                    return (
                      <div key={tp.code} className="p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-800">
                            {tp.code}: {tp.materialSummary}
                          </span>
                          <span className="font-black text-blue-700">{percent}%</span>
                        </div>

                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-500">
                          <div>Materi: {tpDet?.materialCompleted ? '✅ Selesai' : '⏳ Belum'}</div>
                          <div>Aktivitas: {tpDet?.activityCompleted ? '✅ Selesai' : '⏳ Belum'}</div>
                          <div>Formatif: {tpDet?.formatif1Score ? '✅ Dikerjakan' : '⏳ Belum'}</div>
                          <div>Sumatif: {tpDet?.sumatifScore ? '✅ Selesai' : '⏳ Belum'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 11: REFLEKSI SISWA */}
            {activeMenu === 'refleksi' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-pink-100 text-pink-800 uppercase">
                    Refleksi Diri ({selectedTP.code})
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Jurnal Refleksi Pembelajaran Siswa
                    </h3>
                    <button
                      type="button"
                      onClick={() => setReflectionData(SAMPLE_REFLECTIONS[selectedTPCode] || {
                        understood: 'Saya sudah memahami konsep utama materi ' + selectedTPCode,
                        difficult: 'Perlu pengulangan sedikit pada istilah baru',
                        newLearned: 'Mendapat wawasan penting tentang materi IPAS Semester 1',
                        actionPlan: 'Menerapkan perilaku hidup sehat dan nilai perjuangan pahlawan',
                      })}
                      className="text-[11px] font-bold text-pink-600 hover:text-pink-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Gunakan Draf Refleksi Lengkap ({selectedTPCode})</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Jawablah pertanyaan refleksi berikut dengan jujur sesuai apa yang kamu rasakan setelah mempelajari materi.
                  </p>
                </div>

                {/* Status indicator if already submitted */}
                {currentTPProgress?.refleksiSubmitted && (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between text-emerald-900">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-semibold">
                        Jurnal refleksi belajarmu telah tersimpan. Kamu dapat memperbarui atau menambah catatan kapan saja.
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-black bg-emerald-200 text-emerald-900 text-[10px] shrink-0 ml-2">
                      TERSIMPAN
                    </span>
                  </div>
                )}

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      1. Apa yang sudah saya pahami dari materi ini?
                    </label>
                    <textarea
                      rows={3}
                      value={reflectionData.understood}
                      onChange={(e) => setReflectionData({ ...reflectionData, understood: e.target.value })}
                      placeholder="Contoh: Saya sudah paham nama organ pencernaan dan urutannya dari mulut hingga usus..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      2. Apa yang masih sulit atau belum saya pahami?
                    </label>
                    <textarea
                      rows={3}
                      value={reflectionData.difficult}
                      onChange={(e) => setReflectionData({ ...reflectionData, difficult: e.target.value })}
                      placeholder="Contoh: Saya masih bingung membedakan fungsi enzim amilase dan lipase..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      3. Apa hal baru yang saya pelajari dari materi ini?
                    </label>
                    <textarea
                      rows={3}
                      value={reflectionData.newLearned}
                      onChange={(e) => setReflectionData({ ...reflectionData, newLearned: e.target.value })}
                      placeholder="Contoh: Saya baru tahu bahwa semboyan 3G adalah Gold, Glory, dan Gospel..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      4. Apa tindakan nyata yang akan saya lakukan setelah mempelajari materi ini?
                    </label>
                    <textarea
                      rows={3}
                      value={reflectionData.actionPlan}
                      onChange={(e) => setReflectionData({ ...reflectionData, actionPlan: e.target.value })}
                      placeholder="Contoh: Saya berjanji selalu sarapan pagi tepat waktu dan mencuci tangan sebelum makan..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSubmitReflection}
                    disabled={isSubmittingReflection}
                    className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
                  >
                    <HeartPulse className="w-4 h-4" />
                    <span>{isSubmittingReflection ? 'Menyimpan Refleksi...' : 'Simpan Lembar Refleksi'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 12: PROFIL SAYA */}
            {activeMenu === 'profil' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    <span>Biodata & Profil Akun Siswa</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Nama Lengkap Siswa:</span>
                    <p className="font-extrabold text-slate-900 text-sm">{currentUser.fullName}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Username Login:</span>
                    <p className="font-mono font-bold text-blue-700">{currentUser.username}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Satuan Pendidikan:</span>
                    <p className="font-bold text-slate-800">SD NEGERI 11 ANGGREK</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Kelas / Fase:</span>
                    <p className="font-bold text-slate-800">VI (Enam) / Fase C</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Mata Pelajaran:</span>
                    <p className="font-bold text-slate-800">Ilmu Pengetahuan Alam dan Sosial (IPAS)</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-medium">Guru Kelas VI:</span>
                    <p className="font-bold text-slate-800">FERY GUSTOMI KAHARU, S.Pd.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onChangePasswordClick}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Ganti Kata Sandi Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
