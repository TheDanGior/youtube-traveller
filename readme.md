# Youtube Traveller

Youtube Traveller is a tool that can quickly go though youtube and to see where the algorithm takes you.

It works by using puppeteer to open a youtube video in browser, skipping passed any pre-roll ads, going to the autoplay video, and repeating.

## Setup
1. Install Node.js 20
2. Run `npm ci`
3. Run `npm run install`
    * This installs a test version of chrome which will be controlled by puppeteer into the `.cache` directory
4. Change `STARTING_LINK` constant at the top of `index.ts` to the video you want to start with.
5. Run `npm start` and see where the youtube algoritm takes you

## Details
This runs in a different instance of chrome from your installed browser. To hopefully not influence the results too much and not destroy your youtube recommendations. The puppeteer user is not logged in. 

You can run as a logged in user by opening the test version of chrome in the `.cache` directory and logging into an account.