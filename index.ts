import * as browsers from "@puppeteer/browsers";
import puppeteer, { Browser, ElementHandle, Page } from "puppeteer-core";
import fs from "node:fs";

const STARTING_LINK = "https://www.youtube.com/watch?v=aRcUVhVlSHg";

async function main(): Promise<void> {
  const outputDir = `output/${STARTING_LINK.split("?v=")[1]}/`;
  const screenshotDir = outputDir + "/screenshots";
  const outputPath = outputDir + "/output.txt";
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.writeFileSync(outputPath, "");

  const browser: Browser = await getBrowser();
  const page: Page = await browser.newPage();

  await page.setBypassCSP(true);
  await page.setViewport({ width: 1024, height: 768 });
  await page.goto(STARTING_LINK, { waitUntil: ["load", "networkidle0"] });
  await waitForVideoToPlay(page);

  console.log(String(0).padStart(5, "0") + ": " + page.url());
  await page.screenshot({
    path: `${screenshotDir}/screenshot-${String(0).padStart(5, "0")}.png`,
  });

  for (var i = 1; i <= 5000; i++) {
    await playNext(page);
    await waitForVideoToPlay(page);
    console.log(String(i).padStart(5, "0") + ": " + page.url());
    fs.appendFileSync(outputPath, page.url() + "\n");
    await page.screenshot({
      path: `${screenshotDir}/screenshot-${String(i).padStart(5, "0")}.png`,
    });
  }

  await page.close();
  await browser.close();
}

async function waitForVideoToPlay(page: Page): Promise<any> {
  const vidContainer: ElementHandle | null = await page.$("#movie_player");
  if (!vidContainer) {
    console.error("no video element found :(");
    process.exit(2);
  }

  await waitForVidStart(page);

  var classes: string[] = await getClasses(vidContainer);
  while (classes.includes("ad-showing")) {
    try {
      const button = await page.locator("button.ytp-skip-ad-button").setTimeout(5000).waitHandle();
      await button.click();
      await waitForVidStart(page);
    } catch (e) { }
    classes = await getClasses(vidContainer);
  }
}

async function waitForVidStart(page: Page) {
  return Promise.all([
    page.waitForFunction(
      'document.querySelector("video.html5-main-video").readyState > 2',
    ),
    page.waitForFunction(
      'document.querySelector("video.html5-main-video").currentTime > 1',
    ),
  ]);
}

async function getClasses(vidContainer: ElementHandle) {
  return (
    (await vidContainer
      ?.getProperty("className")
      .then((a) => a.jsonValue())
      .then((a) => a.split(" "))) || []
  );
}

async function playNext(page: Page) {
  return page.evaluate('document.querySelector(".ytp-autonav-endscreen-upnext-play-button").click()');
}

async function getBrowser(): Promise<Browser> {
  const cacheDir: string = __dirname + "/.cache";
  const platform: browsers.BrowserPlatform =
    browsers.detectBrowserPlatform() || browsers.BrowserPlatform.LINUX;
  const browser: browsers.Browser = browsers.Browser.CHROME;
  const buildId: string = await browsers.resolveBuildId(
    browsers.Browser.CHROME,
    platform,
    "stable",
  );
  const executablePath: string = browsers.computeExecutablePath({
    cacheDir,
    browser,
    buildId,
  });

  return puppeteer.launch({
    executablePath,
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-audio-output",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
}

main();
