import { test } from "node:test";
import assert from "node:assert/strict";
import * as b from "../kit/brick.mjs";
import { auditPieces } from "../kit/lego-audit.mjs";

const types = (pieces) => auditPieces(pieces).map((issue) => issue.type).sort();
const base = () => b.plate({ x: 0, y: 0, w: 8, d: 8, color: "bright-green" });

test("a clean build has no issues", () => {
  assert.deepEqual(types([base(), b.brick({ x: 1, y: 1, z: 1, w: 2, d: 2, color: "red" }), b.brick({ x: 1, y: 1, z: 4, w: 2, d: 2, color: "blue" })]), []);
});

test("bricks side by side touch but don't overlap", () => {
  assert.deepEqual(types([base(), b.brick({ x: 1, y: 1, z: 1, w: 2, color: "red" }), b.brick({ x: 3, y: 1, z: 1, w: 2, color: "blue" })]), []);
});

test("two bricks in the same place overlap", () => {
  assert.deepEqual(types([base(), b.brick({ x: 1, y: 1, z: 1, w: 2, color: "red" }), b.brick({ x: 2, y: 1, z: 1, w: 2, color: "blue" })]), ["overlap"]);
});

test("round pieces diagonal to each other don't overlap, though their boxes would", () => {
  assert.deepEqual(types([base(), b.round({ x: 1, y: 1, z: 1, w: 2, color: "red" }), b.round({ x: 2.6, y: 2.6, z: 1, w: 2, color: "blue", offGrid: true })]), []);
});

test("a brick in mid-air floats", () => {
  assert.deepEqual(types([base(), b.brick({ x: 1, y: 1, z: 5, color: "red" })]), ["floating"]);
});

test("a cloud marked float may float", () => {
  assert.deepEqual(types([base(), b.brick({ x: 1, y: 1, z: 30, color: "white", float: true })]), []);
});

test("a piece held only by a later step appears too early", () => {
  assert.deepEqual(types([base(), b.brick({ x: 1, y: 1, z: 1, color: "red", step: 2 }), b.brick({ x: 1, y: 1, z: 4, color: "blue", step: 1 })]), ["early"]);
});

test("off-grid bricks are reported, half studs are not", () => {
  assert.deepEqual(types([base(), b.brick({ x: 1.5, y: 1, z: 1, color: "red" })]), []);
  assert.deepEqual(types([base(), b.brick({ x: 1.3, y: 1, z: 1, color: "red" })]), ["grid"]);
  assert.deepEqual(types([base(), b.brick({ x: 1, y: 1, z: 1, h: 2.5, color: "red" })]), ["grid"]);
});

test("pipes may run into what they connect", () => {
  const tank = b.round({ x: 2, y: 2, z: 1, w: 3, h: 6, color: "light-gray" });
  const pipe = b.pipe({ axis: "x", from: 0, to: 28, at: [28, 8] });
  assert.deepEqual(types([base(), tank, pipe]), []);
});
