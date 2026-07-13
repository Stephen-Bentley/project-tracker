import api from '../api/api';

export const apiAssetSource = (assetUrl?: string) => {
  if (!assetUrl || !assetUrl.startsWith('/')) return assetUrl;
  return new URL(assetUrl, api.defaults.baseURL).toString();
};

export const avatarSource = apiAssetSource;
