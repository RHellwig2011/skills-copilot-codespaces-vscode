# Ericder 🔥🐸

A Tinder-style joke site with exactly one option: Eric. Women get auto-matched on every swipe (yes, even left).

- `index.html`, `style.css`, `app.js` — the whole site, no build step
- `photos/` — drop Eric's photos here (see `photos/README.md`)
- Edit the profiles and Eric's chat replies at the top of `app.js`

## Put it online (GitHub Pages)

Repo **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**. The link shows up there in a minute or two.

## Let Eric message people back (live chat)

Until you do this, the chat is a joke bot. Once it's set up, messages go to the real Eric and he replies from **`/eric.html`** (his inbox, login required). About 5 minutes, free:

1. Go to https://console.firebase.google.com → **Add project** (Analytics off is fine).
2. **Build → Realtime Database → Create database** (any location, start in *locked mode*).
3. **Build → Authentication → Get started → Email/Password → Enable**. Then **Users → Add user** with an email + password for Eric.
4. Copy that user's **User UID** from the Users list.
5. **Realtime Database → Rules**: paste the contents of `database.rules.json`, replace both `PASTE_ERIC_UID` with the UID from step 4, **Publish**.
6. **Project settings (gear) → Your apps → Web (`</>`)** → register an app, then copy the config values into `firebase-config.js` (including `databaseURL` from the Realtime Database page).
7. Commit and push. Eric opens `<your site>/eric.html`, logs in, and sees every woman who messaged him.

Notes: the inbox has no push notifications, so Eric has to check it (the tab title shows the unread count). Women can see Eric's replies by coming back to the site on the same phone/browser.
