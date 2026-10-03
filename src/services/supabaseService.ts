import { BoletimDeUrna, SupabaseConfig } from '../types';
import { 
  cadastrarBoletimOnline, 
  testarConectividadeSupabase, 
  sincronizarBoletinsPendentes,
  TABELA_BOLETINS 
} from './cadastros';

export const DEFAULT_CONFIG: SupabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  tableName: TABELA_BOLETINS,
  autoSync: true,
};

const STORAGE_KEY_SUPABASE = 'bu_leitor_supabase_config';

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
 * Testa conectividade com o Supabase utilizando a camada centralizada
 */
export async function testarConexaoSupabase(_config?: SupabaseConfig): Promise<{ sucesso: boolean; mensagem: string }> {
  const res = await testarConectividadeSupabase();
  return {
    sucesso: res.online,
    mensagem: `[${res.status}] ${res.mensagem}`
  };
}

/**
 * Sincroniza um Boletim de Urna diretamente no Supabase PostgreSQL
 */
export async function sincronizarBoletim(bu: BoletimDeUrna): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    await cadastrarBoletimOnline(bu);
    return { sucesso: true, mensagem: `Boletim ${bu.id} gravado no Supabase com sucesso.` };
  } catch (err: any) {
    return { sucesso: false, mensagem: err?.message || 'Falha ao sincronizar com Supabase.' };
  }
}

/**
 * Sincroniza todos os boletins pendentes
 */
export async function sincronizarTodosPendentes(_boletins?: BoletimDeUrna[]): Promise<{ sincronizados: number; erros: number }> {
  const res = await sincronizarBoletinsPendentes();
  return { sincronizados: res.enviados, erros: res.falhas };
}
