import { listPartners, removePartner, requestPartner, updatePartner } from '../services/partnerService.js';

export async function list(req, res) {
  const data = await listPartners(req.user.id);
  res.json({ success: true, data });
}

export async function request(req, res) {
  const partner = await requestPartner(req.user.id, req.body.email, req.body.shareProgress);
  res.status(201).json({ success: true, data: { partner } });
}

export async function update(req, res) {
  const partner = await updatePartner(req.user.id, req.params.partnerId, req.body);
  res.json({ success: true, data: { partner } });
}

export async function remove(req, res) {
  await removePartner(req.user.id, req.params.partnerId);
  res.json({ success: true, data: { message: 'Partner removed.' } });
}
