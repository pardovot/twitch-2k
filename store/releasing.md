# Releasing

1. Bump `version` in `extension/manifest.json` and commit.
2. Tag and push: `git tag v1.0.1 && git push origin v1.0.1`.

The Release workflow runs the tests, checks the tag matches the manifest version, and attaches `twitch-2k-v1.0.1.zip` to a GitHub release. If the Chrome Web Store is configured it also uploads the zip and submits it for review.

## Chrome Web Store setup

Do this once, after the first version has been uploaded manually in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).

1. In [Google Cloud Console](https://console.cloud.google.com), create a project, enable **Chrome Web Store API**, create a service account with no roles, and create a JSON key for it.
2. In the Developer Dashboard under **Account**, add the service account's email. Copy your publisher ID from the same page and the extension ID from the item page.
3. In the GitHub repo settings:
   - **Environments:** create `chrome-web-store` and add the secret `CWS_SERVICE_ACCOUNT_KEY` with the JSON key. Add required reviewers here if every store submission should wait for approval.
   - **Variables (repository):** add `CWS_PUBLISHER_ID` and `CWS_EXTENSION_ID`. The publish job is skipped while `CWS_EXTENSION_ID` is unset.

To publish by hand instead: get a token with `gcloud auth print-access-token --impersonate-service-account=<email> --scopes=https://www.googleapis.com/auth/chromewebstore`, then run `node scripts/publish-chrome-web-store.mjs twitch-2k.zip` with `CWS_ACCESS_TOKEN`, `CWS_PUBLISHER_ID` and `CWS_EXTENSION_ID` set.
