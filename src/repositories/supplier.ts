import { eq, and, gte, lte, desc, asc, sql, sum } from 'drizzle-orm';
import { db } from '../db/index';
import { suppliers, purchaseOrders, purchaseOrderItems, supplierPrices, ingredients, stockMovements } from '../db/schema';
import type { NewSupplier } from '../db/schema';

export async function getAllSuppliers() {
  return db.select().from(suppliers).orderBy(asc(suppliers.name));
}

export async function getActiveSuppliers() {
  return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.name));
}

export async function getSupplierById(id: number) {
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id));
  return result[0] || null;
}

export async function createSupplier(data: NewSupplier) {
  return db.insert(suppliers).values(data);
}

export async function updateSupplier(id: number, data: Record<string, any>) {
  await db.update(suppliers).set({ ...data, updatedAt: new Date() }).where(eq(suppliers.id, id));
  return db.select().from(suppliers).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number) {
  await db.update(suppliers).set({ isActive: false, updatedAt: new Date() }).where(eq(suppliers.id, id));
}

export async function getSuppliersByCategory(category: string) {
  return db.select().from(suppliers).where(and(eq(suppliers.category, category), eq(suppliers.isActive, true)));
}

export async function getAllPOs() {
  return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
}

export async function getPOById(id: number) {
  const result = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
  return result[0] || null;
}

export async function getPOByNumber(poNumber: string) {
  const result = await db.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, poNumber));
  return result[0] || null;
}

export async function getPOItems(poId: number) {
  return db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
}

export async function getPOWithItems(poId: number) {
  const po = await getPOById(poId);
  if (!po) return null;
  const items = await getPOItems(poId);
  return { po, items };
}

export async function createPO(data: { supplierId: number; items: Array<{ ingredientId: number; quantity: string; unit: string; unitPrice: number; notes?: string }>; notes?: string; expectedDeliveryDate?: string; createdBy: number }) {
  const poNumber = await generatePONumber();
  const subtotal = data.items.reduce((total, item) => {
    const qty = parseFloat(item.quantity);
    return total + (qty * item.unitPrice);
  }, 0);

  const poResult = await db.insert(purchaseOrders).values({
    poNumber,
    supplierId: data.supplierId,
    orderDate: new Date(),
    expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
    status: 'draft',
    subtotal: Math.round(subtotal),
    notes: data.notes || '',
    createdBy: data.createdBy,
  });

  const poId = poResult[0]?.insertId;
  if (!poId) return null;

  for (const item of data.items) {
    const qty = parseFloat(item.quantity);
    await db.insert(purchaseOrderItems).values({
      poId: Number(poId),
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: Math.round(qty * item.unitPrice),
      notes: item.notes || '',
    });
  }

  return getPOWithItems(Number(poId));
}

export async function updatePO(id: number, data: Record<string, any>) {
  const po = await getPOById(id);
  if (!po || po.status !== 'draft') return { error: 'Only draft POs can be updated' };

  if (data.items) {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, id));
    let subtotal = 0;
    for (const item of data.items) {
      const qty = parseFloat(item.quantity);
      subtotal += qty * item.unitPrice;
      await db.insert(purchaseOrderItems).values({
        poId: id,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: Math.round(qty * item.unitPrice),
        notes: item.notes || '',
      });
    }
    data.subtotal = Math.round(subtotal);
    delete data.items;
  }

  await db.update(purchaseOrders).set({ ...data, updatedAt: new Date() }).where(eq(purchaseOrders.id, id));
  return getPOWithItems(id);
}

export async function updatePOStatus(id: number, status: 'draft' | 'ordered' | 'received' | 'cancelled') {
  const po = await getPOById(id);
  if (!po) return null;
  if (po.status === 'received' || po.status === 'cancelled') return { error: 'Cannot change status of received or cancelled PO' };

  const updateData: Record<string, any> = { status, updatedAt: new Date() };
  if (status === 'received') {
    updateData.receivedDate = new Date();
  }

  await db.update(purchaseOrders).set(updateData).where(eq(purchaseOrders.id, id));
  return getPOById(id);
}

export async function receivePO(id: number, receivedBy: number, receivedItems?: Array<{ itemId: number; quantityReceived: string }>) {
  const po = await getPOById(id);
  if (!po) return { error: 'PO not found' };
  if (po.status !== 'ordered') return { error: 'Only ordered POs can be received' };

  const items = await getPOItems(id);

  const processItem = async (item: any, qtyReceived: number) => {
    const ingredient = await db.select().from(ingredients).where(eq(ingredients.id, item.ingredientId));
    if (ingredient.length) {
      const ing = ingredient[0];
      if (!ing) return;
      const currentStock = parseFloat(ing.currentStock);
      await db.update(ingredients).set({
        currentStock: (currentStock + qtyReceived).toFixed(2),
        updatedAt: new Date(),
      }).where(eq(ingredients.id, item.ingredientId));

       await db.insert(stockMovements).values({
         ingredientId: item.ingredientId,
         type: 'in',
         quantity: qtyReceived.toString(),
         reason: `PO ${po.poNumber} received`,
         referenceId: id,
         userId: receivedBy,
         createdAt: new Date(),
       });
    }

    await db.insert(supplierPrices).values({
      supplierId: po.supplierId,
      ingredientId: item.ingredientId,
      price: item.unitPrice,
      unit: item.unit,
      lastOrderedAt: new Date(),
    }).onDuplicateKeyUpdate({ set: { price: item.unitPrice, unit: item.unit, lastOrderedAt: new Date() } });
  };

  if (receivedItems) {
    for (const ri of receivedItems) {
      const item = items.find(i => i.id === ri.itemId);
      if (!item) continue;
      const qtyReceived = parseFloat(ri.quantityReceived);
      await db.update(purchaseOrderItems).set({ quantityReceived: ri.quantityReceived }).where(eq(purchaseOrderItems.id, ri.itemId));
      await processItem(item, qtyReceived);
    }
  } else {
    for (const item of items) {
      const qtyReceived = parseFloat(item.quantity);
      await db.update(purchaseOrderItems).set({ quantityReceived: item.quantity }).where(eq(purchaseOrderItems.id, item.id));
      await processItem(item, qtyReceived);
    }
  }

  await db.update(purchaseOrders).set({
    status: 'received',
    receivedDate: new Date(),
    receivedBy,
    updatedAt: new Date(),
  }).where(eq(purchaseOrders.id, id));

  return getPOWithItems(id);
}

export async function getPOsBySupplier(supplierId: number) {
  return db.select().from(purchaseOrders).where(eq(purchaseOrders.supplierId, supplierId)).orderBy(desc(purchaseOrders.createdAt));
}

export async function getPOsByStatus(status: string) {
  return db.select().from(purchaseOrders).where(sql`${purchaseOrders.status} = ${status}`).orderBy(desc(purchaseOrders.createdAt));
}

export async function getPOsByDateRange(startDate: string, endDate: string) {
  return db.select().from(purchaseOrders)
    .where(and(gte(purchaseOrders.orderDate, new Date(startDate)), lte(purchaseOrders.orderDate, new Date(endDate))))
    .orderBy(desc(purchaseOrders.createdAt));
}

export async function generatePONumber() {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');
  const prefix = `PO-${dateStr}-`;

  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(purchaseOrders)
    .where(sql`${purchaseOrders.poNumber} LIKE ${prefix + '%'}`);

  const seq = ((result[0]?.count || 0) + 1).toString().padStart(3, '0');
  return prefix + seq;
}

export async function getSupplierPrices(supplierId: number) {
  return db.select().from(supplierPrices).where(eq(supplierPrices.supplierId, supplierId));
}

export async function getSupplierPrice(supplierId: number, ingredientId: number) {
  const result = await db.select().from(supplierPrices)
    .where(and(eq(supplierPrices.supplierId, supplierId), eq(supplierPrices.ingredientId, ingredientId)));
  return result[0] || null;
}

export async function updateSupplierPrice(supplierId: number, ingredientId: number, price: number, unit: string) {
  const existing = await getSupplierPrice(supplierId, ingredientId);
  if (existing) {
    await db.update(supplierPrices).set({ price, unit, lastOrderedAt: new Date() })
      .where(and(eq(supplierPrices.supplierId, supplierId), eq(supplierPrices.ingredientId, ingredientId)));
  } else {
    await db.insert(supplierPrices).values({ supplierId, ingredientId, price, unit, lastOrderedAt: new Date() });
  }
}

export async function getBestPriceForIngredient(ingredientId: number) {
  return db.select({
    supplierId: supplierPrices.supplierId,
    supplierName: suppliers.name,
    price: supplierPrices.price,
    unit: supplierPrices.unit,
    lastOrderedAt: supplierPrices.lastOrderedAt,
  })
  .from(supplierPrices)
  .leftJoin(suppliers, eq(supplierPrices.supplierId, suppliers.id))
  .where(eq(supplierPrices.ingredientId, ingredientId))
  .orderBy(asc(supplierPrices.price));
}
