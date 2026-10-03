# Twitch 2K

Chrome extension that unlocks 1440p ("2K") Twitch streams in countries where Twitch restricts them.

## How it works

Twitch decides your maximum quality when it issues the playback token (`PlaybackAccessToken` GQL request), based on the IP that asks for it. The token is signed, so it cannot be edited. Once issued, the playlist and video segments load from any country.

The extension sends only that one token request through a small Cloudflare Worker that you deploy yourself, pinned to Frankfurt. Video still streams directly from Twitch at full speed. If the Worker fails, the request falls back to Twitch directly, so the worst case is the usual 1080p.

The Worker is self-hosted because the token request carries your Twitch login. It only forwards `PlaybackAccessToken` operations, and browsers can only call it from twitch.tv and the extension.

## Setup

### 1. Deploy the Worker

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/pardovot/twitch-2k/tree/master/worker)

Or with Wrangler:

```sh
cd worker
npx wrangler login
npx wrangler deploy
```

Copy the URL it prints, e.g. `https://twitch-2k-token.<you>.workers.dev`. The free Workers plan is plenty, the extension makes one request per stream you open.

### 2. Install the extension

1. Download the latest `twitch-2k-v*.zip` from [Releases](https://github.com/pardovot/twitch-2k/releases) and unzip it.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.

### 3. Connect them

Click the extension icon, paste your Worker URL, then click **Save** and **Test**. Reload any open Twitch tabs.

## Status

The toolbar icon shows what happened to the last token request in each tab. Hover it for a summary or open the popup for details.

| Corner | Meaning |
| --- | --- |
| None | No stream loaded in this tab yet. |
| Green check | Token issued without restrictions. 1440p shows up on streams that broadcast it. |
| Amber `!` | Log in to Twitch, or the Worker's region is restricted too. In that case change `placement.region` in `worker/wrangler.jsonc` and redeploy. |
| Red `x` | The Worker failed and the stream fell back to 1080p. The popup shows the error. |
| Gray dots | No Worker URL saved yet. |

## Development

```sh
npm test
```

Tests use Node's built-in test runner (Node 22+) and need no dependencies.

`npm run package` zips the committed `extension` folder into `twitch-2k.zip`. Pushing a `v*` tag builds a GitHub release and can submit to the Chrome Web Store, see [store/releasing.md](store/releasing.md). Listing text and reviewer notes are in [store/listing.md](store/listing.md).

## Privacy

The extension collects nothing. Your Twitch login token only goes to Twitch and your own Worker. See [PRIVACY.md](PRIVACY.md).

## Disclaimer

Changing the region Twitch sees may violate Twitch's Terms of Service. Use at your own risk. This project is not affiliated with Twitch.
