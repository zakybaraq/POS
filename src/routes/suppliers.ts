import { Elysia, t } from 'elysia';
import * as supplierRepo from '../repositories/supplier';

export const supplierRoutes = new Elysia({ prefix: '/api/suppliers' })
  .get('/', async () => {
    return supplierRepo.getAllSuppliers();
  })
  .get('/active', async () => {
    return supplierRepo.getActiveSuppliers();
  })
  .get('/:id', async ({ params }) => {
    const supplier = await supplierRepo.getSupplierById(Number(params.id));
    if (!supplier) return { error: 'Supplier not found' };
    return supplier;
  })
  .post('/', async ({ body }) => {
    const { name, contactPerson, phone, email, address, category, notes } = body as any;
    if (!name) return { error: 'Name is required' };
    return supplierRepo.createSupplier({ name, contactPerson, phone, email, address, category, notes, isActive: true, createdAt: new Date() });
  })
  .put('/:id', async ({ params, body }) => {
    return supplierRepo.updateSupplier(Number(params.id), body as any);
  })
  .delete('/:id', async ({ params }) => {
    await supplierRepo.deleteSupplier(Number(params.id));
    return { success: true };
  })
  .get('/:id/prices', async ({ params }) => {
    return supplierRepo.getSupplierPrices(Number(params.id));
  });
