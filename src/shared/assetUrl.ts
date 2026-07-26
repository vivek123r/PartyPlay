/** Resolve a file from public/ for both root and GitHub Pages subpath hosting. */
export const publicAsset = (path: string): string => {
  const normalized = path.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${normalized}`;
};
