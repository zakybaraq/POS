# POS Application v2.1 - Requirements

**Version:** 2.1.0  
**Status:** In Planning  
**Last Updated:** 2026-04-14  
**Theme:** Advanced Inventory Management

---

## Overview

Milestone v2.1 focuses on advancing the inventory system with supplier management, purchase order workflows, cost analytics, and automated reordering capabilities.

---

## Requirements

### REQ-001: Supplier Management
**Priority:** Must Have  
**Status:** Planning  
**Phase:** 11

#### Description
Manage supplier relationships with contact info, ratings, and lead times.

#### Acceptance Criteria
- [ ] CRUD operations for suppliers
- [ ] Supplier contact information (name, email, phone, address)
- [ ] Supplier rating system (1-5 stars based on delivery/p quality)
- [ ] Lead time tracking (average days to deliver)
- [ ] Assign preferred supplier per ingredient
- [ ] Supplier status (active/inactive)

#### Fields
- id, name, contact_person, email, phone, address, rating, lead_time_days, status, created_at, updated_at

---

### REQ-002: Purchase Order System
**Priority:** Must Have  
**Status:** Planning  
**Phase:** 12

#### Description
Full purchase order workflow from creation to receiving.

#### Acceptance Criteria
- [ ] Create purchase order (PO) with multiple line items
- [ ] PO status workflow: draft → submitted → approved → received → cancelled
- [ ] Partial receiving (receive PO in multiple shipments)
- [ ] PO approval workflow (admin approval required)
- [ ] Receive goods and update inventory automatically
- [ ] PO history and search

#### PO Status Flow
```
draft → submitted → [approved/rejected] → received → completed
                                              ↘ cancelled
```

#### Line Items
- ingredient_id, quantity, unit_cost, received_quantity

---

### REQ-003: Cost Analytics
**Priority:** Must Have  
**Status:** Planning  
**Phase:** 13

#### Description
Track and analyze ingredient costs over time.

#### Acceptance Criteria
- [ ] Cost per unit per ingredient (current)
- [ ] Price history per supplier (track changes over time)
- [ ] Cost variance alerts (price change > X%)
- [ ] Cost comparison between suppliers
- [ ] Monthly cost reports
- [ ] Profit margin calculations (menu item cost vs price)

#### Metrics
- Average cost per ingredient
- Cost trend (up/down/stable)
- Best supplier per ingredient by price

---

### REQ-004: Auto-Reorder System
**Priority:** Should Have  
**Status:** Planning  
**Phase:** 14

#### Description
Automated reorder suggestions based on stock levels and usage.

#### Acceptance Criteria
- [ ] Reorder point calculation per ingredient (min_stock + safety_stock)
- [ ] Economic Order Quantity (EOQ) calculation
- [ ] Auto-generate draft PO when stock hits reorder point
- [ ] Manual override/approval before submission
- [ ] Lead time consideration in calculations
- [ ] Dashboard widget for pending reorder suggestions

#### Formulas
- Reorder Point = (Lead Time × Daily Usage) + Safety Stock
- EOQ = √(2 × Annual Demand × Ordering Cost / Holding Cost)

---

## Requirements Summary

| Priority | Count | Status |
|----------|-------|--------|
| Must Have | 3 | 0/3 complete |
| Should Have | 1 | 0/1 complete |
| **Total** | **4** | **0/4 complete** |

---

## Technical Stack Additions

- **Charts:** D3.js or Chart.js (reuse from v2.0 if done)
- **Reports:** PDF generation (optional)
- **Email:** Nodemailer (for PO notifications)

---

## Performance Targets

- PO creation: < 2 seconds
- Cost report generation: < 5 seconds
- Real-time stock updates: < 1 second

---

## Out of Scope (v2.1)

- Multi-location inventory
- Barcode/QR scanning
- Supplier portal (external)
- Advanced forecasting/ML

---

## Dependencies

- ✅ Phase 1-5 (v1.0) complete
- ✅ Inventory system ready
- ✅ Authentication ready

---

**Next:** Create ROADMAP.md with phase breakdown