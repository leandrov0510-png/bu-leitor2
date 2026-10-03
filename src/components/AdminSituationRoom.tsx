import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  BarChart3, 
  Target, 
  Vote, 
  Users, 
  Building2, 
  Download, 
  Sliders, 
  Eye, 
  CheckCircle2, 
  TrendingUp, 
  Filter, 
  Trash2, 
  RefreshCw, 
  LogOut,
  Flame,
  Award,
  PlusCircle,
  FileSpreadsheet,
  KeyRound,
  Image as ImageIcon
} from 'lucide-react';
import { BoletimDeUrna, CandidatoFederalAlvo } from '../types';
import { exportarBusParaCsv, exportarApuracaoCargoCsv } from '../services/csvExport';
import { contabilizarTodosVotosCandidatoAlvo, extrairVotosCandidatoDoBu } from '../services/tallyService';
import { AdminChangePasswordModal } from './AdminChangePasswordModal';
import { AdminCoverPhotoModal } from './AdminCoverPhotoModal';

interface AdminSituationRoomProps {
  boletins: BoletimDeUrna[];
  candidatoAlvo: CandidatoFederalAlvo;
  onUpdateCandidatoAlvo: (candidato: CandidatoFederalAlvo) => void;
  onBackHome: () => void;
  onSelectBuReceipt: (bu: BoletimDeUrna) => void;
  onDeleteBu: (id: string) => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  onOpenSyncSettings: () => void;
}

export const AdminSituationRoom: React.FC<AdminSituationRoomProps> = ({
  boletins,
  candidatoAlvo,
  onUpdateCandidatoAlvo,
  onBackHome,
  onSelectBuReceipt,
  onDeleteBu,
  onSyncAll,
  isSyncing,
  onOpenSyncSettings
}) => {
  // Tabs: 'alvo' | 'geral_sp' | 'bus'
  const [activeTab, setActiveTab] = useState<'alvo' | 'geral_sp' | 'bus'>('alvo');

  // Selected cargo for General SP tally (defaults to 6 - Deputado Federal)
  const [cargoGeral, setCargoGeral] = useState<string>('6');
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>('TODOS');
  const [isEditAlvoModalOpen, setIsEditAlvoModalOpen] = useState(false);
  const [filtroSomenteComVoto, setFiltroSomenteComVoto] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isCoverPhotoModalOpen, setIsCoverPhotoModalOpen] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);

  // Edit target candidate form state
  const [editNumero, setEditNumero] = useState(candidatoAlvo.numero);
  const [editNome, setEditNome] = useState(candidatoAlvo.nome);
  const [editPartido, setEditPartido] = useState(candidatoAlvo.partido);
  const [editSigla, setEditSigla] = useState(candidatoAlvo.sigla);
  const [editMeta, setEditMeta] = useState(candidatoAlvo.metaVotos.toString());

  // Filter only SP BUs
  const boletinsSP = useMemo(() => {
    return boletins.filter(b => b.uf.toUpperCase() === 'SP');
  }, [boletins]);

  // Distinct SP cities
  const cidadesSP = useMemo(() => {
    const set = new Set(boletinsSP.map(b => b.municipioNome));
    return ['TODOS', ...Array.from(set)];
  }, [boletinsSP]);

  // CONTABILIZAÇÃO EXAUSTIVA DE TODOS OS VOTOS DOS QR CODES DO CANDIDATO ALVO
  const resumoContabilizacao = useMemo(() => {
    return contabilizarTodosVotosCandidatoAlvo(boletinsSP, candidatoAlvo.numero);
  }, [boletinsSP, candidatoAlvo.numero]);

  const percentualMeta = candidatoAlvo.metaVotos > 0 
    ? ((resumoContabilizacao.totalVotosGeral / candidatoAlvo.metaVotos) * 100).toFixed(2)
    : '0';

  // General SP Voting by Cargo
  const apuracaoGeralSP = useMemo(() => {
    let votosNominais = 0;
    let votosLegenda = 0;
    let votosBrancos = 0;
    let votosNulos = 0;
    const candMap: Record<string, { numero: string; nome: string; partido: string; sigla: string; votos: number }> = {};

    const list = filtroMunicipio === 'TODOS' ? boletinsSP : boletinsSP.filter(b => b.municipioNome === filtroMunicipio);

    list.forEach(bu => {
      const cargo = bu.cargos[cargoGeral];
      if (cargo) {
        votosNominais += cargo.votosNominais;
        votosLegenda += cargo.votosLegenda;
        votosBrancos += cargo.votosBranco;
        votosNulos += cargo.votosNulo;

        cargo.candidatos.forEach(c => {
          if (!candMap[c.numero]) {
            candMap[c.numero] = {
              numero: c.numero,
              nome: c.nome,
              partido: c.partido,
              sigla: c.siglaPartido,
              votos: 0
            };
          }
          candMap[c.numero].votos += c.votos;
        });
      }
    });

    const totalValidos = votosNominais + votosLegenda;
    const ranking = Object.values(candMap)
      .map(c => ({
        ...c,
        porcentagem: totalValidos > 0 ? (c.votos / totalValidos) * 100 : 0
      }))
      .sort((a, b) => b.votos - a.votos);

    const nomesCargos: Record<string, string> = {
      '6': 'Deputado Federal SP',
      '1': 'Presidente da República em SP',
      '3': 'Governador de SP',
      '5': 'Senador de SP'
    };

    return {
      nomeCargo: nomesCargos[cargoGeral] || `Cargo ${cargoGeral}`,
      totalValidos,
      votosBrancos,
      votosNulos,
      ranking
    };
  }, [boletinsSP, cargoGeral, filtroMunicipio]);

  function handleSaveEditAlvo(e: React.FormEvent) {
    e.preventDefault();
    onUpdateCandidatoAlvo({
      numero: editNumero.trim(),
      nome: editNome.trim() || 'Candidato Alvo SP',
      partido: editPartido.trim(),
      sigla: editSigla.trim(),
      metaVotos: parseInt(editMeta, 10) || 100000
    });
    setIsEditAlvoModalOpen(false);
  }

  function handleExportCsv() {
    exportarBusParaCsv(boletinsSP);
  }

  // Export specific tally of the candidate target
  function handleExportExtratoAlvoCsv() {
    const cabecalho = [
      'MUNICIPIO',
      'ZONA_ELEITORAL',
      'SECAO_ELEITORAL',
      'URNA_ID',
      'VOTOS_CANDIDATO_ALVO',
      'COMPARECIMENTO_TOTAL_SECAO',
      'PERCENTUAL_NA_URNA_%',
      'DATA_HORA_EMISSAO_BU'
    ];

    const linhas = resumoContabilizacao.detalhesPorSecao.map(d => [
      `"${d.municipioNome}"`,
      `"${d.zona}"`,
      `"${d.secao}"`,
      `"${d.idUrna}"`,
      d.votos,
      d.comparecimento,
      `"${d.porcentagemNaUrna.toFixed(2)}%"`,
      `"${d.dataHora}"`
    ].join(';'));

    const resumoLinhas = [
      '',
      `"EXTRATO DE CONTABILIZACAO DOS QR CODES DO CANDIDATO ALVO"`,
      `"CANDIDATO: ${candidatoAlvo.nome} (${candidatoAlvo.sigla}) - NUMERO: ${candidatoAlvo.numero}"`,
      `"TOTAL DE VOTOS CONTABILIZADOS: ${resumoContabilizacao.totalVotosGeral}"`,
      `"TOTAL DE URNAS DE SP ANALISADAS: ${resumoContabilizacao.totalUrnasApuradas}"`,
      `"MEDIA DE VOTOS POR URNA: ${resumoContabilizacao.mediaPorUrna.toFixed(2)}"`
    ];

    const conteudoCsv = '\uFEFF' + [cabecalho.join(';'), ...linhas, ...resumoLinhas].join('\r\n');
    const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EXTRATO_VOTOS_CANDIDATO_${candidatoAlvo.numero}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Situation Room Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBackHome}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition mr-1"
              title="Voltar para a Tela Inicial"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              <span className="text-emerald-400">SALA DE SITUAÇÃO</span> • ESTADO DE SÃO PAULO
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 uppercase">
              Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Contabilização em tempo real de todos os QR Codes de São Paulo para {candidatoAlvo.nome} (Nº {candidatoAlvo.numero}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Target Candidate button */}
          <button
            onClick={() => {
              setEditNumero(candidatoAlvo.numero);
              setEditNome(candidatoAlvo.nome);
              setEditPartido(candidatoAlvo.partido);
              setEditSigla(candidatoAlvo.sigla);
              setEditMeta(candidatoAlvo.metaVotos.toString());
              setIsEditAlvoModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Configurar Alvo</span>
          </button>

          {/* Change Admin Password */}
          <button
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition"
            title="Alterar a Senha de Acesso do Administrador"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Alterar Senha</span>
          </button>

          {/* Change Cover Photo (Admin) */}
          <button
            onClick={() => setIsCoverPhotoModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition"
            title="Alterar a Foto de Capa Inicial da Aplicação"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Foto de Capa</span>
          </button>

          {/* Sync All Button */}
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportExtratoAlvoCsv}
            disabled={boletinsSP.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow transition"
            title="Exportar Extrato Detalhado de Votos do Candidato Alvo"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Extrato Alvo</span>
          </button>

          {/* Logout / Back to simple Home */}
          <button
            onClick={onBackHome}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition"
            title="Sair do Modo Administrativo"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('alvo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
            activeTab === 'alvo'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Contabilização dos Votos do Candidato Alvo ({resumoContabilizacao.totalVotosGeral} votos)</span>
        </button>

        <button
          onClick={() => setActiveTab('geral_sp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
            activeTab === 'geral_sp'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Votação Geral de São Paulo</span>
        </button>

        <button
          onClick={() => setActiveTab('bus')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
            activeTab === 'bus'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>Extrato de Todos os QR Codes ({boletinsSP.length})</span>
        </button>
      </div>

      {/* TAB 1: PAINEL DE CONTABILIZAÇÃO DO CANDIDATO FEDERAL ALVO */}
      {activeTab === 'alvo' && (
        <div className="space-y-6">
          
          {/* Big Master Card with Total Votes */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Candidate Info */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-black text-3xl shadow-xl border-2 border-white/20">
                  {candidatoAlvo.numero}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      DEPUTADO FEDERAL • SÃO PAULO
                    </span>
                    <span className="text-xs text-slate-400 font-bold">{candidatoAlvo.sigla}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {candidatoAlvo.nome}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {candidatoAlvo.partido} • Contabilização auditada dos QR Codes do TSE
                  </p>
                </div>
              </div>

              {/* Master Total Votes Counter */}
              <div className="bg-slate-950/90 border-2 border-emerald-500/60 rounded-3xl p-5 sm:p-6 text-center min-w-[280px] shadow-2xl">
                <span className="text-xs font-black text-emerald-400 block uppercase tracking-wider">
                  TOTAL GERAL CONTABILIZADO
                </span>
                <div className="text-4xl sm:text-5xl font-black text-emerald-400 mt-1 leading-none">
                  {resumoContabilizacao.totalVotosGeral.toLocaleString('pt-BR')}
                </div>
                <span className="text-xs font-semibold text-slate-300 block mt-1">
                  votos somados de todos os QR Codes de SP
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  em {resumoContabilizacao.totalUrnasApuradas} urnas processadas
                </span>
              </div>

            </div>

            {/* Goal Progress Bar */}
            <div className="mt-6 pt-6 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Meta Estadual: {candidatoAlvo.metaVotos.toLocaleString('pt-BR')} votos</span>
                </span>
                <span className="font-black text-emerald-400 text-sm">
                  {percentualMeta}% atingido
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(parseFloat(percentualMeta), 1))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Target KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] text-slate-400 block font-medium">Média por QR Code</span>
              <span className="text-2xl font-black text-white">{resumoContabilizacao.mediaPorUrna.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500 block">votos por seção em SP</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] text-slate-400 block font-medium">Cidades com Voto</span>
              <span className="text-2xl font-black text-blue-400">{resumoContabilizacao.detalhesPorMunicipio.length}</span>
              <span className="text-[10px] text-slate-500 block">municípios paulistas</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] text-slate-400 block font-medium">Urnas com Votos</span>
              <span className="text-2xl font-black text-emerald-400">
                {resumoContabilizacao.totalUrnasComVoto} / {resumoContabilizacao.totalUrnasApuradas}
              </span>
              <span className="text-[10px] text-slate-500 block">presença em seções</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] text-slate-400 block font-medium">Pico em 1 QR Code</span>
              <span className="text-2xl font-black text-amber-400">
                {resumoContabilizacao.maiorVotacaoSecao ? `${resumoContabilizacao.maiorVotacaoSecao.votos} votos` : '0'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {resumoContabilizacao.maiorVotacaoSecao ? `${resumoContabilizacao.maiorVotacaoSecao.municipioNome} (S-${resumoContabilizacao.maiorVotacaoSecao.secao})` : 'Aguardando'}
              </span>
            </div>
          </div>

          {/* Breakdown by City */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>Contabilização por Municípios de São Paulo ({candidatoAlvo.nome})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resumoContabilizacao.detalhesPorMunicipio.map((item, index) => (
                <div key={item.municipioNome} className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-200 text-xs font-black flex items-center justify-center">
                      {index + 1}º
                    </span>
                    <div>
                      <span className="font-bold text-white text-xs block">{item.municipioNome} (SP)</span>
                      <span className="text-[10px] text-slate-400">{item.totalSecoes} seção(ões) • Média {item.media.toFixed(1)}/urna</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400">{item.totalVotos.toLocaleString('pt-BR')}</span>
                    <span className="text-[10px] text-slate-400 block">{item.porcentagemDoTotal.toFixed(1)}% do total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Section by Section Table for Target Candidate */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white">Extrato de Votos Urna a Urna (Todos os QR Codes)</h3>
                <p className="text-xs text-slate-400">Contribuição exata de cada QR Code de São Paulo para {candidatoAlvo.nome}</p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtroSomenteComVoto}
                    onChange={(e) => setFiltroSomenteComVoto(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span>Apenas seções com votos</span>
                </label>

                <button
                  onClick={handleExportExtratoAlvoCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CSV Extrato</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="p-3">Município / Seção</th>
                    <th className="p-3">Zona</th>
                    <th className="p-3">Urna ID</th>
                    <th className="p-3">Votos do Candidato Alvo</th>
                    <th className="p-3">% dos Votos da Seção</th>
                    <th className="p-3">Comparecimento</th>
                    <th className="p-3 text-right">Espelho Térmico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {resumoContabilizacao.detalhesPorSecao
                    .filter(d => (filtroSomenteComVoto ? d.votos > 0 : true))
                    .map(item => {
                      const buOriginal = boletinsSP.find(b => b.id === item.buId);
                      return (
                        <tr key={item.buId} className="hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="font-bold text-white">{item.municipioNome} (SP)</div>
                            <div className="text-[11px] text-slate-400">Seção {item.secao}</div>
                          </td>
                          <td className="p-3 font-semibold text-slate-300">
                            Zona {item.zona}
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {item.idUrna}
                          </td>
                          <td className="p-3">
                            <span className="font-black text-emerald-400 text-sm">
                              +{item.votos} votos
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-200">
                            {item.porcentagemNaUrna.toFixed(2)}%
                          </td>
                          <td className="p-3 text-slate-400">
                            {item.comparecimento} eleitores
                          </td>
                          <td className="p-3 text-right">
                            {buOriginal && (
                              <button
                                onClick={() => onSelectBuReceipt(buOriginal)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 transition"
                                title="Ver Espelho Térmico do BU"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: VOTAÇÃO GERAL DO ESTADO DE SÃO PAULO */}
      {activeTab === 'geral_sp' && (
        <div className="space-y-6">
          
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-slate-400 font-bold uppercase mr-1">Cargo SP:</span>
              
              <button
                onClick={() => setCargoGeral('6')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  cargoGeral === '6' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                Deputado Federal SP
              </button>

              <button
                onClick={() => setCargoGeral('1')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  cargoGeral === '1' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                Presidente em SP
              </button>

              <button
                onClick={() => setCargoGeral('3')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  cargoGeral === '3' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                Governador de SP
              </button>

              <button
                onClick={() => setCargoGeral('5')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  cargoGeral === '5' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                Senador de SP
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Cidade SP:</span>
              <select
                value={filtroMunicipio}
                onChange={(e) => setFiltroMunicipio(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer"
              >
                {cidadesSP.map(cid => (
                  <option key={cid} value={cid} className="bg-slate-900 text-white">{cid}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ranking of Candidates */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <span>Resultado Geral em SP: {apuracaoGeralSP.nomeCargo}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {filtroMunicipio === 'TODOS' ? 'Consolidado de todo o Estado de São Paulo' : `Filtrado para o município de ${filtroMunicipio}`}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-bold">Total Votos Válidos</span>
                <span className="text-base font-black text-blue-400">
                  {apuracaoGeralSP.totalValidos.toLocaleString('pt-BR')} votos
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {apuracaoGeralSP.ranking.map((cand, index) => {
                const isAlvo = cand.numero === candidatoAlvo.numero;
                return (
                  <div 
                    key={cand.numero}
                    className={`p-3.5 rounded-2xl border transition ${
                      isAlvo 
                        ? 'bg-emerald-950/60 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          index === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {index + 1}º
                        </span>

                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 ${
                          isAlvo ? 'bg-emerald-600 shadow' : 'bg-slate-700'
                        }`}>
                          {cand.numero}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white truncate">{cand.nome}</span>
                            {isAlvo && (
                              <span className="px-2 py-0.2 text-[9px] font-black bg-emerald-500 text-slate-950 rounded-full uppercase">
                                SEU CANDIDATO ALVO
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            <span className="font-bold text-slate-300">{cand.sigla}</span> • {cand.partido}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-white">
                          {cand.porcentagem.toFixed(2)}%
                        </div>
                        <div className="text-xs text-slate-400">
                          {cand.votos.toLocaleString('pt-BR')} votos
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-950 rounded-full h-2 mt-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAlvo ? 'bg-emerald-400' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(cand.porcentagem, 1))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: LISTA COMPLETA DE BUS DE SÃO PAULO */}
      {activeTab === 'bus' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-white">Boletins de Urna Registrados no Estado de São Paulo</h3>
              <p className="text-xs text-slate-400">Total de {boletinsSP.length} seções eleitorais auditadas</p>
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Exportar BUs CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="p-3">Município / Seção</th>
                  <th className="p-3">Zona</th>
                  <th className="p-3">Urna ID</th>
                  <th className="p-3">Comparecimento</th>
                  <th className="p-3">Votos do Candidato Alvo</th>
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {boletinsSP.map(bu => {
                  const votosAlvoUrna = extrairVotosCandidatoDoBu(bu, candidatoAlvo.numero);

                  return (
                    <tr key={bu.id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-white">{bu.municipioNome} (SP)</div>
                        <div className="text-[11px] text-slate-400">Seção {bu.secao}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-300">
                        Zona {bu.zona}
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        {bu.idUrna}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-white">{bu.comparecimento}</span>
                        <span className="text-[10px] text-slate-400"> / {bu.eleitoresAptos}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-black text-emerald-400 text-sm">+{votosAlvoUrna} votos</span>
                      </td>
                      <td className="p-3 text-slate-400 text-[10px]">
                        {bu.dataHoraGeracao}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectBuReceipt(bu)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
                            title="Ver Espelho Térmico do BU"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Excluir o Boletim da Seção ${bu.secao} (${bu.municipioNome})?`)) {
                                onDeleteBu(bu.id);
                              }
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÃO DO CANDIDATO ALVO */}
      {isEditAlvoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-black text-white mb-2 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-400" />
              <span>Configurar Candidato Federal Alvo</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Defina o número e os dados do candidato a Deputado Federal de SP. O sistema recalculará imediatamente todos os votos de todos os QR Codes lidos para o novo número!
            </p>

            <form onSubmit={handleSaveEditAlvo} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Número na Urna (4 dígitos):</label>
                <input
                  type="text"
                  required
                  value={editNumero}
                  onChange={(e) => setEditNumero(e.target.value)}
                  placeholder="Ex: 2200"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nome do Candidato:</label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome completo na urna"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Sigla Partido:</label>
                  <input
                    type="text"
                    required
                    value={editSigla}
                    onChange={(e) => setEditSigla(e.target.value)}
                    placeholder="Ex: PL"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nome Partido / Coligação:</label>
                  <input
                    type="text"
                    value={editPartido}
                    onChange={(e) => setEditPartido(e.target.value)}
                    placeholder="Ex: Partido Liberal"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Meta de Votos no Estado de SP:</label>
                <input
                  type="number"
                  required
                  value={editMeta}
                  onChange={(e) => setEditMeta(e.target.value)}
                  placeholder="120000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditAlvoModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Salvar e Recontar Votos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Alterar Senha do Administrador */}
      <AdminChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSuccess={(msg) => {
          setPasswordChangeSuccess(msg);
          setTimeout(() => setPasswordChangeSuccess(null), 5000);
        }}
      />

      {/* Modal para Alterar Foto de Capa (Exclusivo Admin) */}
      <AdminCoverPhotoModal
        isOpen={isCoverPhotoModalOpen}
        onClose={() => setIsCoverPhotoModalOpen(false)}
        onCoverUpdated={() => {
          setPasswordChangeSuccess('Foto de capa do aplicativo atualizada com sucesso!');
          setTimeout(() => setPasswordChangeSuccess(null), 4000);
        }}
      />

      {/* Password change feedback alert */}
      {passwordChangeSuccess && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-950/95 border-2 border-emerald-500 rounded-2xl shadow-2xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{passwordChangeSuccess}</span>
        </div>
      )}

    </div>
  );
};
