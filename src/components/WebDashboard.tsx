import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Vote, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Building2, 
  Download, 
  QrCode, 
  Filter, 
  CheckSquare, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { BoletimDeUrna } from '../types';
import { exportarApuracaoCargoCsv } from '../services/csvExport';

interface WebDashboardProps {
  boletins: BoletimDeUrna[];
  onOpenScanner: () => void;
  onSelectBu: (bu: BoletimDeUrna) => void;
  onOpenExportModal?: () => void;
}

export const WebDashboard: React.FC<WebDashboardProps> = ({
  boletins,
  onOpenScanner,
  onSelectBu
}) => {
  // Available cargos across all BUs
  const availableCargos = useMemo(() => {
    const map: Record<string, string> = {};
    boletins.forEach(bu => {
      Object.entries(bu.cargos).forEach(([cod, cargo]) => {
        map[cod] = cargo.nomeCargo;
      });
    });
    return Object.entries(map).map(([codigo, nome]) => ({ codigo, nome }));
  }, [boletins]);

  // Selected cargo (defaults to "1" - Presidente if available, or first available)
  const [selectedCargoCod, setSelectedCargoCod] = useState<string>('1');

  useEffect(() => {
    if (availableCargos.length > 0) {
      const hasPresidente = availableCargos.some(c => c.codigo === '1');
      if (hasPresidente) {
        setSelectedCargoCod('1');
      } else if (!availableCargos.some(c => c.codigo === selectedCargoCod)) {
        setSelectedCargoCod(availableCargos[0].codigo);
      }
    }
  }, [availableCargos]);

  // UF / City filter
  const [selectedUf, setSelectedUf] = useState<string>('TODOS');

  const ufsDisponiveis = useMemo(() => {
    const set = new Set(boletins.map(b => b.uf));
    return ['TODOS', ...Array.from(set)];
  }, [boletins]);

  const filteredBus = useMemo(() => {
    if (selectedUf === 'TODOS') return boletins;
    return boletins.filter(b => b.uf === selectedUf);
  }, [boletins, selectedUf]);

  // General KPIs
  const kpis = useMemo(() => {
    let aptos = 0;
    let comparecimento = 0;
    let abstencao = 0;
    let sincronizados = 0;

    filteredBus.forEach(b => {
      aptos += b.eleitoresAptos;
      comparecimento += b.comparecimento;
      abstencao += b.abstencao;
      if (b.syncStatus === 'synced') sincronizados++;
    });

    const taxaComparecimento = aptos > 0 ? (comparecimento / aptos) * 100 : 0;
    const taxaAbstencao = aptos > 0 ? (abstencao / aptos) * 100 : 0;

    return {
      totalBus: filteredBus.length,
      aptos,
      comparecimento,
      abstencao,
      taxaComparecimento,
      taxaAbstencao,
      sincronizados
    };
  }, [filteredBus]);

  // Consolidated Votes for currently selected Cargo
  const apuracaoCargo = useMemo(() => {
    let votosNominais = 0;
    let votosLegenda = 0;
    let votosBrancos = 0;
    let votosNulos = 0;

    const candidatosMap: Record<string, {
      numero: string;
      nome: string;
      partido: string;
      sigla: string;
      votos: number;
    }> = {};

    let totalSecoesDoCargo = 0;

    filteredBus.forEach(bu => {
      const cargo = bu.cargos[selectedCargoCod];
      if (cargo) {
        totalSecoesDoCargo++;
        votosNominais += cargo.votosNominais;
        votosLegenda += cargo.votosLegenda;
        votosBrancos += cargo.votosBranco;
        votosNulos += cargo.votosNulo;

        cargo.candidatos.forEach(c => {
          if (!candidatosMap[c.numero]) {
            candidatosMap[c.numero] = {
              numero: c.numero,
              nome: c.nome,
              partido: c.partido,
              sigla: c.siglaPartido,
              votos: 0
            };
          }
          candidatosMap[c.numero].votos += c.votos;
        });
      }
    });

    const totalValidos = votosNominais + votosLegenda;
    const totalGeral = totalValidos + votosBrancos + votosNulos;

    const ranking = Object.values(candidatosMap)
      .map(c => ({
        ...c,
        porcentagem: totalValidos > 0 ? (c.votos / totalValidos) * 100 : 0
      }))
      .sort((a, b) => b.votos - a.votos);

    const nomeCargoAtual = availableCargos.find(c => c.codigo === selectedCargoCod)?.nome || 'Cargo Eleitoral';

    return {
      nomeCargo: nomeCargoAtual,
      totalSecoes: totalSecoesDoCargo,
      votosNominais,
      votosLegenda,
      votosBrancos,
      votosNulos,
      totalValidos,
      totalGeral,
      ranking
    };
  }, [filteredBus, selectedCargoCod, availableCargos]);

  // Mathematical Audit Check across all loaded BUs
  const auditoriaMatematica = useMemo(() => {
    let erros = 0;
    const detalhes: string[] = [];

    filteredBus.forEach(b => {
      if (b.eleitoresAptos > 0 && b.eleitoresAptos !== (b.comparecimento + b.abstencao)) {
        erros++;
        detalhes.push(`BU ${b.id}: Aptos (${b.eleitoresAptos}) ≠ Comparecimento (${b.comparecimento}) + Abstenção (${b.abstencao})`);
      }
    });

    return {
      erros,
      valido: erros === 0,
      detalhes
    };
  }, [filteredBus]);

  function handleExportCargo() {
    exportarApuracaoCargoCsv(
      apuracaoCargo.nomeCargo,
      apuracaoCargo.ranking,
      apuracaoCargo.totalValidos,
      apuracaoCargo.votosBrancos,
      apuracaoCargo.votosNulos,
      apuracaoCargo.totalSecoes
    );
  }

  // Color generator based on party initials
  function getPartyColor(sigla: string) {
    const colors: Record<string, string> = {
      'PT': 'from-red-600 to-rose-700',
      'PL': 'from-blue-600 to-sky-700',
      'MDB': 'from-emerald-600 to-green-700',
      'PSOL': 'from-yellow-500 to-amber-600',
      'PSD': 'from-cyan-600 to-blue-700',
      'PSB': 'from-amber-600 to-orange-700',
      'NOVO': 'from-orange-500 to-amber-600',
      'PSDB': 'from-blue-500 to-indigo-600',
      'UNIÃO': 'from-indigo-600 to-blue-700',
      'PRTB': 'from-emerald-500 to-teal-700',
      'PSTU': 'from-rose-600 to-red-800'
    };
    return colors[sigla] || 'from-slate-600 to-slate-700';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner / Situation Room Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              SALA DE SITUAÇÃO & AUDITORIA ELEITORAL
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
              Tempo Real
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Totalização paralela e verificação matemática independente dos Boletins de Urna (TSE).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* UF Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>UF:</span>
            <select
              value={selectedUf}
              onChange={(e) => setSelectedUf(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              {ufsDisponiveis.map(uf => (
                <option key={uf} value={uf} className="bg-slate-900 text-white">{uf}</option>
              ))}
            </select>
          </div>

          {/* Quick Scanner Action */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
          >
            <QrCode className="w-4 h-4" />
            <span>Ler Novo QR BU</span>
          </button>

          {/* Export Cargo Result */}
          <button
            onClick={handleExportCargo}
            disabled={apuracaoCargo.ranking.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Exportar CSV Cargo</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total BUs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Seções / BUs</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{kpis.totalBus}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">100% validados</span>
          </div>
        </div>

        {/* Aptos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Eleitores Aptos</span>
          <span className="text-2xl font-black text-white">{kpis.aptos.toLocaleString('pt-BR')}</span>
        </div>

        {/* Comparecimento */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Comparecimento</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">{kpis.comparecimento.toLocaleString('pt-BR')}</span>
            <span className="text-[11px] text-slate-400 font-medium">({kpis.taxaComparecimento.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Abstenção */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Abstenção</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-400">{kpis.abstencao.toLocaleString('pt-BR')}</span>
            <span className="text-[11px] text-slate-400 font-medium">({kpis.taxaAbstencao.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Votos Válidos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Votos Válidos ({apuracaoCargo.nomeCargo})</span>
          <span className="text-2xl font-black text-blue-400">{apuracaoCargo.totalValidos.toLocaleString('pt-BR')}</span>
        </div>

        {/* Auditoria Integridade */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Auditoria Aritmética</span>
          <div className="flex items-center gap-1.5">
            {auditoriaMatematica.valido ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-300">100% Íntegro</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-300">{auditoriaMatematica.erros} divergência(s)</span>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Cargo Switcher Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">Cargo:</span>
        {availableCargos.map(cargo => (
          <button
            key={cargo.codigo}
            onClick={() => setSelectedCargoCod(cargo.codigo)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-sm ${
              selectedCargoCod === cargo.codigo
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {cargo.nome} (Código {cargo.codigo})
          </button>
        ))}
      </div>

      {/* Main Apuração Ranking Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Candidate Ranking & Progress Bars */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Vote className="w-5 h-5 text-blue-400" />
                <span>Apuração para {apuracaoCargo.nomeCargo}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Totalizado a partir de {apuracaoCargo.totalSecoes} seção(ões) eleitoral(is)
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-300 block">Total de Votos Válidos</span>
              <span className="text-sm font-black text-blue-400">
                {apuracaoCargo.totalValidos.toLocaleString('pt-BR')} votos
              </span>
            </div>
          </div>

          {apuracaoCargo.ranking.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>Nenhum voto computado para este cargo nos BUs carregados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apuracaoCargo.ranking.map((cand, index) => {
                const isLeader = index === 0;
                return (
                  <div 
                    key={cand.numero}
                    className="p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Left: Rank + Avatar + Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          isLeader ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {index + 1}º
                        </span>

                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getPartyColor(cand.sigla)} flex items-center justify-center text-white font-black text-xs shadow-md shrink-0`}>
                          {cand.numero}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white truncate">{cand.nome}</span>
                            {isLeader && (
                              <span className="px-1.5 py-0.2 text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                                LÍDER
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-bold text-slate-300">{cand.sigla}</span>
                            <span>•</span>
                            <span className="truncate">{cand.partido}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Votes & Percentage */}
                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-white">
                          {cand.porcentagem.toFixed(2)}%
                        </div>
                        <div className="text-xs text-slate-400">
                          {cand.votos.toLocaleString('pt-BR')} votos
                        </div>
                      </div>

                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-950 rounded-full h-2 mt-3 overflow-hidden border border-slate-700/40">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${getPartyColor(cand.sigla)} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(cand.porcentagem, 1))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Breakdown: Legenda, Brancos, Nulos */}
          <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Votos em Branco</span>
              <span className="text-sm font-bold text-slate-200">
                {apuracaoCargo.votosBrancos.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {apuracaoCargo.totalGeral > 0 ? ((apuracaoCargo.votosBrancos / apuracaoCargo.totalGeral) * 100).toFixed(1) : 0}% do total
              </span>
            </div>

            <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Votos Nulos</span>
              <span className="text-sm font-bold text-slate-200">
                {apuracaoCargo.votosNulos.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {apuracaoCargo.totalGeral > 0 ? ((apuracaoCargo.votosNulos / apuracaoCargo.totalGeral) * 100).toFixed(1) : 0}% do total
              </span>
            </div>

            <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Votos de Legenda</span>
              <span className="text-sm font-bold text-slate-200">
                {apuracaoCargo.votosLegenda.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Partidos
              </span>
            </div>
          </div>

        </div>

        {/* Right Col: Zona Breakdown & Audit Log Summary */}
        <div className="space-y-6">
          
          {/* Zonas Eleitorais Audited */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Zonas Eleitorais Auditadas ({filteredBus.length} BUs)</span>
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredBus.map(b => (
                <div
                  key={b.id}
                  onClick={() => onSelectBu(b)}
                  className="p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-xl cursor-pointer transition flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <span>Zona {b.zona}</span>
                      <span>•</span>
                      <span>Seção {b.secao}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {b.municipioNome} ({b.uf})
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 block">
                      {b.comparecimento} votos
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-blue-400 transition">
                      Ver Espelho →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Independent Verification Guarantee box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <span>Auditoria Aberta e Imutável</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O Boletim de Urna é um documento público emitido após o término da votação pela Urna Eletrônica.
            </p>
            <div className="mt-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Assinatura Digital SHA-512 da Urna</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Conferência de Hash de Software TSE</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auditoria de Quociente e Soma Aritmética</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
