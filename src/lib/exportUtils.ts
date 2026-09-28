import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, StudentProgress, AssessmentSubmission, TPItem, AppSettings } from '../types';
import { getKKTPCategory, getKKTPLabel } from './firebase';

export function exportToExcel(
  students: User[],
  progressMap: { [studentId: string]: StudentProgress },
  submissions: AssessmentSubmission[],
  tps: TPItem[],
  settings: AppSettings
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet DATA SISWA
  const dataSiswaRows = students.map((s, idx) => {
    const prog = progressMap[s.id];
    return {
      No: idx + 1,
      'Nama Siswa': s.fullName,
      Username: s.username,
      Kelas: settings.className,
      'Progress (%)': prog ? `${prog.overallProgressPercent}%` : '0%',
      'TP Selesai': prog ? `${prog.completedTPCount} / 6` : '0 / 6',
      'Nilai Rata-rata': prog?.averageScore || 0,
      'Kategori KKTP': prog ? getKKTPLabel(prog.kktpCategory) : 'BB',
      'Terakhir Aktif': prog?.lastActive ? new Date(prog.lastActive).toLocaleString('id-ID') : '-',
    };
  });
  const wsDataSiswa = XLSX.utils.json_to_sheet(dataSiswaRows);
  XLSX.utils.book_append_sheet(wb, wsDataSiswa, 'DATA SISWA');

  // 2. Sheet REKAP NILAI
  const rekapNilaiRows = students.map((s, idx) => {
    const prog = progressMap[s.id];
    return {
      No: idx + 1,
      'Nama Siswa': s.fullName,
      'TP 6.1': prog?.tpProgress?.['TP 6.1']?.finalScore || 0,
      'TP 6.2': prog?.tpProgress?.['TP 6.2']?.finalScore || 0,
      'TP 6.3': prog?.tpProgress?.['TP 6.3']?.finalScore || 0,
      'TP 6.4': prog?.tpProgress?.['TP 6.4']?.finalScore || 0,
      'TP 6.5': prog?.tpProgress?.['TP 6.5']?.finalScore || 0,
      'TP 6.6': prog?.tpProgress?.['TP 6.6']?.finalScore || 0,
      'Rata-rata': prog?.averageScore || 0,
      Kategori: prog ? prog.kktpCategory : 'BB',
      'Progress Belajar': prog ? `${prog.overallProgressPercent}%` : '0%',
    };
  });
  const wsRekap = XLSX.utils.json_to_sheet(rekapNilaiRows);
  XLSX.utils.book_append_sheet(wb, wsRekap, 'REKAP NILAI');

  // 3 - 8. Sheets TP 6.1 through TP 6.6
  ['TP 6.1', 'TP 6.2', 'TP 6.3', 'TP 6.4', 'TP 6.5', 'TP 6.6'].forEach((tpCode) => {
    const tpRows = students.map((s, idx) => {
      const prog = progressMap[s.id];
      const tpDet = prog?.tpProgress?.[tpCode];
      return {
        No: idx + 1,
        'Nama Siswa': s.fullName,
        'Materi Selesai': tpDet?.materialCompleted ? 'Ya' : 'Belum',
        'Formatif 1': tpDet?.formatif1Score || 0,
        'Formatif 2': tpDet?.formatif2Score || 0,
        'Formatif 3': tpDet?.formatif3Score || 0,
        'Nilai Sumatif': tpDet?.sumatifScore || 0,
        'Tugas Dikirim': tpDet?.tugasSubmitted ? 'Ya' : 'Belum',
        'Refleksi Diisi': tpDet?.refleksiSubmitted ? 'Ya' : 'Belum',
        'Nilai Akhir TP': tpDet?.finalScore || 0,
        'Kategori KKTP': tpDet ? getKKTPLabel(tpDet.kktpCategory) : 'BB',
        'Status Tuntas': tpDet?.isCompleted ? 'Tuntas' : 'Belum',
      };
    });
    const wsTP = XLSX.utils.json_to_sheet(tpRows);
    XLSX.utils.book_append_sheet(wb, wsTP, tpCode);
  });

  // 9. Sheet HASIL PEKERJAAN
  const hasilRows = submissions.map((sub, idx) => ({
    No: idx + 1,
    'Nama Siswa': sub.studentName,
    TP: sub.tpCode,
    'Jenis Asesmen': sub.assessmentType.toUpperCase(),
    'Skor Diperoleh': sub.totalScore,
    'Skor Maksimal': sub.maxScore,
    'Nilai (0-100)': sub.finalGrade,
    Kategori: sub.kktpCategory,
    'Tanggal Kirim': new Date(sub.submittedAt).toLocaleString('id-ID'),
    'Catatan Guru': sub.teacherNotes || '-',
  }));
  const wsHasil = XLSX.utils.json_to_sheet(hasilRows.length > 0 ? hasilRows : [{ Catatan: 'Belum ada submission' }]);
  XLSX.utils.book_append_sheet(wb, wsHasil, 'HASIL PEKERJAAN');

  // 10. Sheet ANALISIS TP
  const analisisRows = ['TP 6.1', 'TP 6.2', 'TP 6.3', 'TP 6.4', 'TP 6.5', 'TP 6.6'].map((tpCode) => {
    let completedCount = 0;
    let scores: number[] = [];
    let bb = 0;
    let mb = 0;
    let bsh = 0;
    let sb = 0;

    students.forEach((s) => {
      const tpDet = progressMap[s.id]?.tpProgress?.[tpCode];
      if (tpDet) {
        if (tpDet.isCompleted) completedCount++;
        if (tpDet.finalScore > 0) {
          scores.push(tpDet.finalScore);
          if (tpDet.kktpCategory === 'SB') sb++;
          else if (tpDet.kktpCategory === 'BSH') bsh++;
          else if (tpDet.kktpCategory === 'MB') mb++;
          else bb++;
        }
      }
    });

    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const pct = Math.round((completedCount / students.length) * 100);

    return {
      'Kode TP': tpCode,
      'Total Siswa': students.length,
      'Siswa Selesai': completedCount,
      'Siswa Belum': students.length - completedCount,
      'Nilai Tertinggi': highest,
      'Nilai Terendah': lowest,
      'Rata-rata': avg,
      'Jumlah BB': bb,
      'Jumlah MB': mb,
      'Jumlah BSH': bsh,
      'Jumlah SB': sb,
      'Persentase Ketuntasan': `${pct}%`,
    };
  });
  const wsAnalisis = XLSX.utils.json_to_sheet(analisisRows);
  XLSX.utils.book_append_sheet(wb, wsAnalisis, 'ANALISIS TP');

  // Generate and download
  XLSX.writeFile(wb, `LMS_IPAS_KELAS_VI_REKAP_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// PDF Helper Header
function addPdfHeader(doc: jsPDF, title: string, settings: AppSettings) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.schoolName, doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mata Pelajaran: ${settings.subject} | Kelas: ${settings.className} | Fase: ${settings.phase}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
  doc.text(`Semester: ${settings.semester} | Tahun Pelajaran: ${settings.academicYear}`, doc.internal.pageSize.getWidth() / 2, 27, { align: 'center' });
  doc.text(`Guru Pengampu: ${settings.teacherName}`, doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });

  doc.setLineWidth(0.8);
  doc.line(14, 35, doc.internal.pageSize.getWidth() - 14, 35);
  doc.setLineWidth(0.2);
  doc.line(14, 36.5, doc.internal.pageSize.getWidth() - 14, 36.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 44, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, doc.internal.pageSize.getWidth() - 14, 49, { align: 'right' });
}

// 1. Download Rekap Nilai PDF
export function downloadRekapNilaiPdf(
  students: User[],
  progressMap: { [studentId: string]: StudentProgress },
  settings: AppSettings
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addPdfHeader(doc, 'REKAPITULASI NILAI IPAS KELAS VI SEMESTER 1', settings);

  const head = [['No', 'Nama Lengkap Siswa', 'TP 6.1', 'TP 6.2', 'TP 6.3', 'TP 6.4', 'TP 6.5', 'TP 6.6', 'Rata-rata', 'Kategori KKTP', 'Progress']];
  const body = students.map((s, idx) => {
    const prog = progressMap[s.id];
    return [
      idx + 1,
      s.fullName,
      prog?.tpProgress?.['TP 6.1']?.finalScore || 0,
      prog?.tpProgress?.['TP 6.2']?.finalScore || 0,
      prog?.tpProgress?.['TP 6.3']?.finalScore || 0,
      prog?.tpProgress?.['TP 6.4']?.finalScore || 0,
      prog?.tpProgress?.['TP 6.5']?.finalScore || 0,
      prog?.tpProgress?.['TP 6.6']?.finalScore || 0,
      prog?.averageScore || 0,
      prog ? prog.kktpCategory : 'BB',
      prog ? `${prog.overallProgressPercent}%` : '0%',
    ];
  });

  autoTable(doc, {
    startY: 53,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [15, 76, 129], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 55 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center', fontStyle: 'bold' },
      9: { halign: 'center', fontStyle: 'bold' },
      10: { halign: 'center' },
    },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  doc.save(`Rekap_Nilai_IPAS_Kelas_VI_${settings.academicYear.replace('/', '-')}.pdf`);
}

// 2. Download Analisis TP PDF
export function downloadAnalisisTpPdf(
  students: User[],
  progressMap: { [studentId: string]: StudentProgress },
  settings: AppSettings
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addPdfHeader(doc, 'ANALISIS KETERCAPAIAN TUJUAN PEMBELAJARAN (TP)', settings);

  const tps = ['TP 6.1', 'TP 6.2', 'TP 6.3', 'TP 6.4', 'TP 6.5', 'TP 6.6'];
  const head = [['Kode TP', 'Siswa Tuntas', 'Rata-rata', 'Nilai Tertinggi', 'Nilai Terendah', 'BB', 'MB', 'BSH', 'SB', '% Tuntas']];
  const body = tps.map((tpCode) => {
    let completed = 0;
    let scores: number[] = [];
    let bb = 0;
    let mb = 0;
    let bsh = 0;
    let sb = 0;

    students.forEach((s) => {
      const tpDet = progressMap[s.id]?.tpProgress?.[tpCode];
      if (tpDet) {
        if (tpDet.isCompleted) completed++;
        if (tpDet.finalScore > 0) {
          scores.push(tpDet.finalScore);
          if (tpDet.kktpCategory === 'SB') sb++;
          else if (tpDet.kktpCategory === 'BSH') bsh++;
          else if (tpDet.kktpCategory === 'MB') mb++;
          else bb++;
        }
      }
    });

    const high = scores.length > 0 ? Math.max(...scores) : 0;
    const low = scores.length > 0 ? Math.min(...scores) : 0;
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const pct = Math.round((completed / students.length) * 100);

    return [tpCode, `${completed}/${students.length}`, avg, high, low, bb, mb, bsh, sb, `${pct}%`];
  });

  autoTable(doc, {
    startY: 53,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [44, 82, 130], halign: 'center' },
    styles: { fontSize: 9, halign: 'center' },
  });

  doc.save(`Analisis_TP_IPAS_Kelas_VI_${settings.academicYear.replace('/', '-')}.pdf`);
}

// 3. Download Nilai Individu Siswa PDF
export function downloadNilaiIndividuPdf(
  student: User,
  prog: StudentProgress | undefined,
  settings: AppSettings
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addPdfHeader(doc, 'LEMBAR LAPORAN CAPAIAN BELAJAR SISWA', settings);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nama Siswa   : ${student.fullName}`, 14, 55);
  doc.text(`Username      : ${student.username}`, 14, 60);
  doc.text(`Kelas / Fase  : ${settings.className} / ${settings.phase}`, 14, 65);
  doc.text(`Rata-rata Nilai: ${prog?.averageScore || 0} (${getKKTPLabel(prog?.kktpCategory || 'BB')})`, 120, 55);
  doc.text(`Progress Belajar: ${prog?.overallProgressPercent || 0}%`, 120, 60);

  const tps = ['TP 6.1', 'TP 6.2', 'TP 6.3', 'TP 6.4', 'TP 6.5', 'TP 6.6'];
  const head = [['Kode', 'Tujuan Pembelajaran', 'Formatif 1', 'Formatif 2', 'Formatif 3', 'Sumatif', 'Nilai TP', 'Kategori', 'Status']];
  const body = tps.map((code) => {
    const tpDet = prog?.tpProgress?.[code];
    return [
      code,
      code === 'TP 6.1' ? 'Organ tubuh & fungsi' :
      code === 'TP 6.2' ? 'Hubungan fungsi & kesehatan' :
      code === 'TP 6.3' ? 'Upaya menjaga kesehatan' :
      code === 'TP 6.4' ? 'Refleksi hidup sehat' :
      code === 'TP 6.5' ? 'Latar belakang penjajahan' : 'Perjuangan pahlawan',
      tpDet?.formatif1Score || 0,
      tpDet?.formatif2Score || 0,
      tpDet?.formatif3Score || 0,
      tpDet?.sumatifScore || 0,
      tpDet?.finalScore || 0,
      tpDet?.kktpCategory || 'BB',
      tpDet?.isCompleted ? 'Tuntas' : 'Belum',
    ];
  });

  autoTable(doc, {
    startY: 72,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175], halign: 'center' },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 50 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center', fontStyle: 'bold' },
      7: { halign: 'center', fontStyle: 'bold' },
      8: { halign: 'center' },
    },
  });

  doc.save(`Rapor_IPAS_${student.username.replace(/\s+/g, '_')}.pdf`);
}

// 4. Download Hasil Pekerjaan Siswa PDF
export function downloadHasilPekerjaanPdf(
  submissions: AssessmentSubmission[],
  settings: AppSettings
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addPdfHeader(doc, 'REKAP HASIL PEKERJAAN & ASESMEN SISWA', settings);

  const head = [['No', 'Nama Siswa', 'TP', 'Jenis Asesmen', 'Skor Diperoleh', 'Skor Maks', 'Nilai', 'Kategori', 'Waktu Submit', 'Status']];
  const body = submissions.map((sub, idx) => [
    idx + 1,
    sub.studentName,
    sub.tpCode,
    sub.assessmentType.toUpperCase().replace('_', ' '),
    sub.totalScore,
    sub.maxScore,
    sub.finalGrade,
    sub.kktpCategory,
    new Date(sub.submittedAt).toLocaleString('id-ID'),
    sub.status === 'dinilai' ? 'Dinilai Guru' : 'Selesai Otomatis',
  ]);

  autoTable(doc, {
    startY: 53,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], halign: 'center' },
    styles: { fontSize: 8, halign: 'center' },
    columnStyles: { 1: { halign: 'left' } },
  });

  doc.save(`Hasil_Pekerjaan_Siswa_${settings.academicYear.replace('/', '-')}.pdf`);
}

// 5. Download Progress Siswa PDF
export function downloadProgressSiswaPdf(
  students: User[],
  progressMap: { [studentId: string]: StudentProgress },
  settings: AppSettings
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addPdfHeader(doc, 'LEMBAR PEMANTAUAN PROGRES BELAJAR SISWA', settings);

  const head = [['No', 'Nama Siswa', 'Username', 'Progress Total', 'TP Tuntas', 'Rata-rata', 'Kategori', 'Aktivitas Terakhir']];
  const body = students.map((s, idx) => {
    const prog = progressMap[s.id];
    return [
      idx + 1,
      s.fullName,
      s.username,
      prog ? `${prog.overallProgressPercent}%` : '0%',
      prog ? `${prog.completedTPCount} / 6` : '0 / 6',
      prog?.averageScore || 0,
      prog?.kktpCategory || 'BB',
      prog?.lastActive ? new Date(prog.lastActive).toLocaleDateString('id-ID') : 'Belum aktif',
    ];
  });

  autoTable(doc, {
    startY: 53,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [13, 148, 136], halign: 'center' },
    styles: { fontSize: 8, halign: 'center' },
    columnStyles: { 1: { halign: 'left' }, 2: { halign: 'left' } },
  });

  doc.save(`Progress_Belajar_Siswa_${settings.academicYear.replace('/', '-')}.pdf`);
}
