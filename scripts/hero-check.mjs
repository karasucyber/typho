import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader"],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".typho-letter");

const sample = () => page.evaluate(() => ({
  letters: [...document.querySelectorAll(".typho-letter")].map((letter) => ({
    opacity: Number(getComputedStyle(letter).opacity),
    transform: getComputedStyle(letter).transform,
  })),
  threads: [...document.querySelectorAll(".wordmark-thread")].map((thread) => Number(getComputedStyle(thread).opacity)),
  flash: Number(getComputedStyle(document.querySelector(".wordmark-flash")).opacity),
}));

const initial = await sample();
await page.waitForTimeout(420);
const drawing = await sample();
await page.waitForTimeout(500);
const pulling = await sample();
await page.waitForFunction(() => Number(getComputedStyle(document.querySelector(".wordmark-flash")).opacity) > 0.1, undefined, { timeout: 1500 });
const flashing = await sample();
await page.waitForTimeout(850);
const settled = await sample();

const reducedPage = await browser.newPage({ reducedMotion: "reduce" });
await reducedPage.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
await reducedPage.waitForSelector(".typho-letter");
const reduced = await reducedPage.evaluate(() => ({
  letters: [...document.querySelectorAll(".typho-letter")].map((letter) => Number(getComputedStyle(letter).opacity)),
  threadsHidden: [...document.querySelectorAll(".wordmark-thread")].every((thread) => getComputedStyle(thread).display === "none"),
}));

await browser.close();

if (initial.letters.length !== 5 || initial.letters.some((letter) => letter.opacity > 0.2)) {
  throw new Error(`Letters did not start hidden: ${JSON.stringify(initial)}`);
}
if (drawing.threads.every((opacity) => opacity < 0.05)) {
  throw new Error(`Web threads did not draw: ${JSON.stringify(drawing)}`);
}
if (pulling.letters.every((letter) => letter.opacity < 0.5)) {
  throw new Error(`Letters were not pulled into place: ${JSON.stringify(pulling)}`);
}
if (flashing.flash < 0.05) {
  throw new Error(`Final flash did not appear: ${JSON.stringify(flashing)}`);
}
if (settled.letters.some((letter) => letter.opacity < 0.99) || settled.flash > 0.05) {
  throw new Error(`Logo did not settle: ${JSON.stringify(settled)}`);
}
if (reduced.letters.some((opacity) => opacity < 0.99) || !reduced.threadsHidden) {
  throw new Error(`Reduced motion is not respected: ${JSON.stringify(reduced)}`);
}
if (errors.length) {
  throw new Error(errors.join(" | "));
}

console.log(JSON.stringify({ initial, drawing, pulling, flashing, settled, reduced }, null, 2));
