import { BoletimDeUrna } from '../types';

/**
 * Converte array de BUs em CSV detalhado (formato compatível com Excel em português - separado por ponto e vírgula e com BOM UTF-8)
 */
export function exportarBusParaCsv(boletins: BoletimDeUrna[]): void {
  const cabecalho = [
    'ID_BU',
    'UF',
    'COD_MUNICIPIO',
    'NOME_MUNICIPIO',
    'ZONA',
    'SECAO',
    'URNA_ID',
    'DATA_HORA_GERACAO',
    'APTOS',
    'COMPARECIMENTO',
    'ABSTENCAO',
    'TAXA_COMPARECIMENTO_%',
    'TOTAL_VOTOS_NOMINAIS',
    'TOTAL_VOTOS_LEGENDA',
    'TOTAL_VOTOS_BRANCOS',
    'TOTAL_VOTOS_NULOS',
    'CARGOS_APURADOS',
    'HASH_ASSINATURA',
    'STATUS_SYNC'
  ];

  const linhas = boletins.map(bu => {
    const taxa = bu.eleitoresAptos > 0 ? ((bu.comparecimento / bu.eleitoresAptos) * 100).toFixed(2) : '0';
    const nomesCargos = Object.values(bu.cargos).map(c => c.nomeCargo).join(' | ');

    return [
      `"${bu.id}"`,
      `"${bu.uf}"`,
      `"${bu.municipioCodigo}"`,
      `"${bu.municipioNome}"`,
      `"${bu.zona}"`,
      `"${bu.secao}"`,
      `"${bu.idUrna}"`,
      `"${bu.dataHoraGeracao}"`,
      bu.eleitoresAptos,
      bu.comparecimento,
      bu.abstencao,
      `"${taxa}%"`,
      bu.totalVotosNominais,
      bu.totalVotosLegenda,
      bu.totalVotosBrancos,
      bu.totalVotosNulos,
      `"${nomesCargos}"`,
      `"${bu.hashAssinatura}"`,
      `"${bu.syncStatus}"`
    ].join(';');
  });

  const conteudoCsv = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\r\n');
  const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `BU_LEITOR_EXPORT_BUS_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converte a apuração consolidada de um cargo em CSV de resultado
 */
export function exportarApuracaoCargoCsv(
  nomeCargo: string,
  candidatos: Array<{ numero: string; nome: string; partido: string; sigla: string; votos: number; porcentagem: number }>,
  totalValidos: number,
  totalBrancos: number,
  totalNulos: number,
  totalSecoes: number
): void {
  const cabecalho = [
    'POSICAO',
    'NUMERO',
    'NOME_CANDIDATO',
    'PARTIDO_SIGLA',
    'PARTIDO_NOME',
    'TOTAL_VOTOS',
    'PERCENTUAL_VALIDOS_%'
  ];

  const linhas = candidatos.map((c, index) => {
    return [
      index + 1,
      `"${c.numero}"`,
      `"${c.nome}"`,
      `"${c.sigla}"`,
      `"${c.partido}"`,
      c.votos,
      `"${c.porcentagem.toFixed(2)}%"`
    ].join(';');
  });

  const resumo = [
    '',
    `"RESUMO DA TOTALIZACAO - CARGO ${nomeCargo.toUpperCase()}"`,
    `"SECOES APURADAS: ${totalSecoes}"`,
    `"VOTOS VALIDOS: ${totalValidos}"`,
    `"VOTOS EM BRANCO: ${totalBrancos}"`,
    `"VOTOS NULOS: ${totalNulos}"`,
    `"TOTAL GERAL: ${totalValidos + totalBrancos + totalNulos}"`
  ];

  const conteudoCsv = '\uFEFF' + [
    cabecalho.join(';'),
    ...linhas,
    ...resumo
  ].join('\r\n');

  const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `BU_LEITOR_APURACAO_${nomeCargo.toUpperCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
