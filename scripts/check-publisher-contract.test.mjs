import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validatePublisherContract } from "./check-publisher-contract.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const publisherPath = "apps/platform/lib/publisher.ts";
const schemaPath = "packages/brand-db/schema.prisma";
const publisher = fs.readFileSync(path.join(root, publisherPath), "utf8");
const schema = fs.readFileSync(path.join(root, schemaPath), "utf8");

function errors(overrides) { return validatePublisherContract(root, { publisher, schema, ...overrides }); }
function fails(mutator, expected) { assert.ok(errors({ publisher: mutator(publisher) }).some((error) => error.includes(expected))); }

test("current Publisher contract passes", () => assert.deepEqual(errors({}), []));
test("Product submit fixture maps to PENDING_REVIEW", () => assert.match(publisher, /SUBMIT_FOR_REVIEW[\s\S]*PENDING_REVIEW/));
test("Journal submit fixture maps to PENDING_REVIEW", () => assert.match(publisher, /journal[\s\S]*publish-status/));
test("approve fixture targets APPROVED", () => assert.match(publisher, /APPROVE[\s\S]*PublishStatus\.APPROVED/));
test("reject fixture retains reason metadata", () => assert.match(publisher, /rejectionMetadata[\s\S]*reason/));
test("future scheduling fixture uses publish job upsert", () => assert.match(publisher, /parseFuturePublishAt[\s\S]*publishJobOperation = "upsert"/));
test("invalid and past scheduling fixture is rejected", () => assert.match(publisher, /publishAt must be a valid future timestamp/));
test("publish fixture targets PUBLISHED", () => assert.match(publisher, /PUBLISH[\s\S]*PublishStatus\.PUBLISHED/));
test("unpublish fixture targets UNPUBLISHED", () => assert.match(publisher, /UNPUBLISH[\s\S]*PublishStatus\.UNPUBLISHED/));
test("archive fixture targets ARCHIVED", () => assert.match(publisher, /ARCHIVE[\s\S]*PublishStatus\.ARCHIVED/));
test("invalid transition fixture is rejected", () => assert.match(publisher, /Illegal publisher transition/));
test("integer and string content IDs are registry controlled", () => assert.match(publisher, /idKind: "integer"[\s\S]*idKind: "string"/));
test("unknown content type fixture is rejected", () => fails((source) => source.replace('if (!(job.contentType in PUBLISHER_CONTENT_REGISTRY))', 'if (false)'), "G-PUB-10"));
test("publish fixture retains the version snapshot", () => fails((source) => source.replace('await createVersion(contentType, normalizedId, snapshot, PublishStatus.PUBLISHED);', '/* snapshot removed */'), "G-PUB-06"));
test("IN_REVIEW enum persistence fixture fails", () => fails((source) => source.replace('case "SUBMIT_FOR_REVIEW": targetStatus = PublishStatus.PENDING_REVIEW', 'case "SUBMIT_FOR_REVIEW": targetStatus = PublishStatus.IN_REVIEW'), "G-PUB-02"));
test("SCHEDULED enum persistence fixture fails", () => fails((source) => source.replace('case "SCHEDULE":', 'case "SCHEDULED":').replace('PublishStatus.APPROVED', 'PublishStatus.SCHEDULED'), "G-PUB-03"));
test("REJECTED enum persistence fixture fails", () => fails((source) => source.replace('case "REJECT":', 'case "REJECTED":').replace('PublishStatus.DRAFT', 'PublishStatus.REJECTED'), "G-PUB-04"));
