/**
 * Calcula a distância em metros entre dois pontos geográficos usando a fórmula de Haversine.
 * A fórmula de Haversine determina a distância do grande círculo entre dois pontos em uma esfera
 * dadas as suas longitudes e latitudes.
 *
 * @param lat1 Latitude do primeiro ponto
 * @param lon1 Longitude do primeiro ponto
 * @param lat2 Latitude do segundo ponto
 * @param lon2 Longitude do segundo ponto
 * @returns Distância em metros
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error('As coordenadas fornecidas devem ser números válidos.');
  }

  const toRadians = (degree: number) => degree * (Math.PI / 180);

  const R = 6371e3; // Raio da Terra em metros
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Formata a distância em metros para uma string legível.
 * Se < 1000m, exibe em metros (ex: 250m).
 * Se >= 1000m, exibe em quilômetros (ex: 2,15 km).
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }
  
  const km = distanceMeters / 1000;
  return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}
