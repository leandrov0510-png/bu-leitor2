import React, { useState } from 'react';
import { X, Lock, KeyRound, CheckCircle2 } from 'lucide-react';
import { UserSession } from '../types';
import { dbVerificarSenhaAdmin } from '../db/database';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: UserSession;
  onSaveSession: (session: UserSession) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  onSaveSession
}) => {
  const [nome, setNome] = useState(currentSession.nome || 'Coordenador Geral SP');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!senha.trim()) {
      setErro('Informe a senha de administrador.');
      return;
    }

    setIsValidating(true);
    try {
      const isCorreta = await dbVerificarSenhaAdmin(senha);
      if (!isCorreta) {
        setErro('Senha incorreta! Digite a senha cadastrada para o Administrador.');
        return;
      }

      onSaveSession({
        autenticado: true,
        nome: nome.trim() || 'Administrador',
        perfil: 'Administrador',
        partidoOuEntidade: 'Coordenação de Campanha SP',
        token: 'ADMIN_' + Math.random().toString(36).substring(2, 10).toUpperCase()
      });
      onClose();
    } catch {
      setErro('Falha ao validar credenciais. Tente novamente.');
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Login Administrativo</h3>
              <p className="text-xs text-slate-400">Acesso restrito à Sala de Situação de São Paulo</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info box */}
        <div className="mb-4 p-3 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-xs text-blue-300">
          O Administrador tem acesso completo e exclusivo a todas as informações: votos do Candidato Alvo, totalização geral de SP, ranking por municípios e controle de BUs.
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Nome do Administrador / Coordenador:
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Coordenador de Apuração SP"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Senha de Administrador:
              </label>
              <span className="text-[10px] text-slate-500">
                (Senha inicial: <code className="text-blue-400 font-mono">admin2026</code>)
              </span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a sua senha de administrador"
                className="w-full pl-9 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {erro && (
            <div className="text-xs text-rose-300 font-semibold p-2.5 bg-rose-500/15 rounded-xl border border-rose-500/30">
              {erro}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isValidating}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isValidating ? 'Verificando Senha...' : 'Entrar na Sala de Situação'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
