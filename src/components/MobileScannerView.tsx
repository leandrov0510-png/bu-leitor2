import React, { useState } from 'react';
import { 
  Camera, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  MapPin, 
  Users, 
  ChevronRight, 
  CloudCheck, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { BoletimDeUrna, UserSession } from '../types';
import { QrCameraScanner } from './QrCameraScanner';

interface MobileScannerViewProps {
  onScanSuccess: (decodedText: string) => void;
  savedBus: BoletimDeUrna[];
  onSelectBu: (bu: BoletimDeUrna) => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  isOnline: boolean;
  userSession: UserSession;
  multiPartProgress?: {
    current: number;
    total: number;
    key?: string;
  } | null;
  lastScannedBu: BoletimDeUrna | null;
  onClearLastScanned: () => void;
}

export const MobileScannerView: React.FC<MobileScannerViewProps> = ({
  onScanSuccess,
  savedBus,
  onSelectBu,
  onSyncAll,
  isSyncing,
  isOnline,
  userSession,
  multiPartProgress,
  lastScannedBu,
  onClearLastScanned
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'storage' | 'sync'>('camera');

  const pendingCount = savedBus.filter(b => b.syncStatus !== 'synced').length;
  const syncedCount = savedBus.filter(b => b.syncStatus === 'synced').length;

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-4rem)] flex flex-col bg-slate-900 border-x border-slate-800 shadow-2xl pb-16">
      
      {/* Mobile Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Coletor Móvel Android</h2>
              <p className="text-[11px] text-slate-400">Auditoria Eleitoral em Campo</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-full border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-400'}`} />
            <span className="text-[11px] font-semibold text-slate-300">
              {isOnline ? 'Conectado' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Quick KPI pills */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/50 text-center">
          <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50">
            <span className="block text-[10px] text-slate-400">BUs Lidos</span>
            <span className="text-sm font-black text-white">{savedBus.length}</span>
          </div>
          <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50">
            <span className="block text-[10px] text-slate-400">Pendentes</span>
            <span className="text-sm font-black text-amber-400">{pendingCount}</span>
          </div>
          <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50">
            <span className="block text-[10px] text-slate-400">Sincronizados</span>
            <span className="text-sm font-black text-emerald-400">{syncedCount}</span>
          </div>
        </div>
      </div>

      {/* Main View Content by Tab */}
      <div className="flex-1 p-4 flex flex-col">
        
        {/* TAB 1: CÂMERA SCANNER */}
        {activeTab === 'camera' && (
          <div className="flex-1 flex flex-col items-center">
            
            {/* Multi-part Progress Alert (When BU has 2+ QR codes) */}
            {multiPartProgress && multiPartProgress.total > 1 && (
              <div className="w-full mb-3 p-3 bg-blue-950/80 border border-blue-500/40 rounded-xl text-blue-200 shadow">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
                    <Layers className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span>Boletim Dividido em Múltiplos QR Codes</span>
                  </div>
                  <span className="text-xs font-bold bg-blue-500/30 px-2 py-0.5 rounded-full text-blue-200">
                    {multiPartProgress.current} / {multiPartProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-900/50 rounded-full h-2 overflow-hidden border border-blue-500/20">
                  <div 
                    className="bg-blue-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(multiPartProgress.current / multiPartProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-blue-300/80 mt-1.5">
                  Aponte a câmera para a próxima parte ({multiPartProgress.current + 1} de {multiPartProgress.total}) do boletim.
                </p>
              </div>
            )}

            {/* QR Scanner Component */}
            <QrCameraScanner
              onScanSuccess={onScanSuccess}
              isScanningActive={activeTab === 'camera'}
            />

            {/* Instruction Tip */}
            <div className="mt-4 p-3 bg-slate-800/70 border border-slate-700/60 rounded-xl w-full">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-white">Leitura Segura Offline:</span> Aponte para o QR Code impresso no rodapé do Boletim de Urna da seção eleitoral. Todos os dados são assinados digitalmente pela Urna Eletrônica do TSE.
                </div>
              </div>
            </div>

            {/* Post-Scan Quick Preview Card */}
            {lastScannedBu && (
              <div className="w-full mt-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-black uppercase text-emerald-300">BU Lido com Sucesso!</span>
                  </div>
                  <button 
                    onClick={onClearLastScanned}
                    className="text-xs text-emerald-400/80 hover:text-white"
                  >
                    Fechar
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Localidade</span>
                    <span className="font-bold text-white">{lastScannedBu.municipioNome} - {lastScannedBu.uf}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Zona / Seção</span>
                    <span className="font-bold text-white">Z-{lastScannedBu.zona} | S-{lastScannedBu.secao}</span>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2 rounded-lg">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Comparecimento</span>
                    <span className="font-semibold text-emerald-400">{lastScannedBu.comparecimento} eleitores</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Abstenção</span>
                    <span className="font-semibold text-amber-400">{lastScannedBu.abstencao} eleitores</span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onSelectBu(lastScannedBu)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver Espelho Completo</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: ARMAZENAMENTO OFFLINE (IndexedDB) */}
        {activeTab === 'storage' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Armazenamento Local (IndexedDB)</h3>
                <p className="text-xs text-slate-400">Banco de dados no dispositivo</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-bold">
                {savedBus.length} {savedBus.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {savedBus.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-800/30 rounded-2xl border border-slate-800">
                <HardDrive className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-300">Nenhum BU armazenado localmente</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                  Use a aba Câmera para escanear os QR Codes dos Boletins de Urna impressos.
                </p>
                <button
                  onClick={() => setActiveTab('camera')}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  Abrir Scanner de Câmera
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {savedBus.map((bu) => (
                  <div
                    key={bu.id}
                    onClick={() => onSelectBu(bu)}
                    className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl cursor-pointer transition flex items-center justify-between group shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">
                          Seção {bu.secao}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Zona {bu.zona}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 font-bold border border-slate-700">
                          {bu.uf}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                        <span>{bu.municipioNome}</span>
                        <span>•</span>
                        <span>{bu.comparecimento} votos</span>
                      </div>

                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Gerado: {bu.dataHoraGeracao}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      {bu.syncStatus === 'synced' ? (
                        <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Sincronizado na Nuvem">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="p-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Pendente de Envio">
                          <AlertCircle className="w-4 h-4" />
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SINCRONIZAÇÃO */}
        {activeTab === 'sync' && (
          <div className="flex-1 flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Sincronização em Nuvem</h3>
              <p className="text-xs text-slate-400">Envio para servidor central de totalização</p>
            </div>

            {/* Sync Status Card */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                <span className="text-xs font-bold text-slate-300">Conectividade Atual</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {isOnline ? 'Rede Ativa (Online)' : 'Sem Internet (Offline)'}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Total de BUs no Aparelho:</span>
                  <span className="font-bold text-white">{savedBus.length}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Enviados com Sucesso:</span>
                  <span className="font-bold text-emerald-400">{syncedCount}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Aguardando Sincronização:</span>
                  <span className="font-bold text-amber-400">{pendingCount}</span>
                </div>
              </div>

              <button
                onClick={onSyncAll}
                disabled={isSyncing || savedBus.length === 0}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg transition"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando com a Nuvem...' : 'Sincronizar Todos os BUs Agora'}</span>
              </button>
            </div>

            {/* Offline-First explanation */}
            <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-xs text-slate-400 leading-relaxed">
              <h4 className="font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Como funciona o modo Offline</span>
              </h4>
              <p>
                Mesmo sem sinal de internet ou sinal de celular na seção eleitoral, todos os BUs capturados são armazenados de forma segura e criptografada no banco IndexedDB do navegador.
              </p>
              <p className="mt-2">
                Assim que você retornar à conexão Wi-Fi ou dados móveis, basta tocar no botão acima para sincronizar todos os votos com a central.
              </p>
            </div>

          </div>
        )}

      </div>

      {/* Android Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-4 py-2 z-30">
        <div className="grid grid-cols-3 gap-2">
          
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeTab === 'camera' 
                ? 'text-emerald-400 bg-emerald-500/10 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Câmera</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition relative ${
              activeTab === 'storage' 
                ? 'text-emerald-400 bg-emerald-500/10 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Offline</span>
            {savedBus.length > 0 && (
              <span className="absolute top-1 right-6 w-4 h-4 bg-emerald-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center">
                {savedBus.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition relative ${
              activeTab === 'sync' 
                ? 'text-emerald-400 bg-emerald-500/10 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className={`w-5 h-5 mb-0.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="text-[10px]">Sync</span>
            {pendingCount > 0 && (
              <span className="absolute top-1 right-6 w-4 h-4 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>

        </div>
      </div>

    </div>
  );
};
