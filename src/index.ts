#!/usr/bin/env node

import * as browsers from "@puppeteer/browsers";
// import getVideoId from 'get-video-id';
import { google } from 'googleapis';
import fs from "node:fs";
import puppeteer, { Browser, ElementHandle, Page } from "puppeteer-core";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import csv from './csv';
import {VideoDetails} from './types';

const WINDOW_WIDTH = 1024;
const WINDOW_HEIGHT = 768;

const opts = yargs(hideBin(process.argv))
  .option('url', {
    alias: 'u',
    type: 'string',
    description: 'The YouTube URL to start with',
    requiresArg: true
  })
  .option('no-csv', {
    type: 'boolean',
    description: 'Skip csv generation at the end',
    default: false
  })
  .option('iterations', {
    alias: 'i',
    type: 'number',
    description: 'The maximum number of videos to follow',
    default: 100
  })
  .option('output-dir', {
    type: "string",
    description: "The location to save results",
    default: 'output'
  })
  .option('youtube-api-key', {
    type: 'string',
    description: 'Youtube api key, may also be set in the environment variable YOUTUBE_API_KEY'
  })
  .demandOption(['url'])
  .parseSync();

const STARTING_LINK = opts.url;
const NUMBER_OF_ITERATIONS = opts.iterations;
const CREATE_CSV = !opts.noCsv;
const BASE_OUTPUT_DIR = opts.outputDir;
const YOUTUBE_API_KEY = opts.youtubeApiKey || process.env.YOUTUBE_API_KEY;

async function main(): Promise<void> {
  const getVideoId = await import('get-video-id');
  const videoId = getVideoId.default(STARTING_LINK);
  if (!videoId.id) {
    console.error('Unable to get video ID from ' + STARTING_LINK);
    process.exit(2);
  }

  const outputDir = `${BASE_OUTPUT_DIR}/${videoId.id}/`;
  const screenshotDir = outputDir + "/screenshots";
  const outputPath = outputDir + "/output.json";
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.writeFileSync(outputPath, "[]", 'utf-8');

  const browser: Browser = await getBrowser();
  const page: Page = await browser.newPage();

  await page.setViewport({ width: WINDOW_WIDTH, height: WINDOW_HEIGHT });
  await page.goto(STARTING_LINK, { waitUntil: ["load", "networkidle2"] });
  await waitForVideoToPlay(page);
  const a = await getVideoDetails(page.url(), 0);
  console.log("00000: " + page.url() + ": " + a?.title);
  saveVideoDetails(outputPath, a);
  await page.screenshot({ path: `${screenshotDir}/screenshot-00000.png` });

  for (var i = 1; i <= NUMBER_OF_ITERATIONS; i++) {
    await playNext(page);
    await waitForVideoToPlay(page);

    const a = await getVideoDetails(page.url(), i);
    console.log(String(i).padStart(5, "0") + ": " + page.url() + ": " + a.title || '');
    saveVideoDetails(outputPath, a);

    await page.screenshot({ path: `${screenshotDir}/screenshot-${String(i).padStart(5, "0")}.png` });
  }

  await page.close();
  await browser.close();


  if (CREATE_CSV) {
    csv(videoId.id || undefined, true);
  }
}

function saveVideoDetails(outputPath: string, a: VideoDetails) {
  var fileData: VideoDetails[] = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  fileData.push(a);
  fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 2), 'utf-8');
}

async function getVideoDetails(url: string, num: number): Promise<VideoDetails> {
  const getVideoId = await import('get-video-id');
  const videoId = getVideoId.default(url);
  if (!videoId.id || !YOUTUBE_API_KEY) return { order: num, id: videoId.id || '', title: '' };

  try {
    const resp: any = await google.youtube('v3').videos.list({
      auth: YOUTUBE_API_KEY,
      id: [videoId.id],
      part: ['snippet', 'id', 'statistics', 'contentDetails', 'topicDetails'],
    });
    const item = resp?.data?.items?.[0] || { id: videoId.id };
    const good = {
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

    return good;
  } catch (e) {
    // console.error(JSON.stringify(e, null, 2));
    return { order: num, id: videoId.id, title: '' }
  }
}

async function waitForVideoToPlay(page: Page): Promise<any> {
  const vidContainer: ElementHandle | null = await page.$("#movie_player");
  if (!vidContainer) {
    console.error("no video element found :(");
    process.exit(2);
  }

  await waitForVidStart(page);

  var classes = await getClasses(vidContainer);
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
    page.waitForFunction('document.querySelector("video.html5-main-video").readyState > 2'),
    page.waitForFunction('document.querySelector("video.html5-main-video").currentTime > 1'),
  ]);
}

async function getClasses(vidContainer: ElementHandle): Promise<string[]> {
  return vidContainer.getProperty("className")
    .then((a) => a.jsonValue())
    .then((a) => a.trim().split(" "));
}

async function playNext(page: Page) {
  return page.evaluate('document.querySelector(".ytp-autonav-endscreen-upnext-play-button").click()');
}

async function getBrowser(): Promise<Browser> {
  const cacheDir: string = process.cwd() + "/.cache";
  const platform: browsers.BrowserPlatform = browsers.detectBrowserPlatform() || browsers.BrowserPlatform.LINUX;
  const browser: browsers.Browser = browsers.Browser.CHROME;
  const buildId: string = await browsers.resolveBuildId(browsers.Browser.CHROME, platform, "stable",);
  const executablePath: string = browsers.computeExecutablePath({ cacheDir, browser, buildId, });

  return puppeteer.launch({
    executablePath,
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-audio-output",
      "--autoplay-policy=no-user-gesture-required",
      `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`
    ],
  });
}

if (require.main === module) {
  main();
}