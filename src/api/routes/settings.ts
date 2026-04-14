import { Elysia, t } from 'elysia';
import * as settingsRepo from '../repositories/settings';

export const settingsRoutes = new Elysia({ prefix: '/api/settings' })
  .get('/business', async () => {
    return await settingsRepo.getBusinessSettings();
  })
  .put('/business', async ({ body }) => {
    return await settingsRepo.updateBusinessSettings(body as any);
  })
  .get('/tax', async () => {
    return await settingsRepo.getTaxSettings();
  })
  .put('/tax', async ({ body }) => {
    return await settingsRepo.updateTaxSettings(body as any);
  })
  .get('/payments', async () => {
    return await settingsRepo.getAllPaymentMethods();
  })
  .put('/payments/:id', async ({ params, body }) => {
    return await settingsRepo.updatePaymentMethod(Number(params.id), body as any);
  })
  .patch('/payments/:id/toggle', async ({ params }) => {
    return await settingsRepo.togglePaymentMethod(Number(params.id));
  })
  .get('/receipt', async () => {
    return await settingsRepo.getReceiptSettings();
  })
  .put('/receipt', async ({ body }) => {
    return await settingsRepo.updateReceiptSettings(body as any);
  })
  .get('/hours', async () => {
    return await settingsRepo.getOperatingHours();
  })
  .put('/hours/:day', async ({ params, body }) => {
    return await settingsRepo.updateOperatingHours(Number(params.day), body as any);
  })
  .get('/all', async () => {
    return await settingsRepo.getAllSettings();
  })
  .get('/public/is-open', async () => {
    return { isOpen: await settingsRepo.isCurrentlyOpen() };
  });
