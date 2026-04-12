import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { ingredients, recipes, stockMovements, menus, orders, orderItems } from '../db/schema';
import type { NewIngredient, NewRecipe, NewStockMovement } from '../db/schema';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { getLoggerWithRequestId } from '../utils/logger-with-context';
import { incrementStockDecrements } from '../metrics';

// === CRUD Ingredients ===
export async function getAllIngredients() {
  return db.select().from(ingredients).orderBy(ingredients.name);
}

export async function getIngredientById(id: number) {
  const result = await db.select().from(ingredients).where(eq(ingredients.id, id));
  return result[0] || null;
}

export async function createIngredient(data: NewIngredient) {
  const result = await db.insert(ingredients).values(data);
  const insertId = result[0]?.insertId;
  if (insertId) return getIngredientById(Number(insertId));
  return null;
}

export async function updateIngredient(id: number, data: Partial<NewIngredient>) {
  await db.update(ingredients).set(data).where(eq(ingredients.id, id));
  return getIngredientById(id);
}

export async function deleteIngredient(id: number) {
  return db.delete(ingredients).where(eq(ingredients.id, id));
}

export async function getLowStockIngredients() {
  return db.select().from(ingredients).where(sql`${ingredients.currentStock} < ${ingredients.minStock}`);
}

// === CRUD Recipes ===
export async function getRecipesByMenuId(menuId: number) {
  return db.select({
    id: recipes.id,
    menuId: recipes.menuId,
    ingredientId: recipes.ingredientId,
    quantity: recipes.quantity,
    ingredientName: ingredients.name,
    ingredientUnit: ingredients.unit,
    currentStock: ingredients.currentStock,
    costPerUnit: ingredients.costPerUnit,
  })
  .from(recipes)
  .leftJoin(ingredients, eq(recipes.ingredientId, ingredients.id))
  .where(eq(recipes.menuId, menuId));
}

export async function createRecipe(data: NewRecipe) {
  const result = await db.insert(recipes).values(data);
  const insertId = result[0]?.insertId;
  if (insertId) {
    return db.select().from(recipes).where(eq(recipes.id, Number(insertId))).then(r => r[0]);
  }
  return null;
}

export async function updateRecipe(id: number, data: Partial<NewRecipe>) {
  await db.update(recipes).set(data).where(eq(recipes.id, id));
  return db.select().from(recipes).where(eq(recipes.id, id)).then(r => r[0]);
}

export async function deleteRecipe(id: number) {
  return db.delete(recipes).where(eq(recipes.id, id));
}

export async function deleteRecipesByMenuId(menuId: number) {
  return db.delete(recipes).where(eq(recipes.menuId, menuId));
}

export async function getMenuCost(menuId: number) {
  const recipeItems = await getRecipesByMenuId(menuId);
  let totalCost = 0;
  for (const item of recipeItems) {
    totalCost += Number(item.quantity) * Number(item.costPerUnit || 0);
  }
  return Math.round(totalCost);
}

// === Stock Movements ===
export async function getStockMovements(ingredientId?: number, limit: number = 50) {
  let query = db.select({
    id: stockMovements.id,
    ingredientId: stockMovements.ingredientId,
    type: stockMovements.type,
    quantity: stockMovements.quantity,
    stockBefore: stockMovements.stockBefore,
    stockAfter: stockMovements.stockAfter,
    reason: stockMovements.reason,
    referenceId: stockMovements.referenceId,
    userId: stockMovements.userId,
    createdAt: stockMovements.createdAt,
    ingredientName: ingredients.name,
    ingredientUnit: ingredients.unit,
  })
  .from(stockMovements)
  .leftJoin(ingredients, eq(stockMovements.ingredientId, ingredients.id))
  .orderBy(desc(stockMovements.createdAt))
  .limit(limit);

  if (ingredientId) {
    return query.where(eq(stockMovements.ingredientId, ingredientId));
  }
  return query;
}

export async function createStockMovement(data: NewStockMovement) {
  return db.insert(stockMovements).values(data);
}

// === Stock Operations ===
export async function adjustStock(
  ingredientId: number,
  quantity: number,
  type: 'in' | 'out' | 'adjustment' | 'waste',
  reason: string,
  userId?: number,
  referenceId?: number
) {
  const ingredient = await getIngredientById(ingredientId);
  if (!ingredient) return null;

  const currentStock = Number(ingredient.currentStock);
  let newStock: number;
  
  switch (type) {
    case 'in':
      newStock = currentStock + quantity;
      break;
    case 'out':
    case 'waste':
      newStock = currentStock - quantity;
      break;
    case 'adjustment':
      newStock = quantity;
      break;
    default:
      newStock = currentStock + quantity;
  }

  await db.update(ingredients)
    .set({ currentStock: String(newStock), updatedAt: new Date() })
    .where(eq(ingredients.id, ingredientId));

  await db.insert(stockMovements).values({
    ingredientId,
    type,
    quantity: String(Math.abs(quantity)),
    stockBefore: String(currentStock),
    stockAfter: String(newStock),
    reason,
    userId: userId || null,
    referenceId: referenceId || null,
    createdAt: new Date(),
  });

  return getIngredientById(ingredientId);
}

export async function decrementStockForOrder(orderId: number) {
  const logger = getLoggerWithRequestId();
  const { getOrderById } = await import('./order');
  const order = await getOrderById(orderId);

  if (!order || order.status !== 'completed') {
    logger.info({ orderId, orderStatus: order?.status }, 'Stock decrement skipped - order not completed');
    return;
  }

  const { getItemsWithMenuByOrderId } = await import('./order-item');
  const items = await getItemsWithMenuByOrderId(orderId);

  for (const item of items) {
    const recipeItems = await getRecipesByMenuId(item.menuId);
    for (const recipe of recipeItems) {
      const totalQuantity = Number(recipe.quantity) * item.quantity;
      await adjustStock(
        recipe.ingredientId,
        -totalQuantity,
        'out',
        `Pesanan #${orderId}`,
        undefined,
        orderId
      );
    }
  }
}

export async function decrementStockForOrderTx(
  tx: any,
  orderId: number
) {
  const logger = getLoggerWithRequestId();
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
  
  if (!order || order.status !== 'completed') {
    throw new Error(`Order #${orderId} not found or not completed`);
  }

  const existingMovements = await tx
    .select({ count: sql<number>`count(*)` })
    .from(stockMovements)
    .where(eq(stockMovements.referenceId, orderId));
    
  if (existingMovements[0]?.count > 0) {
    logger.info({ orderId, existingMovements: existingMovements[0]?.count }, 'Stock already decremented - skipping to prevent duplication');
    return;
  }

  const { getItemsWithMenuByOrderId } = await import('./order-item');
  const items = await getItemsWithMenuByOrderId(orderId);

  logger.info({ orderId, itemCount: items.length }, 'Starting stock decrement for order');

  for (const item of items) {
    const recipeItems = await getRecipesByMenuId(item.menuId);
    for (const recipe of recipeItems) {
      const totalQuantity = Number(recipe.quantity) * item.quantity;
      const ingredient = await tx
        .select()
        .from(ingredients)
        .where(eq(ingredients.id, recipe.ingredientId))
        .then(r => r[0]);
        
      if (!ingredient) {
        throw new Error(`Ingredient #${recipe.ingredientId} not found`);
      }

      const currentStock = Number(ingredient.currentStock);
      const newStock = currentStock - totalQuantity;
      
      if (newStock < 0) {
        throw new Error(
          `Insufficient stock for ingredient "${ingredient.name}" (available: ${currentStock}, needed: ${totalQuantity})`
        );
      }

      logger.debug(
        {
          orderId,
          ingredientId: recipe.ingredientId,
          ingredientName: ingredient.name,
          quantity: totalQuantity,
          stockBefore: currentStock,
          stockAfter: newStock,
        },
        'Decrementing stock for ingredient'
      );

      await tx
        .update(ingredients)
        .set({ currentStock: String(newStock), updatedAt: new Date() })
        .where(eq(ingredients.id, recipe.ingredientId));

      await tx.insert(stockMovements).values({
        ingredientId: recipe.ingredientId,
        type: 'out',
        quantity: String(totalQuantity),
        stockBefore: String(currentStock),
        stockAfter: String(newStock),
        reason: `Pesanan #${orderId}`,
        referenceId: orderId,
        createdAt: new Date(),
      });
    }
  }

  incrementStockDecrements(1);
  logger.info({ orderId }, 'Stock decrement completed successfully');
}

/**
 * Refund stock for a cancelled completed order
 * @param tx - Database transaction object
 * @param orderId - Order ID to refund stock for
 */
export async function refundStockForOrderTx(tx: any, orderId: number) {
  const order = await tx.select().from(orders)
    .where(eq(orders.id, orderId))
    .then((r: any) => r[0]);

  if (!order) {
    throw new Error(`Order #${orderId} not found`);
  }

  if (order.status !== 'completed') {
    return { orderId, refunded: false, reason: 'Order was not completed' };
  }

  const existingRefunds = await tx.select().from(stockMovements)
    .where(
      and(
        eq(stockMovements.referenceId, orderId),
        eq(stockMovements.type, 'in'),
        sql`reason LIKE '%Refund%'`
      )
    )
    .then((r: any) => r.length > 0);

  if (existingRefunds) {
    return { orderId, refunded: false, reason: 'Already refunded' };
  }

  const items = await tx.select().from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  if (!items || items.length === 0) {
    return { orderId, refunded: false, reason: 'No items in order' };
  }

  for (const item of items) {
    const recipeItems = await tx.select().from(recipes)
      .where(eq(recipes.menuId, item.menuId));

    for (const recipe of recipeItems) {
      const ingredient = await tx.select().from(ingredients)
        .where(eq(ingredients.id, recipe.ingredientId))
        .then((r: any) => r[0]);

      if (!ingredient) continue;

      const refundQuantity = Number(recipe.quantity) * item.quantity;
      const currentStock = Number(ingredient.currentStock);
      const newStock = currentStock + refundQuantity;

      await tx.update(ingredients)
        .set({ currentStock: String(newStock), updatedAt: new Date() })
        .where(eq(ingredients.id, recipe.ingredientId));

      await tx.insert(stockMovements).values({
        ingredientId: recipe.ingredientId,
        type: 'in',
        quantity: String(refundQuantity),
        stockBefore: String(currentStock),
        stockAfter: String(newStock),
        reason: `Refund for cancelled order #${orderId}`,
        referenceId: orderId,
        createdAt: new Date(),
      });
    }
  }

  return { orderId, refunded: true, itemsRefunded: items.length };
}
