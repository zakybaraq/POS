import mysql from 'mysql2/promise';

async function checkOrder86() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'P@blo7272',
    database: 'pos_db'
  });

  try {
    // Check if order #86 exists
    const [orders] = await connection.execute(
      'SELECT id, status, createdAt, completedAt FROM orders WHERE id = 86'
    );
    
    console.log('\n=== ORDER #86 ===');
    if (orders.length === 0) {
      console.log('Order #86 NOT FOUND in database');
    } else {
      const order = orders[0];
      console.log('Order found:');
      console.log('  Status:', order.status);
      console.log('  Created:', order.createdAt);
      console.log('  Completed:', order.completedAt);
    }

    // Check stock movements for order #86
    const [movements] = await connection.execute(
      `SELECT id, ingredientId, type, quantity, reason, referenceId, createdAt
       FROM stock_movements WHERE referenceId = 86 ORDER BY createdAt DESC`
    );
    
    console.log('\n=== STOCK MOVEMENTS FOR ORDER #86 ===');
    if (movements.length === 0) {
      console.log('NO stock movements found for order #86 (referenceId=86)');
    } else {
      console.log(`Found ${movements.length} stock movement(s):`);
      movements.forEach((m, i) => {
        console.log(`  [${i+1}] Type: ${m.type}, Qty: ${m.quantity}, Created: ${m.createdAt}, Reason: ${m.reason}`);
      });
    }

    // Check what order items are in order #86
    const [items] = await connection.execute(
      `SELECT oi.id, oi.menuId, oi.quantity, m.name 
       FROM order_items oi
       LEFT JOIN menus m ON oi.menuId = m.id
       WHERE oi.orderId = 86`
    );
    
    console.log('\n=== ORDER ITEMS IN ORDER #86 ===');
    if (items.length === 0) {
      console.log('No items in order #86');
    } else {
      console.log(`Found ${items.length} item(s):`);
      items.forEach((item, i) => {
        console.log(`  [${i+1}] Menu: ${item.name} (ID: ${item.menuId}), Qty: ${item.quantity}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkOrder86();
