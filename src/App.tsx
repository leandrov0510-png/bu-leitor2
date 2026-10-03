/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HomeSimplificada } from './components/HomeSimplificada';
import { FiscalScannerView } from './components/FiscalScannerView';
import { AdminSituationRoom } from './components/AdminSituationRoom';
import { BuReceiptModal } from './components/BuReceiptModal';
import { QrGeneratorModal } from './components/QrGeneratorModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { CloudSyncSettingsModal } from './components/CloudSyncSettingsModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { BoletimDeUrna, UserSession, SupabaseConfig, CandidatoFederalAlvo } from './types';
import { parseBoletimTse } from './parser';
import { extrairVotosCandidatoDoBu } from './services/tallyService';
import { 
  dbListarBoletins, 
  dbSalvarBoletim, 
  dbRemoverBoletim, 
  dbInicializarDadosExemplo,
  dbObterCandidatoAlvo,
  dbSalvarCandidatoAlvo,
  dbVerificarDuplicata,
  CANDIDATO_ALVO_DEFAULT
} from './db/database';
import { 
  obterConfiguracaoSupabase, 
  sincronizarBoletim, 
  sincronizarTodosPendentes 
} from './services/supabaseService';
import { soundService } from './services/soundService';
import { Vote, Cloud, CloudOff, Lock, Camera, X } from 'lucide-react';

export default function App() {
  // Routes: 'home' | 'scanner' | 'admin'
  const [currentRoute, setCurrentRoute] = useState<'home' | 'scanner' | 'admin'>('home');
  const [boletins, setBoletins] = useState<BoletimDeUrna[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Target candidate for Federal Deputy SP
  const [candidatoAlvo, setCandidatoAlvo] = useState<CandidatoFederalAlvo>(CANDIDATO_ALVO_DEFAULT);

  // Modals
  const [selectedBuReceipt, setSelectedBuReceipt] = useState<BoletimDeUrna | null>(null);
  const [isQrGeneratorOpen, setIsQrGeneratorOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState<boolean>(false);

  // Scanner state
  const [scannedBu, setScannedBu] = useState<BoletimDeUrna | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isSendingBu, setIsSendingBu] = useState<boolean>(false);
  const [multiPartProgress, setMultiPartProgress] = useState<{
    current: number;
    total: number;
    key?: string;
  } | null>(null);

  // Admin session
  const [userSession, setUserSession] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem('bu_leitor_admin_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      autenticado: false,
      nome: 'Administrador',
      perfil: 'Administrador',
      partidoOuEntidade: 'Coordenação Eleitoral SP'
    };
  });

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(obterConfiguracaoSupabase());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Online / offline detector
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      if (supabaseConfig.autoSync) {
        sincronizarTodosPendentes(boletins).catch(() => {});
      }
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [supabaseConfig, boletins]);

  // Load IndexedDB and Candidate Target on startup
  const loadInitialData = useCallback(async () => {
    await dbInicializarDadosExemplo();
    const list = await dbListarBoletins();
    setBoletins(list);
    const alvo = await dbObterCandidatoAlvo();
    setCandidatoAlvo(alvo);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Master tally of target candidate votes across all SP QR codes
  const totalVotosAlvo = useMemo(() => {
    let soma = 0;
    boletins.forEach(bu => {
      if (bu.uf.toUpperCase() === 'SP') {
        soma += extrairVotosCandidatoDoBu(bu, candidatoAlvo.numero);
      }
    });
    return soma;
  }, [boletins, candidatoAlvo.numero]);

  // Handle Target candidate update from Admin
  async function handleUpdateCandidatoAlvo(novoAlvo: CandidatoFederalAlvo) {
    setCandidatoAlvo(novoAlvo);
    await dbSalvarCandidatoAlvo(novoAlvo);
    showToast('success', `Candidato Alvo atualizado para ${novoAlvo.nome} (${novoAlvo.numero})!`);
  }

  // Toast notification helper
  function showToast(type: 'success' | 'error' | 'info', text: string) {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  }

  // Process raw text scanned by camera, upload, or simulator
  const handleRawScan = useCallback((rawText: string) => {
    if (!rawText || !rawText.trim()) return;

    try {
      const resultado = parseBoletimTse(rawText);

      if (resultado.sucesso && resultado.completo && resultado.boletim) {
        soundService.playSuccessBeep();
        const bu = resultado.boletim;

        // Verify if BU is strictly from Estado de São Paulo
        if (bu.uf.toUpperCase() !== 'SP') {
          soundService.playErrorBeep();
          showToast('error', `Atenção: Este sistema é exclusivo para o Estado de São Paulo. A urna pertence a ${bu.uf} (${bu.municipioNome}).`);
        }

        // Verificação rigorosa de duplicata de QR Code
        const duplicata = boletins.find(b => 
          b.id === bu.id ||
          (b.uf.toUpperCase() === bu.uf.toUpperCase() && b.municipioCodigo === bu.municipioCodigo && b.zona === bu.zona && b.secao === bu.secao) ||
          (Boolean(b.idUrna && bu.idUrna && b.idUrna === bu.idUrna))
        );

        if (duplicata) {
          soundService.playErrorBeep();
          const msg = `O Boletim da Zona ${duplicata.zona}, Seção ${duplicata.secao} (${duplicata.municipioNome}/SP) já foi registrado anteriormente. O aplicativo não aceita duplicatas do mesmo QR Code!`;
          setDuplicateError(msg);
          showToast('error', `⚠️ DUPLICATA DETECTADA: Seção ${duplicata.secao} já foi registrada!`);
        } else {
          setDuplicateError(null);
        }

        setScannedBu(bu);
        setMultiPartProgress(null);
      } else if (resultado.sucesso && !resultado.completo) {
        soundService.playPartBeep();
        setMultiPartProgress({
          current: resultado.parteAtual || 1,
          total: resultado.totalPartes || 2,
          key: resultado.chaveUnica
        });
        showToast('info', resultado.mensagem);
      } else {
        soundService.playErrorBeep();
        showToast('error', resultado.mensagem || 'Código não reconhecido como Boletim de Urna.');
      }
    } catch (err: unknown) {
      soundService.playErrorBeep();
      const msg = err instanceof Error ? err.message : 'Falha ao processar';
      showToast('error', `Erro na leitura: ${msg}`);
    }
  }, []);

  // Confirm and send BU by Fiscal
  async function handleFiscalConfirmAndSend(bu: BoletimDeUrna, fiscalNome: string): Promise<boolean> {
    if (bu.uf.toUpperCase() !== 'SP') {
      showToast('error', 'Apenas urnas do Estado de São Paulo podem ser enviadas.');
      return false;
    }

    // Prevenção de duplicata no envio
    const checkDuplicata = await dbVerificarDuplicata(bu);
    if (checkDuplicata.isDuplicata) {
      soundService.playErrorBeep();
      setDuplicateError(checkDuplicata.motivo || 'Este Boletim de Urna já foi registrado.');
      showToast('error', `Envio Rejeitado: ${checkDuplicata.motivo}`);
      return false;
    }

    setIsSendingBu(true);
    try {
      bu.fiscalNome = fiscalNome;
      bu.fiscalCargo = 'Fiscal de Seção SP';

      // Save to IndexedDB local
      await dbSalvarBoletim(bu);

      // Attempt immediate cloud sync if online
      if (navigator.onLine) {
        await sincronizarBoletim(bu);
      }

      // Refresh list
      const list = await dbListarBoletins();
      setBoletins(list);

      soundService.playSuccessBeep();
      showToast('success', `Boletim da Seção ${bu.secao} (${bu.municipioNome}/SP) enviado com sucesso!`);
      setDuplicateError(null);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar o Boletim.';
      showToast('error', msg);
      return false;
    } finally {
      setIsSendingBu(false);
    }
  }

  // Admin login success
  function handleAdminLoginSuccess(session: UserSession) {
    setUserSession(session);
    try {
      localStorage.setItem('bu_leitor_admin_session', JSON.stringify(session));
    } catch {}
    setIsLoginModalOpen(false);
    setCurrentRoute('admin');
    showToast('success', 'Acesso administrativo autorizado.');
  }

  // Admin actions: sync and delete
  async function handleSyncAll() {
    setIsSyncing(true);
    try {
      await sincronizarTodosPendentes(boletins);
      const list = await dbListarBoletins();
      setBoletins(list);
      showToast('success', 'Sincronização em nuvem concluída!');
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDeleteBu(id: string) {
    await dbRemoverBoletim(id);
    const list = await dbListarBoletins();
    setBoletins(list);
    showToast('info', 'Boletim removido.');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Universal Minimal Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo with SP Badge */}
          <div 
            onClick={() => setCurrentRoute('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-amber-400 to-blue-600 flex items-center justify-center p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
                <Vote className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-wider text-white">BU LEITOR</span>
                <span className="px-1.5 py-0.2 text-[9px] font-black bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded">
                  SP 2026
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Estado de São Paulo • Fiscalização Eleitoral
              </p>
            </div>
          </div>

          {/* Quick Header Actions based on Route */}
          <div className="flex items-center gap-2">
            
            {/* PWA Install Button for Android & iOS */}
            <PWAInstallButton variant="header" />

            {/* Online / Offline status badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-400'}`} />
              <span className="text-[11px] text-slate-300 hidden sm:inline">
                {isOnline ? 'Conectado' : 'Offline'}
              </span>
            </div>

            {/* Quick Switch to Scanner from other views */}
            {currentRoute !== 'scanner' && (
              <button
                onClick={() => {
                  setScannedBu(null);
                  setCurrentRoute('scanner');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leitor QR</span>
              </button>
            )}

            {/* Quick Switch to Admin from other views */}
            {currentRoute !== 'admin' && (
              <button
                onClick={() => {
                  if (userSession.autenticado) {
                    setCurrentRoute('admin');
                  } else {
                    setIsLoginModalOpen(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Login Admin</span>
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-fade-in">
          <div className={`p-4 rounded-2xl shadow-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/60'
              : toastMessage.type === 'info'
              ? 'bg-blue-950/95 text-blue-200 border-blue-500/60'
              : 'bg-rose-950/95 text-rose-200 border-rose-500/60'
          }`}>
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT ROUTER */}
      <main className="flex-1">
        
        {/* ROUTE 1: PÁGINA INICIAL SIMPLIFICADA (Apenas 2 Opções) */}
        {currentRoute === 'home' && (
          <HomeSimplificada
            onOpenQrScanner={() => {
              setScannedBu(null);
              setCurrentRoute('scanner');
            }}
            onOpenAdminLogin={() => {
              if (userSession.autenticado) {
                setCurrentRoute('admin');
              } else {
                setIsLoginModalOpen(true);
              }
            }}
            onOpenQrGenerator={() => setIsQrGeneratorOpen(true)}
            totalBusLidos={boletins.length}
            isAdmin={userSession.autenticado}
          />
        )}

        {/* ROUTE 2: MODO LEITOR DE QR CODE DO FISCAL (Lê e Envia Apenas) */}
        {currentRoute === 'scanner' && (
          <FiscalScannerView
            onBackHome={() => {
              setScannedBu(null);
              setDuplicateError(null);
              setCurrentRoute('home');
            }}
            onScanRaw={handleRawScan}
            scannedBu={scannedBu}
            duplicateError={duplicateError}
            onConfirmAndSend={handleFiscalConfirmAndSend}
            isSending={isSendingBu}
            multiPartProgress={multiPartProgress}
            onResetScan={() => {
              setScannedBu(null);
              setDuplicateError(null);
            }}
          />
        )}

        {/* ROUTE 3: SALA DE SITUAÇÃO DO ADMINISTRADOR (Todas as Informações) */}
        {currentRoute === 'admin' && (
          <AdminSituationRoom
            boletins={boletins}
            candidatoAlvo={candidatoAlvo}
            onUpdateCandidatoAlvo={handleUpdateCandidatoAlvo}
            onBackHome={() => setCurrentRoute('home')}
            onSelectBuReceipt={setSelectedBuReceipt}
            onDeleteBu={handleDeleteBu}
            onSyncAll={handleSyncAll}
            isSyncing={isSyncing}
            onOpenSyncSettings={() => setIsSyncSettingsOpen(true)}
          />
        )}

      </main>

      {/* MODAL: ESPELHO DO BU TÉRMICO TSE */}
      <BuReceiptModal
        bu={selectedBuReceipt}
        onClose={() => setSelectedBuReceipt(null)}
      />

      {/* MODAL: GERADOR DE QR CODE DE TESTE SP */}
      <QrGeneratorModal
        isOpen={isQrGeneratorOpen}
        onClose={() => setIsQrGeneratorOpen(false)}
        onSimulateScan={(rawText) => {
          handleRawScan(rawText);
          setCurrentRoute('scanner');
          setIsQrGeneratorOpen(false);
        }}
      />

      {/* MODAL: LOGIN ADMINISTRATIVO */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentSession={userSession}
        onSaveSession={handleAdminLoginSuccess}
      />

      {/* MODAL: CONFIGURAÇÃO DO SUPABASE / NUVEM */}
      <CloudSyncSettingsModal
        isOpen={isSyncSettingsOpen}
        onClose={() => setIsSyncSettingsOpen(false)}
        config={supabaseConfig}
        onSaveConfig={setSupabaseConfig}
      />

    </div>
  );
}
