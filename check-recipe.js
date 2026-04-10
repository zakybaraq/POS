import mysql from 'mysql2/promise';

async function checkRecipe() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'P@blo7272',
    database: 'pos_db'
  });

  try {
    // Check menu item #1 (Nasi Goreng)
    const [menus] = await connection.execute(
      'SELECT id, name, category FROM menus WHERE id = 1'
    );
    console.log('\n=== MENU ITEM #1 ===');
    console.log(menus[0]);

    // Check recipes for menu #1
    const [recipes] = await connection.execute(
      `SELECT r.id, r.ingredient_id, i.name as ingredient_name, r.quantity, i.unit
       FROM recipes r
       LEFT JOIN ingredients i ON r.ingredient_id = i.id
       WHERE r.menu_id = 1`
    );
    
    console.log('\n=== RECIPES FOR MENU #1 (Nasi Goreng) ===');
    if (recipes.length === 0) {
      console.log('No recipes found for Nasi Goreng!');
    } else {
      console.log(`Found ${recipes.length} recipe item(s):`);
      recipes.forEach((r) => {
        console.log(`  - ${r.ingredient_name}: ${r.quantity} ${r.unit}`);
      });
    }

    // Check if stock movements were created for orders #84 and #85 (which DO have movements)
    console.log('\n=== ORDER #85 (HAS MOVEMENTS) ===');
    const [order85] = await connection.execute(
      'SELECT * FROM orders WHERE id = 85'
    );
    if (order85.length > 0) {
      console.log('Status:', order85[0].order_status);
    }

    const [movements85] = await connection.execute(
      'SELECT type, quantity, reason FROM stock_movements WHERE reference_id = 85'
    );
    console.log(`Movements for #85: ${movements85.length}`);
    if (movements85.length > 0) {
      movements85.forEach(m => console.log(`  - ${m.type}: ${m.quantity} (${m.reason})`));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkRecipe();
