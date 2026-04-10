# Fix Dine-In Order Stock Decrement Bug

## Problem Statement
Stok bahan baku tidak berkurang untuk pesanan dine-in yang telah selesai karena pesanan dine-in tidak ditandai sebagai "completed" saat pembayaran diproses. Hal ini terjadi karena logika `shouldComplete` di layanan pembayaran hanya mengizinkan pesanan takeaway (tanpa meja) untuk ditandai sebagai selesai.

## Root Cause
Di file `src/services/payment.ts`, baris 21-22:
```typescript
const shouldComplete = !order.tableId || order.tableId === 0;
const completedOrder = await orderRepo.completeOrder(orderId, amountPaid, shouldComplete);
```
Logika di atas hanya menandai pesanan sebagai completed jika tidak ada tableId (takeaway), sehingga pesanan dine-in (dengan tableId) tidak pernah ditandai sebagai completed dan fungsi `decrementStockForOrder` tidak dipanggil.

## Solution
Ubah logika di layanan pembayaran untuk selalu menandai pesanan sebagai completed saat pembayaran berhasil, terlepas dari tipe pesanan (dine-in atau takeaway). Ini akan memastikan bahwa fungsi pengurangan stok dipanggil untuk semua pesanan yang selesai.

## Implementation Plan
1. Modifikasi `src/services/payment.ts` untuk menghapus logika kondisional dan selalu meneruskan `true` sebagai parameter `markCompleted` ke fungsi `completeOrder`
2. Pastikan fungsi `decrementStockForOrder` tetap dipanggil setelah pesanan selesai
3. Verifikasi bahwa perubahan ini tidak mengganggu alur lain

## Test Cases
1. Pesanan dine-in setelah pembayaran harus ditandai sebagai "completed"
2. Stok bahan baku harus berkurang untuk pesanan dine-in yang selesai
3. Pesanan takeaway harus tetap berfungsi normal
4. Tidak ada regresi pada fungsi pembatalan atau alur lain

## Files to Modify
- `src/services/payment.ts`

## Estimated Effort
- 15-30 menit untuk implementasi dan verifikasi