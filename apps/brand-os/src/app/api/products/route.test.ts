import assert from "node:assert/strict";
import test from "node:test";
import { prepareProductMutationData } from "./mutation";

test("POST-compatible create input defaults to draft states and preserves business fields", () => {
  const result = prepareProductMutationData({
    sku: "YW-T-001",
    name: "测试产品",
    slug: "test-product",
    seriesId: 1,
    objectCategory: "BRACELET",
    theme: "见己",
    story: "故事",
    materials: "材料",
    coverImage: "/cover.png",
    gallery: ["a", "b"],
    costPrice: 12,
    salePrice: 34,
    stock: 5,
    erpProductId: 88,
    inspiration: "灵感",
    keywords: "关键字",
    lifeStage: "成品",
    suitableFor: "礼赠",
    sortOrder: 2,
  }, "create");

  assert.equal(result.status, "draft");
  assert.equal(result.publishStatus, "DRAFT");
  assert.equal(result.sku, "YW-T-001");
  assert.equal(result.seriesId, 1);
  assert.equal(result.gallery, '["a","b"]');
  assert.equal(result.stock, 5);
});

test("create rejects direct workflow status writes", () => {
  for (const field of [
    { status: "PUBLISHED" },
    { publish_status: "PUBLISHED" },
    { publishStatus: "PUBLISHED" },
  ]) {
    assert.throws(
      () => prepareProductMutationData({
        sku: "YW-T-001",
        name: "测试产品",
        slug: "test-product",
        seriesId: 1,
        ...field,
      }, "create"),
      /Product status cannot be set through this endpoint\. Use the publishing workflow\./,
    );
  }
});

test("update preserves business fields and rejects direct workflow mutations", () => {
  const result = prepareProductMutationData({
    name: "更新后名称",
    theme: "澄明",
    salePrice: 66,
  }, "update");

  assert.deepEqual(result, {
    name: "更新后名称",
    theme: "澄明",
    salePrice: 66,
  });

  for (const field of [
    { status: "PUBLISHED" },
    { publish_status: "PUBLISHED" },
    { publishStatus: "PUBLISHED" },
  ]) {
    assert.throws(
      () => prepareProductMutationData({
        id: 1,
        name: "更新后名称",
        ...field,
      }, "update"),
      /Product status cannot be set through this endpoint\. Use the publishing workflow\./,
    );
  }
});

test("update rejects unknown fields instead of silently forwarding them", () => {
  assert.throws(
    () => prepareProductMutationData({
      name: "更新后名称",
      statusLabel: "PUBLISHED",
    }, "update"),
    /包含不支持的字段/,
  );
});
