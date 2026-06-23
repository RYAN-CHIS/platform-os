/** ERP Materials — Type Definitions. WO-P6B: Native Migration. */
export interface Material {
  id: number; code: string; name: string; category: string;
  materialType: string; specification?: string; inventoryUnit: string;
  remaining: number; unitCost?: number; status: string;
  shape?: string; beadsPerStrand?: number; weightPerStrand?: number;
  supplier: string; remark?: string; createdAt: string; updatedAt: string;
}
export interface PurchaseRecord {
  id: number; materialId: number; purchaseDate: string; supplier?: string;
  purchaseUnit: string; conversionRate: number; purchaseQuantity: number;
  purchaseUnitPrice?: number; purchasePrice: number; inventoryQuantity: number;
  unitCost?: number; remark?: string; material?: { code: string; name: string; inventoryUnit: string };
}
export interface InventoryTransaction {
  id: number; materialId: number; type: "IN" | "OUT" | "ADJUST";
  quantity: number; beforeQty: number; afterQty: number;
  relatedDoc?: string; remark?: string; createdAt: string;
}
export interface MaterialFilters { status?: string; materialType?: string; category?: string; keyword?: string; }
