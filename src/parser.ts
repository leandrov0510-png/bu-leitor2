import { BoletimDeUrna, CargoResultado, CandidatoResultado, QrParseResult } from './types';
import { TSE_CARGOS, obterDadosCandidato } from './data/tseReferenceData';

// Buffer in memory to reassemble multi-part QR codes
interface MultiPartBufferItem {
  id: string; // key e.g. "SP-71072-0001-0042" or hash
  totalParts: number;
  parts: Record<number, string>;
  lastUpdated: number;
}

const multiPartStorage: Map<string, MultiPartBufferItem> = new Map();

/**
 * Normalizes input raw text from QR Scanner or paste
 */
export function limparTextoQr(raw: string): string {
  if (!raw) return '';
  return raw.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Extrai cabeçalho de partes se for QR Code particionado (TSE divide BUs longos em 2 a 6 QRs)
 * Formatos suportados:
 * - "QRBU:1:4\n..."
 * - "PART:1/4\n..."
 * - "PARTE:1/4\n..."
 * - "TSE:1/3:..."
 */
export function extrairInfoPartes(texto: string): {
  ehParticionado: boolean;
  parteAtual: number;
  totalPartes: number;
  conteudoUtil: string;
} {
  const primeiraLinha = texto.split('\n')[0].trim();
  
  // Padrão QRBU:1:4 ou QRBU:1/4
  const matchQrBu = primeiraLinha.match(/^QRBU[:\s]+(\d+)[:/](\d+)/i);
  if (matchQrBu) {
    const parteAtual = parseInt(matchQrBu[1], 10);
    const totalPartes = parseInt(matchQrBu[2], 10);
    const linhasRestantes = texto.split('\n').slice(1).join('\n');
    return {
      ehParticionado: true,
      parteAtual,
      totalPartes,
      conteudoUtil: linhasRestantes.trim()
    };
  }

  // Padrão PART:1/4 ou PARTE:1/4
  const matchPart = primeiraLinha.match(/^(?:PART|PARTE)[:\s]+(\d+)[:/](\d+)/i);
  if (matchPart) {
    const parteAtual = parseInt(matchPart[1], 10);
    const totalPartes = parseInt(matchPart[2], 10);
    const linhasRestantes = texto.split('\n').slice(1).join('\n');
    return {
      ehParticionado: true,
      parteAtual,
      totalPartes,
      conteudoUtil: linhasRestantes.trim()
    };
  }

  return {
    ehParticionado: false,
    parteAtual: 1,
    totalPartes: 1,
    conteudoUtil: texto
  };
}

/**
 * Tenta inferir uma chave temporária para o BU a partir de fragmentos
 */
function extrairChaveIdentificacao(linhas: string[]): string {
  let uf = '';
  let muni = '';
  let zona = '';
  let seca = '';
  let hash = '';

  for (const linha of linhas) {
    const limpa = linha.trim();
    if (limpa.startsWith('UNFE:') || limpa.startsWith('UF:')) {
      uf = limpa.split(':')[1]?.trim() || '';
    } else if (limpa.startsWith('MUNI:')) {
      muni = limpa.split(':')[1]?.trim().split(' ')[0] || '';
    } else if (limpa.startsWith('ZONA:')) {
      zona = limpa.split(':')[1]?.trim() || '';
    } else if (limpa.startsWith('SECA:') || limpa.startsWith('SECAO:')) {
      seca = limpa.split(':')[1]?.trim() || '';
    } else if (limpa.startsWith('HASH:')) {
      hash = limpa.split(':')[1]?.trim() || '';
    }
  }

  if (uf && zona && seca) {
    return `${uf}-${muni || '00000'}-${zona.padStart(4, '0')}-${seca.padStart(4, '0')}`;
  }
  if (hash) {
    return hash.substring(0, 16);
  }
  return 'BU_TEMPORARIO';
}

/**
 * Parser principal do Boletim de Urna
 * Processa string de QR Code (único ou remontado) e constrói a estrutura completa
 */
export function parseBoletimTse(rawPayload: string): QrParseResult {
  const textoLimpo = limparTextoQr(rawPayload);

  if (!textoLimpo) {
    return {
      sucesso: false,
      completo: false,
      mensagem: 'Conteúdo do QR Code vazio ou ilegível.'
    };
  }

  // Suporte a JSON exportado previamente
  if (textoLimpo.startsWith('{') && textoLimpo.endsWith('}')) {
    try {
      const obj = JSON.parse(textoLimpo);
      if (obj.id && obj.cargos && obj.comparecimento !== undefined) {
        return {
          sucesso: true,
          completo: true,
          boletim: obj as BoletimDeUrna,
          mensagem: 'Boletim de Urna em formato JSON carregado com sucesso.'
        };
      }
    } catch {
      // continua para o parser de texto padrão
    }
  }

  // Verifica se é multipart
  const infoPartes = extrairInfoPartes(textoLimpo);
  const linhasUteis = infoPartes.conteudoUtil.split('\n').map(l => l.trim()).filter(Boolean);

  if (infoPartes.ehParticionado && infoPartes.totalPartes > 1) {
    const chaveTemp = extrairChaveIdentificacao(linhasUteis);
    let buffer = multiPartStorage.get(chaveTemp);
    if (!buffer) {
      buffer = {
        id: chaveTemp,
        totalParts: infoPartes.totalPartes,
        parts: {},
        lastUpdated: Date.now()
      };
      multiPartStorage.set(chaveTemp, buffer);
    }

    buffer.parts[infoPartes.parteAtual] = infoPartes.conteudoUtil;
    buffer.lastUpdated = Date.now();

    const partesArmazenadas = Object.keys(buffer.parts).map(Number);
    const faltam = infoPartes.totalPartes - partesArmazenadas.length;

    if (faltam > 0) {
      return {
        sucesso: true,
        completo: false,
        parteAtual: infoPartes.parteAtual,
        totalPartes: infoPartes.totalPartes,
        chaveUnica: chaveTemp,
        mensagem: `Parte ${infoPartes.parteAtual} de ${infoPartes.totalPartes} lida! Faltam ${faltam} parte(s) para completar o BU.`
      };
    }

    // Todas as partes foram lidas! Remonta o texto em ordem
    let textoRemontado = '';
    for (let i = 1; i <= infoPartes.totalPartes; i++) {
      textoRemontado += (buffer.parts[i] || '') + '\n';
    }
    // Remove do buffer
    multiPartStorage.delete(chaveTemp);

    // Repassa o texto remontado
    return processarTextoCompletoBu(textoRemontado, [rawPayload]);
  }

  // BU de parte única
  return processarTextoCompletoBu(infoPartes.conteudoUtil, [rawPayload]);
}

/**
 * Processa as linhas textuais de um BU completo
 */
function processarTextoCompletoBu(texto: string, rawOriginal: string[]): QrParseResult {
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);

  // Campos padrão
  let versaoQr = '02.00';
  let versaoUrna = '08.26.00';
  let pleito = 'ELEIÇÕES MUNICIPAIS 2024';
  let fase = 1;
  let uf = 'SP';
  let municipioCodigo = '71072';
  let municipioNome = 'SÃO PAULO';
  let zona = '0001';
  let secao = '0001';
  let idUrna = '';
  let idCarga = '';
  let dataHoraGeracao = '';
  let dataHoraEncerramento = '';
  let eleitoresAptos = 0;
  let comparecimento = 0;
  let abstencao = 0;
  let hashAssinatura = '';

  const cargosMap: Record<string, CargoResultado> = {};
  let cargoAtual: CargoResultado | null = null;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    
    // Tratamento de tags com separador ':'
    const indexDoisPontos = linha.indexOf(':');
    if (indexDoisPontos === -1) continue;

    const tag = linha.substring(0, indexDoisPontos).trim().toUpperCase();
    const valor = linha.substring(indexDoisPontos + 1).trim();

    switch (tag) {
      case 'VRQR':
        versaoQr = valor;
        break;
      case 'VRUE':
        versaoUrna = valor;
        break;
      case 'PLEI':
        pleito = valor;
        break;
      case 'FASE':
        fase = parseInt(valor, 10) || 1;
        break;
      case 'UNFE':
      case 'UF':
        uf = valor.toUpperCase();
        break;
      case 'MUNI':
        // Pode vir no formato "71072 SÃO PAULO" ou "71072"
        const partesMuni = valor.split(' ');
        municipioCodigo = partesMuni[0] || '00000';
        if (partesMuni.length > 1) {
          municipioNome = partesMuni.slice(1).join(' ').replace(/[()]/g, '');
        }
        break;
      case 'MUNINOME':
        municipioNome = valor;
        break;
      case 'ZONA':
        zona = valor.padStart(4, '0');
        break;
      case 'SECA':
      case 'SECAO':
        secao = valor.padStart(4, '0');
        break;
      case 'IDUE':
      case 'URNA':
        idUrna = valor;
        break;
      case 'IDCM':
      case 'CARGA':
        idCarga = valor;
        break;
      case 'DHGE':
        dataHoraGeracao = valor;
        break;
      case 'DHEM':
        dataHoraEncerramento = valor;
        break;
      case 'APTO':
      case 'APTOS':
        eleitoresAptos = parseInt(valor, 10) || 0;
        break;
      case 'COMP':
      case 'COMPARECIMENTO':
        comparecimento = parseInt(valor, 10) || 0;
        break;
      case 'ABST':
      case 'ABSTENCAO':
        abstencao = parseInt(valor, 10) || 0;
        break;
      case 'HASH':
      case 'ASSI':
        hashAssinatura = valor;
        break;

      // Início de bloco de cargo
      case 'CARG':
      case 'CARGO': {
        const codigoCargo = valor;
        const nomeCargo = TSE_CARGOS[codigoCargo] || `Cargo ${codigoCargo}`;
        cargoAtual = {
          codigoCargo,
          nomeCargo,
          votosNominais: 0,
          votosLegenda: 0,
          votosBranco: 0,
          votosNulo: 0,
          totalVotos: 0,
          candidatos: []
        };
        cargosMap[codigoCargo] = cargoAtual;
        break;
      }

      // Voto de Candidato (ex: CAND:2200:152 ou VTCA:2200:152)
      case 'CAND':
      case 'VTCA':
      case 'VOTO': {
        // Valor pode ser "numero:votos" ou "numero votos"
        const partesCand = valor.includes(':') ? valor.split(':') : valor.split(' ');
        const numero = partesCand[0]?.trim();
        const votos = parseInt(partesCand[1]?.trim() || '0', 10);

        if (!cargoAtual) {
          // Infere cargo pelo número de dígitos na eleição de 2026:
          // 4 dígitos = Deputado Federal (6)
          // 2 dígitos = Presidente (1) ou Governador (3)
          // 5 dígitos = Deputado Estadual (7)
          // 3 dígitos = Senador (5)
          let inferredCargo = '6';
          let inferredNome = 'Deputado Federal';
          if (numero && numero.length === 2) {
            inferredCargo = '1';
            inferredNome = 'Presidente';
          } else if (numero && numero.length === 5) {
            inferredCargo = '7';
            inferredNome = 'Deputado Estadual';
          } else if (numero && numero.length === 3) {
            inferredCargo = '5';
            inferredNome = 'Senador';
          }

          cargoAtual = {
            codigoCargo: inferredCargo,
            nomeCargo: inferredNome,
            votosNominais: 0,
            votosLegenda: 0,
            votosBranco: 0,
            votosNulo: 0,
            totalVotos: 0,
            candidatos: []
          };
          cargosMap[inferredCargo] = cargoAtual;
        }

        if (numero) {
          const info = obterDadosCandidato(numero, cargoAtual.codigoCargo);
          const candExistente = cargoAtual.candidatos.find(c => c.numero === numero);
          if (candExistente) {
            candExistente.votos += votos;
          } else {
            cargoAtual.candidatos.push({
              numero,
              nome: info.nome,
              partido: info.partido,
              siglaPartido: info.sigla,
              votos
            });
          }
          cargoAtual.votosNominais += votos;
        }
        break;
      }

      case 'VLEG':
      case 'LEGENDA': {
        if (cargoAtual) {
          const votos = parseInt(valor.split(':').pop() || valor, 10) || 0;
          cargoAtual.votosLegenda += votos;
        }
        break;
      }

      case 'VBLC':
      case 'BRANCO':
      case 'BRANCOS': {
        if (cargoAtual) {
          const votos = parseInt(valor, 10) || 0;
          cargoAtual.votosBranco += votos;
        }
        break;
      }

      case 'VNUL':
      case 'NULO':
      case 'NULOS': {
        if (cargoAtual) {
          const votos = parseInt(valor, 10) || 0;
          cargoAtual.votosNulo += votos;
        }
        break;
      }
    }
  }

  // Se abstencao não veio e temos aptos e comparecimento:
  if (abstencao === 0 && eleitoresAptos > 0 && comparecimento > 0) {
    abstencao = Math.max(0, eleitoresAptos - comparecimento);
  } else if (eleitoresAptos === 0 && comparecimento > 0) {
    eleitoresAptos = comparecimento + abstencao;
  }

  // Se não foi informada data/hora, usa momento atual formatado
  if (!dataHoraGeracao) {
    const agora = new Date();
    dataHoraGeracao = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR');
  }
  if (!dataHoraEncerramento) {
    dataHoraEncerramento = dataHoraGeracao;
  }
  if (!hashAssinatura) {
    hashAssinatura = 'SHA256:' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
  }
  if (!idUrna) {
    idUrna = Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  // Totais gerais
  let totalNominaisGeral = 0;
  let totalLegendaGeral = 0;
  let totalBrancosGeral = 0;
  let totalNulosGeral = 0;

  // Calcula totais e porcentagens para cada cargo
  for (const cod in cargosMap) {
    const cargo = cargosMap[cod];
    cargo.totalVotos = cargo.votosNominais + cargo.votosLegenda + cargo.votosBranco + cargo.votosNulo;

    // Ordena candidatos por votos decrescente
    cargo.candidatos.sort((a, b) => b.votos - a.votos);

    // Total de votos válidos para cálculo de percentual
    const totalValidos = cargo.votosNominais + cargo.votosLegenda;
    for (const c of cargo.candidatos) {
      c.porcentagem = totalValidos > 0 ? (c.votos / totalValidos) * 100 : 0;
    }

    totalNominaisGeral += cargo.votosNominais;
    totalLegendaGeral += cargo.votosLegenda;
    totalBrancosGeral += cargo.votosBranco;
    totalNulosGeral += cargo.votosNulo;
  }

  // Se não identificou nenhum cargo mas temos dados ou números
  if (Object.keys(cargosMap).length === 0) {
    // Tenta fallback com valores padrão
    cargosMap['11'] = {
      codigoCargo: '11',
      nomeCargo: 'Prefeito',
      votosNominais: 0,
      votosLegenda: 0,
      votosBranco: 0,
      votosNulo: 0,
      totalVotos: 0,
      candidatos: []
    };
  }

  const id = `${uf}-${municipioCodigo}-${zona}-${secao}`;

  const boletim: BoletimDeUrna = {
    id,
    versaoQr,
    versaoUrna,
    pleito,
    fase,
    uf,
    municipioCodigo,
    municipioNome,
    zona,
    secao,
    idUrna,
    idCarga: idCarga || '78912345',
    dataHoraGeracao,
    dataHoraEncerramento,
    eleitoresAptos,
    comparecimento,
    abstencao,
    totalVotosNominais: totalNominaisGeral,
    totalVotosLegenda: totalLegendaGeral,
    totalVotosBrancos: totalBrancosGeral,
    totalVotosNulos: totalNulosGeral,
    hashAssinatura,
    cargos: cargosMap,
    rawQrData: rawOriginal,
    partesTotal: 1,
    partesRecebidas: [1],
    createdAt: Date.now(),
    syncStatus: 'pending'
  };

  return {
    sucesso: true,
    completo: true,
    boletim,
    mensagem: `Boletim da Seção ${secao} (Zona ${zona} - ${uf}) decodificado com sucesso!`
  };
}

/**
 * Gera string padrão TSE compatível para testes e exportação de QR Code
 */
export function formatarBuParaTseQr(bu: BoletimDeUrna): string {
  const linhas: string[] = [
    `VRQR:${bu.versaoQr}`,
    `VRUE:${bu.versaoUrna}`,
    `PLEI:${bu.pleito}`,
    `FASE:${bu.fase}`,
    `UNFE:${bu.uf}`,
    `MUNI:${bu.municipioCodigo} (${bu.municipioNome})`,
    `ZONA:${bu.zona}`,
    `SECA:${bu.secao}`,
    `IDUE:${bu.idUrna}`,
    `IDCM:${bu.idCarga || '89123456'}`,
    `DHGE:${bu.dataHoraGeracao}`,
    `DHEM:${bu.dataHoraEncerramento}`,
    `APTO:${bu.eleitoresAptos}`,
    `COMP:${bu.comparecimento}`,
    `ABST:${bu.abstencao}`,
    `HASH:${bu.hashAssinatura}`
  ];

  for (const codCargo in bu.cargos) {
    const cargo = bu.cargos[codCargo];
    linhas.push(`CARG:${cargo.codigoCargo}`);
    for (const c of cargo.candidatos) {
      linhas.push(`CAND:${c.numero}:${c.votos}`);
    }
    if (cargo.votosLegenda > 0) {
      linhas.push(`VLEG:${cargo.votosLegenda}`);
    }
    linhas.push(`BRANCO:${cargo.votosBranco}`);
    linhas.push(`NULO:${cargo.votosNulo}`);
  }

  return linhas.join('\n');
}

/**
 * Validação de integridade aritmética eleitoral do BU
 */
export function validarConsistenciaAritmetica(bu: BoletimDeUrna): {
  valido: boolean;
  alertas: string[];
} {
  const alertas: string[] = [];

  // 1. Aptos = Comparecimento + Abstenção
  if (bu.eleitoresAptos > 0 && bu.eleitoresAptos !== (bu.comparecimento + bu.abstencao)) {
    alertas.push(`Divergência de eleitores: Aptos (${bu.eleitoresAptos}) ≠ Comparecimento (${bu.comparecimento}) + Abstenção (${bu.abstencao})`);
  }

  // 2. Votos de cada cargo comparados com o comparecimento
  for (const cod in bu.cargos) {
    const cargo = bu.cargos[cod];
    const totalCargo = cargo.votosNominais + cargo.votosLegenda + cargo.votosBranco + cargo.votosNulo;
    if (bu.comparecimento > 0 && totalCargo !== bu.comparecimento) {
      alertas.push(`Cargo ${cargo.nomeCargo}: Total de votos (${totalCargo}) diverge do comparecimento (${bu.comparecimento})`);
    }
  }

  return {
    valido: alertas.length === 0,
    alertas
  };
}
