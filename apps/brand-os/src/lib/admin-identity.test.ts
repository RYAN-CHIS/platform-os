import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAdminEmailAvailable,
  resolveSingleAdminIdentity,
} from "./admin-identity";

test("admin identity resolution accepts exactly one matching row", async () => {
  let audits = 0;
  const user = { id: "admin-1" };
  const result = await resolveSingleAdminIdentity(
    async () => [user],
    async () => { audits += 1; },
  );

  assert.equal(result, user);
  assert.equal(audits, 0);
});

test("admin identity resolution fails closed for zero, duplicate, and failed lookups", async () => {
  let audits = 0;
  assert.equal(await resolveSingleAdminIdentity(async () => [], async () => { audits += 1; }), null);
  assert.equal(
    await resolveSingleAdminIdentity(async () => [{ id: "one" }, { id: "two" }], async () => { audits += 1; }),
    null,
  );
  assert.equal(
    await resolveSingleAdminIdentity(async () => { throw new Error("lookup failed"); }, async () => { audits += 1; }),
    null,
  );
  assert.equal(audits, 1);
});

test("admin creation pre-check rejects a matching email and propagates lookup errors", async () => {
  await assert.rejects(() => assertAdminEmailAvailable(async () => ({ id: "admin-1" })), /管理员邮箱已存在/);
  await assert.rejects(() => assertAdminEmailAvailable(async () => { throw new Error("lookup failed"); }), /lookup failed/);
  await assert.doesNotReject(() => assertAdminEmailAvailable(async () => null));
});
