import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index';
import { businessSettings, taxSettings, paymentMethods, receiptSettings, operatingHours } from '../db/schema';

export async function getBusinessSettings() {
  const result = await db.select().from(businessSettings).limit(1);
  return result[0] || null;
}

export async function updateBusinessSettings(data: Record<string, any>) {
  const existing = await getBusinessSettings();
  if (!existing) {
    return db.insert(businessSettings).values({ ...data, updatedAt: new Date() });
  }
  return db.update(businessSettings).set({ ...data, updatedAt: new Date() }).where(eq(businessSettings.id, existing.id));
}

export async function getTaxSettings() {
  const result = await db.select().from(taxSettings).limit(1);
  return result[0] || null;
}

export async function updateTaxSettings(data: Record<string, any>) {
  const existing = await getTaxSettings();
  if (!existing) {
    return db.insert(taxSettings).values({ ...data, updatedAt: new Date() });
  }
  return db.update(taxSettings).set({ ...data, updatedAt: new Date() }).where(eq(taxSettings.id, existing.id));
}

export async function getAllPaymentMethods() {
  return db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder));
}

export async function getActivePaymentMethods() {
  return db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true)).orderBy(asc(paymentMethods.sortOrder));
}

export async function updatePaymentMethod(id: number, data: Record<string, any>) {
  await db.update(paymentMethods).set(data).where(eq(paymentMethods.id, id));
  return db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
}

export async function togglePaymentMethod(id: number) {
  const existing = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
  if (!existing.length) return null;
  const current = existing[0];
  if (!current) return null;
  const newStatus = !current.isActive;
  await db.update(paymentMethods).set({ isActive: newStatus }).where(eq(paymentMethods.id, id));
  return db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
}

export async function getReceiptSettings() {
  const result = await db.select().from(receiptSettings).limit(1);
  return result[0] || null;
}

export async function updateReceiptSettings(data: Record<string, any>) {
  const existing = await getReceiptSettings();
  if (!existing) {
    return db.insert(receiptSettings).values({ ...data, updatedAt: new Date() });
  }
  return db.update(receiptSettings).set({ ...data, updatedAt: new Date() }).where(eq(receiptSettings.id, existing.id));
}

export async function getNextReceiptNumber() {
  const settings = await getReceiptSettings();
  if (!settings) return { prefix: 'INV', suffix: '', number: 1 };
  return { prefix: settings.receiptPrefix, suffix: settings.receiptSuffix, number: settings.nextReceiptNumber };
}

export async function incrementReceiptNumber() {
  const existing = await getReceiptSettings();
  if (!existing) return;
  await db.update(receiptSettings).set({ nextReceiptNumber: existing.nextReceiptNumber + 1, updatedAt: new Date() }).where(eq(receiptSettings.id, existing.id));
}

export async function getOperatingHours() {
  return db.select().from(operatingHours).orderBy(asc(operatingHours.dayOfWeek));
}

export async function updateOperatingHours(dayOfWeek: number, data: Record<string, any>) {
  const existing = await db.select().from(operatingHours).where(eq(operatingHours.dayOfWeek, dayOfWeek));
  if (!existing.length) {
    return db.insert(operatingHours).values({ dayOfWeek, ...data });
  }
  return db.update(operatingHours).set(data).where(eq(operatingHours.dayOfWeek, dayOfWeek));
}

export async function isCurrentlyOpen() {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const currentTime = now.toTimeString().slice(0, 5);
  const hours = await db.select().from(operatingHours).where(eq(operatingHours.dayOfWeek, dayOfWeek));
  if (!hours.length) return false;
  const h = hours[0];
  if (!h || !h.isOpen) return false;
  return currentTime >= h.openTime && currentTime <= h.closeTime;
}

export async function getAllSettings() {
  const [business, tax, payments, receipt, hours] = await Promise.all([
    getBusinessSettings(),
    getTaxSettings(),
    getAllPaymentMethods(),
    getReceiptSettings(),
    getOperatingHours(),
  ]);
  return { business, tax, payments, receipt, hours };
}

export async function seedDefaultSettings() {
  const payments = await getAllPaymentMethods();
  if (!payments.length) {
    const defaultPayments = [
      { code: 'cash', name: 'Cash', icon: '💵', isActive: true, sortOrder: 0 },
      { code: 'card', name: 'Kartu Debit/Kredit', icon: '💳', isActive: true, sortOrder: 1 },
      { code: 'qris', name: 'QRIS', icon: '📱', isActive: true, sortOrder: 2 },
      { code: 'gopay', name: 'GoPay', icon: '🟢', isActive: false, sortOrder: 3 },
      { code: 'ovo', name: 'OVO', icon: '🟣', isActive: false, sortOrder: 4 },
      { code: 'dana', name: 'Dana', icon: '🔵', isActive: false, sortOrder: 5 },
      { code: 'shopeepay', name: 'ShopeePay', icon: '🟠', isActive: false, sortOrder: 6 },
    ];
    for (const p of defaultPayments) {
      await db.insert(paymentMethods).values(p);
    }
  }

  const hours = await getOperatingHours();
  if (!hours.length) {
    for (let i = 0; i < 7; i++) {
      await db.insert(operatingHours).values({
        dayOfWeek: i,
        openTime: i === 5 || i === 6 ? '08:00' : '09:00',
        closeTime: i === 4 || i === 5 ? '23:00' : '22:00',
        isOpen: true,
      });
    }
  }
}
