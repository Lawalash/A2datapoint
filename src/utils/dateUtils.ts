export const getLocalOperationDate = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

export const getLocalOperationTime = (): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
};

export const getLocalOperationYear = (): string => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    year: 'numeric'
  }).format(new Date());
};

export const getLocalOperationMonth = (): string => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    month: '2-digit'
  }).format(new Date());
};

export const getLocalOperationDay = (): string => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    day: '2-digit'
  }).format(new Date());
};
