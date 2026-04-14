import { Elysia, t } from 'elysia';
import * as poRepo from '../repositories/supplier';

export const purchaseOrderRoutes = new Elysia({ prefix: '/api/purchase-orders' })
  .get('/', async () => {
    return poRepo.getAllPOs();
  })
  .get('/:id', async ({ params }) => {
    const po = await poRepo.getPOWithItems(Number(params.id));
    if (!po) return { error: 'PO not found' };
    return po;
  })
  .post('/', async ({ body }) => {
    const { supplierId, items, notes, expectedDeliveryDate, createdBy } = body as any;
    if (!supplierId || !items || items.length === 0) return { error: 'supplierId and items are required' };
    return poRepo.createPO({ supplierId, items, notes, expectedDeliveryDate, createdBy });
  })
  .put('/:id', async ({ params, body }) => {
    return poRepo.updatePO(Number(params.id), body as any);
  })
  .patch('/:id/status', async ({ params, body }) => {
    const { status } = body as any;
    if (!status || !['draft', 'ordered', 'received', 'cancelled'].includes(status)) return { error: 'Invalid status' };
    return poRepo.updatePOStatus(Number(params.id), status);
  })
  .post('/:id/receive', async ({ params, body }) => {
    const { receivedBy, receivedItems } = body as any;
    if (!receivedBy) return { error: 'receivedBy is required' };
    return poRepo.receivePO(Number(params.id), receivedBy, receivedItems);
  })
  .get('/supplier/:supplierId', async ({ params }) => {
    return poRepo.getPOsBySupplier(Number(params.supplierId));
  })
  .get('/best-price/:ingredientId', async ({ params }) => {
    return poRepo.getBestPriceForIngredient(Number(params.ingredientId));
  });
