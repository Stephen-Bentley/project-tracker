import api from '../api/api';

export const apiAssetSource = (assetUrl?: string) => {
  if (!assetUrl) return '';
  if (assetUrl.startsWith('http')) return assetUrl;

  const base = api.defaults.baseURL || window.location.origin;
  const absoluteBase = base.startsWith('http')
    ? base
    : `${window.location.origin}${base}`.replace(/\/+/g, '/');
  const path = assetUrl.startsWith('/') ? assetUrl : `/${assetUrl}`;

  return `${absoluteBase}${path}`.replace(/\/+/g, '/');
};

export const avatarSource = apiAssetSource;
