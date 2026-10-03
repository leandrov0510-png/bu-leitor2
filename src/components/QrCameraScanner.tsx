import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, Upload, FileText, Flashlight, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface QrCameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isScanningActive: boolean;
}

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({
  onScanSuccess,
  onScanError,
  isScanningActive
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'tse-bu-qr-reader-container';

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [fileScanStatus, setFileScanStatus] = useState<string | null>(null);

  // Initialize camera scanner
  useEffect(() => {
    let isMounted = true;

    async function initScanner() {
      if (!isScanningActive) return;

      try {
        setIsInitializing(true);
        setCameraError(null);

        // Get available camera devices
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera ('environment')
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('traseira') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear')
          );
          const activeId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(activeId);

          await startCamera(activeId);
        } else {
          // iOS Safari fallback: directly request back camera via facingMode constraint
          await startCamera({ facingMode: "environment" } as any);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Permissão de câmera negada ou indisponível.';
        setCameraError(`Câmera inacessível (${msg}). Use o envio de imagem do BU ou entrada manual.`);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    initScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isScanningActive]);

  async function startCamera(cameraId: string) {
    stopCamera();

    try {
      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        (error) => {
          if (onScanError && error) {
            onScanError(error);
          }
        }
      );

      // Check if torch is supported
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }

      setCameraError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao iniciar stream da câmera';
      setCameraError(`Erro ao abrir câmera: ${msg}`);
    }
  }

  function stopCamera() {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      scannerRef.current.clear();
      scannerRef.current = null;
    }
  }

  async function switchCamera(newCameraId: string) {
    setSelectedCameraId(newCameraId);
    await startCamera(newCameraId);
  }

  async function toggleTorch() {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const next = !torchEnabled;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: next } as any]
      });
      setTorchEnabled(next);
    } catch {
      // Not supported
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileScanStatus('Processando imagem do BU...');

    try {
      // Temporary standalone instance for file scanning
      const tempScanner = new Html5Qrcode('file-temp-scanner-div');
      const result = await tempScanner.scanFile(file, true);
      tempScanner.clear();

      setFileScanStatus('QR Code encontrado e decodificado!');
      setTimeout(() => setFileScanStatus(null), 2500);
      onScanSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'QR Code não legível';
      setFileScanStatus(`QR Code não identificado na foto (${msg}). Tente uma imagem mais nítida.`);
      setTimeout(() => setFileScanStatus(null), 4000);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualText.trim()) return;
    onScanSuccess(manualText.trim());
    setManualText('');
    setShowManualInput(false);
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Hidden div for file processing */}
      <div id="file-temp-scanner-div" style={{ display: 'none' }} />

      {/* Camera Viewfinder Box */}
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700 shadow-2xl">
        
        {/* html5-qrcode mount point */}
        <div id={containerId} className="w-full aspect-square min-h-[300px] bg-slate-950" />

        {/* Scan Reticle & Animated Laser Line (visual overlay when camera is running) */}
        {!cameraError && !isInitializing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Viewfinder target box */}
            <div className="w-56 h-56 border-2 border-dashed border-emerald-400/80 rounded-xl relative shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Animated laser scan bar */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse absolute top-1/2 -translate-y-1/2" />
            </div>

            <span className="absolute bottom-4 text-xs font-semibold text-emerald-300 bg-slate-900/85 px-3 py-1 rounded-full border border-emerald-500/30 backdrop-blur-sm">
              Enquadre o QR Code do Boletim de Urna
            </span>
          </div>
        )}

        {/* Loading Spinner */}
        {isInitializing && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">Inicializando leitor óptico...</p>
            <p className="text-xs text-slate-500 mt-1">Solicitando acesso à câmera</p>
          </div>
        )}

        {/* Camera Error / Permission Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
            <p className="text-sm font-bold text-white mb-2">Câmera em Standby ou Sem Permissão</p>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">{cameraError}</p>
            
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow">
                <Upload className="w-4 h-4" />
                <span>Fotografar / Carregar Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700"
              >
                <FileText className="w-4 h-4" />
                <span>Digitar / Colar Código</span>
              </button>
            </div>
          </div>
        )}

        {/* In-Viewfinder Camera Controls Toolbar */}
        {!cameraError && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-full backdrop-blur-md transition ${
                  torchEnabled ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900/70 text-slate-200'
                }`}
                title={torchEnabled ? 'Desligar Lanterna' : 'Ligar Lanterna'}
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            {cameras.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
                  const nextIndex = (currentIndex + 1) % cameras.length;
                  switchCamera(cameras[nextIndex].id);
                }}
                className="p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-slate-200 backdrop-blur-md transition"
                title="Inverter Câmera (Frontal / Traseira)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

      </div>

      {/* File status message notification */}
      {fileScanStatus && (
        <div className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
          fileScanStatus.includes('sucesso') || fileScanStatus.includes('encontrado')
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : fileScanStatus.includes('não')
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        }`}>
          {fileScanStatus.includes('encontrado') ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          <span>{fileScanStatus}</span>
        </div>
      )}

      {/* Alternative Input Methods Bar */}
      <div className="flex items-center justify-center gap-3 mt-4 w-full max-w-sm">
        <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition shadow-sm">
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>Upload Imagem</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>

        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs font-medium transition shadow-sm"
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Colar Dados</span>
        </button>
      </div>

      {/* Manual Input Dropdown / Box */}
      {showManualInput && (
        <form onSubmit={handleManualSubmit} className="mt-3 w-full max-w-sm bg-slate-800/95 p-4 rounded-xl border border-slate-700 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200">Entrada Manual de Dados do BU</span>
            <button
              type="button"
              onClick={() => setShowManualInput(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Cole a string de QR Code ou o conteúdo do Boletim de Urna (ex: linhas VRQR, UNFE, ZONA, SECA, CAND, etc.):
          </p>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={4}
            placeholder="VRQR:02.00&#10;UNFE:SP&#10;ZONA:0001&#10;SECA:0042&#10;CARG:11&#10;CAND:15:114&#10;..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="submit"
              disabled={!manualText.trim()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow"
            >
              Processar Boletim
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
