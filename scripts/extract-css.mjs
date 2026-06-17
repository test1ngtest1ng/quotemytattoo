// Dev-only: extracts the <style> block and the app-phone illustration SVG from
// the home mockup so the marketing pages can reuse the exact original styling.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const html = readFileSync("design-reference/home page.html", "utf8");

// 1) the full stylesheet
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
mkdirSync("src/styles", { recursive: true });
// use the next/font Figtree variable instead of the literal family name
const fixed = css.replace(/font-family:\s*"Figtree"\s*,/g, "font-family:var(--font-figtree),");
writeFileSync("src/styles/marketing.css", fixed.trim() + "\n");
console.log(`marketing.css written (${fixed.length} bytes)`);

// 2) the app-phone illustration svg
const m = html.match(/<div class="pimg-phone app-phone">\s*(<svg[\s\S]*?<\/svg>)/);
if (m) {
  let svg = m[1];
  if (!svg.includes("xmlns")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  writeFileSync("public/images/app-phone.svg", svg);
  console.log(`app-phone.svg written (${svg.length} bytes)`);
} else {
  console.log("app-phone svg not found");
}
