# Youtube Traveller

Youtube Traveller is an automated tool that can quickly navigate though youtube autoplay suggestions to see where the algorithm takes you.

It works by opening a browser, navigating to the given youtube video, skipping any pre-roll ads, and clicking the hidden autoplay "Play Now" button for as long as you want.

## Quick Start
1. Install Node.js 20
2. Run `npx youtube-traveller -u "<youtube url>"`

## CLI Options
```
Options:
      --help                  Show help                                [boolean]
      --version               Show version number                      [boolean]
  -u, --url                   The YouTube URL to start with  [string] [required]
      --no-csv                Skip csv generation at the end
                                                      [boolean] [default: false]
  -i, --iterations            The maximum number of videos to follow
                                                         [number] [default: 100]
      --output-dir            The location to save results
                                                    [string] [default: "output"]
      --no-screenshots, --ns  Save screenshots of each page
                                                      [boolean] [default: false]
  -r, --save-recording        Save a screenrecording of the browser
                                                      [boolean] [default: false]
      --youtube-api-key       Youtube api key, may also be set in the
                              environment variable YOUTUBE_API_KEY      [string]

```

## Details
This runs in a seperate version of chrome downloaded to the `.cache` directory. It will not interfear with your regular browser or any services you are logged into. It does not run headless, it will open up a window which may take focus away from anything else you care working on. Running headless may be possible in a future version.

To save the video details, save a YouTube API v3 api key to the `YOUTUBE_API_KEY` environemtn variable, or use the `--youtube-api-key` flag.

## Future Enhancements
* Run headless
* Allow login to a youtube account
