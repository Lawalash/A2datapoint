export const getProfileAvatarKey = (userId: string): string => {
  return `profileAvatar:${userId}`;
};

export const saveProfileAvatar = (userId: string, base64: string): void => {
  if (!userId) return;
  localStorage.setItem(getProfileAvatarKey(userId), base64);
  window.dispatchEvent(new Event('avatarUpdated'));
};

export const loadProfileAvatar = (userId: string): string | null => {
  if (!userId) return null;
  return localStorage.getItem(getProfileAvatarKey(userId));
};

export const removeProfileAvatar = (userId: string): void => {
  if (!userId) return;
  localStorage.removeItem(getProfileAvatarKey(userId));
  window.dispatchEvent(new Event('avatarUpdated'));
};
