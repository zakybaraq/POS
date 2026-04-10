import mysql from 'mysql2/promise';

async function checkOrder86() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'P@blo7272',
    database: 'pos_db'
  });

  try {
    // Check order #86 status
    const [orders] = await connection.execute(
      'SELECT id, order_status, created_at, completed_at FROM orders WHERE id = 86'
    );
    
    console.log('\n=== ORDER #86 ===');
    if (orders.length === 0) {
      console.log('Order #86 NOT FOUND');
    } else {
      const order = orders[0];
      console.log('Status:', order.order_status);
      console.log('Created:', order.created_at);
      console.log('Completed:', order.completed_at);
    }

    // Check stock movements for order #86
    const [movements] = await connection.execute(
      `SELECT id, ingredient_id, type, quantity, reason, reference_id, created_at
       FROM stock_movements WHERE reference_id = 86 ORDER BY created_at DESC`
    );
    
    console.log('\n=== STOCK MOVEMENTS FOR ORDER #86 ===');
    if (movements.length === 0) {
      console.log('❌ NO stock movements found (referenceId=86)');
    } else {
      console.log(`✅ Found ${movements.length} stock movement(s):`);
      movements.forEach((m, i) => {
        console.log(`  [${i+1}] ${m.type.padEnd(12)} | Qty: ${String(m.quantity).padEnd(6)} | Created: ${m.created_at} | Reason: ${m.reason}`);
      });
    }

    // Check order items
    const [items] = await connection.execute(
      `SELECT oi.id, oi.menu_id, oi.quantity, m.name 
       FROM order_items oi
       LEFT JOIN menus m ON oi.menu_id = m.id
       WHERE oi.order_id = 86`
    );
    
    console.log('\n=== ORDER ITEMS IN ORDER #86 ===');
    if (items.length === 0) {
      console.log('No items in order #86');
    } else {
      console.log(`Found ${items.length} item(s):`);
      items.forEach((item) => {
        console.log(`  - ${item.name} (Menu ID: ${item.menu_id}), Qty: ${item.quantity}`);
      });
    }

    // Check all stock movements in last 100 to see pattern
    console.log('\n=== LAST 10 STOCK MOVEMENTS (ALL) ===');
    const [allMovements] = await connection.execute(
      `SELECT id, reference_id, type, quantity, created_at 
       FROM stock_movements ORDER BY created_at DESC LIMIT 10`
    );
    allMovements.forEach((m) => {
      console.log(`  ID: ${m.id}, RefID: ${m.reference_id || 'null'}, Type: ${m.type}, Qty: ${m.quantity}, Created: ${m.created_at}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkOrder86();
