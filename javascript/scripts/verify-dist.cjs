// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
const expected = ["index.html", "chinese.html", "app.css", "app.js", "worksheet.js", "zhuyin-data.js", "legal.html", ".nojekyll", "LICENSE.md", "LEGAL.md", "NOTICE", "THIRD_PARTY_NOTICES.md", ...fs.readdirSync(path.join(root, "fonts")).map((file) => `fonts/${file}`)];
for (const file of expected) {
  assert.deepEqual(fs.readFileSync(path.join(output, file)), fs.readFileSync(path.join(root, file)), `Published asset differs: ${file}`);
}
const actual = fs.readdirSync(output, { recursive: true }).filter((file) => fs.statSync(path.join(output, file)).isFile()).map((file) => file.replaceAll(path.sep, "/")).sort();
assert.deepEqual(actual, expected.sort(), "Unexpected or missing files in publishing output");
const officialLicenseHash = "ffcca38841adb694b6f380647e15f17c446a4d1656fed51a1e2041d064c94cc8";
assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(output, "LICENSE.md"))).digest("hex"), officialLicenseHash, "Official license text changed");
console.log(`Verified ${expected.length} publishable files, including complete license and font notices.`);
