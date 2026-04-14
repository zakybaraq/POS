import { db } from '../infrastructure/database/index';
import { purchaseOrders, purchaseOrderItems, ingredients, suppliers } from '../infrastructure/database/schema';
import { eq } from 'drizzle-orm';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const enabled = process.env.EMAIL_ENABLED === 'true';
  
  if (!enabled) {
    console.log(`[EMAIL MOCK] To: ${options.to}, Subject: ${options.subject}`);
    console.log(`[EMAIL MOCK] Body: ${options.body.substring(0, 200)}...`);
    return true;
  }
  
  return false;
}

export async function notifyPOStatusChange(poId: number, newStatus: string, changedBy: number) {
  const po = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
  if (!po.length) return;
  
  const order = po[0];
  const supplier = await db.select().from(suppliers).where(eq(suppliers.id, order.supplierId));
  
  const subject = `PO ${order.poNumber} status changed to ${newStatus}`;
  const body = `
Purchase Order ${order.poNumber} has been ${newStatus}.

Supplier: ${supplier[0]?.name || 'N/A'}
Date: ${order.orderDate}
Changed by: User ${changedBy}

View in system: /purchase-orders/${poId}
  `.trim();
  
  return sendEmail({ to: 'admin@restaurant.com', subject, body });
}

export async function notifyPOReceived(poId: number, receivedBy: number) {
  const po = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
  if (!po.length) return;
  
  const order = po[0];
  const supplier = await db.select().from(suppliers).where(eq(suppliers.id, order.supplierId));
  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
  
  const itemList = await Promise.all(items.map(async (item) => {
    const ing = await db.select().from(ingredients).where(eq(ingredients.id, item.ingredientId));
    return `${ing[0]?.name || 'Unknown'}: ${item.quantityReceived || item.quantity} ${item.unit}`;
  }));
  
  const subject = `PO ${order.poNumber} received`;
  const body = `
Purchase Order ${order.poNumber} has been received.

Supplier: ${supplier[0]?.name || 'N/A'}
Total: Rp ${order.subtotal?.toLocaleString() || 0}
Received by: User ${receivedBy}

Items received:
${itemList.join('\n')}

View in system: /purchase-orders/${poId}
  `.trim();
  
  return sendEmail({ to: 'admin@restaurant.com', subject, body });
}