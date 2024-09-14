import {
  Browser,
  install,
  resolveBuildId,
  detectBrowserPlatform,
  BrowserPlatform,
  computeExecutablePath
} from "@puppeteer/browsers";

export async function installBrowser() {
  const cacheDir = process.cwd() + "/.cache";
  const browser = Browser.CHROME;
  const platform: BrowserPlatform = detectBrowserPlatform() || BrowserPlatform.LINUX;
  const buildId = await resolveBuildId(browser, platform, "stable");
  await install({ browser, buildId, cacheDir });
}

export async function getBrowserPath(): Promise<string> {
  const cacheDir: string = process.cwd() + "/.cache";
  const platform: BrowserPlatform = detectBrowserPlatform() || BrowserPlatform.LINUX;
  const browser: Browser = Browser.CHROME;
  const buildId: string = await resolveBuildId(Browser.CHROME, platform, "stable",);
  const executablePath: string = computeExecutablePath({ cacheDir, browser, buildId, });
  return executablePath
}

if (require.main === module) {
  installBrowser();
}
