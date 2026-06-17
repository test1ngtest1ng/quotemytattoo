// Dev-only: pulls base64 data-URI images out of a design-reference HTML file
// and writes them to public/images/. Run:
//   node scripts/extract-images.mjs "design-reference/home page.html" home
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const [, , file, prefix = "img"] = process.argv;
if (!file) throw new Error("usage: node extract-images.mjs <html> <prefix>");

const html = readFileSync(file, "utf8");
const re = /data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)/g;

mkdirSync("public/images", { recursive: true });
let i = 0;
const map = [];
let m;
while ((m = re.exec(html)) !== null) {
  i++;
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const name = `${prefix}-${i}.${ext}`;
  writeFileSync(`public/images/${name}`, Buffer.from(m[2], "base64"));
  map.push({ name, bytes: Buffer.from(m[2], "base64").length });
}
console.log(`Extracted ${i} images to public/images/`);
console.table(map);
