export interface PurchaseRecordInput {
  materialId: number;
  purchaseDate?: Date;
  supplier?: string;
  purchaseUnit: string;
  conversionRate: number;
  purchaseQuantity: number;
  purchaseUnitPrice?: number;
  purchasePrice: number;
  remark?: string;
}

export interface ConsumeMaterialInput {
  materialId: number;
  quantity: number;
  relatedDoc?: string;
  remark?: string;
}

export interface AdjustInventoryInput {
  materialId: number;
  newQuantity: number;
  remark?: string;
}
