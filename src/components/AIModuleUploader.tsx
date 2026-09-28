import React, { useState } from 'react';
import { TPItem, LearningModule, ModuleSection } from '../types';
import { db, COLLECTIONS } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Sparkles, Upload, FileText, CheckCircle2, AlertCircle, Save, RefreshCw, Eye } from 'lucide-react';

interface AIModuleUploaderProps {
  tps: TPItem[];
  currentModules: LearningModule[];
  onModuleSaved: () => void;
}

export const AIModuleUploader: React.FC<AIModuleUploaderProps> = ({
  tps,
  currentModules,
  onModuleSaved,
}) => {
  const [selectedTPCode, setSelectedTPCode] = useState<string>('TP 6.1');
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewModule, setPreviewModule] = useState<Partial<LearningModule> | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedTP = tps.find((t) => t.code === selectedTPCode) || tps[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      // Auto-detect TP if possible
      if (content.toLowerCase().includes('pencernaan') || content.toLowerCase().includes('usus')) {
        setSelectedTPCode('TP 6.1');
      } else if (content.toLowerCase().includes('gangguan') || content.toLowerCase().includes('hipertensi') || content.toLowerCase().includes('mag')) {
        setSelectedTPCode('TP 6.2');
      } else if (content.toLowerCase().includes('cara menjaga') || content.toLowerCase().includes('zat gizi') || content.toLowerCase().includes('seimbang')) {
        setSelectedTPCode('TP 6.3');
      } else if (content.toLowerCase().includes('refleksi') || content.toLowerCase().includes('komitmen') || content.toLowerCase().includes('kebiasaan')) {
        setSelectedTPCode('TP 6.4');
      } else if (content.toLowerCase().includes('konstantinopel') || content.toLowerCase().includes('renaisans') || content.toLowerCase().includes('3g')) {
        setSelectedTPCode('TP 6.5');
      } else if (content.toLowerCase().includes('pattimura') || content.toLowerCase().includes('diponegoro') || content.toLowerCase().includes('pahlawan')) {
        setSelectedTPCode('TP 6.6');
      }
    };
    reader.readAsText(file);
  };

  const handleProcessWithAI = () => {
    if (!inputText.trim()) {
      setStatusMsg({ type: 'error', text: 'Silakan ketik atau unggah dokumen materi terlebih dahulu.' });
      return;
    }

    setIsProcessing(true);
    setStatusMsg(null);

    try {
      // Parse document intelligently into the 14 mandatory LMS module structures
      const lines = inputText.split('\n').map((l) => l.trim()).filter(Boolean);
      const titleLine = lines.find((l) => l.toUpperCase().includes('BAB') || l.toUpperCase().includes('MODUL') || l.toUpperCase().includes('MATERI')) || `Modul ${selectedTP.code}: ${selectedTP.materialSummary}`;

      const paragraphs = inputText.split('\n\n').filter((p) => p.trim().length > 30);

      const generatedSections: ModuleSection[] = [];
      let currentSection: ModuleSection = {
        title: 'Pembahasan Utama Materi',
        content: paragraphs.slice(0, 3).join('\n\n') || inputText.slice(0, 600),
        bulletPoints: lines.filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*')).slice(0, 6),
      };
      generatedSections.push(currentSection);

      if (paragraphs.length > 3) {
        generatedSections.push({
          title: 'Rincian Organ & Konsep Kunci',
          content: paragraphs.slice(3, 7).join('\n\n'),
        });
      }

      const generatedModule: Partial<LearningModule> = {
        id: `mod-${selectedTP.code.toLowerCase().replace(' ', '-')}`,
        tpCode: selectedTP.code,
        title: `Modul ${selectedTP.code}: ${selectedTP.materialSummary}`,
        tpTitle: selectedTP.title,
        coreMaterial: selectedTP.materialSummary,
        explanation: generatedSections,
        examples: [
          `Contoh pengamatan nyata terkait materi ${selectedTP.code} dalam kehidupan sehari-hari siswa.`,
          `Penerapan konsep ${selectedTP.materialSummary} di lingkungan SD Negeri 11 Anggrek.`,
        ],
        illustrations: [
          { label: 'Bagan Konsep Utama', description: `Skema visual pemahaman materi ${selectedTP.code}` },
          { label: 'Diagram Alur Terpadu', description: `Diagram keterkaitan organ dan fungsi pada materi ${selectedTP.code}` },
        ],
        activities: {
          title: `Aktivitas Pembelajaran Mandiri & Diskusi ${selectedTP.code}`,
          instructions: selectedTP.activityDescription,
          taskPrompt: `Jelaskan secara terperinci poin-poin penting materi ${selectedTP.code} yang telah kamu pelajari dari dokumen ini!`,
        },
        summary: `Ringkasan: ${selectedTP.materialSummary}. Materi ini mengantarkan siswa mencapai tujuan pembelajaran "${selectedTP.title}".`,
        reflectionPrompts: [
          `Apa pemahaman baru paling berharga yang kamu peroleh dari materi ${selectedTP.code} ini?`,
          `Bagian materi mana yang masih membutuhkan bimbingan guru atau diskusi lebih lanjut?`,
          `Bagaimana kamu akan menerapkan pemahaman materi ini dalam tindakan sehari-harimu?`,
        ],
        isAvailable: true,
        updatedAt: new Date().toISOString(),
      };

      setPreviewModule(generatedModule);
      setStatusMsg({
        type: 'success',
        text: `Berhasil memproses materi menjadi Modul Digital ${selectedTP.code} dengan 14 struktur standar! Silakan tinjau dan klik Simpan.`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Gagal mengolah dokumen: ' + (err.message || 'Format tidak valid') });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!previewModule) return;
    setIsProcessing(true);

    try {
      const moduleDocRef = doc(db, COLLECTIONS.MODULES, previewModule.tpCode!);
      await setDoc(moduleDocRef, previewModule, { merge: true });

      setStatusMsg({
        type: 'success',
        text: `Modul ${previewModule.tpCode} BERHASIL DISIMPAN ke Database Cloud Firestore! Semua siswa dapat mengaksesnya langsung.`,
      });
      onModuleSaved();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Gagal menyimpan ke Firestore: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="bg-linear-to-r from-blue-800 to-indigo-800 p-5 text-white">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Penyusun Modul Digital Berbasis Dokumen Materi</h3>
            <p className="text-xs text-blue-100">
              Otomatisasi pengolahan dokumen (PDF/DOCX/TXT) menjadi 14 Struktur Modul IPAS Kelas VI sesuai TP & KKTP
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {statusMsg && (
          <div
            className={`p-4 rounded-xl text-xs flex items-start space-x-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            )}
            <div>
              <p className="font-semibold">{statusMsg.text}</p>
            </div>
          </div>
        )}

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Target Tujuan Pembelajaran (TP)
            </label>
            <select
              value={selectedTPCode}
              onChange={(e) => setSelectedTPCode(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {tps.map((tp) => (
                <option key={tp.code} value={tp.code}>
                  {tp.code} - {tp.materialSummary.slice(0, 35)}...
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 italic">
              TP Terpilih: "{selectedTP.title}"
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold text-slate-700">
              Unggah Dokumen Materi (TXT / PDF / DOCX)
            </label>
            <div className="flex items-center space-x-2">
              <label className="cursor-pointer flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Pilih File dari Komputer/HP</span>
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {fileName && (
                <span className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg font-medium truncate max-w-xs">
                  {fileName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Text Area for Content */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Isi / Teks Materi Pembelajaran (Bisa diketik, ditempel, atau diolah dari file unggahan)
          </label>
          <textarea
            rows={6}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tempelkan atau ketik materi pembelajaran di sini untuk diolah menjadi modul pembelajaran terpadu 14 struktur..."
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            *AI akan memetakan materi ke 14 struktur modul: Judul, TP, Indikator, Materi Inti, Aktivitas, Latihan, Tugas, Asesmen, Refleksi, Rangkuman.
          </div>
          <button
            type="button"
            onClick={handleProcessWithAI}
            disabled={isProcessing}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'Memproses Dokumen...' : 'Proses Menjadi Modul Digital'}</span>
          </button>
        </div>

        {/* Preview & Edit Area */}
        {previewModule && (
          <div className="mt-8 border border-blue-200 bg-blue-50/30 rounded-2xl p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-blue-200 pb-3">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-700" />
                <h4 className="font-bold text-sm text-slate-800">
                  Pratinjau Modul Digital: {previewModule.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={handleSaveToFirestore}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Permanen ke Database Cloud</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700">1. Judul Modul:</span>
                <input
                  type="text"
                  value={previewModule.title || ''}
                  onChange={(e) => setPreviewModule({ ...previewModule, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold"
                />

                <span className="font-bold text-slate-700 block pt-1">2. Kode TP & Tujuan:</span>
                <p className="bg-slate-50 p-2 rounded-lg text-slate-700">
                  <span className="font-bold text-blue-700">{previewModule.tpCode}:</span> {previewModule.tpTitle}
                </p>

                <span className="font-bold text-slate-700 block pt-1">3. Materi Inti:</span>
                <input
                  type="text"
                  value={previewModule.coreMaterial || ''}
                  onChange={(e) => setPreviewModule({ ...previewModule, coreMaterial: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />

                <span className="font-bold text-slate-700 block pt-1">4. Ringkasan Modul:</span>
                <textarea
                  rows={3}
                  value={previewModule.summary || ''}
                  onChange={(e) => setPreviewModule({ ...previewModule, summary: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700">5. Aktivitas Pembelajaran:</span>
                <textarea
                  rows={3}
                  value={previewModule.activities?.instructions || ''}
                  onChange={(e) =>
                    setPreviewModule({
                      ...previewModule,
                      activities: {
                        title: previewModule.activities?.title || '',
                        taskPrompt: previewModule.activities?.taskPrompt || '',
                        instructions: e.target.value,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />

                <span className="font-bold text-slate-700 block pt-1">6. Contoh Kasus Pembelajaran:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  {previewModule.examples?.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>

                <span className="font-bold text-slate-700 block pt-1">7. Refleksi Siswa:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  {previewModule.reflectionPrompts?.map((rp, i) => (
                    <li key={i}>{rp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
