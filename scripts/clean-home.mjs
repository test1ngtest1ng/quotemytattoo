// Dev-only: emits the home marketing section with base64 images swapped for
// /images/home-N files and the big illustration SVGs swapped for <img> refs,
// so it can be faithfully converted to JSX. Output: /tmp/home-clean.html
import { readFileSync, writeFileSync } from "node:fs";

let html = readFileSync("design-reference/home page.html", "utf8");

// Grab the home marketing <section ... id="home"> ... </section>
const start = html.indexOf('<section class="panel show" data-step="0" id="home">');
const end = html.indexOf("<!-- ===================== WIZARD", start);
let sec = html.slice(start, end);

// Replace the 3 step illustration svgs (viewBox 0 0 260 260)
let stepN = 0;
sec = sec.replace(/<svg viewBox="0 0 260 260"[\s\S]*?<\/svg>/g, () => {
  stepN++;
  return `<img class="ill-img" src="/images/step-${stepN}.svg" alt="" width="220" height="220">`;
});
// Replace the app phone svg
sec = sec.replace(/<svg viewBox="0 0 340[\s\S]*?<\/svg>/g, '<img src="/images/app-phone.svg" alt="Quote My Tattoo app" width="300" height="600">');

// Replace base64 images in document order with /images/home-N
let imgN = 0;
const exts = ["jpg","jpg","jpg","jpg","jpg","jpg","png","png","jpg","png","png"];
sec = sec.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, () => {
  imgN++;
  return `/images/home-${imgN}.${exts[imgN-1] || "jpg"}`;
});

writeFileSync("/tmp/home-clean.html", sec);
console.log(`home-clean.html: ${sec.length} bytes, ${imgN} images, ${stepN} step svgs`);
