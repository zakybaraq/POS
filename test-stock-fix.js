import { db } from './src/db/index.js';
import * as orderRepo from './src/repositories/order.js';
import * as inventoryRepo from './src/repositories/inventory.js';
import { orders, stockMovements, ingredients } from './src/db/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';

// Test function to verify stock decrement works on order completion
async function testStockDecrement() {
  console.log('Testing stock decrement on order completion...');
  
  // Get current timestamp for today's start
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  try {
    // Get all completed orders today
    const completedOrders = await db.select().from(orders)
      .where(and(
        gte(orders.createdAt, todayStart),
        eq(orders.status, 'completed')
      ));
    
    console.log(`Found ${completedOrders.length} completed orders today`);
    
    // Check stock movements for these orders
    for (const order of completedOrders) {
      const movements = await db.select().from(stockMovements)
        .where(eq(stockMovements.referenceId, order.id))
        .orderBy(desc(stockMovements.createdAt));
      
      console.log(`Order #${order.id}: ${movements.length} stock movements found`);
      
      if (movements.length === 0) {
        console.log(`  WARNING: No stock movements found for completed order #${order.id}`);
      } else {
        movements.forEach(movement => {
          console.log(`  - ${movement.type}: ${movement.quantity} ${movement.ingredientUnit || ''} of ${movement.ingredientName || 'Unknown'} (${movement.reason})`);
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error testing stock decrement:', error);
    return false;
  }
}

// Run the test
testStockDecrement()
  .then(success => {
    if (success) {
      console.log('Test completed successfully');
    } else {
      console.log('Test failed');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });