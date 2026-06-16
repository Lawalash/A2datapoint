import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/context/ToastContext';

export type CameraState = 'idle' | 'countdown' | 'flash' | 'processing' | 'success';

export const useCameraSimulation = () => {
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [countdownValue, setCountdownValue] = useState(3);
  const { addToast } = useToast();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = useCallback(() => {
    setCameraState('countdown');
    setCountdownValue(3);

    let count = 3;
    timerRef.current = setInterval(() => {
      count -= 1;
      setCountdownValue(count);
      if (count <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setCameraState('flash');
        setTimeout(() => {
          setCameraState('processing');
          setTimeout(() => {
            setCameraState('success');
            setTimeout(() => {
              setCameraState('idle');
              addToast('Ponto registrado com sucesso!', 'success');
            }, 1500);
          }, 800);
        }, 300);
      }
    }, 800);
  }, [addToast]);

  const resetCamera = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCameraState('idle');
    setCountdownValue(3);
  }, []);

  return { cameraState, countdownValue, startCamera, resetCamera };
};
