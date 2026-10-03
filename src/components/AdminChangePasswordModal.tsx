import React, { useState } from 'react';
import { X, KeyRound, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { dbVerificarSenhaAdmin, dbSalvarSenhaAdmin } from '../db/database';

interface AdminChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AdminChangePasswordModal: React.FC<AdminChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaNovaSenha, setConfirmaNovaSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!senhaAtual.trim()) {
      setErro('Informe a sua senha atual.');
      return;
    }

    if (novaSenha.length < 4) {
      setErro('A nova senha deve possuir no mínimo 4 caracteres.');
      return;
    }

    if (novaSenha !== confirmaNovaSenha) {
      setErro('A confirmação não coincide com a nova senha digitada.');
      return;
    }

    if (novaSenha === senhaAtual) {
      setErro('A nova senha deve ser diferente da senha atual.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Verify current password
      const senhaValida = await dbVerificarSenhaAdmin(senhaAtual);
      if (!senhaValida) {
        setErro('A senha atual digitada está incorreta.');
        setIsSaving(false);
        return;
      }

      // 2. Save new password in DB
      await dbSalvarSenhaAdmin(novaSenha);
      
      onSuccess('Senha do Administrador alterada com sucesso! Use a nova senha nos próximos acessos.');
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar senha.';
      setErro(msg);
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmaNovaSenha('');
    setErro(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Alterar Senha do Administrador</h3>
              <p className="text-[11px] text-slate-400">Atualize sua credencial de segurança da Sala de Situação</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Note */}
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            A nova senha será exigida sempre que você ou qualquer membro da coordenação realizar o <strong>Login Administrativo</strong>.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Current password */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Senha Atual:
            </label>
            <input
              type="password"
              required
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="Digite a senha atual"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* New password */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Nova Senha (mínimo 4 caracteres):
            </label>
            <input
              type="password"
              required
              minLength={4}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Digite a nova senha segura"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Confirm new password */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Confirmar Nova Senha:
            </label>
            <input
              type="password"
              required
              value={confirmaNovaSenha}
              onChange={(e) => setConfirmaNovaSenha(e.target.value)}
              placeholder="Digite a nova senha novamente"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Error Message */}
          {erro && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg transition"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Salvando Senha...' : 'Salvar Nova Senha'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
