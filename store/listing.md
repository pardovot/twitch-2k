# Chrome Web Store listing

## Name

Twitch 2K

## Summary

Unlocks geo-restricted 1440p on Twitch by minting the playback token through your own Cloudflare Worker.

## Description

Twitch only offers 1440p ("2K") streams in some countries. Twitch 2K unlocks them everywhere else.

Twitch picks your maximum quality from the location of the request that fetches the stream's playback token. This extension sends only that one small request through a free Cloudflare Worker that you deploy yourself in a supported region. The video still streams directly from Twitch at full speed.

Features:
• Unlocks 1440p on streams that broadcast it
• Only the token request is rerouted, video never leaves Twitch's network
• Falls back to normal 1080p if your Worker is unreachable
• Toolbar icon shows whether the unlock worked in each tab
• Self-hosted: your Twitch login only goes to Twitch and your own Worker

Setup takes about two minutes: deploy the Worker with one click, paste its URL into the extension, and press Test. Instructions: https://github.com/pardovot/twitch-2k

Not affiliated with Twitch. Changing the region Twitch sees may violate Twitch's Terms of Service.

## Screenshots

Upload in order from [screenshots/](screenshots/), all 1280x800.

## Category

Entertainment

## Single purpose

Lets Twitch viewers in regions without 1440p access watch 1440p streams by routing the playback token request through the user's own Cloudflare Worker.

## Permission justifications

- **storage:** Saves the user's Worker URL and the per-tab unlock status shown in the popup.
- **Content scripts on https://www.twitch.tv/\*:** Intercepts the PlaybackAccessToken request on Twitch pages and sends it to the user's Worker. No other requests are modified.

## Remote code

No. The extension runs only the code in its package. It fetches data (a Twitch token) from the user's Worker, not code.

## Data usage

- Handles **authentication information**: the Twitch login token in the intercepted request is forwarded to the user's own Worker and on to Twitch, the same as Twitch's own page would send it.
- Data is not sold, not used for anything unrelated to the single purpose, and not used for creditworthiness or lending.

Privacy policy URL: https://github.com/pardovot/twitch-2k/blob/master/PRIVACY.md

## Reviewer notes

The extension needs a Cloudflare Worker URL to unlock 1440p. Reviewers can deploy their own in about two minutes on a free Cloudflare account:

1. Open https://deploy.workers.cloudflare.com/?url=https://github.com/pardovot/twitch-2k/tree/master/worker or run `npx wrangler deploy` in the `worker` folder of the repository.
2. Click the extension icon, paste the Worker URL, click Save, then Test.
3. Log in to Twitch and open a channel that streams in 1440p. The quality menu offers 1440p and the toolbar icon shows a green check.

Without a Worker URL the extension leaves Twitch unchanged and the toolbar icon shows gray dots. Note that 1440p is only restricted in some countries, so in the US or most of the EU Twitch offers it without the extension.
