/**
 * Platform OS — Customer 360 Registry
 *
 * WO-P5C: Unified customer view across Leads (Brand), Customers (ERP),
 * Orders (ERP), and Production (ERP).
 */

import type { ErpGateway, BrandGateway } from "../data-gateway";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface Customer360 {
  customer: CustomerProfile;
  orders: OrderSummary[];
  productions: ProductionSummary[];
  leads: LeadSummary[];
  notes: ActivityNote[];
  metrics: CustomerMetrics;
}

export interface CustomerProfile {
  id: number;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  wechat?: string;
  source?: string;
  address?: string;
  tags?: string;
  firstOrderDate?: string;
  lastOrderDate?: string;
  totalOrders: number;
  totalSpent: number;
}

export interface OrderSummary {
  id: number;
  orderNo: string;
  status: string;
  channel: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  orderDate: string;
  itemCount: number;
}

export interface ProductionSummary {
  id: number;
  skuCode: string;
  quantity: number;
  totalCost: number;
  unitCost: number;
  createdAt: string;
  status: string;
}

export interface LeadSummary {
  id: string;
  name: string;
  email?: string;
  wechat?: string;
  message?: string;
  source: string;
  createdAt: string;
  status: LeadStatus;
}

export interface ActivityNote {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerMetrics {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  repeatPurchase: boolean;
  conversionSource?: string;
  leadToOrderDays?: number;
}

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "QUOTE_SENT"
  | "ORDER_CREATED"
  | "PRODUCTION"
  | "DELIVERED"
  | "LOST";

export type ActivityType =
  | "LEAD_CREATED"
  | "LEAD_CONTACTED"
  | "ORDER_CREATED"
  | "ORDER_PAID"
  | "PRODUCTION_STARTED"
  | "PRODUCTION_COMPLETED"
  | "DELIVERED"
  | "NOTE_ADDED";

// ═══════════════════════════════════════════
// Customer 360 Builder
// ═══════════════════════════════════════════

export async function getCustomer360(
  erp: ErpGateway,
  brand: BrandGateway,
  customerId: number
): Promise<Customer360 | null> {
  // 1. Load customer profile from ERP
  const customerRaw = await erp.customers.getById(customerId);
  if (!customerRaw) return null;
  const c = customerRaw as any;

  // 2. Load orders
  const ordersRaw = await (erp.orders as any).list({ customerId });
  const orders: OrderSummary[] = (ordersRaw || []).map((o: any) => ({
    id: o.id, orderNo: o.orderNo, status: o.status, channel: o.channel,
    totalAmount: o.totalAmount, paidAmount: o.paidAmount,
    paymentStatus: o.paymentStatus, orderDate: o.orderDate,
    itemCount: typeof o.items === "string" ? JSON.parse(o.items).length : 0,
  }));

  // 3. Load production records (linked via orders → SKUs)
  const productions: ProductionSummary[] = [];
  for (const o of orders) {
    const orderItems = typeof (c as any).items === "string" ? JSON.parse((c as any).items || "[]") : [];
    for (const item of orderItems) {
      const prods = await (erp.production as any).list();
      const matched = (prods || []).filter((p: any) => p.skuId === item.skuId);
      productions.push(...matched.map((p: any) => ({
        id: p.id, skuCode: p.skuCode || "", quantity: p.quantity,
        totalCost: p.totalCost, unitCost: p.unitCost,
        createdAt: p.createdAt, status: p.status || "COMPLETED",
      })));
    }
  }

  // 4. Match leads by email/phone/wechat
  const allLeads = await brand.leads.list();
  const matchedLeads: LeadSummary[] = (allLeads || [])
    .filter((l: any) =>
      (c.email && l.email === c.email) ||
      (c.phone && l.phone === c.phone) ||
      (c.wechat && l.wechat === c.wechat)
    )
    .map((l: any) => ({
      id: l.id, name: l.name, email: l.email, wechat: l.wechat,
      message: l.message, source: "Website Form", createdAt: l.createdAt,
      status: (orders.length > 0 ? "ORDER_CREATED" : "NEW") as LeadStatus,
    }));

  // 5. Build activity timeline
  const notes: ActivityNote[] = [
    ...matchedLeads.map((l) => ({ id: l.id, type: "LEAD_CREATED" as ActivityType, title: `线索: ${l.name}`, description: l.message || "", timestamp: l.createdAt })),
    ...orders.map((o) => ({ id: `order-${o.id}`, type: "ORDER_CREATED" as ActivityType, title: `订单: ${o.orderNo}`, description: `¥${o.totalAmount}`, timestamp: o.orderDate })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 6. Compute metrics
  const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const metrics: CustomerMetrics = {
    totalOrders: orders.length,
    totalSpent,
    averageOrderValue: orders.length > 0 ? totalSpent / orders.length : 0,
    repeatPurchase: orders.length > 1,
    conversionSource: matchedLeads.length > 0 ? "Website Lead" : "Manual",
    leadToOrderDays: matchedLeads.length > 0 && orders.length > 0
      ? Math.round((new Date(orders[0].orderDate).getTime() - new Date(matchedLeads[0].createdAt).getTime()) / 86400000)
      : undefined,
  };

  return {
    customer: {
      id: c.id, code: c.code, name: c.name,
      phone: c.phone, email: c.email, wechat: c.wechat,
      source: c.source, address: c.address, tags: c.tags,
      firstOrderDate: orders.length > 0 ? orders[orders.length - 1].orderDate : undefined,
      lastOrderDate: orders.length > 0 ? orders[0].orderDate : undefined,
      totalOrders: orders.length, totalSpent,
    },
    orders,
    productions,
    leads: matchedLeads,
    notes,
    metrics,
  };
}
