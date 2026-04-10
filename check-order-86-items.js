import { db } from './src/db/index.js';
import { orders, orderItems, menus } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

// Check details for order #86 items
async function checkOrderItems() {
  console.log('Checking order #86 items...');
  
  try {
    // Get order items for order #86
    const items = await db.select({
      orderItemId: orderItems.id,
      menuId: orderItems.menuId,
      quantity: orderItems.quantity,
      priceAtOrder: orderItems.priceAtOrder,
      menuName: menus.name
    })
    .from(orderItems)
    .leftJoin(menus, eq(orderItems.menuId, menus.id))
    .where(eq(orderItems.orderId, 86));
    
    if (items.length === 0) {
      console.log('No items found for order #86');
      return;
    }
    
    console.log(`Found ${items.length} items for order #86:`);
    items.forEach((item, index) => {
      console.log(`  ${index + 1}. Menu ID: ${item.menuId}, Name: ${item.menuName || 'Unknown'}, Quantity: ${item.quantity}, Price: ${item.priceAtOrder}`);
    });
    
  } catch (error) {
    console.error('Error checking order items:', error);
  }
}

// Run the check
checkOrderItems()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Check error:', error);
    process.exit(1);
  });