import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Upload, RotateCcw, Check, ShieldCheck, Eye } from 'lucide-react';
import imgTransparenciaUrl from '../assets/images/transparencia_sp_1790995082103.jpg';
import { dbObterFotoCapa, dbSalvarFotoCapa, dbRestaurarFotoCapaPadrao } from '../db/database';

interface AdminCoverPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCoverUpdated?: (newUrl: string) => void;
}

export const AdminCoverPhotoModal: React.FC<AdminCoverPhotoModalProps> = ({
  isOpen,
  onClose,
  onCoverUpdated
}) => {
  const [currentCover, setCurrentCover] = useState<string>(imgTransparenciaUrl);
  const [previewUrl, setPreviewUrl] = useState<string>(imgTransparenciaUrl);
  const [urlInput, setUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadCover() {
      const saved = await dbObterFotoCapa();
      if (saved) {
        setCurrentCover(saved);
        setPreviewUrl(saved);
      } else {
        setCurrentCover(imgTransparenciaUrl);
        setPreviewUrl(imgTransparenciaUrl);
      }
    }
    loadCover();
  }, [isOpen]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setPreviewUrl(base64);
        setIsSaving(true);
        try {
          await dbSalvarFotoCapa(base64);
          setCurrentCover(base64);
          setStatusMessage('Foto de capa atualizada pelo Administrador!');
          if (onCoverUpdated) onCoverUpdated(base64);
          setTimeout(() => setStatusMessage(null), 3000);
        } catch {
          alert('Erro ao salvar a foto de capa.');
        } finally {
          setIsSaving(false);
        }
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleApplyUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const novaUrl = urlInput.trim();
    setIsSaving(true);
    try {
      await dbSalvarFotoCapa(novaUrl);
      setCurrentCover(novaUrl);
      setPreviewUrl(novaUrl);
      setUrlInput('');
      setStatusMessage('Foto de capa atualizada com sucesso via URL!');
      if (onCoverUpdated) onCoverUpdated(novaUrl);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      alert('Erro ao salvar foto de capa.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetDefault() {
    setIsSaving(true);
    try {
      await dbRestaurarFotoCapaPadrao();
      setCurrentCover(imgTransparenciaUrl);
      setPreviewUrl(imgTransparenciaUrl);
      setStatusMessage('Foto de capa restaurada para o padrão oficial.');
      if (onCoverUpdated) onCoverUpdated(imgTransparenciaUrl);
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-left max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Alterar Foto de Capa Inicial</h3>
              <p className="text-[11px] text-emerald-400 font-semibold">Exclusivo do Administrador • Configuração Visual do Sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Container */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Pré-visualização da Capa Atual:</span>
          </label>
          <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
            <img 
              src={previewUrl} 
              alt="Pré-visualização da Capa" 
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-3 left-3 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-500/30">
                Eleições Gerais 2026 • SP
              </span>
              <h4 className="text-sm font-black text-white drop-shadow mt-1">BU LEITOR SP</h4>
            </div>
          </div>
        </div>

        {/* Admin Instructions */}
        <div className="mb-4 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-slate-400">
            Como Administrador, você pode alterar a imagem que todos os fiscais e usuários visualizam na tela inicial da aplicação.
          </p>
        </div>

        {/* Action Controls */}
        <div className="space-y-4">
          {/* Method 1: Upload from local file */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              1. Enviar Nova Foto do seu Dispositivo:
            </label>
            <label className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-2xl cursor-pointer text-xs font-bold transition">
              <Upload className="w-4 h-4" />
              <span>{isSaving ? 'Processando imagem...' : 'Escolher Arquivo (JPG, PNG, WEBP)'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isSaving}
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Method 2: Online Image URL */}
          <form onSubmit={handleApplyUrl} className="pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              2. Ou Inserir Link de uma Imagem da Web:
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://exemplo.com/minha-foto-campanha.jpg"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSaving || !urlInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition"
              >
                Salvar URL
              </button>
            </div>
          </form>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
            <button
              type="button"
              onClick={handleResetDefault}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Capa Padrão</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Concluir
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
