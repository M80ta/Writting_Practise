// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

test("HTML and CSS resolve every local asset under GitHub Pages subdirectories and file URLs", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "app.css"), "utf8");
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]).filter((value) => !value.startsWith("#") && !value.startsWith("data:"));
  const fontRefs = [...css.matchAll(/url\('([^']+)'\)/g)].map((match) => match[1]);
  for (const ref of [...references, ...fontRefs]) {
    assert.ok(ref.startsWith("./"), `expected relative resource: ${ref}`);
    assert.ok(fs.existsSync(path.resolve(root, ref)), `missing resource: ${ref}`);
    for (const base of ["https://example.github.io/EnglishPractise/javascript/index.html", "file:///D:/EnglishPractise/javascript/index.html"]) {
      const resolved = new URL(ref, base);
      assert.ok(resolved.pathname.includes("/javascript/"));
    }
  }
  for (const file of ["app.js", "worksheet.js"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.ok(!/fetch\s*\(|XMLHttpRequest|\/api\/render/.test(source), `${file} must not rely on a backend`);
  }
  assert.ok(fs.existsSync(path.join(root, ".nojekyll")));
  assert.ok(fs.existsSync(path.join(root, "fonts/PatrickHand-OFL.txt")));
  assert.ok(fs.existsSync(path.join(root, "fonts/Caveat-OFL.txt")));
});
