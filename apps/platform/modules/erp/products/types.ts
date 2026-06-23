/** ERP Products — Types. WO-P6D. */
export interface Product { id:number;code:string;name:string;workId:number;status:string;description?:string;skus?:Sku[];work?:{series?:{name:string}};createdAt:string;updatedAt:string; }
export interface Sku { id:number;code:string;name:string;productId:number;specification?:string;size?:string;price:number;finishedStock:number;status:string;cost?:{materialCost:number;laborCost:number;totalCost:number}; }
export interface ProductFilters { status?:string;workId?:number;keyword?:string; }
