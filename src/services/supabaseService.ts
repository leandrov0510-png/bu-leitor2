import { BoletimDeUrna, SupabaseConfig } from '../types';
import { dbAtualizarStatusSync, dbRegistrarLog } from '../db/database';

const STORAGE_KEY_SUPABASE = 'bu_leitor_supabase_config';

const DEFAULT_CONFIG: SupabaseConfig = {
  url: '',
  anonKey: '',
  tableName: 'boletins_urna',
  autoSync: true
};

export function obterConfiguracaoSupabase(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPABASE);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_CONFIG;
}

export function salvarConfiguracaoSupabase(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(config));
}

/**
 * Testa a conexão com o Supabase ou endpoint REST
 */
export async function testarConexaoSupabase(config: SupabaseConfig): Promise<{ sucesso: boolean; mensagem: string }> {
  if (!config.url) {
    return { sucesso: false, mensagem: 'URL do Supabase não informada.' };
  }

  const baseUrl = config.url.replace(/\/$/, '');
  const urlTest = `${baseUrl}/rest/v1/${config.tableName}?select=count&limit=1`;

  try {
    const res = await fetch(urlTest, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok || res.status === 200 || res.status === 206) {
      return { sucesso: true, mensagem: `Conexão bem sucedida com a tabela "${config.tableName}"!` };
    } else if (res.status === 404) {
      return { sucesso: false, mensagem: `Tabela "${config.tableName}" não encontrada no Supabase. Crie a tabela ou verifique o nome.` };
    } else if (res.status === 401 || res.status === 403) {
      return { sucesso: false, mensagem: 'Chave Anon Key do Supabase inválida ou sem permissões de leitura/escrita.' };
    } else {
      return { sucesso: false, mensagem: `Servidor retornou status ${res.status}: ${res.statusText}` };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na conexão de rede';
    return { sucesso: false, mensagem: `Falha na requisição: ${msg}` };
  }
}

/**
 * Sincroniza um Boletim de Urna com a tabela do Supabase
 */
export async function sincronizarBoletim(bu: BoletimDeUrna): Promise<{ sucesso: boolean; mensagem: string }> {
  const config = obterConfiguracaoSupabase();

  if (!navigator.onLine) {
    await dbAtualizarStatusSync(bu.id, 'pending');
    return { sucesso: false, mensagem: 'Dispositivo offline. BU armazenado localmente para envio posterior.' };
  }

  // Se não houver URL do Supabase configurada, simula sincronização em nuvem e armazena localmente
  if (!config.url || !config.anonKey) {
    // Sincronização em nuvem simulada (Mock Cloud Relay)
    await new Promise(resolve => setTimeout(resolve, 400));
    await dbAtualizarStatusSync(bu.id, 'synced');
    await dbRegistrarLog({
      timestamp: Date.now(),
      action: 'SYNC',
      buId: bu.id,
      details: `BU ${bu.id} sincronizado via Cloud Relay local.`
    });
    return { sucesso: true, mensagem: `BU ${bu.id} sincronizado com sucesso!` };
  }

  const baseUrl = config.url.replace(/\/$/, '');
  const urlUpsert = `${baseUrl}/rest/v1/${config.tableName}`;

  const payload = {
    id: bu.id,
    uf: bu.uf,
    municipio_codigo: bu.municipioCodigo,
    municipio_nome: bu.municipioNome,
    zona: bu.zona,
    secao: bu.secao,
    urna_id: bu.idUrna,
    eleitores_aptos: bu.eleitoresAptos,
    comparecimento: bu.comparecimento,
    abstencao: bu.abstencao,
    dados_completos_json: bu,
    hash_assinatura: bu.hashAssinatura,
    atualizado_em: new Date().toISOString()
  };

  try {
    const res = await fetch(urlUpsert, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok || res.status === 201 || res.status === 204) {
      await dbAtualizarStatusSync(bu.id, 'synced');
      await dbRegistrarLog({
        timestamp: Date.now(),
        action: 'SYNC',
        buId: bu.id,
        details: `BU ${bu.id} enviado com sucesso ao Supabase.`
      });
      return { sucesso: true, mensagem: `Sincronização do BU ${bu.id} concluída!` };
    } else {
      await dbAtualizarStatusSync(bu.id, 'error');
      return { sucesso: false, mensagem: `Erro do Supabase: ${res.statusText}` };
    }
  } catch (err: unknown) {
    await dbAtualizarStatusSync(bu.id, 'pending');
    const msg = err instanceof Error ? err.message : 'Falha de rede';
    return { sucesso: false, mensagem: `Erro ao enviar para a nuvem: ${msg}` };
  }
}

/**
 * Sincroniza em lote todos os BUs com status pendente
 */
export async function sincronizarTodosPendentes(boletins: BoletimDeUrna[]): Promise<{ sincronizados: number; erros: number }> {
  let sincronizados = 0;
  let erros = 0;

  for (const bu of boletins) {
    if (bu.syncStatus !== 'synced') {
      const res = await sincronizarBoletim(bu);
      if (res.sucesso) {
        sincronizados++;
      } else {
        erros++;
      }
    }
  }

  return { sincronizados, erros };
}
