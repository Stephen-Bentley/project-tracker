import api from '../api/api';

export const avatarSource = (avatarUrl?: string) => {
  if (!avatarUrl || !avatarUrl.startsWith('/')) return avatarUrl;
  return new URL(avatarUrl, api.defaults.baseURL).toString();
};
