import { db } from '../infrastructure/database/index';
import { purchaseOrders, purchaseOrderItems, ingredients, suppliers } from '../infrastructure/database/schema';
import { eq } from 'drizzle-orm';

export async function generatePOPDF(poId: number): Promise<string> {
  const po = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
  if (!po.length) return '';
  
  const order = po[0];
  const supplier = await db.select().from(suppliers).where(eq(suppliers.id, order.supplierId));
  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
  
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const ing = await db.select().from(ingredients).where(eq(ingredients.id, item.ingredientId));
    return {
      ...item,
      ingredientName: ing[0]?.name || 'Unknown',
      ingredientUnit: ing[0]?.unit || item.unit,
    };
  }));
  
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    ordered: 'Ordered',
    received: 'Received',
    cancelled: 'Cancelled',
  };
  
  const itemRows = enrichedItems.map((item, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.ingredientName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity} ${item.ingredientUnit}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Rp ${item.unitPrice?.toLocaleString()}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Rp ${item.totalPrice?.toLocaleString()}</td>
    </tr>
  `).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Order ${order.poNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .company-name { font-size: 24px; font-weight: bold; }
    .po-number { font-size: 18px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
    .info-label { font-weight: bold; color: #666; font-size: 12px; }
    .info-value { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #333; }
    .totals { text-align: right; font-size: 18px; font-weight: bold; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 4px; background: #e0e0e0; }
    .status.ordered { background: #4CAF50; color: white; }
    .status.received { background: #2196F3; color: white; }
    .footer { margin-top: 40px; font-size: 12px; color: #999; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">RESTAURANT POS</div>
      <div>Purchase Order</div>
    </div>
    <div class="po-number" style="text-align: right;">
      <div>${order.poNumber}</div>
      <div class="status ${order.status}">${statusLabels[order.status] || order.status}</div>
    </div>
  </div>
  
  <div class="info-grid">
    <div>
      <div class="info-label">SUPPLIER</div>
      <div class="info-value">${supplier[0]?.name || 'N/A'}</div>
      <div class="info-value">${supplier[0]?.contactPerson || ''}</div>
      <div class="info-value">${supplier[0]?.address || ''}</div>
    </div>
    <div>
      <div class="info-label">ORDER DATE</div>
      <div class="info-value">${order.orderDate ? new Date(order.orderDate).toLocaleDateString('id-ID') : 'N/A'}</div>
      <div class="info-label" style="margin-top: 10px;">EXPECTED DELIVERY</div>
      <div class="info-value">${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('id-ID') : 'Not set'}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Item</th>
        <th style="text-align: right;">Quantity</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="totals">Total</td>
        <td class="totals">Rp ${order.subtotal?.toLocaleString() || 0}</td>
      </tr>
    </tfoot>
  </table>
  
  ${order.notes ? `
  <div style="margin-top: 20px;">
    <div class="info-label">NOTES</div>
    <div style="padding: 10px; background: #f9f9f9; border-radius: 4px;">
      ${order.notes}
    </div>
  </div>
  ` : ''}
  
  <div class="footer">
    Generated on ${new Date().toLocaleString('id-ID')}
  </div>
</body>
</html>
  `.trim();
}