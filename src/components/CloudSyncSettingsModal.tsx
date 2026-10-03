import React, { useState } from 'react';
import { X, Cloud, Key, Database, RefreshCw, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { SupabaseConfig } from '../types';
import { testarConexaoSupabase, salvarConfiguracaoSupabase } from '../services/supabaseService';

interface CloudSyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onSaveConfig: (newConfig: SupabaseConfig) => void;
}

export const CloudSyncSettingsModal: React.FC<CloudSyncSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig
}) => {
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [tableName, setTableName] = useState(config.tableName || 'boletins_urna');
  const [autoSync, setAutoSync] = useState(config.autoSync ?? true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ sucesso: boolean; mensagem: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const res = await testarConexaoSupabase({ url, anonKey, tableName, autoSync });
    setTesting(false);
    setTestResult(res);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const newConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      tableName: tableName.trim() || 'boletins_urna',
      autoSync
    };
    salvarConfiguracaoSupabase(newConfig);
    onSaveConfig(newConfig);
    onClose();
  }

  const sqlSnippet = `-- Tabela Supabase para BU Leitor
create table if not exists public.boletins_urna (
  id text primary key,
  uf text not null,
  municipio_codigo text,
  municipio_nome text,
  zona text not null,
  secao text not null,
  urna_id text,
  eleitores_aptos integer default 0,
  comparecimento integer default 0,
  abstencao integer default 0,
  dados_completos_json jsonb not null,
  hash_assinatura text,
  atualizado_em timestamptz default now()
);

-- Ativar RLS ou permissão de leitura/escrita pública
alter table public.boletins_urna enable row level security;
create policy "Acesso público auditoria" on public.boletins_urna for all using (true) with check (true);`;

  function handleCopySql() {
    navigator.clipboard.writeText(sqlSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configuração do Supabase & Nuvem</h3>
              <p className="text-xs text-slate-400">Armazenamento sincronizado para totalização compartilhada</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="mb-4 p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-slate-300">
          <p>
            O <strong>BU Leitor</strong> funciona de forma independente no modo <strong>Offline (IndexedDB)</strong>. Configurar o Supabase permite que múltiplos fiscais sincronizem os BUs escaneados em tempo real para uma única base de dados consolidada.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              URL do Projeto Supabase:
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzabcdefg.supabase.co"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-400 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Supabase Anon Key (Public Key):
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-400 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nome da Tabela:
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="boletins_urna"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-400 font-mono"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <span className="text-xs text-slate-300 font-medium">Sincronizar ao Conectar</span>
              </label>
            </div>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.sucesso
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.sucesso ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{testResult.mensagem}</span>
            </div>
          )}

          {/* SQL Snippet toggle */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Script SQL para criar tabela no Supabase:</span>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono max-h-24 overflow-y-auto">
              {sqlSnippet}
            </pre>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !url}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
            </button>

            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
            >
              Salvar Configuração
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
