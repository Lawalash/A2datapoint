import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useAdminAttendance } from '../../hooks/useAdminAttendance';

interface PhotoEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  storagePath?: string | null;
  employeeName: string;
  employeeMatricula: string;
  punchType: string;
  punchTime: string;
  punchDate: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  recordId?: string | null;
  photoStatus?: string | null;
}

const PhotoEvidenceModal: React.FC<PhotoEvidenceModalProps> = ({
  isOpen,
  onClose,
  storagePath,
  employeeName,
  employeeMatricula,
  punchType,
  punchTime,
  punchDate,
  latitude,
  longitude,
  distanceMeters,
  recordId,
  photoStatus
}) => {
  const { getSignedUrl } = useAdminAttendance();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    if (isOpen) {
      if (photoStatus === 'removed') {
        setPhotoUrl(null);
        setLoading(false);
      } else if (storagePath) {
        setLoading(true);
        setError(null);
        getSignedUrl(storagePath, recordId || undefined, photoStatus || undefined)
          .then(url => {
            if (isMounted) {
              setPhotoUrl(url);
            }
          })
          .catch(err => {
            console.error(err);
            if (isMounted) {
              setError('Não foi possível carregar a evidência visual. Verifique o Storage.');
              setLoading(false);
            }
          });
      } else if (photoStatus === 'uploaded') {
        // Marcado como enviado mas o storagePath não existe nem fallback funcionou
        setError('Evidência marcada como enviada, mas o caminho da foto não foi encontrado.');
        setLoading(false);
      } else {
        setPhotoUrl(null);
        setLoading(false);
      }
    } else {
      setPhotoUrl(null);
      setLoading(false);
      setError(null);
    }

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, storagePath]); // getSignedUrl removido intencionalmente para evitar hooks refetching

  if (!isOpen) return null;

  const punchLabels: Record<string, string> = {
    'ENTRADA': 'Entrada',
    'SAIDA_ALMOCO': 'Saída Almoço',
    'RETORNO_ALMOCO': 'Retorno Almoço',
    'SAIDA': 'Saída',
  };

  const hasGps = latitude !== null && longitude !== null && latitude !== undefined;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E5E5E5] flex justify-between items-center bg-[#F8F9FA] shrink-0">
            <h3 className="text-lg font-semibold text-[#003D5C] flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#7C9DB5]" />
              Evidência visual do ponto
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#666666] hover:text-[#DC3545] hover:bg-[#DC3545]/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            {/* Context Info */}
            <div className="bg-[#F8F9FA] rounded-xl p-4 mb-6 border border-[#E5E5E5] space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#666666] uppercase font-semibold">Colaborador</p>
                  <p className="text-sm font-medium text-[#1A1A1A]">{employeeName}</p>
                  <p className="text-xs text-[#7C9DB5]">Matrícula: {employeeMatricula}</p>
                </div>
                <div>
                  <p className="text-xs text-[#666666] uppercase font-semibold">Registro</p>
                  <p className="text-sm font-medium text-[#1A1A1A]">{punchDate} às {punchTime}</p>
                  <p className="text-xs text-[#7C9DB5]">Batida: {punchLabels[punchType] || punchType}</p>
                </div>
              </div>
              
              {hasGps && (
                <div className="pt-3 border-t border-[#E5E5E5] flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#7C9DB5] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#666666] uppercase font-semibold">Localização GPS</p>
                    <p className="text-sm text-[#1A1A1A]">
                      Distância da base: {distanceMeters != null ? `${distanceMeters.toFixed(1)} metros` : 'Desconhecida'}
                    </p>
                    <a 
                      href={`https://maps.google.com/?q=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#003D5C] hover:underline"
                    >
                      Abrir no mapa
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Photo Area */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-[3/4] flex items-center justify-center border border-[#E5E5E5]">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 bg-[#1A1A1A]">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#7C9DB5]" />
                  <p className="text-sm font-medium tracking-wide">Carregando evidência visual...</p>
                </div>
              )}

              {error && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-10 bg-[#1A1A1A]">
                  <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                  <p className="text-red-400 font-semibold mb-1 text-base">Falha ao carregar</p>
                  <p className="text-sm text-white/70">{error}</p>
                </div>
              )}

              {!loading && !error && !photoUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-10 bg-[#1A1A1A]">
                  <ImageIcon className="w-10 h-10 text-white/30 mb-3" />
                  <p className="text-white/70 text-sm font-medium">Nenhuma evidência visual disponível.</p>
                  <p className="text-white/40 text-xs mt-1">Status: {photoStatus}</p>
                </div>
              )}

              {!error && photoUrl && (
                <img 
                  src={photoUrl} 
                  alt={`Evidência de ${employeeName}`} 
                  className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError('Não foi possível carregar a evidência visual da imagem.');
                  }}
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PhotoEvidenceModal;
