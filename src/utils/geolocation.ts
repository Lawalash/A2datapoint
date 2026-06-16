export interface GeolocationPositionSafe {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export async function getCurrentPositionSafe(options?: GeolocationOptions): Promise<GeolocationPositionSafe> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      return reject(new Error('Seu dispositivo ou navegador não suporta geolocalização.'));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Permissão de localização negada. Autorize no cadeado ao lado do endereço do navegador.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Não foi possível obter sua localização. Verifique o GPS do dispositivo.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Tempo limite excedido ao buscar localização. Tente novamente.'));
            break;
          default:
            reject(new Error('Ocorreu um erro desconhecido ao obter a localização.'));
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      }
    );
  });
}
