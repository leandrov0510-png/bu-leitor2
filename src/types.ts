export interface CandidatoResultado {
  numero: string;
  nome: string;
  partido: string;
  siglaPartido: string;
  votos: number;
  porcentagem?: number;
}

export interface CargoResultado {
  codigoCargo: string;
  nomeCargo: string;
  votosNominais: number;
  votosLegenda: number;
  votosBranco: number;
  votosNulo: number;
  totalVotos: number;
  candidatos: CandidatoResultado[];
}

export interface BoletimDeUrna {
  id: string; // ex: "SP-71072-0001-0042" (UF-MUNI-ZONA-SECAO)
  versaoQr: string;
  versaoUrna: string;
  pleito: string;
  fase: number; // 1 = 1º Turno, 2 = 2º Turno
  uf: string;
  municipioCodigo: string;
  municipioNome: string;
  zona: string;
  secao: string;
  idUrna: string;
  idCarga?: string;
  dataHoraGeracao: string;
  dataHoraEncerramento: string;
  eleitoresAptos: number;
  comparecimento: number;
  abstencao: number;
  totalVotosNominais: number;
  totalVotosLegenda: number;
  totalVotosBrancos: number;
  totalVotosNulos: number;
  hashAssinatura: string;
  cargos: Record<string, CargoResultado>; // key is codigoCargo, e.g. "11" (Prefeito), "13" (Vereador)
  rawQrData: string[];
  partesTotal: number;
  partesRecebidas: number[];
  createdAt: number;
  syncStatus: 'pending' | 'synced' | 'local_only' | 'error';
  fiscalNome?: string;
  fiscalCargo?: string;
  observacoes?: string;
}

export interface QrParseResult {
  sucesso: boolean;
  completo: boolean;
  boletim?: BoletimDeUrna;
  parteAtual?: number;
  totalPartes?: number;
  chaveUnica?: string;
  mensagem: string;
  erro?: string;
  dadosParciais?: Partial<BoletimDeUrna>;
}

export interface AuditLog {
  id?: number;
  timestamp: number;
  action: 'SCAN' | 'SYNC' | 'DELETE' | 'EXPORT' | 'LOGIN' | 'EDIT';
  buId?: string;
  details: string;
  usuario?: string;
}

export interface CandidatoFederalAlvo {
  numero: string;
  nome: string;
  partido: string;
  sigla: string;
  metaVotos: number;
}

export interface UserSession {
  autenticado: boolean;
  nome: string;
  perfil: 'Auditor Eleitoral' | 'Fiscal Partidário' | 'Delegado' | 'Administrador' | 'Convidado';
  partidoOuEntidade?: string;
  token?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
  autoSync: boolean;
}
