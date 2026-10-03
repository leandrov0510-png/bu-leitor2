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
  dbObterCandidatoAlvo,
  dbSalvarCandidatoAlvo,
  dbVerificarDuplicata,
  CANDIDATO_ALVO_DEFAULT
} from './db/database';
import { 
  cadastrarBoletimOnline,
  listarBoletinsOnline,
  excluirBoletimOnline,
  assinarRealtimeBoletins,
  testarConectividadeSupabase,
  sincronizarBoletinsPendentes,
  ConectividadeResultado
} from './services/cadastros';
import { obterConfiguracaoSupabase } from './services/supabaseService';
import { soundService } from './services/soundService';
import { Vote, Lock, Camera, X, RefreshCw } from 'lucide-react';

export default function App() {
  // Routes: 'home' | 'scanner' | 'admin'
  const [currentRoute, setCurrentRoute] = useState<'home' | 'scanner' | 'admin'>('home');
  const [boletins, setBoletins] = useState<BoletimDeUrna[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [supabaseStatus, setSupabaseStatus] = useState<ConectividadeResultado>({
    online: false,
    status: 'SUPABASE OFFLINE',
    mensagem: 'Verificando conexão...'
  });

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

  // Helper para exibir notificações Toast
  function showToast(type: 'success' | 'error' | 'info', text: string) {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  }

  // 13 & 4: Carregar dados do Supabase e testar conectividade
  const recarregarDados = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Testa conectividade com Supabase
      const statusRes = await testarConectividadeSupabase();
      setSupabaseStatus(statusRes);

      // 2. Busca lista direta do PostgreSQL
      const { boletins: lista, fonte, erro } = await listarBoletinsOnline();
      setBoletins(lista);

      if (erro) {
        showToast('error', erro);
      } else if (fonte === 'supabase') {
        console.log(`[APP] ${lista.length} boletins carregados diretamente do Supabase.`);
      }

      // 3. Carrega configurações do candidato alvo
      const alvo = await dbObterCandidatoAlvo();
      setCandidatoAlvo(alvo);
    } catch (err: any) {
      console.error('[APP] Erro ao carregar dados:', err);
      showToast('error', `Falha ao carregar dados: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    recarregarDados();
  }, [recarregarDados]);

  // 5. Sincronização em Tempo Real (Supabase Realtime)
  useEffect(() => {
    const desinscreverRealtime = assinarRealtimeBoletins({
      onInsert: (novoBu) => {
        setBoletins((atuais) => {
          if (atuais.some((b) => b.id === novoBu.id)) return atuais;
          return [novoBu, ...atuais];
        });
        soundService.playSuccessBeep();
        showToast('info', `⚡ Novo BU recebido via Realtime: Seção ${novoBu.secao} (${novoBu.municipioNome}/SP)`);
      },
      onUpdate: (buAtualizado) => {
        setBoletins((atuais) => atuais.map((b) => (b.id === buAtualizado.id ? buAtualizado : b)));
        showToast('info', `⚡ BU atualizado via Realtime: Seção ${buAtualizado.secao}`);
      },
      onDelete: (idRemovido) => {
        setBoletins((atuais) => atuais.filter((b) => b.id !== idRemovido));
        showToast('info', `BU ${idRemovido} removido via Realtime.`);
      },
      onError: (err) => {
        console.error('[APP] Erro no canal Realtime:', err);
      }
    });

    return () => {
      desinscreverRealtime();
    };
  }, []);

  // Detector de conectividade do navegador
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      recarregarDados();
      sincronizarBoletinsPendentes().catch(() => {});
    }
    function handleOffline() {
      setIsOnline(false);
      setSupabaseStatus({
        online: false,
        status: 'SUPABASE OFFLINE',
        mensagem: 'Aparelho desconectado da rede.'
      });
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [recarregarDados]);

  // Totalizador do Candidato Alvo
  const totalVotosAlvo = useMemo(() => {
    let soma = 0;
    boletins.forEach(bu => {
      if (bu.uf.toUpperCase() === 'SP') {
        soma += extrairVotosCandidatoDoBu(bu, candidatoAlvo.numero);
      }
    });
    return soma;
  }, [boletins, candidatoAlvo.numero]);

  async function handleUpdateCandidatoAlvo(novoAlvo: CandidatoFederalAlvo) {
    setCandidatoAlvo(novoAlvo);
    await dbSalvarCandidatoAlvo(novoAlvo);
    showToast('success', `Candidato Alvo atualizado para ${novoAlvo.nome} (${novoAlvo.numero})!`);
  }

  // Leitura de QR Code
  const handleRawScan = useCallback((rawText: string) => {
    if (!rawText || !rawText.trim()) return;

    try {
      const resultado = parseBoletimTse(rawText);

      if (resultado.sucesso && resultado.completo && resultado.boletim) {
        soundService.playSuccessBeep();
        const bu = resultado.boletim;

        if (bu.uf.toUpperCase() !== 'SP') {
          soundService.playErrorBeep();
          showToast('error', `Atenção: Sistema exclusivo para SP. A urna pertence a ${bu.uf} (${bu.municipioNome}).`);
        }

        // Verificação contra a base completa
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
  }, [boletins]);

  // 3. ENVIO DO CADASTRO (DIRETO NO SUPABASE)
  async function handleFiscalConfirmAndSend(bu: BoletimDeUrna, fiscalNome: string): Promise<boolean> {
    if (bu.uf.toUpperCase() !== 'SP') {
      showToast('error', 'Apenas urnas do Estado de São Paulo podem ser enviadas.');
      return false;
    }

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

      // 3. GRAVAÇÃO DIRETA NO POSTGRESQL DO SUPABASE
      await cadastrarBoletimOnline(bu);

      // Adiciona ao estado local
      setBoletins(atuais => [bu, ...atuais.filter(b => b.id !== bu.id)]);

      soundService.playSuccessBeep();
      showToast('success', `✅ SUCESSO: Boletim da Seção ${bu.secao} (${bu.municipioNome}/SP) gravado no Supabase!`);
      setDuplicateError(null);
      return true;
    } catch (err: unknown) {
      soundService.playErrorBeep();
      const msg = err instanceof Error ? err.message : 'Falha ao salvar no banco Supabase.';
      console.error('ERRO AO SALVAR NO SUPABASE:', err);
      // NUNCA informa sucesso se falhou
      showToast('error', `❌ ${msg}`);
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

  // Sincronizar todos pendentes
  async function handleSyncAll() {
    setIsSyncing(true);
    try {
      const res = await sincronizarBoletinsPendentes();
      await recarregarDados();
      if (res.falhas > 0) {
        showToast('info', `Sincronização: ${res.enviados} enviados, ${res.falhas} falharam.`);
      } else {
        showToast('success', `Sincronização em nuvem concluída! (${res.enviados} registros)`);
      }
    } finally {
      setIsSyncing(false);
    }
  }

  // Exclusão remota e local
  async function handleDeleteBu(id: string) {
    try {
      await excluirBoletimOnline(id);
      setBoletins(atuais => atuais.filter(b => b.id !== id));
      showToast('info', `Boletim ${id} excluído com sucesso do Supabase.`);
    } catch (err: any) {
      showToast('error', `Erro ao excluir: ${err.message}`);
    }
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
                Estado de São Paulo • Fiscalização Eleitoral Online
              </p>
            </div>
          </div>

          {/* Quick Header Actions based on Route */}
          <div className="flex items-center gap-2">
            
            {/* PWA Install Button for Android & iOS */}
            <PWAInstallButton variant="header" />

            {/* Status do Supabase & Realtime */}
            <div 
              onClick={() => recarregarDados()} 
              title={supabaseStatus.mensagem}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 cursor-pointer hover:border-slate-500 transition"
            >
              <span className={`w-2 h-2 rounded-full ${
                supabaseStatus.online 
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' 
                  : supabaseStatus.status.includes('RESTRITOS')
                  ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                  : 'bg-rose-400'
              }`} />
              <span className="text-[11px] text-slate-300 hidden sm:inline">
                {supabaseStatus.online ? 'Supabase Online' : supabaseStatus.status.includes('RESTRITOS') ? 'Quota Excedida' : 'Offline'}
              </span>
              <RefreshCw className={`w-3 h-3 text-slate-400 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
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
        
        {/* ROUTE 1: PÁGINA INICIAL SIMPLIFICADA */}
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

        {/* ROUTE 2: MODO LEITOR DE QR CODE DO FISCAL (Lê e Envia Online) */}
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

        {/* ROUTE 3: SALA DE SITUAÇÃO DO ADMINISTRADOR */}
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
