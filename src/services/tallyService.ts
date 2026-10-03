import { BoletimDeUrna } from '../types';

export interface ResumoContabilizacaoAlvo {
  numeroCandidato: string;
  totalVotosGeral: number;
  totalUrnasApuradas: number;
  totalUrnasComVoto: number;
  mediaPorUrna: number;
  detalhesPorSecao: Array<{
    buId: string;
    municipioNome: string;
    zona: string;
    secao: string;
    idUrna: string;
    votos: number;
    comparecimento: number;
    porcentagemNaUrna: number;
    dataHora: string;
  }>;
  detalhesPorMunicipio: Array<{
    municipioNome: string;
    totalVotos: number;
    totalSecoes: number;
    media: number;
    porcentagemDoTotal: number;
  }>;
  maiorVotacaoSecao: {
    municipioNome: string;
    zona: string;
    secao: string;
    votos: number;
  } | null;
}

/**
 * Extrai os votos do candidato alvo em um único Boletim de Urna
 */
export function extrairVotosCandidatoDoBu(bu: BoletimDeUrna, numeroCandidato: string): number {
  if (!bu || !bu.cargos) return 0;
  let total = 0;
  const numLimpo = numeroCandidato.trim();

  Object.values(bu.cargos).forEach(cargo => {
    cargo.candidatos.forEach(cand => {
      if (cand.numero.trim() === numLimpo) {
        total += cand.votos;
      }
    });
  });

  return total;
}

/**
 * CONTABILIZA TODOS OS VOTOS DOS QR CODES DO CANDIDATO ALVO
 * Processa todos os Boletins de Urna salvos e consolida a contagem em nível de seção, cidade e geral
 */
export function contabilizarTodosVotosCandidatoAlvo(
  boletins: BoletimDeUrna[],
  numeroCandidato: string
): ResumoContabilizacaoAlvo {
  const num = numeroCandidato.trim();
  let totalVotosGeral = 0;
  let totalUrnasComVoto = 0;

  const detalhesPorSecao: ResumoContabilizacaoAlvo['detalhesPorSecao'] = [];
  const mapMunicipios: Record<string, { totalVotos: number; totalSecoes: number }> = {};
  let maiorVotacaoSecao: ResumoContabilizacaoAlvo['maiorVotacaoSecao'] = null;

  boletins.forEach(bu => {
    const votosNaUrna = extrairVotosCandidatoDoBu(bu, num);

    if (votosNaUrna > 0) {
      totalUrnasComVoto++;
      if (!maiorVotacaoSecao || votosNaUrna > maiorVotacaoSecao.votos) {
        maiorVotacaoSecao = {
          municipioNome: bu.municipioNome,
          zona: bu.zona,
          secao: bu.secao,
          votos: votosNaUrna
        };
      }
    }

    totalVotosGeral += votosNaUrna;

    const pctNaUrna = bu.comparecimento > 0 ? (votosNaUrna / bu.comparecimento) * 100 : 0;

    detalhesPorSecao.push({
      buId: bu.id,
      municipioNome: bu.municipioNome,
      zona: bu.zona,
      secao: bu.secao,
      idUrna: bu.idUrna,
      votos: votosNaUrna,
      comparecimento: bu.comparecimento,
      porcentagemNaUrna: pctNaUrna,
      dataHora: bu.dataHoraGeracao
    });

    if (!mapMunicipios[bu.municipioNome]) {
      mapMunicipios[bu.municipioNome] = { totalVotos: 0, totalSecoes: 0 };
    }
    mapMunicipios[bu.municipioNome].totalVotos += votosNaUrna;
    mapMunicipios[bu.municipioNome].totalSecoes += 1;
  });

  // Ordena seções pela votação decrescente
  detalhesPorSecao.sort((a, b) => b.votos - a.votos);

  // Consolidação por município
  const detalhesPorMunicipio: ResumoContabilizacaoAlvo['detalhesPorMunicipio'] = Object.entries(mapMunicipios)
    .map(([municipioNome, dados]) => ({
      municipioNome,
      totalVotos: dados.totalVotos,
      totalSecoes: dados.totalSecoes,
      media: dados.totalSecoes > 0 ? dados.totalVotos / dados.totalSecoes : 0,
      porcentagemDoTotal: totalVotosGeral > 0 ? (dados.totalVotos / totalVotosGeral) * 100 : 0
    }))
    .sort((a, b) => b.totalVotos - a.totalVotos);

  const mediaPorUrna = boletins.length > 0 ? totalVotosGeral / boletins.length : 0;

  return {
    numeroCandidato: num,
    totalVotosGeral,
    totalUrnasApuradas: boletins.length,
    totalUrnasComVoto,
    mediaPorUrna,
    detalhesPorSecao,
    detalhesPorMunicipio,
    maiorVotacaoSecao
  };
}
