import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, Share, PlusSquare, X, Check, Apple, Sparkles } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed as native standalone app, don't show prompt
  if (isInstalled) {
    return null;
  }

  async function handleAndroidInstall() {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 3000);
    }
  }

  // Variant 1: Compact Header Button
  if (variant === 'header') {
    return (
      <>
        {isInstallable && (
          <button
            onClick={handleAndroidInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition"
            title="Instalar aplicativo no Android"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span className="hidden sm:inline">Instalar App</span>
            <span className="sm:hidden">Instalar</span>
          </button>
        )}

        {isIOS && (
          <button
            onClick={() => setShowIOSModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
            title="Como instalar no iPhone ou iPad"
          >
            <Apple className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Instalar no iOS</span>
            <span className="sm:hidden">App iOS</span>
          </button>
        )}

        {/* Fallback button if beforeinstallprompt not yet fired */}
        {!isInstallable && !isIOS && (
          <button
            onClick={() => {
              if (isAndroid) {
                alert('Para instalar no Android: abra o menu do navegador (três pontinhos ⋮ no canto superior) e toque em "Instalar aplicativo" ou "Adicionar à tela inicial".');
              } else {
                setShowIOSModal(true);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Instalar no Celular</span>
          </button>
        )}

        {/* iOS Step-by-Step Installation Modal */}
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-left">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Apple className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Instalar no iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-400">Funciona como aplicativo nativo iOS</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-blue-600/30 flex items-center justify-center text-blue-400 shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-0.5">Toque no botão Compartilhar</span>
                    <span className="text-slate-400">
                      Na barra inferior do Safari, toque no ícone de <strong>Compartilhar</strong> (o quadrado com uma seta para cima <Share className="w-3.5 h-3.5 inline text-blue-400" />).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-0.5">Adicionar à Tela de Início</span>
                    <span className="text-slate-400">
                      Role a lista de opções para baixo e selecione <strong>Adicionar à Tela de Início</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" />).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-amber-600/30 flex items-center justify-center text-amber-400 shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-0.5">Confirmar e Abrir</span>
                    <span className="text-slate-400">
                      Toque em <strong>Adicionar</strong> no canto superior direito. O ícone do <strong>BU Leitor SP</strong> aparecerá na sua tela inicial como um app nativo!
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  Entendi
                </button>
              </div>

            </div>
          </div>
        )}
      </>
    );
  }

  // Variant 2: Banner card for Home page
  return (
    <div className="p-4 bg-gradient-to-r from-blue-950/40 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white block">Instalar no Celular (Android & iOS)</span>
          <span className="text-[11px] text-slate-400">
            Acesse rapidamente da tela inicial com suporte offline e câmera acelerada.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isInstallable ? (
          <button
            onClick={handleAndroidInstall}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Instalar App</span>
          </button>
        ) : (
          <button
            onClick={() => setShowIOSModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold transition"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Instalar no Celular</span>
          </button>
        )}
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Apple className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Instalar no Celular</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                <span className="font-bold text-white block mb-1">No iPhone / iPad (Safari):</span>
                <p className="text-slate-400">
                  1. Toque em <strong>Compartilhar</strong> (ícone com seta para cima na barra inferior).<br />
                  2. Selecione <strong>Adicionar à Tela de Início</strong>.<br />
                  3. Toque em <strong>Adicionar</strong> no topo direito.
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                <span className="font-bold text-white block mb-1">No Android (Chrome):</span>
                <p className="text-slate-400">
                  1. Toque no menu (três pontos ⋮ no canto superior direito).<br />
                  2. Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.<br />
                  3. Confirme a instalação.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
