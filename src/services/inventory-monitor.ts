import { getIO } from '../websocket';
import { getLoggerWithRequestId } from '../utils/logger-with-context';
import { getIngredientById } from '../repositories/inventory';

interface AlertState {
  alertedAt: Date;
  acknowledged: boolean;
}

const alertedIngredients = new Map<number, AlertState>();
const logger = getLoggerWithRequestId();

const COOLDOWN_MINUTES = 5;

export async function checkStockThreshold(ingredient: any) {
  const threshold = parseFloat(ingredient.minStock || '0');
  const currentStock = parseFloat(ingredient.currentStock || '0');

  if (threshold <= 0) return;

  if (currentStock <= threshold) {
    const existingAlert = alertedIngredients.get(ingredient.id);

    if (existingAlert && !existingAlert.acknowledged) {
      const now = new Date();
      const alertAge = (now.getTime() - existingAlert.alertedAt.getTime()) / (1000 * 60);

      if (alertAge < COOLDOWN_MINUTES) {
        return;
      }
    }

    if (existingAlert?.acknowledged) {
      return;
    }

    let io;
    try {
      io = getIO();
    } catch (e) {
      // Socket.io not initialized, skip emitting alert
      logger.debug({ ingredientId: ingredient.id }, 'Socket.io not initialized, skipping alert emission');
      return;
    }

    io.to('admin').to('kitchen').emit('inventory:low-stock', {
      namespace: 'inventory',
      event: 'low-stock',
      payload: {
        ingredientId: ingredient.id,
        name: ingredient.name,
        currentStock,
        threshold,
        shortfall: threshold - currentStock,
        unit: ingredient.unit,
      },
      timestamp: new Date().toISOString(),
    });

    alertedIngredients.set(ingredient.id, {
      alertedAt: new Date(),
      acknowledged: false,
    });

    logger.info({ ingredientId: ingredient.id, currentStock, threshold }, 'Low stock alert');
  } else {
    alertedIngredients.delete(ingredient.id);
  }
}

export async function checkStockThresholdById(ingredientId: number) {
  const ingredient = await getIngredientById(ingredientId);
  if (ingredient) {
    await checkStockThreshold(ingredient);
  }
}

export function acknowledgeAlert(ingredientId: number) {
  const alert = alertedIngredients.get(ingredientId);
  if (alert) {
    alert.acknowledged = true;
    alertedIngredients.set(ingredientId, alert);
    logger.info({ ingredientId }, 'Alert acknowledged');
  }
}

export function getAlertedIngredients(): { id: number; acknowledged: boolean; alertedAt: Date }[] {
  return Array.from(alertedIngredients.entries())
    .map(([id, state]) => ({ id, ...state }));
}

export function isIngredientAlerted(ingredientId: number): boolean {
  const alert = alertedIngredients.get(ingredientId);
  return alert ? !alert.acknowledged : false;
}

export function clearAlert(ingredientId: number) {
  alertedIngredients.delete(ingredientId);
}
