export const TSE_CARGOS: Record<string, string> = {
  '1': 'Presidente',
  '3': 'Governador',
  '5': 'Senador (1ª Vaga)',
  '51': 'Senador (2ª Vaga)',
  '6': 'Deputado Federal',
  '7': 'Deputado Estadual',
  '8': 'Deputado Distrital',
  '11': 'Prefeito',
  '12': 'Vice-Prefeito',
  '13': 'Vereador'
};

// Known candidates catalogue for rich display and realistic TSE simulations (Eleições Gerais 2026 & Municipais)
export const CANDIDATOS_CONHECIDOS: Record<string, { nome: string; partido: string; sigla: string; cargoPadrao?: string }> = {
  // === ELEIÇÕES GERAIS 2026 - PRESIDENTE DA REPÚBLICA (Cargo 1) ===
  '13': { nome: 'LUIZ INÁCIO LULA DA SILVA', partido: 'Federação Brasil da Esperança (PT/PCdoB/PV)', sigla: 'PT', cargoPadrao: '1' },
  '22': { nome: 'TARCÍSIO DE FREITAS', partido: 'Partido Liberal', sigla: 'PL', cargoPadrao: '1' },
  '55': { nome: 'GILBERTO KASSAB / PSD', partido: 'Partido Social Democrático', sigla: 'PSD', cargoPadrao: '1' },
  '15': { nome: 'SIMONE TEBET', partido: 'Movimento Democrático Brasileiro', sigla: 'MDB', cargoPadrao: '1' },
  '12': { nome: 'CIRO GOMES', partido: 'Partido Democrático Trabalhista', sigla: 'PDT', cargoPadrao: '1' },
  '30': { nome: 'ROMEU ZEMA', partido: 'Partido Novo', sigla: 'NOVO', cargoPadrao: '1' },
  '44': { nome: 'RONALDO CAIADO', partido: 'União Brasil', sigla: 'UNIÃO', cargoPadrao: '1' },
  '45': { nome: 'EDUARDO LEITE', partido: 'Partido da Social Democracia Brasileira', sigla: 'PSDB', cargoPadrao: '1' },
  '50': { nome: 'GUILHERME BOULOS', partido: 'Federação PSOL REDE', sigla: 'PSOL', cargoPadrao: '1' },
  '28': { nome: 'PABLO MARÇAL', partido: 'Partido Renovador Trabalhista Brasileiro', sigla: 'PRTB', cargoPadrao: '1' },
  '16': { nome: 'VERA LÚCIA', partido: 'Partido Socialista dos Trabalhadores Unificado', sigla: 'PSTU', cargoPadrao: '1' },
  '80': { nome: 'LEO PÉRICLES', partido: 'Unidade Popular', sigla: 'UP', cargoPadrao: '1' },

  // === GOVERNADOR SP 2026 (Cargo 3) ===
  '10': { nome: 'MARCOS PEREIRA / REPUBLICANOS', partido: 'Republicanos', sigla: 'REPUBLICANOS', cargoPadrao: '3' },
  '130': { nome: 'FERNANDO HADDAD', partido: 'Partido dos Trabalhadores', sigla: 'PT', cargoPadrao: '3' },
  '150': { nome: 'RICARDO NUNES', partido: 'Movimento Democrático Brasileiro', sigla: 'MDB', cargoPadrao: '3' },
  '400': { nome: 'MÁRCIO FRANÇA', partido: 'Partido Socialista Brasileiro', sigla: 'PSB', cargoPadrao: '3' },
  '220': { nome: 'RICARDO SALLES', partido: 'Partido Liberal', sigla: 'PL', cargoPadrao: '3' },

  // === GOVERNADOR RJ 2026 (Cargo 3) ===
  '550': { nome: 'EDUARDO PAES', partido: 'Partido Social Democrático', sigla: 'PSD', cargoPadrao: '3' },
  '222': { nome: 'CLÁUDIO CASTRO / SUCESSÃO', partido: 'Partido Liberal', sigla: 'PL', cargoPadrao: '3' },
  '133': { nome: 'FABIANO CONTARATO / CANDIDATO RJ', partido: 'Partido dos Trabalhadores', sigla: 'PT', cargoPadrao: '3' },

  // === SENADOR 2026 (Cargo 5 - 2 vagas em 2026) ===
  '2222': { nome: 'EDUARDO BOLSONARO (SENADO SP)', partido: 'Partido Liberal', sigla: 'PL', cargoPadrao: '5' },
  '1313': { nome: 'ALEXANDRE PADILHA (SENADO SP)', partido: 'Partido dos Trabalhadores', sigla: 'PT', cargoPadrao: '5' },
  '4040': { nome: 'TABATA AMARAL (SENADO SP)', partido: 'Partido Socialista Brasileiro', sigla: 'PSB', cargoPadrao: '5' },
  '1515': { nome: 'BALEIA ROSSI (SENADO SP)', partido: 'MDB', sigla: 'MDB', cargoPadrao: '5' },
  '3030': { nome: 'MARCEL VAN HATTEM (SENADO RS)', partido: 'Partido Novo', sigla: 'NOVO', cargoPadrao: '5' },

  // === DEPUTADOS FEDERAIS 2026 (Cargo 6) ===
  '2200': { nome: 'NIKOLAS FERREIRA (DEP. FEDERAL MG)', partido: 'Partido Liberal', sigla: 'PL', cargoPadrao: '6' },
  '5050': { nome: 'ERIKA HILTON (DEP. FEDERAL SP)', partido: 'PSOL', sigla: 'PSOL', cargoPadrao: '6' },
  '1300': { nome: 'GLEISI HOFFMANN (DEP. FEDERAL PR)', partido: 'PT', sigla: 'PT', cargoPadrao: '6' },
  '4444': { nome: 'KIM KATAGUIRI (DEP. FEDERAL SP)', partido: 'União Brasil', sigla: 'UNIÃO', cargoPadrao: '6' },
  '1111': { nome: 'ARTHUR LIRA (DEP. FEDERAL AL)', partido: 'Progressistas', sigla: 'PP', cargoPadrao: '6' },
  '5555': { nome: 'HUGO MOTTA (DEP. FEDERAL PB)', partido: 'Republicanos', sigla: 'REPUBLICANOS', cargoPadrao: '6' },

  // === DEPUTADOS ESTADUAIS 2026 (Cargo 7) ===
  '44444': { nome: 'LUCAS PAVANATO', partido: 'Partido Liberal', sigla: 'PL', cargoPadrao: '7' },
  '50000': { nome: 'ANA CAROLINA OLIVEIRA', partido: 'Podemos', sigla: 'PODE', cargoPadrao: '7' },
  '50123': { nome: 'AMANDA PASCHOAL', partido: 'PSOL', sigla: 'PSOL', cargoPadrao: '7' },
  '15555': { nome: 'MILTON LEITE', partido: 'União Brasil', sigla: 'UNIÃO', cargoPadrao: '7' },
  '30123': { nome: 'RUBINHO NUNES', partido: 'União Brasil', sigla: 'UNIÃO', cargoPadrao: '7' },
  '13123': { nome: 'LUNA ZARATTINI', partido: 'Partido dos Trabalhadores', sigla: 'PT', cargoPadrao: '7' },
  '22123': { nome: 'CONTE LOPES', partido: 'Partido Liberal', sigla: 'PL', cargoPadrao: '7' },
  '10123': { nome: 'ALTAIR MORAES', partido: 'Republicanos', sigla: 'REPUBLICANOS', cargoPadrao: '7' }
};

export function obterDadosCandidato(numero: string, codigoCargo: string = '1') {
  if (CANDIDATOS_CONHECIDOS[numero]) {
    return CANDIDATOS_CONHECIDOS[numero];
  }

  // Extrai sigla partidária padrão pelos 2 primeiros dígitos (legenda eleitoral)
  const prefixo = numero.slice(0, 2);
  const legendas: Record<string, string> = {
    '10': 'REPUBLICANOS',
    '11': 'PP',
    '12': 'PDT',
    '13': 'PT',
    '14': 'PRD',
    '15': 'MDB',
    '16': 'PSTU',
    '18': 'REDE',
    '20': 'PODE',
    '21': 'PCB',
    '22': 'PL',
    '23': 'CIDADANIA',
    '25': 'PRD',
    '27': 'DC',
    '28': 'PRTB',
    '29': 'PCO',
    '30': 'NOVO',
    '33': 'MOBILIZA',
    '35': 'PMB',
    '36': 'AGIR',
    '40': 'PSB',
    '43': 'PV',
    '44': 'UNIÃO',
    '45': 'PSDB',
    '50': 'PSOL',
    '55': 'PSD',
    '65': 'PCdoB',
    '70': 'AVANTE',
    '77': 'SOLIDARIEDADE',
    '80': 'UP'
  };

  const sigla = legendas[prefixo] || `PARTIDO ${prefixo}`;
  const nomeCargo = TSE_CARGOS[codigoCargo] || 'Candidato';

  return {
    nome: `${nomeCargo.toUpperCase()} ${numero}`,
    partido: `Coligação / Partido ${sigla}`,
    sigla
  };
}
