import {
  Browser,
  BrowserPlatform,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
  resolveBuildId,
} from "@puppeteer/browsers";

const browser : Browser = Browser.CHROME;
const platform = detectBrowserPlatform() || BrowserPlatform.LINUX;
const cacheDir = process.cwd() + "/.cache";
const tag =  "stable";


export async function installBrowser() {
  const buildId = await resolveBuildId(browser, platform, tag);
  await install({ browser, buildId, cacheDir });
}

export async function getBrowserPath(): Promise<string> {
  const buildId = await resolveBuildId(browser, platform, tag);
  const executablePath = computeExecutablePath({ cacheDir, browser, buildId, });
  return executablePath;
}

if (require.main === module) {
  installBrowser();
}
