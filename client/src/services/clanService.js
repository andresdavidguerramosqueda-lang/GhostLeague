import api from './api';

export const getPublicClans = async ({ limit = 20, skip = 0, search = '' } = {}) => {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('skip', String(skip));
  if (search) params.set('search', search);

  const { data } = await api.get(`/clans?${params.toString()}`);
  return data;
};

export const getClanById = async (clanId) => {
  const { data } = await api.get(`/clans/${clanId}`);
  return data;
};

export const getClanStats = async (clanId) => {
  const { data } = await api.get(`/clans/${clanId}/stats`);
  return data;
};

export const getClanFeed = async (clanId, { limit = 20, skip = 0, type = '' } = {}) => {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('skip', String(skip));
  if (type) params.set('type', type);

  const { data } = await api.get(`/clans/${clanId}/feed?${params.toString()}`);
  return data;
};

export const createClan = async (payload) => {
  const { data } = await api.post('/clans', payload);
  return data;
};

export const updateClan = async (clanId, payload) => {
  const { data } = await api.put(`/clans/${clanId}`, payload);
  return data;
};

export const requestJoinClan = async (clanId, { message } = {}) => {
  const { data } = await api.post(`/clans/${clanId}/join`, { message });
  return data;
};

export const leaveClan = async (clanId) => {
  const { data } = await api.post(`/clans/${clanId}/leave`);
  return data;
};

export const inviteUserToClan = async (clanId, { userId, message, role } = {}) => {
  const { data } = await api.post(`/clans/${clanId}/invite`, { userId, message, role });
  return data;
};

export const promoteClanMember = async (clanId, { userId, newRole } = {}) => {
  const { data } = await api.post(`/clans/${clanId}/promote`, { userId, newRole });
  return data;
};

export const kickClanMember = async (clanId, { userId, reason } = {}) => {
  const { data } = await api.post(`/clans/${clanId}/kick`, { userId, reason });
  return data;
};
