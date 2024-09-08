import {
  Browser,
  install,
  resolveBuildId,
  detectBrowserPlatform,
  BrowserPlatform,
} from "@puppeteer/browsers";

async function main() {
  const cacheDir = __dirname + "/.cache";
  const browser = Browser.CHROME;
  const platform: BrowserPlatform =
    detectBrowserPlatform() || BrowserPlatform.LINUX;
  const buildId = await resolveBuildId(browser, platform, "stable");
  await install({ browser, buildId, cacheDir });
}

main();
