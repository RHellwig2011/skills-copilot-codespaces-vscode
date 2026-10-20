# Erikder 🔥🐸

A Tinder-style joke site with exactly one option: Erik. Women get auto-matched on every right swipe; "nope" just shows the next Erik.

- `index.html`, `style.css`, `app.js` — the whole site, no build step
- `photos/` — drop Erik's photos here (see `photos/README.md`)
- Edit the profiles and Erik's chat replies at the top of `app.js`

## Put it online (GitHub Pages)

Repo **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**. The link shows up there in a minute or two.

## Let Erik message people back (live chat)

Until you do this, the chat is a joke bot. Once it's set up, women **sign in with Google** to message Erik and can come back on any device to see his replies. Erik reads and replies from **`/erik.html`** (also Google sign-in). About 5 minutes, free:

1. Go to https://console.firebase.google.com → **Add project** (Analytics off is fine).
2. **Build → Realtime Database → Create database** (any location, start in *locked mode*).
3. **Build → Authentication → Get started → Sign-in method → Google → Enable → Save**.
4. **Authentication → Settings → Authorized domains → Add domain**: `ericder.vercel.app` (and any other domain the site runs on).
5. **Project settings (gear) → Your apps → Web (`</>`)** → register an app, then copy the config values into `firebase-config.js` (including `databaseURL` from the Realtime Database page). Deploy.
6. Erik opens `<your site>/erik.html` and signs in with his Google account. It will say the account isn't Erik's and show a **UID** — copy it.
7. **Realtime Database → Rules**: paste the contents of `database.rules.json`, replace every `PASTE_ERIK_UID` with that UID, **Publish**. Erik refreshes `/erik.html` and sees his inbox.

Notes: the inbox has no push notifications, so Erik has to check it (the tab title shows the unread count).
