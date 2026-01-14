import api from './api';

export const getMyClanInvites = async ({ type = 'received' } = {}) => {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  const { data } = await api.get(`/clan-invites/me?${params.toString()}`);
  return data;
};

export const acceptClanInvite = async (inviteId) => {
  const { data } = await api.post(`/clan-invites/${inviteId}/accept`);
  return data;
};

export const declineClanInvite = async (inviteId, { reason } = {}) => {
  const { data } = await api.post(`/clan-invites/${inviteId}/decline`, { reason });
  return data;
};

export const cancelClanInvite = async (inviteId) => {
  const { data } = await api.delete(`/clan-invites/${inviteId}`);
  return data;
};
