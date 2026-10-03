import Dexie, { Table } from 'dexie';
import { BoletimDeUrna, AuditLog, CandidatoFederalAlvo } from '../types';

export interface AppSettingRecord {
  key: string;
  value: any;
}

export class BuDexieDatabase extends Dexie {
  boletins!: Table<BoletimDeUrna, string>;
  auditLogs!: Table<AuditLog, number>;
  appSettings!: Table<AppSettingRecord, string>;

  constructor() {
    super('BuLeitorTseDB');
    this.version(1).stores({
      boletins: 'id, uf, municipioNome, zona, secao, syncStatus, createdAt',
      auditLogs: '++id, timestamp, action, buId',
      appSettings: 'key'
    });
  }
}

export const db = new BuDexieDatabase();

// Candidato Federal Alvo padrão de SP (configurável pelo Administrador)
export const CANDIDATO_ALVO_DEFAULT: CandidatoFederalAlvo = {
  numero: '2200',
  nome: 'CANDIDATO FEDERAL ALVO SP',
  partido: 'Partido Liberal',
  sigla: 'PL',
  metaVotos: 120000
};

export async function dbObterCandidatoAlvo(): Promise<CandidatoFederalAlvo> {
  try {
    const setting = await db.appSettings.get('candidato_alvo');
    if (setting && setting.value) {
      return setting.value;
    }
  } catch {}
  return CANDIDATO_ALVO_DEFAULT;
}

export async function dbSalvarCandidatoAlvo(candidato: CandidatoFederalAlvo): Promise<void> {
  await db.appSettings.put({ key: 'candidato_alvo', value: candidato });
}

// ==========================================
// GERENCIAMENTO DE SENHA DO ADMINISTRADOR
// ==========================================
export const SENHA_ADMIN_PADRAO = 'admin2026';

export async function dbObterSenhaAdmin(): Promise<string> {
  try {
    const setting = await db.appSettings.get('admin_password');
    if (setting && typeof setting.value === 'string' && setting.value.trim()) {
      return setting.value;
    }
  } catch {}
  return SENHA_ADMIN_PADRAO;
}

export async function dbSalvarSenhaAdmin(novaSenha: string): Promise<void> {
  if (!novaSenha || novaSenha.trim().length < 4) {
    throw new Error('A nova senha deve possuir pelo menos 4 caracteres.');
  }
  await db.appSettings.put({ key: 'admin_password', value: novaSenha.trim() });
  await dbRegistrarLog({
    timestamp: Date.now(),
    action: 'EDIT',
    details: 'Senha do Administrador atualizada com sucesso.'
  });
}

export async function dbVerificarSenhaAdmin(senhaDigitada: string): Promise<boolean> {
  const senhaCorreta = await dbObterSenhaAdmin();
  return senhaDigitada.trim() === senhaCorreta;
}

// ==========================================
// GERENCIAMENTO DA FOTO DE CAPA (ADMINISTRADOR)
// ==========================================
export async function dbObterFotoCapa(): Promise<string | null> {
  try {
    const setting = await db.appSettings.get('foto_capa');
    if (setting && typeof setting.value === 'string' && setting.value.trim()) {
      return setting.value;
    }
    const local = localStorage.getItem('bu_leitor_capa_sp');
    if (local && local.trim()) {
      return local;
    }
  } catch {}
  return null;
}

export async function dbSalvarFotoCapa(fotoBase64OuUrl: string): Promise<void> {
  await db.appSettings.put({ key: 'foto_capa', value: fotoBase64OuUrl });
  try {
    localStorage.setItem('bu_leitor_capa_sp', fotoBase64OuUrl);
  } catch {}
  await dbRegistrarLog({
    timestamp: Date.now(),
    action: 'EDIT',
    details: 'Foto de capa atualizada pelo Administrador.'
  });
}

export async function dbRestaurarFotoCapaPadrao(): Promise<void> {
  await db.appSettings.delete('foto_capa');
  try {
    localStorage.removeItem('bu_leitor_capa_sp');
  } catch {}
  await dbRegistrarLog({
    timestamp: Date.now(),
    action: 'EDIT',
    details: 'Foto de capa restaurada para o padrão pelo Administrador.'
  });
}

// ==========================================
// PREVENÇÃO DE QR CODE DUPLICADO
// ==========================================
export interface VerificacaoDuplicataResult {
  isDuplicata: boolean;
  motivo?: string;
  buExistente?: BoletimDeUrna;
}

export async function dbVerificarDuplicata(bu: BoletimDeUrna): Promise<VerificacaoDuplicataResult> {
  // 1. Verificação por ID canônico (Ex: SP-71072-0001-0042)
  const porId = await db.boletins.get(bu.id);
  if (porId) {
    return {
      isDuplicata: true,
      motivo: `Boletim da Zona ${porId.zona}, Seção ${porId.secao} (${porId.municipioNome}/SP) já foi registrado anteriormente.`,
      buExistente: porId
    };
  }

  // 2. Verificação pela chave eleitoral única: Município + Zona + Seção de SP
  const todos = await db.boletins.toArray();
  const porSecao = todos.find(b => 
    b.uf.toUpperCase() === bu.uf.toUpperCase() &&
    b.municipioCodigo === bu.municipioCodigo &&
    b.zona === bu.zona &&
    b.secao === bu.secao
  );
  if (porSecao) {
    return {
      isDuplicata: true,
      motivo: `A Seção ${porSecao.secao} da Zona ${porSecao.zona} (${porSecao.municipioNome}/SP) já possui Boletim de Urna registrado.`,
      buExistente: porSecao
    };
  }

  // 3. Verificação por número de série físico da Urna Eletrônica (idUrna)
  if (bu.idUrna && bu.idUrna.trim()) {
    const porUrna = todos.find(b => b.idUrna === bu.idUrna);
    if (porUrna) {
      return {
        isDuplicata: true,
        motivo: `A Urna Eletrônica nº ${bu.idUrna} (Zona ${porUrna.zona}, Seção ${porUrna.secao}) já foi processada anteriormente.`,
        buExistente: porUrna
      };
    }
  }

  return { isDuplicata: false };
}

/**
 * Salva um Boletim de Urna no IndexedDB (somente SP), rejeitando qualquer duplicata
 */
export async function dbSalvarBoletim(bu: BoletimDeUrna): Promise<string> {
  const check = await dbVerificarDuplicata(bu);
  if (check.isDuplicata) {
    throw new Error(`DUPLICATA REJEITADA: ${check.motivo}`);
  }

  await db.boletins.put(bu);
  await dbRegistrarLog({
    timestamp: Date.now(),
    action: 'SCAN',
    buId: bu.id,
    details: `BU ${bu.id} gravado (${bu.municipioNome}/SP - Z-${bu.zona} S-${bu.secao}) com ${bu.comparecimento} votos.`
  });
  return bu.id;
}

/**
 * Obtém todos os Boletins de Urna salvos no IndexedDB (filtrados para SP)
 */
export async function dbListarBoletins(): Promise<BoletimDeUrna[]> {
  try {
    const lista = await db.boletins.where('uf').equals('SP').reverse().sortBy('createdAt');
    if (lista.length === 0) {
      // Retorna todos caso não haja índice estrito
      const todos = await db.boletins.orderBy('createdAt').reverse().toArray();
      return todos.filter(b => b.uf === 'SP');
    }
    return lista;
  } catch (err) {
    console.error('Erro ao ler boletins do Dexie:', err);
    return [];
  }
}

/**
 * Obtém um Boletim de Urna específico por ID
 */
export async function dbObterBoletim(id: string): Promise<BoletimDeUrna | undefined> {
  return await db.boletins.get(id);
}

/**
 * Remove um Boletim de Urna
 */
export async function dbRemoverBoletim(id: string): Promise<void> {
  await db.boletins.delete(id);
  await dbRegistrarLog({
    timestamp: Date.now(),
    action: 'DELETE',
    buId: id,
    details: `BU ${id} removido da base.`
  });
}

/**
 * Atualiza status de sincronização
 */
export async function dbAtualizarStatusSync(id: string, status: 'synced' | 'pending' | 'local_only' | 'error'): Promise<void> {
  await db.boletins.update(id, { syncStatus: status });
}

/**
 * Limpa todos os boletins do banco
 */
export async function dbLimparTudo(): Promise<void> {
  await db.boletins.clear();
  await dbRegistrarLog({
    timestamp: Date.now(),
    action: 'DELETE',
    details: 'Base de dados de BUs reiniciada pelo Administrador.'
  });
}

/**
 * Registra log na tabela de auditoria
 */
export async function dbRegistrarLog(log: Omit<AuditLog, 'id'>): Promise<number> {
  try {
    return await db.auditLogs.add(log);
  } catch {
    return 0;
  }
}

/**
 * Gera BUs realistas exclusivos do ESTADO DE SÃO PAULO (SP)
 */
export function gerarBoletinsEstadoSaoPaulo(): BoletimDeUrna[] {
  // BU 1: São Paulo Capital - Zona 1 (Bela Vista)
  const bu1: BoletimDeUrna = {
    id: 'SP-71072-0001-0042',
    versaoQr: '02.00',
    versaoUrna: '08.26.00',
    pleito: 'ELEIÇÕES GERAIS 2026',
    fase: 1,
    uf: 'SP',
    municipioCodigo: '71072',
    municipioNome: 'SÃO PAULO',
    zona: '0001',
    secao: '0042',
    idUrna: '01849204',
    idCarga: '91823746',
    dataHoraGeracao: '04/10/2026 17:04:12',
    dataHoraEncerramento: '04/10/2026 17:00:00',
    eleitoresAptos: 395,
    comparecimento: 332,
    abstencao: 63,
    totalVotosNominais: 960,
    totalVotosLegenda: 20,
    totalVotosBrancos: 10,
    totalVotosNulos: 6,
    hashAssinatura: 'SHA256:7B9F1D83E9C421A0F5B6E8D7C4A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9',
    partesTotal: 1,
    partesRecebidas: [1],
    createdAt: Date.now() - 3600000 * 3,
    syncStatus: 'synced',
    fiscalNome: 'Fiscal Zona 001 SP',
    rawQrData: [],
    cargos: {
      '6': {
        codigoCargo: '6',
        nomeCargo: 'Deputado Federal',
        votosNominais: 320,
        votosLegenda: 8,
        votosBranco: 2,
        votosNulo: 2,
        totalVotos: 332,
        candidatos: [
          { numero: '2200', nome: 'CANDIDATO FEDERAL ALVO SP', partido: 'PL', siglaPartido: 'PL', votos: 148, porcentagem: 45.12 },
          { numero: '5050', nome: 'ERIKA HILTON', partido: 'PSOL', siglaPartido: 'PSOL', votos: 75, porcentagem: 22.86 },
          { numero: '4444', nome: 'KIM KATAGUIRI', partido: 'UNIÃO', siglaPartido: 'UNIÃO', votos: 42, porcentagem: 12.80 },
          { numero: '1300', nome: 'CANDIDATO PT SP', partido: 'PT', siglaPartido: 'PT', votos: 35, porcentagem: 10.67 },
          { numero: '1515', nome: 'BALEIA ROSSI', partido: 'MDB', siglaPartido: 'MDB', votos: 20, porcentagem: 6.10 }
        ]
      },
      '1': {
        codigoCargo: '1',
        nomeCargo: 'Presidente',
        votosNominais: 326,
        votosLegenda: 0,
        votosBranco: 3,
        votosNulo: 3,
        totalVotos: 332,
        candidatos: [
          { numero: '22', nome: 'TARCÍSIO DE FREITAS', partido: 'PL', siglaPartido: 'PL', votos: 170, porcentagem: 52.14 },
          { numero: '13', nome: 'LUIZ INÁCIO LULA DA SILVA', partido: 'PT', siglaPartido: 'PT', votos: 132, porcentagem: 40.49 },
          { numero: '30', nome: 'ROMEU ZEMA', partido: 'NOVO', siglaPartido: 'NOVO', votos: 16, porcentagem: 4.90 },
          { numero: '15', nome: 'SIMONE TEBET', partido: 'MDB', siglaPartido: 'MDB', votos: 8, porcentagem: 2.45 }
        ]
      },
      '3': {
        codigoCargo: '3',
        nomeCargo: 'Governador',
        votosNominais: 322,
        votosLegenda: 0,
        votosBranco: 6,
        votosNulo: 4,
        totalVotos: 332,
        candidatos: [
          { numero: '10', nome: 'MARCOS PEREIRA', partido: 'Republicanos', siglaPartido: 'REPUBLICANOS', votos: 162, porcentagem: 50.31 },
          { numero: '130', nome: 'FERNANDO HADDAD', partido: 'PT', siglaPartido: 'PT', votos: 134, porcentagem: 41.61 },
          { numero: '400', nome: 'MÁRCIO FRANÇA', partido: 'PSB', siglaPartido: 'PSB', votos: 26, porcentagem: 8.07 }
        ]
      }
    }
  };

  // BU 2: São Paulo Capital - Zona 2 (Santo Amaro)
  const bu2: BoletimDeUrna = {
    id: 'SP-71072-0002-0110',
    versaoQr: '02.00',
    versaoUrna: '08.26.00',
    pleito: 'ELEIÇÕES GERAIS 2026',
    fase: 1,
    uf: 'SP',
    municipioCodigo: '71072',
    municipioNome: 'SÃO PAULO',
    zona: '0002',
    secao: '0110',
    idUrna: '01889922',
    idCarga: '91823747',
    dataHoraGeracao: '04/10/2026 17:05:22',
    dataHoraEncerramento: '04/10/2026 17:00:00',
    eleitoresAptos: 410,
    comparecimento: 345,
    abstencao: 65,
    totalVotosNominais: 990,
    totalVotosLegenda: 22,
    totalVotosBrancos: 12,
    totalVotosNulos: 6,
    hashAssinatura: 'SHA256:8C0A2E94F0D532B1A6C7F9E8D5B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8B0',
    partesTotal: 1,
    partesRecebidas: [1],
    createdAt: Date.now() - 3600000 * 2.5,
    syncStatus: 'synced',
    fiscalNome: 'Fiscal Santo Amaro SP',
    rawQrData: [],
    cargos: {
      '6': {
        codigoCargo: '6',
        nomeCargo: 'Deputado Federal',
        votosNominais: 334,
        votosLegenda: 6,
        votosBranco: 3,
        votosNulo: 2,
        totalVotos: 345,
        candidatos: [
          { numero: '2200', nome: 'CANDIDATO FEDERAL ALVO SP', partido: 'PL', siglaPartido: 'PL', votos: 162, porcentagem: 47.64 },
          { numero: '5050', nome: 'ERIKA HILTON', partido: 'PSOL', siglaPartido: 'PSOL', votos: 82, porcentagem: 24.11 },
          { numero: '4444', nome: 'KIM KATAGUIRI', partido: 'UNIÃO', siglaPartido: 'UNIÃO', votos: 46, porcentagem: 13.52 },
          { numero: '1300', nome: 'CANDIDATO PT SP', partido: 'PT', siglaPartido: 'PT', votos: 30, porcentagem: 8.82 },
          { numero: '1515', nome: 'BALEIA ROSSI', partido: 'MDB', siglaPartido: 'MDB', votos: 14, porcentagem: 4.11 }
        ]
      },
      '1': {
        codigoCargo: '1',
        nomeCargo: 'Presidente',
        votosNominais: 340,
        votosLegenda: 0,
        votosBranco: 3,
        votosNulo: 2,
        totalVotos: 345,
        candidatos: [
          { numero: '22', nome: 'TARCÍSIO DE FREITAS', partido: 'PL', siglaPartido: 'PL', votos: 185, porcentagem: 54.41 },
          { numero: '13', nome: 'LUIZ INÁCIO LULA DA SILVA', partido: 'PT', siglaPartido: 'PT', votos: 135, porcentagem: 39.70 },
          { numero: '30', nome: 'ROMEU ZEMA', partido: 'NOVO', siglaPartido: 'NOVO', votos: 20, porcentagem: 5.88 }
        ]
      }
    }
  };

  // BU 3: Campinas / SP
  const bu3: BoletimDeUrna = {
    id: 'SP-62910-0010-0055',
    versaoQr: '02.00',
    versaoUrna: '08.26.00',
    pleito: 'ELEIÇÕES GERAIS 2026',
    fase: 1,
    uf: 'SP',
    municipioCodigo: '62910',
    municipioNome: 'CAMPINAS',
    zona: '0010',
    secao: '0055',
    idUrna: '02491201',
    idCarga: '89102934',
    dataHoraGeracao: '04/10/2026 17:03:45',
    dataHoraEncerramento: '04/10/2026 17:00:00',
    eleitoresAptos: 388,
    comparecimento: 326,
    abstencao: 62,
    totalVotosNominais: 940,
    totalVotosLegenda: 18,
    totalVotosBrancos: 12,
    totalVotosNulos: 6,
    hashAssinatura: 'SHA256:5D9A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A',
    partesTotal: 1,
    partesRecebidas: [1],
    createdAt: Date.now() - 3600000 * 2,
    syncStatus: 'synced',
    fiscalNome: 'Fiscal Campinas Região',
    rawQrData: [],
    cargos: {
      '6': {
        codigoCargo: '6',
        nomeCargo: 'Deputado Federal',
        votosNominais: 316,
        votosLegenda: 6,
        votosBranco: 2,
        votosNulo: 2,
        totalVotos: 326,
        candidatos: [
          { numero: '2200', nome: 'CANDIDATO FEDERAL ALVO SP', partido: 'PL', siglaPartido: 'PL', votos: 154, porcentagem: 47.82 },
          { numero: '4444', nome: 'KIM KATAGUIRI', partido: 'UNIÃO', siglaPartido: 'UNIÃO', votos: 58, porcentagem: 18.01 },
          { numero: '5050', nome: 'ERIKA HILTON', partido: 'PSOL', siglaPartido: 'PSOL', votos: 54, porcentagem: 16.77 },
          { numero: '1300', nome: 'CANDIDATO PT SP', partido: 'PT', siglaPartido: 'PT', votos: 36, porcentagem: 11.18 },
          { numero: '1515', nome: 'BALEIA ROSSI', partido: 'MDB', siglaPartido: 'MDB', votos: 20, porcentagem: 6.21 }
        ]
      }
    }
  };

  // BU 4: Ribeirão Preto / SP
  const bu4: BoletimDeUrna = {
    id: 'SP-68713-0005-0080',
    versaoQr: '02.00',
    versaoUrna: '08.26.00',
    pleito: 'ELEIÇÕES GERAIS 2026',
    fase: 1,
    uf: 'SP',
    municipioCodigo: '68713',
    municipioNome: 'RIBEIRÃO PRETO',
    zona: '0005',
    secao: '0080',
    idUrna: '02891044',
    idCarga: '78291034',
    dataHoraGeracao: '04/10/2026 17:06:18',
    dataHoraEncerramento: '04/10/2026 17:00:00',
    eleitoresAptos: 402,
    comparecimento: 338,
    abstencao: 64,
    totalVotosNominais: 970,
    totalVotosLegenda: 20,
    totalVotosBrancos: 14,
    totalVotosNulos: 6,
    hashAssinatura: 'SHA256:3A5B7C9D1E2F4A6B8C0D2E4F6A8B0C2D4E6F8A0B2C4D6E8F0A2B4C6D8E0F2A4B',
    partesTotal: 1,
    partesRecebidas: [1],
    createdAt: Date.now() - 3600000 * 1.5,
    syncStatus: 'synced',
    fiscalNome: 'Fiscal Ribeirão Preto',
    rawQrData: [],
    cargos: {
      '6': {
        codigoCargo: '6',
        nomeCargo: 'Deputado Federal',
        votosNominais: 326,
        votosLegenda: 8,
        votosBranco: 2,
        votosNulo: 2,
        totalVotos: 338,
        candidatos: [
          { numero: '2200', nome: 'CANDIDATO FEDERAL ALVO SP', partido: 'PL', siglaPartido: 'PL', votos: 172, porcentagem: 51.49 },
          { numero: '1515', nome: 'BALEIA ROSSI', partido: 'MDB', siglaPartido: 'MDB', votos: 65, porcentagem: 19.46 },
          { numero: '4444', nome: 'KIM KATAGUIRI', partido: 'UNIÃO', siglaPartido: 'UNIÃO', votos: 45, porcentagem: 13.47 },
          { numero: '5050', nome: 'ERIKA HILTON', partido: 'PSOL', siglaPartido: 'PSOL', votos: 30, porcentagem: 8.98 }
        ]
      }
    }
  };

  // BU 5: Santos / SP
  const bu5: BoletimDeUrna = {
    id: 'SP-70971-0003-0019',
    versaoQr: '02.00',
    versaoUrna: '08.26.00',
    pleito: 'ELEIÇÕES GERAIS 2026',
    fase: 1,
    uf: 'SP',
    municipioCodigo: '70971',
    municipioNome: 'SANTOS',
    zona: '0003',
    secao: '0019',
    idUrna: '03102919',
    idCarga: '99201934',
    dataHoraGeracao: '04/10/2026 17:04:40',
    dataHoraEncerramento: '04/10/2026 17:00:00',
    eleitoresAptos: 390,
    comparecimento: 325,
    abstencao: 65,
    totalVotosNominais: 930,
    totalVotosLegenda: 18,
    totalVotosBrancos: 10,
    totalVotosNulos: 6,
    hashAssinatura: 'SHA256:9F8E7D6C5B4A3B2C1D0E9F8A7B6C5D4E3F2A1B0C9D8E7F6A5B4C3D2E1F0A9B8C',
    partesTotal: 1,
    partesRecebidas: [1],
    createdAt: Date.now() - 3600000 * 1,
    syncStatus: 'synced',
    fiscalNome: 'Fiscal Baixada Santista',
    rawQrData: [],
    cargos: {
      '6': {
        codigoCargo: '6',
        nomeCargo: 'Deputado Federal',
        votosNominais: 315,
        votosLegenda: 6,
        votosBranco: 2,
        votosNulo: 2,
        totalVotos: 325,
        candidatos: [
          { numero: '2200', nome: 'CANDIDATO FEDERAL ALVO SP', partido: 'PL', siglaPartido: 'PL', votos: 158, porcentagem: 49.22 },
          { numero: '5050', nome: 'ERIKA HILTON', partido: 'PSOL', siglaPartido: 'PSOL', votos: 68, porcentagem: 21.18 },
          { numero: '4444', nome: 'KIM KATAGUIRI', partido: 'UNIÃO', siglaPartido: 'UNIÃO', votos: 48, porcentagem: 14.95 },
          { numero: '1300', nome: 'CANDIDATO PT SP', partido: 'PT', siglaPartido: 'PT', votos: 32, porcentagem: 9.97 }
        ]
      }
    }
  };

  return [bu1, bu2, bu3, bu4, bu5];
}

/**
 * Seed inicial exclusivo do Estado de São Paulo (SP)
 */
export async function dbInicializarDadosExemplo(): Promise<void> {
  try {
    const total = await db.boletins.count();
    if (total > 0) return;

    const boletinsSP = gerarBoletinsEstadoSaoPaulo();
    await db.boletins.bulkPut(boletinsSP);
    await dbSalvarCandidatoAlvo(CANDIDATO_ALVO_DEFAULT);
    await dbRegistrarLog({
      timestamp: Date.now(),
      action: 'SCAN',
      details: 'Base de dados inicial configurada para o ESTADO DE SÃO PAULO (Deputado Federal Alvo & Votação Geral SP).'
    });
  } catch (err) {
    console.error('Falha ao inicializar dados no Dexie:', err);
  }
}

/**
 * Restaura os dados oficiais do Estado de São Paulo
 */
export async function dbCarregarDadosEleicoes2026(): Promise<void> {
  await db.boletins.clear();
  const boletinsSP = gerarBoletinsEstadoSaoPaulo();
  await db.boletins.bulkPut(boletinsSP);
  await dbSalvarCandidatoAlvo(CANDIDATO_ALVO_DEFAULT);
  await dbRegistrarLog({
    timestamp: Date.now(),
    action: 'SCAN',
    details: 'Base de dados recarregada para o ESTADO DE SÃO PAULO (Deputado Federal Alvo).'
  });
}
