import mysql from 'mysql2/promise';

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'P@blo7272',
    database: 'pos_db'
  });

  try {
    // Get orders table structure
    const [columns] = await connection.execute('DESCRIBE orders');
    console.log('=== ORDERS TABLE COLUMNS ===');
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });

    // Get stock_movements table structure
    const [stockColumns] = await connection.execute('DESCRIBE stock_movements');
    console.log('\n=== STOCK_MOVEMENTS TABLE COLUMNS ===');
    stockColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });

    // Check a sample order
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id = 86 LIMIT 1'
    );
    console.log('\n=== SAMPLE ORDER #86 ===');
    if (orders.length > 0) {
      Object.entries(orders[0]).forEach(([k, v]) => {
        console.log(`  ${k}: ${v}`);
      });
    } else {
      console.log('Order #86 not found. Checking what order IDs exist...');
      const [maxOrder] = await connection.execute(
        'SELECT MAX(id) as maxId FROM orders'
      );
      console.log(`  Max order ID: ${maxOrder[0].maxId}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
