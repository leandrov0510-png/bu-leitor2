import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw, 
  Eye, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MapPin,
  Calendar,
  Vote
} from 'lucide-react';
import { BoletimDeUrna } from '../types';
import { exportarBusParaCsv } from '../services/csvExport';

interface BuListTableProps {
  boletins: BoletimDeUrna[];
  onSelectBu: (bu: BoletimDeUrna) => void;
  onDeleteBu: (id: string) => void;
  onSyncBu: (bu: BoletimDeUrna) => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  onClearAll: () => void;
  onOpenScanner: () => void;
}

export const BuListTable: React.FC<BuListTableProps> = ({
  boletins,
  onSelectBu,
  onDeleteBu,
  onSyncBu,
  onSyncAll,
  isSyncing,
  onClearAll,
  onOpenScanner
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterUf, setFilterUf] = useState<string>('TODOS');
  const [filterSync, setFilterSync] = useState<string>('TODOS');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Distinct UFs
  const ufs = useMemo(() => {
    const s = new Set(boletins.map(b => b.uf));
    return ['TODOS', ...Array.from(s)];
  }, [boletins]);

  // Filtered & Searched BUs
  const filteredList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return boletins.filter(b => {
      // UF filter
      if (filterUf !== 'TODOS' && b.uf !== filterUf) return false;
      // Sync filter
      if (filterSync !== 'TODOS' && b.syncStatus !== filterSync) return false;

      // Text search
      if (!term) return true;

      const matchId = b.id.toLowerCase().includes(term);
      const matchCity = b.municipioNome.toLowerCase().includes(term);
      const matchZona = b.zona.includes(term);
      const matchSecao = b.secao.includes(term);
      const matchUrna = b.idUrna.includes(term);

      // Check candidates inside
      const matchCandidate = Object.values(b.cargos).some(c => 
        c.candidatos.some(cand => 
          cand.nome.toLowerCase().includes(term) || 
          cand.numero.includes(term) ||
          cand.siglaPartido.toLowerCase().includes(term)
        )
      );

      return matchId || matchCity || matchZona || matchSecao || matchUrna || matchCandidate;
    });
  }, [boletins, searchTerm, filterUf, filterSync]);

  // Selection toggle
  function toggleSelectAll() {
    if (selectedIds.size === filteredList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map(b => b.id)));
    }
  }

  function toggleSelectOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function handleExportAll() {
    exportarBusParaCsv(filteredList);
  }

  function handleExportSelected() {
    const list = boletins.filter(b => selectedIds.has(b.id));
    if (list.length > 0) {
      exportarBusParaCsv(list);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>Lista de Boletins de Urna Auditados</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Total de {boletins.length} boletins registrados no banco local (IndexedDB).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition"
          >
            <Vote className="w-4 h-4" />
            <span>Ler BU</span>
          </button>

          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar Nuvem</span>
          </button>

          <button
            onClick={handleExportAll}
            disabled={filteredList.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Exportar CSV</span>
          </button>

          {boletins.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Tem certeza que deseja apagar todos os BUs armazenados localmente?')) {
                  onClearAll();
                }
              }}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition"
              title="Limpar todos os dados do banco local"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        
        {/* Search input */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por Seção, Zona, Município, Urna ID ou Candidato..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* UF dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>UF:</span>
          <select
            value={filterUf}
            onChange={(e) => setFilterUf(e.target.value)}
            className="bg-transparent text-white font-bold outline-none cursor-pointer"
          >
            {ufs.map(uf => (
              <option key={uf} value={uf} className="bg-slate-900 text-white">{uf}</option>
            ))}
          </select>
        </div>

        {/* Sync Status dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
          <span>Status:</span>
          <select
            value={filterSync}
            onChange={(e) => setFilterSync(e.target.value)}
            className="bg-transparent text-white font-bold outline-none cursor-pointer"
          >
            <option value="TODOS" className="bg-slate-900 text-white">Todos</option>
            <option value="synced" className="bg-slate-900 text-white">Sincronizado</option>
            <option value="pending" className="bg-slate-900 text-white">Pendente</option>
          </select>
        </div>

        {/* Selected count action */}
        {selectedIds.size > 0 && (
          <button
            onClick={handleExportSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar {selectedIds.size} selecionado(s)</span>
          </button>
        )}

      </div>

      {/* Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-slate-300">Nenhum Boletim de Urna encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Ajuste os filtros ou escaneie novos BUs usando o leitor óptico.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredList.length && filteredList.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="p-4">Seção & Zona</th>
                  <th className="p-4">Município / UF</th>
                  <th className="p-4">Urna ID</th>
                  <th className="p-4">Comparecimento</th>
                  <th className="p-4">Data/Hora Emissão</th>
                  <th className="p-4">Status Sincronização</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.map((bu) => {
                  const isSelected = selectedIds.has(bu.id);
                  const taxa = bu.eleitoresAptos > 0 ? ((bu.comparecimento / bu.eleitoresAptos) * 100).toFixed(1) : '0';

                  return (
                    <tr
                      key={bu.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-blue-900/10' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(bu.id)}
                          className="rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Seção & Zona */}
                      <td className="p-4">
                        <div className="font-black text-white text-sm">
                          Seção {bu.secao}
                        </div>
                        <div className="text-slate-400 font-medium">
                          Zona {bu.zona}
                        </div>
                      </td>

                      {/* Município / UF */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-200">
                          {bu.municipioNome}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          UF: <span className="font-bold text-slate-300">{bu.uf}</span> • Cód: {bu.municipioCodigo}
                        </div>
                      </td>

                      {/* Urna ID */}
                      <td className="p-4">
                        <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {bu.idUrna}
                        </span>
                      </td>

                      {/* Comparecimento & Aptos */}
                      <td className="p-4">
                        <div className="font-bold text-emerald-400">
                          {bu.comparecimento} / {bu.eleitoresAptos}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Taxa: <span className="font-semibold text-slate-300">{taxa}%</span> • Abst: {bu.abstencao}
                        </div>
                      </td>

                      {/* Data/Hora */}
                      <td className="p-4 text-slate-300 text-[11px]">
                        <div>{bu.dataHoraGeracao}</div>
                        <div className="text-[10px] text-slate-500">Encerramento: {bu.dataHoraEncerramento}</div>
                      </td>

                      {/* Status Sync */}
                      <td className="p-4">
                        {bu.syncStatus === 'synced' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Sincronizado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>Pendente</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* View Paper Thermal Receipt */}
                          <button
                            onClick={() => onSelectBu(bu)}
                            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                            title="Ver Espelho do BU (Formato Impresso TSE)"
                          >
                            <Eye className="w-4 h-4 text-emerald-400" />
                          </button>

                          {/* Re-sync single BU */}
                          <button
                            onClick={() => onSyncBu(bu)}
                            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                            title="Sincronizar com Nuvem"
                          >
                            <RefreshCw className="w-4 h-4 text-blue-400" />
                          </button>

                          {/* Delete BU */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Excluir o Boletim da Seção ${bu.secao} (Zona ${bu.zona})?`)) {
                                onDeleteBu(bu.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                            title="Excluir Registro"
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
        )}
      </div>

    </div>
  );
};
