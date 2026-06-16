// Utility to monitor LocalStorage usage for A2 DataPoint

export interface LocalStorageItem {
  key: string;
  type: string;
  sizeBytes: number;
}

export const getProjectLocalStorageKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      if (
        key.startsWith('a2') ||
        key.startsWith('A2') ||
        key.includes('datapoint') ||
        key.startsWith('employeeAvatar') ||
        key.startsWith('adminAvatar') ||
        key.startsWith('profileAvatar')
      ) {
        keys.push(key);
      }
    }
  }
  return keys;
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getLocalStorageUsage = (): { items: LocalStorageItem[]; totalBytes: number } => {
  const keys = getProjectLocalStorageKeys();
  let totalBytes = 0;
  const items: LocalStorageItem[] = keys.map(key => {
    const value = localStorage.getItem(key) || '';
    // Approximate size in bytes: 1 character = 2 bytes (UTF-16)
    const sizeBytes = value.length * 2;
    totalBytes += sizeBytes;

    let type = 'Dados de Configuração';
    if (key.includes('Avatar')) {
      type = 'Foto de Perfil Local (Base64)';
    } else if (key.includes('token') || key.includes('auth')) {
      type = 'Sessão/Token';
    }

    return { key, type, sizeBytes };
  });

  return { items, totalBytes };
};

export const clearProfileAvatarsFromLocalStorage = (): void => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key === 'adminAvatar' || key.startsWith('employeeAvatar') || key.startsWith('profileAvatar'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Dispatch event so other components can update
  window.dispatchEvent(new Event('avatarUpdated'));
};
