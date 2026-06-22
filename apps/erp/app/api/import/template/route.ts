import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

// 生成导入模板
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "raw-materials";

  let headers: string[] = [];
  let example: Record<string, string> = {};

  switch (type) {
    case "raw-materials":
      headers = ["原料编码", "名称", "品类", "供应商", "规格(mm)", "单位(克/个)", "采购数量", "采购总价", "采购单价", "备注(形状)", "颗数/条", "单圈克重(g)", "单颗成本"];
      example = {
        "原料编码": "cx001",
        "名称": "沉香",
        "品类": "沉香",
        "供应商": "三哥沉香",
        "规格(mm)": "7",
        "单位(克/个)": "克",
        "采购数量": "1",
        "采购总价": "71",
        "采购单价": "8",
        "备注(形状)": "方糖",
        "颗数/条": "25",
        "单圈克重(g)": "8.9",
        "单颗成本": "2.85"
      };
      break;
    case "works":
      headers = ["作品编号", "作品名称", "所属序", "主题", "材质结构", "售价", "状态"];
      example = { "作品编号": "W001", "作品名称": "示例作品", "所属序": "芙初", "主题": "本真", "材质结构": "沉香+水晶", "售价": "599", "状态": "在售" };
      break;
    case "bom":
      headers = ["作品编号", "作品名称", "材料编码", "材料名称", "数量", "单颗成本"];
      example = { "作品编号": "W001", "作品名称": "示例作品", "材料编码": "cx001", "材料名称": "沉香", "数量": "3", "单颗成本": "2.85" };
      break;
    case "costs":
      headers = ["作品编号", "作品名称", "所属序", "材料成本", "人工", "包装", "损耗率"];
      example = { "作品编号": "W001", "作品名称": "示例作品", "所属序": "芙初", "材料成本": "200", "人工": "50", "包装": "10", "损耗率": "0.1" };
      break;
    case "inventory":
      headers = ["材料编码", "名称", "采购数量", "已使用"];
      example = { "材料编码": "cx001", "名称": "沉香", "采购数量": "10", "已使用": "3" };
      break;
    default:
      return NextResponse.json({ error: "未知模板类型" }, { status: 400 });
  }

  // 生成 Excel
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    headers.map((h) => example[h] ?? ""),
    [], // 空行供用户填写
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "导入模板");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const nameMap: Record<string, string> = {
    "raw-materials": "原材料导入模板",
    "works": "七序作品导入模板",
    "bom": "BOM导入模板",
    "costs": "成本核算导入模板",
    "inventory": "库存导入模板",
  };
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nameMap[type] || "导入模板")}.xlsx`,
    },
  });
}
