import React from 'react';
import { 
  Vote, 
  Smartphone, 
  LayoutDashboard, 
  Cloud, 
  CloudOff, 
  QrCode, 
  Download, 
  UserCheck, 
  RefreshCw,
  Sliders
} from 'lucide-react';
import { UserSession } from '../types';

interface NavbarProps {
  currentView: 'mobile' | 'dashboard' | 'table';
  onViewChange: (view: 'mobile' | 'dashboard' | 'table') => void;
  isOnline: boolean;
  totalPendingSync: number;
  totalBus: number;
  userSession: UserSession;
  onOpenLogin: () => void;
  onOpenSyncSettings: () => void;
  onOpenQrGenerator: () => void;
  onExportCsv: () => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  onReload2026?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  isOnline,
  totalPendingSync,
  totalBus,
  userSession,
  onOpenLogin,
  onOpenSyncSettings,
  onOpenQrGenerator,
  onExportCsv,
  onSyncAll,
  isSyncing,
  onReload2026
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-amber-400 to-blue-600 flex items-center justify-center p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Vote className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-wider text-white">BU LEITOR</span>
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  ELEIÇÕES 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Auditoria Popular e Totalização Independente de BUs • TSE
              </p>
            </div>
          </div>

          {/* Navigation View Switcher */}
          <nav className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              onClick={() => onViewChange('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'mobile'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Interface do Aplicativo Android / Coletor de Campo"
            >
              <Smartphone className="w-4 h-4" />
              <span>App Coletor</span>
            </button>

            <button
              onClick={() => onViewChange('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Painel Geral de Apuração e Gráficos"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onViewChange('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Tabela de Boletins de Urna e Pesquisa"
            >
              <span>Lista de BUs</span>
              {totalBus > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-900/60 rounded-full font-bold">
                  {totalBus}
                </span>
              )}
            </button>
          </nav>

          {/* Right Actions & Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Online/Offline & Sync indicator */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={onSyncAll}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isOnline
                    ? totalPendingSync > 0
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
                title="Status de Sincronização em Nuvem"
              >
                {isOnline ? (
                  totalPendingSync > 0 ? (
                    <>
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{totalPendingSync} pendente{totalPendingSync > 1 ? 's' : ''}</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Nuvem OK</span>
                    </>
                  )
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5" />
                    <span>Offline (Local)</span>
                  </>
                )}
              </button>
            </div>

            {/* Test QR Code Generator tool button */}
            <button
              onClick={onOpenQrGenerator}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition"
              title="Gerar QR Code TSE de Teste (Eleições 2026)"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
            </button>

            {onReload2026 && (
              <button
                onClick={onReload2026}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-bold transition"
                title="Recarregar Dados Oficiais das Eleições Gerais 2026"
              >
                <span>Dados 2026</span>
              </button>
            )}

            {/* Cloud Settings (Supabase) */}
            <button
              onClick={onOpenSyncSettings}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition"
              title="Configurar Supabase / Nuvem"
            >
              <Sliders className="w-4 h-4 text-blue-400" />
            </button>

            {/* Export CSV quick button */}
            <button
              onClick={onExportCsv}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-xs font-semibold transition"
              title="Exportar dados consolidados em CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {/* User session / Login */}
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs transition"
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              <div className="text-left hidden sm:block max-w-[120px] truncate">
                <span className="block font-medium leading-none text-slate-200">{userSession.nome}</span>
                <span className="text-[10px] text-slate-400 leading-none">{userSession.perfil}</span>
              </div>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
