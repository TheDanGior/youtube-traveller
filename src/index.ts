import { google } from "googleapis";
import fs from "node:fs";
import puppeteer, {
  Browser,
  ElementHandle,
  Page,
  ScreenRecorder,
} from "puppeteer-core";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as installBrowser from "./browser";
import csv from "./csv";
import { VideoDetails } from "./types";

const WINDOW_WIDTH = 1024;
const WINDOW_HEIGHT = 768;

const opts = yargs(hideBin(process.argv))
  .option("url", {
    alias: "u",
    type: "string",
    description: "The YouTube URL to start with",
    requiresArg: true,
  })
  .option("no-csv", {
    type: "boolean",
    description: "Skip csv generation at the end",
    default: false,
  })
  .option("iterations", {
    alias: "i",
    type: "number",
    description: "The maximum number of videos to follow",
    default: 100,
  })
  .option("output-dir", {
    type: "string",
    description: "The location to save results",
    default: "output",
  })
  .option("no-screenshots", {
    alias: "ns",
    type: "boolean",
    description: "Save screenshots of each page",
    default: false,
  })
  .option("save-recording", {
    alias: "r",
    type: "boolean",
    description: "Save a screenrecording of the browser",
    default: false,
  })
  .option("youtube-api-key", {
    type: "string",
    description:
      "Youtube api key, may also be set in the environment variable YOUTUBE_API_KEY",
  })
  .demandOption(["url"])
  .parseSync();

const STARTING_LINK = opts.url;
const NUMBER_OF_ITERATIONS = opts.iterations;
const CREATE_CSV = !opts.noCsv;
const BASE_OUTPUT_DIR = opts.outputDir;
const YOUTUBE_API_KEY = opts.youtubeApiKey || process.env.YOUTUBE_API_KEY;
const SAVE_SCREENSHOTS = !opts.noScreenshots;
const SAVE_RECORDING = opts.saveRecording;

async function main(): Promise<void> {
  console.log(`Starting at ${STARTING_LINK}`);
  console.log(`Following up to ${NUMBER_OF_ITERATIONS} suggestions`);
  console.log(`Saving to the ${BASE_OUTPUT_DIR} directory`);
  console.log(`${SAVE_SCREENSHOTS ? "" : "Not "}Saving screenshots`);
  console.log(`${SAVE_RECORDING ? "" : "Not "}Saving screen recording`);
  console.log(`${CREATE_CSV ? "" : "Not "}Converting to CSV`);
  console.log(`${!!YOUTUBE_API_KEY ? "" : "Do not "}Have YouTube api key`);
  console.log();

  const getVideoId = await import("get-video-id");
  const startingVideoId = getVideoId.default(STARTING_LINK);
  if (!startingVideoId.id) {
    console.error("Unable to get video ID from " + STARTING_LINK);
    process.exit(2);
  }

  const outputDir = `${BASE_OUTPUT_DIR}/${startingVideoId.id}/`;
  const screenshotDir = outputDir + "/screenshots";
  const outputPath = outputDir + "/output.json";
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.writeFileSync(outputPath, "[]", "utf-8");

  const browser: Browser = await getBrowser();
  const page: Page = await browser.newPage();

  var recorder: ScreenRecorder | null = null;

  if (SAVE_RECORDING) {
    recorder = await page.screencast({ path: `${outputDir}/recording.webm` });
  }

  await page.goto(STARTING_LINK, { waitUntil: ["load", "networkidle2"] });

  for (var i = 0; i <= NUMBER_OF_ITERATIONS; i++) {
    if (i > 0) {
      await playNext(page);
    }
    await waitForVideoToPlay(page);
    const vidId = getVideoId.default(page.url());
    const vidDetails = await getVideoDetails(vidId.id || "", i);
    console.log(
      String(i).padStart(5, "0") + ": " + page.url() + ": " + vidDetails.title,
    );
    saveVideoDetails(outputPath, vidDetails);

    if (SAVE_SCREENSHOTS) {
      await page.screenshot({
        path: `${screenshotDir}/screenshot-${String(i).padStart(5, "0")}.png`,
      });
    }
  }

  if (!!recorder) {
    await recorder.stop();
  }

  await page.close();
  await browser.close();

  if (CREATE_CSV) {
    console.log();
    csv(startingVideoId.id || undefined, true);
  }
}

function saveVideoDetails(outputPath: string, vidDetails: VideoDetails) {
  var fileData: VideoDetails[] = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
  fileData.push(vidDetails);
  fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 2), "utf-8");
}

async function getVideoDetails(id: string, num: number): Promise<VideoDetails> {
  if (!id || !YOUTUBE_API_KEY) return { order: num, id: id || "", title: "" };

  try {
    const resp: any = await google.youtube("v3").videos.list({
      auth: YOUTUBE_API_KEY,
      id: [id],
      part: ["snippet", "id", "statistics", "contentDetails", "topicDetails"],
    });
    const item = resp?.data?.items?.[0] || { id };
    const dataToSave = {
      order: num,
      id: item.id,
      channel: item.snippet.channelTitle,
      title: item.snippet.title,
      description: String(item.snippet.description).trim(),
      viewCount: item.statistics.viewCount,
      likeCount: item.statistics.likeCount,
      commentCount: item.statistics.commentCount,
      publishedAt: item.snippet.publishedAt,
      topicCategories: item.topicDetails.topicCategories,
      licensedContent: item.contentDetails.licensedContent,
      liveBroadcastContent: item.snippet.liveBroadcastContent,
      kind: item.kind,
      defaultLanguage: item.snippet.defaultLanguage,
      defaultAudioLanguage: item.snippet.defaultAudioLanguage,
      channelId: item.snippet.channelId,
      categoryId: item.snippet.categoryId,
      thumbnailUrl: item.snippet.thumbnails.default.url,
    };

    return dataToSave;
  } catch (e) {
    return { order: num, id, title: "" };
  }
}

async function waitForVideoToPlay(page: Page): Promise<any> {
  const vidContainer: ElementHandle | null = await page.$("#movie_player");
  if (!vidContainer) {
    console.error("no video element found :(");
    process.exit(2);
  }

  await waitForVideoToStart(page);

  var classes = await getClasses(vidContainer);
  while (classes.includes("ad-showing")) {
    try {
      const button = await page
        .locator("button.ytp-skip-ad-button")
        .setTimeout(5000)
        .waitHandle();
      await button.click();
      await waitForVideoToStart(page);
    } catch (e) { }
    classes = await getClasses(vidContainer);
  }
}

async function waitForVideoToStart(page: Page) {
  return Promise.all([
    page.waitForFunction(
      'document.querySelector("video.html5-main-video").readyState > 2',
    ),
    page.waitForFunction(
      'document.querySelector("video.html5-main-video").currentTime > 1',
    ),
  ]);
}

async function getClasses(vidContainer: ElementHandle): Promise<string[]> {
  return vidContainer
    .getProperty("className")
    .then((a) => a.jsonValue())
    .then((a) => a.trim().split(" "));
}

async function playNext(page: Page): Promise<unknown> {
  return page.evaluate(
    'document.querySelector(".ytp-autonav-endscreen-upnext-play-button").click()',
  );
}

async function getBrowser(): Promise<Browser> {
  await installBrowser.installBrowser();
  const browserPath = await installBrowser.getBrowserPath();
  return puppeteer.launch({
    executablePath: browserPath,
    defaultViewport: {
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
    },
    headless: false,
    args: [
      "--disable-audio-output",
      "--autoplay-policy=no-user-gesture-required",
      `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`,
    ],
    waitForInitialPage: true,
  });
}

if (require.main === module) {
  main();
}
