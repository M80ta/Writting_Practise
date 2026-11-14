// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
fs.mkdirSync(output, { recursive: true });
for (const file of ["index.html", "chinese.html", "app.css", "app.js", "worksheet.js", "zhuyin-data.js", "legal.html", ".nojekyll", "LICENSE.md", "LEGAL.md", "NOTICE", "THIRD_PARTY_NOTICES.md"]) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.cpSync(path.join(root, "fonts"), path.join(output, "fonts"), { recursive: true });
console.log(`Static website prepared in ${output}`);
