import React from 'react';
import { 
  Camera, 
  Lock, 
  Send, 
  ShieldCheck, 
  QrCode, 
  BarChart3, 
  ChevronRight 
} from 'lucide-react';
import { CapaTransparenciaEleitoral } from './CapaTransparenciaEleitoral';
import { PWAInstallButton } from './PWAInstallButton';

interface HomeSimplificadaProps {
  onOpenQrScanner: () => void;
  onOpenAdminLogin: () => void;
  onOpenQrGenerator: () => void;
  totalBusLidos: number;
  isAdmin?: boolean;
}

export const HomeSimplificada: React.FC<HomeSimplificadaProps> = ({
  onOpenQrScanner,
  onOpenAdminLogin,
  onOpenQrGenerator,
  totalBusLidos,
  isAdmin = false
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* COMPONENTE DE CAPA ESTILIZADA DE TRANSPARÊNCIA ELEITORAL */}
        <CapaTransparenciaEleitoral 
          totalBusLidos={totalBusLidos} 
          isAdmin={isAdmin}
          onRequireAdminLogin={onOpenAdminLogin}
        />

        {/* The Two Main Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
          
          {/* OPTION 1: LEITOR DE QR CODE (Fiscal de Urna - Envio Apenas) */}
          <div 
            onClick={onOpenQrScanner}
            className="group relative bg-gradient-to-b from-slate-900 to-slate-900/90 hover:from-slate-800 hover:to-slate-900 border-2 border-slate-800 hover:border-emerald-500/70 rounded-3xl p-6 shadow-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  MODO FISCAL
                </span>
              </div>

              <h2 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                Leitor de QR Code
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Escaneie o QR Code do Boletim de Urna da sua seção eleitoral em São Paulo e envie a apuração diretamente para a central.
              </p>

              <div className="mt-4 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Send className="w-3.5 h-3.5" />
                  <span>Envio direto e seguro à central</span>
                </div>
                <div className="text-slate-400">
                  Válido exclusivamente para seções do Estado de São Paulo (SP).
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-emerald-400 font-bold text-xs">
              <span>Abrir Câmera do Leitor</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* OPTION 2: LOGIN ADMINISTRATIVO (Acesso Geral da Coordenação) */}
          <div 
            onClick={onOpenAdminLogin}
            className="group relative bg-gradient-to-b from-slate-900 to-slate-900/90 hover:from-slate-800 hover:to-slate-900 border-2 border-slate-800 hover:border-blue-500/70 rounded-3xl p-6 shadow-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Lock className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  COORDENAÇÃO
                </span>
              </div>

              <h2 className="text-xl font-black text-white group-hover:text-blue-300 transition-colors">
                Login Administrativo
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Acesso restrito da coordenação: painel analítico completo, totalização de votos de todos os QR Codes e auditoria.
              </p>

              <div className="mt-4 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Todas as informações consolidadas</span>
                </div>
                <div className="text-slate-400">
                  Exclusivo para coordenadores e administradores.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-blue-400 font-bold text-xs">
              <span>Entrar com Credencial Admin</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>

        {/* In-App PWA Install Guide for Android & iOS */}
        <PWAInstallButton variant="banner" />

        {/* Bottom Utility Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{totalBusLidos} seções eleitorais de SP registradas na base local.</span>
          </div>

          <button
            onClick={onOpenQrGenerator}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold border border-slate-700 transition"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gerar QR de Teste SP</span>
          </button>
        </div>

      </div>
    </div>
  );
};
