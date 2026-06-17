// Dev-only: extracts the 260x260 "how it works" illustration SVGs from the
// home mockup into standalone files so they stay pixel-exact.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const html = readFileSync("design-reference/home page.html", "utf8");
const re = /<svg viewBox="0 0 260 260"[\s\S]*?<\/svg>/g;
mkdirSync("public/images", { recursive: true });

let i = 0;
let m;
while ((m = re.exec(html)) !== null) {
  i++;
  let svg = m[0];
  if (!svg.includes("xmlns")) svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  writeFileSync(`public/images/step-${i}.svg`, svg);
}
console.log(`Extracted ${i} step illustration(s).`);
