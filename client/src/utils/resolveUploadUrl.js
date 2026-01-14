export const resolveUploadUrl = (fileBase, value) => {
  if (!value) return '';
  if (typeof value !== 'string') return '';
  return value.startsWith('/uploads') ? `${fileBase}${value}` : value;
};
