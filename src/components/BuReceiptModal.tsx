import React from 'react';
import { X, Printer, Copy, Check, ShieldCheck, Download } from 'lucide-react';
import { BoletimDeUrna } from '../types';
import { formatarBuParaTseQr } from '../parser';

interface BuReceiptModalProps {
  bu: BoletimDeUrna | null;
  onClose: () => void;
}

export const BuReceiptModal: React.FC<BuReceiptModalProps> = ({ bu, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!bu) return null;

  function handleCopyText() {
    if (!bu) return;
    const raw = formatarBuParaTseQr(bu);
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Espelho do Boletim de Urna (BU)</h3>
              <p className="text-[11px] text-slate-400">Layout fidedigno ao papel térmico impresso pela Urna Eletrônica</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold transition"
              title="Copiar Código do BU"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold transition"
              title="Imprimir Espelho"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Paper Simulation Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex justify-center">
          
          {/* Paper Strip */}
          <div className="w-full max-w-md bg-[#fffdf0] text-slate-900 font-mono text-xs p-6 shadow-2xl rounded-sm border-t-8 border-b-8 border-dashed border-[#e2dec9] select-text">
            
            {/* TSE Official Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <div className="text-[11px] font-bold tracking-widest uppercase">
                REPÚBLICA FEDERATIVA DO BRASIL
              </div>
              <div className="text-[10px] font-semibold text-slate-700 uppercase">
                JUSTIÇA ELEITORAL - TRIBUNAL SUPERIOR ELEITORAL
              </div>
              <div className="text-sm font-black mt-1 uppercase tracking-wider">
                BOLETIM DE URNA
              </div>
              <div className="text-[10px] mt-0.5 font-bold">
                {bu.pleito}
              </div>
              <div className="text-[9px] text-slate-600">
                FASE: {bu.fase}º TURNO | OFICIAL
              </div>
            </div>

            {/* Geographic & Section Data */}
            <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-3 mb-3 text-[11px]">
              <div className="flex justify-between">
                <span>ESTADO (UF):</span>
                <span className="font-bold">{bu.uf}</span>
              </div>
              <div className="flex justify-between">
                <span>MUNICÍPIO:</span>
                <span className="font-bold">{bu.municipioCodigo} - {bu.municipioNome}</span>
              </div>
              <div className="flex justify-between">
                <span>ZONA ELEITORAL:</span>
                <span className="font-bold">{bu.zona}</span>
              </div>
              <div className="flex justify-between">
                <span>SEÇÃO ELEITORAL:</span>
                <span className="font-bold">{bu.secao}</span>
              </div>
              <div className="flex justify-between">
                <span>URNA ELETRÔNICA (ID):</span>
                <span className="font-bold">{bu.idUrna}</span>
              </div>
              <div className="flex justify-between">
                <span>CARGA DA URNA:</span>
                <span className="font-bold">{bu.idCarga || '98712345'}</span>
              </div>
              <div className="flex justify-between">
                <span>DATA/HORA EMISSÃO:</span>
                <span className="font-bold">{bu.dataHoraGeracao}</span>
              </div>
              <div className="flex justify-between">
                <span>ENCERRAMENTO:</span>
                <span className="font-bold">{bu.dataHoraEncerramento}</span>
              </div>
            </div>

            {/* Turnout & Voters statistics */}
            <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-3 mb-3 text-[11px]">
              <div className="font-bold text-[10px] uppercase text-slate-700 mb-1">
                ESTATÍSTICA DO ELEITORADO
              </div>
              <div className="flex justify-between">
                <span>ELEITORES APTOS:</span>
                <span className="font-bold">{bu.eleitoresAptos}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>COMPARECIMENTO:</span>
                <span>{bu.comparecimento}</span>
              </div>
              <div className="flex justify-between">
                <span>ABSTENÇÃO:</span>
                <span>{bu.abstencao}</span>
              </div>
            </div>

            {/* Results by Cargo */}
            {Object.values(bu.cargos).map((cargo) => (
              <div key={cargo.codigoCargo} className="border-b border-dashed border-slate-400 pb-3 mb-3">
                <div className="text-center font-black text-xs uppercase bg-slate-200 py-0.5 mb-2">
                  CARGO: {cargo.nomeCargo.toUpperCase()}
                </div>

                <div className="space-y-1 text-[11px]">
                  {cargo.candidatos.map((cand) => (
                    <div key={cand.numero} className="flex justify-between items-baseline">
                      <div className="truncate max-w-[240px]">
                        <span className="font-bold mr-1">{cand.numero}</span>
                        <span>{cand.nome}</span>
                        <span className="text-[9px] text-slate-600 ml-1">({cand.siglaPartido})</span>
                      </div>
                      <span className="font-bold shrink-0 ml-2">{cand.votos}</span>
                    </div>
                  ))}

                  {cargo.votosLegenda > 0 && (
                    <div className="flex justify-between text-slate-700 pt-1">
                      <span>VOTOS DE LEGENDA:</span>
                      <span className="font-bold">{cargo.votosLegenda}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-700">
                    <span>VOTOS EM BRANCO:</span>
                    <span className="font-bold">{cargo.votosBranco}</span>
                  </div>

                  <div className="flex justify-between text-slate-700">
                    <span>VOTOS NULOS:</span>
                    <span className="font-bold">{cargo.votosNulo}</span>
                  </div>

                  <div className="flex justify-between font-black border-t border-dotted border-slate-400 pt-1 mt-1">
                    <span>TOTAL APURADO NO CARGO:</span>
                    <span>{cargo.totalVotos}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Cryptographic Hash */}
            <div className="text-[9px] text-slate-600 break-all border-b border-dashed border-slate-400 pb-3 mb-3">
              <div className="font-bold uppercase text-slate-800 mb-0.5">RESUMO DIGITAL / ASSINATURA:</div>
              <div>{bu.hashAssinatura}</div>
              <div className="mt-1">VERSÃO DO SOFTWARE: {bu.versaoUrna} | QR: {bu.versaoQr}</div>
            </div>

            {/* Signature Lines */}
            <div className="mt-4 pt-2 text-[10px] space-y-4 text-center">
              <div>
                <div className="border-t border-slate-400 w-48 mx-auto mb-0.5" />
                <span>PRESIDENTE DA MESA RECEPTORA</span>
              </div>
              <div>
                <div className="border-t border-slate-400 w-48 mx-auto mb-0.5" />
                <span>1º MESÁRIO</span>
              </div>
              <div>
                <div className="border-t border-slate-400 w-48 mx-auto mb-0.5" />
                <span>FISCAL / DELEGADO PARTIDÁRIO</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            ID: <span className="font-mono text-slate-300">{bu.id}</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
