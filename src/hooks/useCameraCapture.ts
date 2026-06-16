import { useState, useRef, useCallback, useEffect } from 'react';

export function useCameraCapture() {
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'captured' | 'uploading' | 'success' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraState('starting');
      setCameraError(null);
      setPhotoBlob(null);
      setPhotoDataUrl(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (fallbackErr) {
        console.warn('Falha com facingMode user, tentando fallback sem facingMode...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;

      // Se o videoRef já estiver pronto, atachamos direto. Senão, o useEffect vai lidar com isso.
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.error('Erro ao tocar vídeo:', e));
      }

      setCameraState('active');
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraState('error');
      
      if (err.name === 'NotAllowedError') {
        setCameraError('Permissão de câmera negada. Autorize a câmera no navegador para registrar o ponto.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('Não foi possível acessar a câmera neste dispositivo.');
      } else {
        setCameraError('Erro ao abrir a câmera: ' + err.message);
      }
    }
  }, []);

  // Garante que o stream seja anexado ao video quando ele for renderizado
  useEffect(() => {
    if (cameraState === 'active' && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [cameraState]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
    setCameraError(null);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || cameraState !== 'active') return;

    try {
      const video = videoRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Câmera ainda não está pronta para captura.');
      }

      const canvas = document.createElement('canvas');
      
      // Calculate aspect ratio
      const videoRatio = video.videoWidth / video.videoHeight;
      const targetWidth = Math.min(video.videoWidth, 1280);
      const targetHeight = targetWidth / videoRatio;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível inicializar o canvas 2D');

      // Mirror the image back to normal if it was mirrored in UI
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Convert to WebP for better compression
      const dataUrl = canvas.toDataURL('image/webp', 0.8);
      setPhotoDataUrl(dataUrl);

      // Create Blob for upload
      canvas.toBlob((blob) => {
        if (blob) {
          setPhotoBlob(blob);
          setCameraState('captured');
        } else {
          throw new Error('Falha ao gerar o arquivo de imagem.');
        }
      }, 'image/webp', 0.8);

    } catch (err: any) {
      console.error('Erro na captura:', err);
      setCameraError(err.message || 'Falha ao processar a foto.');
      setCameraState('error');
    }
  }, [cameraState]);

  const retakePhoto = useCallback(() => {
    setPhotoBlob(null);
    setPhotoDataUrl(null);
    setCameraState('active');
  }, []);

  return {
    cameraState,
    setCameraState,
    cameraError,
    photoBlob,
    photoDataUrl,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    retakePhoto
  };
}
