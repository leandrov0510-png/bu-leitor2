import { supabase } from '../lib/supabaseClient';
import { BoletimDeUrna } from '../types';
import { dbSalvarBoletim, dbListarBoletins, dbRemoverBoletim, dbAtualizarStatusSync, dbRegistrarLog } from '../db/database';

export const TABELA_BOLETINS = 'boletins_urna';

export interface ConectividadeResultado {
  online: boolean;
  status: 'SUPABASE ONLINE' | 'SUPABASE OFFLINE' | 'SERVIÇOS RESTRITOS (QUOTA EXCEDIDA)';
  mensagem: string;
  totalRegistros?: number;
}

/**
 * Mapeia erros do Supabase/PostgREST para mensagens claras e diagnósticos específicos.
 */
export function mapearErroSupabase(error: any): string {
  if (!error) return 'Erro desconhecido.';
  
  const status = error.status || error.statusCode || (error.code ? parseInt(error.code, 10) : undefined);
  const msg = (error.message || '').toLowerCase();
  const details = error.details || '';
  const hint = error.hint || '';

  // 1. Quota / Limite de uso / Serviços restritos (HTTP 402)
  if (status === 402 || msg.includes('payment required') || msg.includes('quota') || msg.includes('exceeded') || msg.includes('restricted')) {
    return 'SUPABASE RESTRITO: Limite de utilização gratuito do projeto excedido (HTTP 402). Verifique o painel do Supabase.';
  }

  // 2. Erros de permissão / RLS (HTTP 401 / 403)
  if (status === 401 || status === 403 || msg.includes('jwt') || msg.includes('permission denied') || msg.includes('row-level security') || msg.includes('rls')) {
    return `ERRO DE PERMISSÃO/RLS (HTTP ${status || 403}): Operação bloqueada pelas políticas de segurança do banco. Detalhes: ${error.message}`;
  }

  // 3. Tabela inexistente
  if (status === 404 || msg.includes('relation') || msg.includes('not found') || error.code === '42P01') {
    return `TABELA NÃO ENCONTRADA: A tabela "${TABELA_BOLETINS}" não foi encontrada no banco.`;
  }

  // 4. Erros de rede / conexão offline
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('connection refused') || msg.includes('timeout')) {
    return `ERRO DE CONEXÃO: Não foi possível alcançar o servidor Supabase. Verifique sua conexão com a internet.`;
  }

  // 5. Erro genérico com código PostgREST
  return `ERRO SUPABASE: ${error.message || 'Falha na operação.'} ${details ? `(${details})` : ''} ${hint ? `Dica: ${hint}` : ''}`;
}

/**
 * 13. FUNÇÃO DE TESTE DE CONECTIVIDADE
 * Testa a conexão com o Supabase e a leitura da tabela principal.
 */
export async function testarConectividadeSupabase(): Promise<ConectividadeResultado> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      online: false,
      status: 'SUPABASE OFFLINE',
      mensagem: 'Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas.'
    };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      online: false,
      status: 'SUPABASE OFFLINE',
      mensagem: 'Dispositivo desconectado da internet.'
    };
  }

  try {
    const { count, error, status } = await supabase
      .from(TABELA_BOLETINS)
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('ERRO AO TESTAR CONEXÃO SUPABASE:', error);
      if (status === 402 || error.message?.includes('quota') || error.message?.includes('exceeded')) {
        return {
          online: false,
          status: 'SERVIÇOS RESTRITOS (QUOTA EXCEDIDA)',
          mensagem: 'O projeto Supabase atingiu os limites de utilização da organização.'
        };
      }
      return {
        online: false,
        status: 'SUPABASE OFFLINE',
        mensagem: mapearErroSupabase(error)
      };
    }

    return {
      online: true,
      status: 'SUPABASE ONLINE',
      mensagem: `Supabase conectado com sucesso! Tabela "${TABELA_BOLETINS}" acessível.`,
      totalRegistros: count ?? 0
    };
  } catch (err: any) {
    console.error('FALHA DE REDE AO TESTAR SUPABASE:', err);
    return {
      online: false,
      status: 'SUPABASE OFFLINE',
      mensagem: `Falha de rede ao conectar com Supabase: ${err?.message || err}`
    };
  }
}

/**
 * 3. CORRIGIR O CADASTRO
 * Salva o Boletim de Urna DIRETAMENTE no PostgreSQL do Supabase.
 * Nunca esconde erros. Mantém o IndexedDB local apenas como cache.
 */
export async function cadastrarBoletimOnline(bu: BoletimDeUrna): Promise<BoletimDeUrna> {
  const payload = {
    id: bu.id,
    uf: bu.uf,
    municipio_codigo: bu.municipioCodigo,
    municipio_nome: bu.municipioNome,
    zona: String(bu.zona),
    secao: String(bu.secao),
    urna_id: bu.idUrna,
    eleitores_aptos: bu.eleitoresAptos,
    comparecimento: bu.comparecimento,
    abstencao: bu.abstencao,
    fiscal_nome: bu.fiscalNome || null,
    fiscal_cargo: bu.fiscalCargo || null,
    hash_assinatura: bu.hashAssinatura || null,
    dados_completos_json: bu,
    atualizado_em: new Date().toISOString()
  };

  // Se o dispositivo estiver offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    bu.syncStatus = 'pending';
    await dbSalvarBoletim(bu).catch(() => {});
    const erroOffline = new Error('Dispositivo sem conexão de internet. O boletim foi armazenado localmente para envio posterior.');
    console.warn(erroOffline.message);
    throw erroOffline;
  }

  // INSERT / UPSERT diretamente no PostgreSQL
  const { data, error } = await supabase
    .from(TABELA_BOLETINS)
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('ERRO AO SALVAR NO SUPABASE:', error);
    // Salva cópia com erro no cache para auditoria
    bu.syncStatus = 'error';
    await dbSalvarBoletim(bu).catch(() => {});
    await dbRegistrarLog({
      timestamp: Date.now(),
      action: 'SYNC',
      buId: bu.id,
      details: `Falha ao gravar no Supabase: ${error.message}`
    }).catch(() => {});
    
    const msgAmigavel = mapearErroSupabase(error);
    throw new Error(msgAmigavel);
  }

  // Sucesso comprovado no Supabase
  bu.syncStatus = 'synced';
  await dbSalvarBoletim(bu).catch(() => {});
  await dbAtualizarStatusSync(bu.id, 'synced').catch(() => {});
  await dbRegistrarLog({
    timestamp: Date.now(),
    action: 'SYNC',
    buId: bu.id,
    details: `BU ${bu.id} gravado no PostgreSQL do Supabase com sucesso.`
  }).catch(() => {});

  console.log(`[SUPABASE] BU ${bu.id} salvo com sucesso no banco remoto.`);
  return bu;
}

/**
 * 4. CORRIGIR A LEITURA DO PAINEL ADMINISTRATIVO
 * Busca todos os registros diretamente do Supabase PostgreSQL.
 * Se offline, usa o cache local com aviso claro.
 */
export async function listarBoletinsOnline(): Promise<{ boletins: BoletimDeUrna[]; fonte: 'supabase' | 'cache_offline'; erro?: string }> {
  try {
    const { data, error } = await supabase
      .from(TABELA_BOLETINS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ERRO AO BUSCAR DADOS DO SUPABASE:', error);
      const erroMsg = mapearErroSupabase(error);
      
      // Fallback para cache local em caso de erro remoto
      const locais = await dbListarBoletins();
      return {
        boletins: locais,
        fonte: 'cache_offline',
        erro: erroMsg
      };
    }

    if (!data) {
      return { boletins: [], fonte: 'supabase' };
    }

    // Mapear dados retornados do Supabase
    const boletinsRemotos: BoletimDeUrna[] = data.map((item: any) => {
      const buCompleto: BoletimDeUrna = item.dados_completos_json || {
        id: item.id,
        uf: item.uf,
        municipioCodigo: item.municipio_codigo,
        municipioNome: item.municipio_nome,
        zona: item.zona,
        secao: item.secao,
        idUrna: item.urna_id,
        eleitoresAptos: item.eleitores_aptos,
        comparecimento: item.comparecimento,
        abstencao: item.abstencao,
        fiscalNome: item.fiscal_nome,
        fiscalCargo: item.fiscal_cargo,
        hashAssinatura: item.hash_assinatura,
        createdAt: new Date(item.created_at).getTime(),
        syncStatus: 'synced',
        cargos: {},
        versaoQr: '',
        versaoUrna: '',
        pleito: '',
        fase: 1,
        dataHoraGeracao: '',
        dataHoraEncerramento: '',
        totalVotosNominais: 0,
        totalVotosLegenda: 0,
        totalVotosBrancos: 0,
        totalVotosNulos: 0,
        rawQrData: [],
        partesTotal: 1,
        partesRecebidas: [1]
      };
      
      buCompleto.syncStatus = 'synced';
      return buCompleto;
    });

    // Atualiza o cache local silenciosamente para manter cópia offline atualizada
    for (const bu of boletinsRemotos) {
      dbSalvarBoletim(bu).catch(() => {});
    }

    return {
      boletins: boletinsRemotos,
      fonte: 'supabase'
    };
  } catch (err: any) {
    console.error('FALHA DE REDE AO CONSULTAR SUPABASE:', err);
    const locais = await dbListarBoletins();
    return {
      boletins: locais,
      fonte: 'cache_offline',
      erro: `Erro de conexão: ${err?.message || err}`
    };
  }
}

/**
 * Exclui um cadastro do Supabase e do cache local.
 */
export async function excluirBoletimOnline(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABELA_BOLETINS)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('ERRO AO EXCLUIR NO SUPABASE:', error);
    throw new Error(mapearErroSupabase(error));
  }

  // Remove também do cache local
  await dbRemoverBoletim(id).catch(() => {});
}

/**
 * 5. GARANTIR SINCRONIZAÇÃO ENTRE CELULARES (REALTIME)
 * Escuta INSERT, UPDATE e DELETE na tabela boletins_urna via postgres_changes.
 */
export function assinarRealtimeBoletins(callbacks: {
  onInsert?: (bu: BoletimDeUrna) => void;
  onUpdate?: (bu: BoletimDeUrna) => void;
  onDelete?: (id: string) => void;
  onError?: (err: any) => void;
}): () => void {
  const channelName = `realtime_${TABELA_BOLETINS}_${Date.now()}`;
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABELA_BOLETINS
      },
      (payload) => {
        console.log('[REALTIME] Evento recebido:', payload.eventType, payload);

        if (payload.eventType === 'INSERT') {
          const novo = payload.new as any;
          const bu: BoletimDeUrna = novo.dados_completos_json || {
            id: novo.id,
            uf: novo.uf,
            municipioCodigo: novo.municipio_codigo,
            municipioNome: novo.municipio_nome,
            zona: novo.zona,
            secao: novo.secao,
            idUrna: novo.urna_id,
            comparecimento: novo.comparecimento,
            abstencao: novo.abstencao,
            eleitoresAptos: novo.eleitores_aptos,
            dados_completos_json: novo,
            syncStatus: 'synced',
            createdAt: new Date(novo.created_at).getTime(),
            cargos: {}
          };
          bu.syncStatus = 'synced';
          dbSalvarBoletim(bu).catch(() => {});
          callbacks.onInsert?.(bu);
        } else if (payload.eventType === 'UPDATE') {
          const atualizado = payload.new as any;
          const bu: BoletimDeUrna = atualizado.dados_completos_json || {
            id: atualizado.id,
            uf: atualizado.uf,
            municipioCodigo: atualizado.municipio_codigo,
            municipioNome: atualizado.municipio_nome,
            zona: atualizado.zona,
            secao: atualizado.secao,
            idUrna: atualizado.urna_id,
            comparecimento: atualizado.comparecimento,
            abstencao: atualizado.abstencao,
            eleitoresAptos: atualizado.eleitores_aptos,
            dados_completos_json: atualizado,
            syncStatus: 'synced',
            createdAt: new Date(atualizado.created_at).getTime(),
            cargos: {}
          };
          bu.syncStatus = 'synced';
          dbSalvarBoletim(bu).catch(() => {});
          callbacks.onUpdate?.(bu);
        } else if (payload.eventType === 'DELETE') {
          const id = (payload.old as any)?.id;
          if (id) {
            dbRemoverBoletim(id).catch(() => {});
            callbacks.onDelete?.(id);
          }
        }
      }
    )
    .subscribe((status, err) => {
      console.log('[REALTIME] Status da inscrição:', status);
      if (err) {
        console.error('[REALTIME] Erro no canal:', err);
        callbacks.onError?.(err);
      }
    });

  // Retorna função para desmontar canal adequadamente
  return () => {
    console.log('[REALTIME] Desinscrevendo canal:', channelName);
    supabase.removeChannel(channel);
  };
}

/**
 * Sincroniza todos os boletins locais pendentes para o Supabase.
 */
export async function sincronizarBoletinsPendentes(): Promise<{ enviados: number; falhas: number }> {
  const locais = await dbListarBoletins();
  const pendentes = locais.filter(b => b.syncStatus !== 'synced');
  
  let enviados = 0;
  let falhas = 0;

  for (const bu of pendentes) {
    try {
      await cadastrarBoletimOnline(bu);
      enviados++;
    } catch (e) {
      falhas++;
      console.error(`Falha ao sincronizar BU pendente ${bu.id}:`, e);
    }
  }

  return { enviados, falhas };
}
