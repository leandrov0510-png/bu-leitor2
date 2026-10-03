import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Image as ImageIcon, 
  Upload, 
  RotateCcw, 
  Check, 
  X,
  Cpu,
  Eye,
  KeyRound
} from 'lucide-react';
import imgTransparenciaUrl from '../assets/images/transparencia_sp_1790995082103.jpg';
import { dbObterFotoCapa, dbSalvarFotoCapa, dbRestaurarFotoCapaPadrao } from '../db/database';

interface CapaTransparenciaEleitoralProps {
  totalBusLidos: number;
  isAdmin?: boolean;
  onRequireAdminLogin?: () => void;
}

export const CapaTransparenciaEleitoral: React.FC<CapaTransparenciaEleitoralProps> = ({
  totalBusLidos,
  isAdmin = false,
  onRequireAdminLogin
}) => {
  // Saved custom photo or fallback to the new transparency artwork
  const [capaFoto, setCapaFoto] = useState<string>(imgTransparenciaUrl);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    async function carregarFoto() {
      const saved = await dbObterFotoCapa();
      if (saved) {
        setCapaFoto(saved);
      }
    }
    carregarFoto();
  }, [isModalOpen]);

  // File upload from camera or local file system
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem válida (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCapaFoto(base64);
        try {
          await dbSalvarFotoCapa(base64);
        } catch {}
        setUploadStatus('Foto de capa atualizada pelo Administrador!');
        setTimeout(() => {
          setUploadStatus(null);
          setIsModalOpen(false);
        }, 1200);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleApplyUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const novaUrl = urlInput.trim();
    setCapaFoto(novaUrl);
    try {
      await dbSalvarFotoCapa(novaUrl);
    } catch {}
    setUrlInput('');
    setUploadStatus('Foto de capa atualizada pelo Administrador!');
    setTimeout(() => {
      setUploadStatus(null);
      setIsModalOpen(false);
    }, 1200);
  }

  async function handleResetDefault() {
    setCapaFoto(imgTransparenciaUrl);
    try {
      await dbRestaurarFotoCapaPadrao();
    } catch {}
    setIsModalOpen(false);
  }

  function handleOpenChangeModal() {
    if (isAdmin) {
      setIsModalOpen(true);
    } else if (onRequireAdminLogin) {
      onRequireAdminLogin();
    } else {
      setIsModalOpen(true);
    }
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border-2 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] bg-slate-950 group">
      
      {/* Background Image Container */}
      <div className="relative h-64 sm:h-72 w-full overflow-hidden">
        <img 
          src={capaFoto} 
          alt="Transparência Eleitoral - Estado de São Paulo" 
          className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.08] transition-transform duration-1000 ease-out group-hover:scale-105"
        />

        {/* Dynamic Gradient Mesh Overlays for visual impact */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-emerald-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent pointer-events-none" />
        
        {/* Subtle Cyber Grid lines for transparency motif */}
        <div 
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* Button to Change Cover Photo (Admin Authorized) */}
      <button
        onClick={handleOpenChangeModal}
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-slate-200 hover:text-white rounded-xl border border-slate-700/80 backdrop-blur-md text-xs font-semibold shadow-lg transition"
        title={isAdmin ? "Alterar foto de capa (Administrador)" : "Fazer login como Administrador para alterar a foto de capa"}
      >
        {isAdmin ? (
          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Lock className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span>{isAdmin ? 'Alterar Capa (Admin)' : 'Alterar Capa (Admin)'}</span>
      </button>

      {/* Hero Content (Floating over image) */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 z-10 text-left">
        
        {/* Badges Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[11px] font-black tracking-wider uppercase backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span>Transparência Eleitoral Ativa</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 text-[11px] font-bold backdrop-blur-md">
            <span>Eleições Gerais 2026 • SP</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
          BU LEITOR <span className="text-emerald-400 font-extrabold shadow-emerald-400">SP</span>
        </h1>
        
        <p className="text-xs sm:text-sm text-slate-200 max-w-xl mt-1.5 drop-shadow leading-relaxed">
          Auditoria independente e checagem pública dos Boletins de Urna oficiais da Justiça Eleitoral no Estado de São Paulo.
        </p>

        {/* Integrity Pillars Micro-bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-3 sm:gap-6 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-white">Assinatura SHA-256</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-semibold text-white">Criptografia TSE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-white">Auditoria Cidadã</span>
          </div>
        </div>

      </div>

      {/* MODAL: CUSTOMIZAR FOTO DE CAPA (ADMINISTRADOR) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Alterar Foto de Capa</h3>
                  <p className="text-[11px] text-emerald-400 font-semibold">Configuração Exclusiva do Administrador</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Como Administrador, selecione uma nova imagem institucional para a capa de abertura do aplicativo.
            </p>

            <div className="space-y-4">
              {/* Option 1: File Upload */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  1. Carregar Foto do Computador ou Celular:
                </label>
                <label className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-2xl cursor-pointer text-xs font-bold transition">
                  <Upload className="w-4 h-4" />
                  <span>Escolher Imagem (JPG, PNG, WEBP)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Option 2: Image URL */}
              <form onSubmit={handleApplyUrl} className="pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  2. Ou Colar URL de uma Imagem:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!urlInput.trim()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition"
                  >
                    Salvar
                  </button>
                </div>
              </form>

              {/* Feedback status */}
              {uploadStatus && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>{uploadStatus}</span>
                </div>
              )}

              {/* Option 3: Reset to Default */}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Capa Padrão</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
