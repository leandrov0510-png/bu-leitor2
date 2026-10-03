import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Layers,
  Ban,
  RotateCcw
} from 'lucide-react';
import { BoletimDeUrna } from '../types';
import { QrCameraScanner } from './QrCameraScanner';

interface FiscalScannerViewProps {
  onBackHome: () => void;
  onScanRaw: (text: string) => void;
  scannedBu: BoletimDeUrna | null;
  duplicateError?: string | null;
  onConfirmAndSend: (bu: BoletimDeUrna, fiscalNome: string) => Promise<boolean>;
  isSending: boolean;
  multiPartProgress?: {
    current: number;
    total: number;
    key?: string;
  } | null;
  onResetScan: () => void;
}

export const FiscalScannerView: React.FC<FiscalScannerViewProps> = ({
  onBackHome,
  onScanRaw,
  scannedBu,
  duplicateError,
  onConfirmAndSend,
  isSending,
  multiPartProgress,
  onResetScan
}) => {
  const [fiscalNome, setFiscalNome] = useState('');
  const [hasSentSuccess, setHasSentSuccess] = useState(false);
  const [lastSentBu, setLastSentBu] = useState<BoletimDeUrna | null>(null);

  // Check if scanned BU belongs to SP
  const isFromSaoPaulo = scannedBu ? scannedBu.uf.toUpperCase() === 'SP' : false;

  async function handleSend() {
    if (!scannedBu || !isFromSaoPaulo || duplicateError) return;
    const ok = await onConfirmAndSend(scannedBu, fiscalNome.trim() || 'Fiscal Voluntário SP');
    if (ok) {
      setLastSentBu(scannedBu);
      setHasSentSuccess(true);
    }
  }

  function handleScanNext() {
    setHasSentSuccess(false);
    setLastSentBu(null);
    onResetScan();
  }

  return (
    <div className="max-w-lg mx-auto min-h-[calc(100vh-4rem)] p-4 sm:p-6 flex flex-col justify-between">
      
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <button
            onClick={onBackHome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="text-right">
            <span className="text-xs font-black text-white block">MODO COLETOR DE CAMPO</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Estado de São Paulo (SP)</span>
          </div>
        </div>

        {/* Fiscal Name Identifier */}
        {!hasSentSuccess && !scannedBu && (
          <div className="mb-4 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <label className="text-[11px] font-bold text-slate-400 block mb-1">
              Seu Nome / Identificação do Fiscal (Opcional):
            </label>
            <input
              type="text"
              value={fiscalNome}
              onChange={(e) => setFiscalNome(e.target.value)}
              placeholder="Ex: Carlos Silva (Fiscal de Seção SP)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {/* Multi-part Progress Alert */}
        {multiPartProgress && multiPartProgress.total > 1 && !hasSentSuccess && (
          <div className="mb-4 p-3 bg-blue-950/80 border border-blue-500/40 rounded-2xl text-blue-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Boletim com Múltiplos QR Codes</span>
              </span>
              <span className="text-xs font-black bg-blue-500/30 px-2 py-0.5 rounded-full">
                {multiPartProgress.current} de {multiPartProgress.total}
              </span>
            </div>
            <div className="w-full bg-blue-900/50 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${(multiPartProgress.current / multiPartProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-blue-300/80 mt-1.5">
              Aponte agora para a próxima parte ({multiPartProgress.current + 1} de {multiPartProgress.total}) do boletim impresso.
            </p>
          </div>
        )}

        {/* STATE 1: SUCCESS CONFIRMATION OF SENT BU */}
        {hasSentSuccess && lastSentBu ? (
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Boletim Enviado com Sucesso!</h3>
              <p className="text-xs text-slate-400 mt-1">
                A urna foi transmitida e registrada na central de apuração de São Paulo.
              </p>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-xs space-y-2 text-left">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Município:</span>
                <span className="font-bold text-white">{lastSentBu.municipioNome} (SP)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Zona Eleitoral:</span>
                <span className="font-bold text-white">Zona {lastSentBu.zona}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Seção Eleitoral:</span>
                <span className="font-bold text-white">Seção {lastSentBu.secao}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Urna ID:</span>
                <span className="font-mono text-slate-200">{lastSentBu.idUrna}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-400">Comparecimento:</span>
                <span className="font-bold text-emerald-400">{lastSentBu.comparecimento} eleitores</span>
              </div>
            </div>

            <button
              onClick={handleScanNext}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-xl transition"
            >
              <Camera className="w-5 h-5" />
              <span>Escanear Próxima Urna</span>
            </button>
          </div>
        ) : scannedBu ? (
          /* STATE 2: SCANNED - REVIEW & SEND BUTTON */
          <div className="space-y-4">
            
            {/* If from another state, block sending */}
            {!isFromSaoPaulo ? (
              <div className="bg-rose-950/80 border-2 border-rose-500 rounded-3xl p-5 text-center space-y-3 shadow-xl">
                <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
                <h3 className="text-base font-black text-white">Urna Não Pertence a São Paulo!</h3>
                <p className="text-xs text-rose-200 leading-relaxed">
                  Este sistema é restrito à apuração do <strong>Estado de São Paulo (SP)</strong>. O Boletim lido pertence ao estado de <strong>{scannedBu.uf}</strong> ({scannedBu.municipioNome}).
                </p>
                <button
                  onClick={onResetScan}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  Tentar Novamente com Urna de SP
                </button>
              </div>
            ) : duplicateError ? (
              /* DUPLICATE DETECTED AND BLOCKED */
              <div className="bg-gradient-to-b from-rose-950/90 to-slate-900 border-2 border-rose-500 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-rose-500/20 border-2 border-rose-500 rounded-full flex items-center justify-center mx-auto text-rose-400">
                  <Ban className="w-9 h-9" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">QR Code Duplicado Rejeitado!</h3>
                  <p className="text-xs text-rose-200 mt-1 font-semibold leading-relaxed">
                    {duplicateError}
                  </p>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-2xl border border-rose-500/30 text-xs text-slate-300 space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Seção Lida:</span>
                    <span className="font-bold text-white">Seção {scannedBu.secao} (Zona {scannedBu.zona})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Município:</span>
                    <span className="font-bold text-white">{scannedBu.municipioNome} - SP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Urna ID:</span>
                    <span className="font-mono text-white">{scannedBu.idUrna}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 text-[11px] text-amber-300">
                    O sistema de integridade impede votos duplicados de uma mesma urna física.
                  </div>
                </div>

                <button
                  onClick={onResetScan}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>Escanear Outro QR Code</span>
                </button>
              </div>
            ) : (
              /* Valid SP BU Ready to Send */
              <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-black text-white uppercase">Boletim Inédito de SP Identificado</span>
                  </div>
                  <button
                    onClick={onResetScan}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Trocar Urna
                  </button>
                </div>

                {/* Section details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Município</span>
                    <span className="font-bold text-white text-sm">{scannedBu.municipioNome} - SP</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Zona / Seção</span>
                    <span className="font-bold text-white text-sm">Z-{scannedBu.zona} | S-{scannedBu.secao}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Identificação da Urna:</span>
                    <span className="font-mono text-white">{scannedBu.idUrna}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Comparecimento da Seção:</span>
                    <span className="font-bold text-emerald-400">{scannedBu.comparecimento} eleitores</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Data/Hora da Emissão:</span>
                    <span className="text-slate-400">{scannedBu.dataHoraGeracao}</span>
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Boletim oficial validado. Clique abaixo para enviar à central de apuração.</span>
                </div>

                {/* Primary Action Button: SEND */}
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl transition"
                >
                  <Send className={`w-5 h-5 ${isSending ? 'animate-pulse' : ''}`} />
                  <span>{isSending ? 'Enviando para Central...' : 'Confirmar e Enviar Boletim'}</span>
                </button>
              </div>
            )}

          </div>
        ) : (
          /* STATE 3: LIVE CAMERA SCANNER VIEW */
          <div className="space-y-4">
            <QrCameraScanner
              onScanSuccess={onScanRaw}
              isScanningActive={true}
            />

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Aponte para o QR Code impresso no pé do papel do Boletim de Urna da sua seção em São Paulo. O sistema valida a autenticidade e impede duplicatas.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-6 text-center text-[11px] text-slate-500">
        Eleições Gerais 2026 • Auditoria & Coleta Exclusiva de São Paulo (SP)
      </div>

    </div>
  );
};
