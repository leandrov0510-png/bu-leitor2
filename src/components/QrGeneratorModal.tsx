import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Download, Play, Layers, CheckCircle2, Sparkles } from 'lucide-react';

interface QrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateScan: (rawQrText: string) => void;
}

export const QrGeneratorModal: React.FC<QrGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSimulateScan
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [preset, setPreset] = useState<'sp_capital' | 'sp_campinas' | 'sp_santos' | 'sp_multipart'>('sp_capital');
  const [currentPart, setCurrentPart] = useState<number>(1);
  const [totalParts, setTotalParts] = useState<number>(1);
  const [qrText, setQrText] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Generate payload based on São Paulo (SP) presets
  useEffect(() => {
    if (!isOpen) return;

    if (preset === 'sp_capital') {
      setTotalParts(1);
      setCurrentPart(1);
      const payload = [
        'VRQR:02.00',
        'VRUE:08.26.00',
        'PLEI:ELEIÇÕES GERAIS 2026',
        'FASE:1',
        'UNFE:SP',
        'MUNI:71072 (SÃO PAULO)',
        'ZONA:0001',
        'SECA:0088',
        'IDUE:01984201',
        'IDCM:98127394',
        'DHGE:04/10/2026 17:03:10',
        'DHEM:04/10/2026 17:00:00',
        'APTO:390',
        'COMP:330',
        'ABST:60',
        'HASH:SHA256:4C8F9A1D2E3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A7B8C9D',
        'CARG:6',
        'CAND:2200:152',
        'CAND:5050:78',
        'CAND:4444:45',
        'CAND:1300:32',
        'CAND:1515:18',
        'BRANCO:3',
        'NULO:2',
        'CARG:1',
        'CAND:22:172',
        'CAND:13:132',
        'CAND:30:18',
        'BRANCO:4',
        'NULO:4'
      ].join('\n');
      setQrText(payload);
    } else if (preset === 'sp_campinas') {
      setTotalParts(1);
      setCurrentPart(1);
      const payload = [
        'VRQR:02.00',
        'VRUE:08.26.00',
        'PLEI:ELEIÇÕES GERAIS 2026',
        'FASE:1',
        'UNFE:SP',
        'MUNI:62910 (CAMPINAS)',
        'ZONA:0010',
        'SECA:0055',
        'IDUE:02491201',
        'IDCM:89102934',
        'DHGE:04/10/2026 17:03:45',
        'DHEM:04/10/2026 17:00:00',
        'APTO:388',
        'COMP:326',
        'ABST:62',
        'HASH:SHA256:5D9A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A',
        'CARG:6',
        'CAND:2200:154',
        'CAND:4444:58',
        'CAND:5050:54',
        'CAND:1300:36',
        'CAND:1515:20',
        'BRANCO:2',
        'NULO:2'
      ].join('\n');
      setQrText(payload);
    } else if (preset === 'sp_santos') {
      setTotalParts(1);
      setCurrentPart(1);
      const payload = [
        'VRQR:02.00',
        'VRUE:08.26.00',
        'PLEI:ELEIÇÕES GERAIS 2026',
        'FASE:1',
        'UNFE:SP',
        'MUNI:70971 (SANTOS)',
        'ZONA:0003',
        'SECA:0019',
        'IDUE:03102919',
        'IDCM:99201934',
        'DHGE:04/10/2026 17:04:40',
        'DHEM:04/10/2026 17:00:00',
        'APTO:390',
        'COMP:325',
        'ABST:65',
        'HASH:SHA256:9F8E7D6C5B4A3B2C1D0E9F8A7B6C5D4E3F2A1B0C9D8E7F6A5B4C3D2E1F0A9B8C',
        'CARG:6',
        'CAND:2200:158',
        'CAND:5050:68',
        'CAND:4444:48',
        'CAND:1300:32',
        'BRANCO:2',
        'NULO:2'
      ].join('\n');
      setQrText(payload);
    } else if (preset === 'sp_multipart') {
      setTotalParts(2);
      if (currentPart === 1) {
        const p1 = [
          'QRBU:1:2',
          'VRQR:02.00',
          'VRUE:08.26.00',
          'PLEI:ELEIÇÕES GERAIS 2026',
          'FASE:1',
          'UNFE:SP',
          'MUNI:71072 (SÃO PAULO)',
          'ZONA:0002',
          'SECA:0125',
          'IDUE:01889922',
          'APTO:400',
          'COMP:330',
          'ABST:70',
          'HASH:SHA256:9F8E7D6C5B4A3B2C1D0E9F8A7B6C5D4E3F2A1B0C9D8E7F6A5B4C3D2E1F0A9B8C',
          'CARG:6',
          'CAND:2200:162',
          'CAND:5050:70',
          'CAND:4444:50',
          'CAND:1300:35',
          'BRANCO:3',
          'NULO:2'
        ].join('\n');
        setQrText(p1);
      } else {
        const p2 = [
          'QRBU:2:2',
          'UNFE:SP',
          'MUNI:71072 (SÃO PAULO)',
          'ZONA:0002',
          'SECA:0125',
          'HASH:SHA256:9F8E7D6C5B4A3B2C1D0E9F8A7B6C5D4E3F2A1B0C9D8E7F6A5B4C3D2E1F0A9B8C',
          'CARG:1',
          'CAND:22:175',
          'CAND:13:135',
          'CAND:30:15',
          'BRANCO:3',
          'NULO:2'
        ].join('\n');
        setQrText(p2);
      }
    }
  }, [isOpen, preset, currentPart]);

  // Render QR Code on canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !qrText) return;

    QRCode.toCanvas(canvasRef.current, qrText, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }, (err) => {
      if (err) console.error('Falha ao renderizar QR no canvas:', err);
    });
  }, [isOpen, qrText]);

  if (!isOpen) return null;

  function handleSimulate() {
    onSimulateScan(qrText);
    setStatusMsg('Código de São Paulo enviado para o Leitor!');
    setTimeout(() => setStatusMsg(null), 2500);
  }

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `QR_TSE_SP_2026_${preset}_P${currentPart}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-white">Gerador de QR Code TSE • São Paulo</h3>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded border border-emerald-500/30">
                  SP 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">Gere QR Codes de seções de SP para teste com câmera ou envio direto</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Selector for SP */}
        <div className="space-y-3 mb-4">
          <label className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Selecione a Seção Eleitoral de São Paulo:</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setPreset('sp_capital'); setCurrentPart(1); }}
              className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition ${
                preset === 'sp_capital'
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span className="font-bold block text-white">São Paulo Capital (Z-001)</span>
              <span className="text-[10px] text-slate-400">Dep. Federal Alvo: 152 votos</span>
            </button>

            <button
              onClick={() => { setPreset('sp_campinas'); setCurrentPart(1); }}
              className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition ${
                preset === 'sp_campinas'
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span className="font-bold block text-white">Campinas / SP (Z-010)</span>
              <span className="text-[10px] text-slate-400">Dep. Federal Alvo: 154 votos</span>
            </button>

            <button
              onClick={() => { setPreset('sp_santos'); setCurrentPart(1); }}
              className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition ${
                preset === 'sp_santos'
                  ? 'bg-amber-600/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span className="font-bold block text-white">Santos / SP (Z-003)</span>
              <span className="text-[10px] text-slate-400">Dep. Federal Alvo: 158 votos</span>
            </button>

            <button
              onClick={() => { setPreset('sp_multipart'); setCurrentPart(1); }}
              className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition ${
                preset === 'sp_multipart'
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span className="font-bold block text-white">SP Multipart (2 Partes)</span>
              <span className="text-[10px] text-slate-400">Seção 0125 com 2 QR Codes</span>
            </button>
          </div>
        </div>

        {/* Multipart Switcher if applicable */}
        {totalParts > 1 && (
          <div className="flex items-center justify-between p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl mb-4 text-xs">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Boletim Multipart SP: Parte {currentPart} de {totalParts}</span>
            </span>

            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPart(1)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  currentPart === 1 ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                Parte 1
              </button>
              <button
                onClick={() => setCurrentPart(2)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  currentPart === 2 ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                Parte 2
              </button>
            </div>
          </div>
        )}

        {/* QR Code Canvas Display Box */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner mb-4">
          <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
          <span className="text-[11px] text-slate-600 font-mono mt-1 text-center font-bold">
            QR Code Oficial de Urna do Estado de São Paulo (SP)
          </span>
        </div>

        {/* Notification message */}
        {statusMsg && (
          <div className="mb-4 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
          >
            <Play className="w-4 h-4" />
            <span>Testar Leitura Direta no Scanner</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
            title="Baixar imagem PNG do QR"
          >
            <Download className="w-4 h-4 text-blue-400" />
          </button>
        </div>

      </div>
    </div>
  );
};
