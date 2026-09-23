import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const targets = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
  { name: "compact", width: 320, height: 568 },
];

mkdirSync("artifacts", { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader"],
});

const results = [];

for (const target of targets) {
  const page = await browser.newPage({ viewport: { width: target.width, height: target.height } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas");
  await page.waitForTimeout(800);
  const canvasPointerEvents = await page.locator(".particle-layer > div").evaluate(
    (element) => getComputedStyle(element).pointerEvents,
  );
  const scene = await page.locator(".scene").boundingBox();
  const wordmark = await page.locator(".brand-lockup").boundingBox();
  const intro = await page.locator("#possibilidades").boundingBox();
  if (!scene || !wordmark) throw new Error(`${target.name}: logo layout not found`);
  if (!intro) throw new Error(`${target.name}: content section not found`);
  const pageSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: document.documentElement.clientWidth,
    viewportHeight: window.innerHeight,
  }));

  const sampleCanvas = () => page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas not found");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL context not found");
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let litPixels = 0;
    let chromaticPixels = 0;
    let xTotal = 0;
    let yTotal = 0;
    let hash = 2166136261;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 4) {
        litPixels += 1;
        const pixel = index / 4;
        xTotal += pixel % width;
        yTotal += height - 1 - Math.floor(pixel / width);
        const spread = Math.max(pixels[index], pixels[index + 1], pixels[index + 2])
          - Math.min(pixels[index], pixels[index + 1], pixels[index + 2]);
        if (spread > 25) chromaticPixels += 1;
      }
      if (index % 404 === 0) {
        hash ^= pixels[index] + pixels[index + 1] * 3 + pixels[index + 2] * 7 + pixels[index + 3] * 11;
        hash = Math.imul(hash, 16777619);
      }
    }
    return {
      width, height, litPixels, chromaticPixels,
      centroidX: xTotal / Math.max(1, litPixels),
      centroidY: yTotal / Math.max(1, litPixels),
      hash: hash >>> 0,
    };
  });

  const before = await sampleCanvas();
  const directionBefore = await page.locator(".direction-card").first().evaluate(
    (card) => Number(getComputedStyle(card).opacity),
  );
  await page.screenshot({ path: `artifacts/${target.name}.png` });
  await page.screenshot({ path: `artifacts/${target.name}-page.png`, fullPage: true });
  await page.waitForTimeout(800);
  const moving = await sampleCanvas();
  await page.screenshot({ path: `artifacts/${target.name}-moving.png` });
  await page.mouse.move(scene.x + scene.width / 2, scene.y + scene.height / 2);
  await page.waitForTimeout(650);
  const after = await sampleCanvas();

  await page.screenshot({ path: `artifacts/${target.name}-hover.png` });
  await page.locator(".scroll-link").click();
  await page.waitForTimeout(900);
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => {
    const hero = document.getElementById("inicio");
    if (!hero) throw new Error("Hero not found");
    window.scrollTo({ top: hero.getBoundingClientRect().height * 0.64, behavior: "instant" });
  });
  await page.waitForTimeout(900);
  const firstDust = await sampleCanvas();
  await page.screenshot({ path: `artifacts/${target.name}-first-dust.png` });
  await page.waitForTimeout(300);
  const firstDustMoving = await sampleCanvas();
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scrollY);
  await page.locator(".web-space").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const web = await sampleCanvas();
  await page.screenshot({ path: `artifacts/${target.name}-content.png` });
  await page.locator(".neural-space").evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - window.innerHeight * 0.675, behavior: "instant" });
  });
  await page.waitForTimeout(900);
  const between = await sampleCanvas();
  await page.screenshot({ path: `artifacts/${target.name}-morph.png` });
  await page.waitForTimeout(300);
  const betweenMoving = await sampleCanvas();
  await page.locator(".neural-space").evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(900);
  const neural = await sampleCanvas();
  await page.screenshot({ path: `artifacts/${target.name}-neural.png` });
  await page.locator(".web-space").evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(900);
  const webReturn = await sampleCanvas();

  const inspectCards = async (selector, section) => {
    const cards = page.locator(selector);
    const count = await cards.count();
    if (count !== 3) throw new Error(`${target.name}: ${section} cards are missing`);
    const styles = [];
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      styles.push(await card.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          opacity: Number(style.opacity),
          borderWidth: style.borderTopWidth,
          backdropFilter: style.backdropFilter,
        };
      }));
      if (index === 0) {
        await page.screenshot({ path: `artifacts/${target.name}-${section}.png` });
        if (section === "frentes" && target.name === "desktop") {
          const beforeHover = await card.evaluate((element) => getComputedStyle(element).borderTopColor);
          await card.hover();
          await page.waitForTimeout(350);
          const afterHover = await card.evaluate((element) => getComputedStyle(element).borderTopColor);
          if (beforeHover === afterHover) throw new Error("desktop: glass card hover did not respond");
        }
      }
    }
    return styles;
  };

  const directions = await inspectCards(".direction-card", "frentes");
  const steps = await inspectCards(".step-row", "abordagem");
  const gradients = await page.locator(".content-section h2").evaluateAll(
    (headings) => headings.map((heading) => getComputedStyle(heading).backgroundClip),
  );
  results.push({
    target: target.name, scene, wordmark, intro, pageSize, scrollY,
    before, moving, after, firstDust, firstDustMoving, web, between, betweenMoving, neural, webReturn, canvasPointerEvents, directionBefore, directions, steps, gradients, errors,
  });
  await page.close();
}

await browser.close();

for (const result of results) {
  if (result.before.litPixels < 500 || result.after.litPixels < 500) {
    throw new Error(`${result.target}: canvas appears blank`);
  }
  if (result.before.chromaticPixels < result.before.litPixels * 0.8) {
    throw new Error(`${result.target}: logo particles are washed out`);
  }
  if (result.web.litPixels < 500 || result.web.chromaticPixels < 500) {
    throw new Error(`${result.target}: colored web did not render`);
  }
  if (result.firstDust.litPixels < 500 || result.firstDust.chromaticPixels < 500) {
    throw new Error(`${result.target}: particles disappeared during the spider-to-web morph`);
  }
  if (result.firstDust.hash === result.firstDustMoving.hash) {
    throw new Error(`${result.target}: spider-to-web dust is static`);
  }
  if (result.neural.litPixels < 500 || result.neural.chromaticPixels < 500) {
    throw new Error(`${result.target}: neural network did not render`);
  }
  if (result.between.litPixels < 500 || result.between.chromaticPixels < 500) {
    throw new Error(`${result.target}: particles disappeared during the web-to-neural morph`);
  }
  if (result.between.hash === result.betweenMoving.hash) {
    throw new Error(`${result.target}: web-to-neural dust is static`);
  }
  if (result.webReturn.litPixels < 500 || result.webReturn.chromaticPixels < 500) {
    throw new Error(`${result.target}: web did not return after reversing scroll`);
  }
  if (result.pageSize.width > result.pageSize.viewportWidth + 1) {
    throw new Error(`${result.target}: page overflows horizontally`);
  }
  if (result.pageSize.height < result.pageSize.viewportHeight * 1.8 || result.intro.y >= result.pageSize.viewportHeight) {
    throw new Error(`${result.target}: scroll content is missing from the first viewport`);
  }
  if (result.scrollY < result.pageSize.viewportHeight * 0.3) {
    throw new Error(`${result.target}: explore link did not scroll to content`);
  }
  if (result.before.hash === result.moving.hash) {
    throw new Error(`${result.target}: particles do not move without the pointer`);
  }
  if (Math.abs(result.before.litPixels - result.moving.litPixels) > result.before.litPixels * 0.12) {
    throw new Error(`${result.target}: idle motion changes the spider silhouette too much`);
  }
  const isMobile = result.target !== "desktop";
  if (isMobile && result.web.centroidY < result.before.centroidY + result.before.height * 0.12) {
    throw new Error(`${result.target}: particles did not move down into the web section`);
  }
  if (!isMobile && result.web.centroidX < result.before.centroidX + result.before.width * 0.22) {
    throw new Error(`${result.target}: particles did not move right into the web section`);
  }
  if (!isMobile && result.neural.centroidX > result.web.centroidX - result.before.width * 0.25) {
    throw new Error(`${result.target}: particles did not move left into the neural section`);
  }
  if (!isMobile && (
    result.between.centroidX > result.web.centroidX - result.before.width * 0.08
    || result.between.centroidX < result.neural.centroidX + result.before.width * 0.08
  )) {
    throw new Error(`${result.target}: web-to-neural movement is not gradual`);
  }
  if (!isMobile && result.webReturn.centroidX < result.neural.centroidX + result.before.width * 0.25) {
    throw new Error(`${result.target}: particles did not return right to the web`);
  }
  if (isMobile && result.scene.y + result.scene.height > result.wordmark.y) {
    throw new Error(`${result.target}: spider overlaps the wordmark`);
  }
  if (!isMobile && result.scene.x + result.scene.width > result.wordmark.x) {
    throw new Error(`${result.target}: spider overlaps the wordmark`);
  }
  if (result.before.hash === result.after.hash) {
    throw new Error(`${result.target}: particles did not react to the pointer`);
  }
  if (result.canvasPointerEvents !== "none") {
    throw new Error(`${result.target}: particle canvas blocks content interactions`);
  }
  if (result.directionBefore > 0.05) {
    throw new Error(`${result.target}: card reveal started before it entered the viewport`);
  }
  if (result.gradients.length !== 3 || result.gradients.some((clip) => clip !== "text")) {
    throw new Error(`${result.target}: section title gradients are missing`);
  }
  for (const card of [...result.directions, ...result.steps]) {
    if (card.opacity < 0.95 || card.borderWidth !== "1px" || card.backdropFilter === "none") {
      throw new Error(`${result.target}: glass card or scroll reveal is missing: ${JSON.stringify(card)}`);
    }
  }
  if (result.errors.length > 0) {
    throw new Error(`${result.target}: ${result.errors.join(" | ")}`);
  }
}

console.log(JSON.stringify(results, null, 2));
