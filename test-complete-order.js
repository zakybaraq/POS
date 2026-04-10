import { db } from './src/db/index.js';
import * as orderRepo from './src/repositories/order.js';
import * as tableRepo from './src/repositories/table.js';
import * as inventoryRepo from './src/repositories/inventory.js';

// Test creating and completing an order to verify stock decrement
async function testCompleteOrder() {
  console.log('Testing order completion and stock decrement...');
  
  try {
    // Get an available table
    const tables = await tableRepo.getAllTables();
    const availableTable = tables.find(t => t.status === 'available');
    
    if (!availableTable) {
      console.log('No available tables found');
      return false;
    }
    
    console.log(`Using table #${availableTable.id} (${availableTable.tableNumber})`);
    
    // Create a new order
    const order = await orderRepo.createOrder(availableTable.id, 1); // userId = 1
    if (!order) {
      console.log('Failed to create order');
      return false;
    }
    
    console.log(`Created order #${order.id}`);
    
    // Add an item to the order (we need to check what menu items exist)
    const menus = await db.select().from(orderRepo.menus).limit(1);
    if (menus.length === 0) {
      console.log('No menu items found');
      return false;
    }
    
    const menuItem = menus[0];
    console.log(`Adding menu item #${menuItem.id} (${menuItem.name}) to order`);
    
    const orderItem = await orderRepo.addItem(order.id, menuItem.id, 1);
    if (!orderItem) {
      console.log('Failed to add item to order');
      return false;
    }
    
    console.log(`Added order item #${orderItem.id}`);
    
    // Calculate totals
    await orderRepo.calculateTotals(order.id);
    const updatedOrder = await orderRepo.getOrderById(order.id);
    console.log(`Order total: ${updatedOrder.total}`);
    
    // Complete the order with payment
    const completedOrder = await orderRepo.completeOrder(order.id, updatedOrder.total, true);
    if (!completedOrder) {
      console.log('Failed to complete order');
      return false;
    }
    
    console.log(`Completed order #${completedOrder.id}`);
    console.log(`Order status: ${completedOrder.status}`);
    
    // Check if stock movements were created
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit for DB operations
    
    const movements = await db.select().from(inventoryRepo.stockMovements)
      .where('referenceId', order.id)
      .orderBy('createdAt', true);
    
    console.log(`Stock movements created: ${movements.length}`);
    
    if (movements.length > 0) {
      movements.forEach(movement => {
        console.log(`  - ${movement.type}: ${movement.quantity} ${movement.ingredientUnit || ''} of ${movement.ingredientName || 'Unknown'} (${movement.reason})`);
      });
      return true;
    } else {
      console.log('  WARNING: No stock movements found!');
      return false;
    }
    
  } catch (error) {
    console.error('Error testing order completion:', error);
    return false;
  }
}

// Run the test
testCompleteOrder()
  .then(success => {
    if (success) {
      console.log('\n✅ TEST PASSED: Stock decrement working correctly');
    } else {
      console.log('\n❌ TEST FAILED: Stock decrement not working');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });