import { db } from './src/db/index.js';
import { orders } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

// Check details for order #86
async function checkOrderDetails() {
  console.log('Checking order #86 details...');
  
  try {
    const order = await db.select().from(orders)
      .where(eq(orders.id, 86))
      .limit(1);
    
    if (order.length === 0) {
      console.log('Order #86 not found');
      return;
    }
    
    const o = order[0];
    console.log(`Order #${o.id}:`);
    console.log(`  Status: ${o.status}`);
    console.log(`  Created at: ${o.createdAt}`);
    console.log(`  Completed at: ${o.completedAt || 'Not set'}`);
    console.log(`  Total: ${o.total}`);
    console.log(`  Amount paid: ${o.amountPaid || 0}`);
    console.log(`  Change due: ${o.changeDue || 0}`);
    
  } catch (error) {
    console.error('Error checking order details:', error);
  }
}

// Run the check
checkOrderDetails()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Check error:', error);
    process.exit(1);
  });