# Privacy Policy

The extension does not collect, store, or send any data to its developer. There are no analytics and no remote servers operated by the developer.

## What the extension handles

- **Your Worker URL** is saved in Chrome's local extension storage on your device.
- **Twitch playback token requests.** On twitch.tv, the extension sends the `PlaybackAccessToken` request to the Cloudflare Worker that you deploy and control, instead of directly to Twitch. The request includes the same headers Twitch's own page sends, including your Twitch login token. Your Worker forwards it to Twitch and returns Twitch's response. Nothing else is sent to the Worker.
- **Per-tab status** (whether the last token was unrestricted) is kept in Chrome's session storage and cleared when the tab or browser closes.

## Third parties

Requests go only to Twitch and to your own Cloudflare Worker. The Worker code in this repository does not log or store requests. Cloudflare's own handling of traffic to your Worker is covered by [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/).

## Contact

Open an issue at https://github.com/pardovot/twitch-2k/issues.
