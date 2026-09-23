import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader"],
});

for (const target of [
  { name: "desktop", width: 1440, height: 900, offset: 72 },
  { name: "mobile", width: 390, height: 844, offset: 64 },
  { name: "compact", width: 320, height: 568, offset: 64 },
]) {
  const page = await browser.newPage({ viewport: { width: target.width, height: target.height } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });

  const header = page.locator(".site-header");
  const toggle = page.locator(".site-header__toggle");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  if (await header.evaluate((element) => getComputedStyle(element).position) !== "fixed") {
    throw new Error(`${target.name}: header is not fixed`);
  }

  if (target.name === "desktop") {
    if (!(await nav.isVisible()) || await toggle.isVisible()) {
      throw new Error("desktop: navigation layout is incorrect");
    }
  } else {
    if (await nav.isVisible() || !(await toggle.isVisible())) {
      throw new Error(`${target.name}: mobile menu starts in the wrong state`);
    }
    await toggle.click();
    if (!(await nav.isVisible()) || await toggle.getAttribute("aria-expanded") !== "true") {
      throw new Error(`${target.name}: mobile menu did not open`);
    }
    await page.screenshot({ path: `artifacts/${target.name}-nav-open.png` });
    await page.keyboard.press("Escape");
    if (await nav.isVisible()) throw new Error(`${target.name}: Escape did not close the menu`);
    await toggle.click();
  }

  await nav.getByRole("link", { name: "Frentes" }).click();
  await page.waitForFunction((offset) => {
    const top = document.getElementById("frentes")?.getBoundingClientRect().top;
    return top !== undefined && top >= offset - 5 && top <= offset + 5;
  }, target.offset, { timeout: 5000 });
  await page.waitForFunction(() => (
    document.querySelector('#site-navigation a[href="/#frentes"]')?.getAttribute("aria-current") === "location"
  ), undefined, { timeout: 2000 });
  if (target.name !== "desktop" && await nav.isVisible()) {
    throw new Error(`${target.name}: menu stayed open after navigation`);
  }

  if (target.name !== "desktop") {
    await toggle.click();
    await page.mouse.click(target.width - 8, target.height - 8);
    if (await nav.isVisible()) throw new Error(`${target.name}: outside click did not close the menu`);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1 || errors.length) {
    throw new Error(`${target.name}: overflow or runtime errors: ${overflow}, ${errors.join(" | ")}`);
  }
  await page.close();
}

await browser.close();
console.log("Navigation passed on desktop, mobile, and compact viewports.");
