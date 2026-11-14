// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");

test("license package retains official text, required notice, website links, and third-party rights", () => {
  for (const file of ["LICENSE.md", "LEGAL.md", "NOTICE", "THIRD_PARTY_NOTICES.md"]) {
    const local = fs.readFileSync(path.join(root, file));
    const parent = path.join(root, "..", file);
    if (fs.existsSync(parent)) assert.deepEqual(local, fs.readFileSync(parent), `License copy differs from repository root: ${file}`);
  }
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "LICENSE.md"))).digest("hex"), "ffcca38841adb694b6f380647e15f17c446a4d1656fed51a1e2041d064c94cc8");
  assert.match(fs.readFileSync(path.join(root, "NOTICE"), "utf8"), /^Required Notice: Copyright/);
  assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /href="\.\/legal.html"/);
  const legal = fs.readFileSync(path.join(root, "legal.html"), "utf8");
  for (const file of ["LICENSE.md", "LEGAL.md", "NOTICE", "THIRD_PARTY_NOTICES.md"]) assert.ok(legal.includes(`href="./${file}"`));
});
