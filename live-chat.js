// Real chat backed by Firebase. Women sign in with Google to message Erik and see
// his replies from any device; Erik reads and replies from erik.html.
import { firebaseConfig } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_ME") {
  const { initializeApp } = await import(SDK + "firebase-app.js");
  const authMod = await import(SDK + "firebase-auth.js");
  const db = await import(SDK + "firebase-database.js");
  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const database = db.getDatabase(app);

  // Each woman's chat lives under her Google account's uid.
  const chatRef = () => db.ref(database, `chats/${auth.currentUser.uid}`);

  window.liveChat = {
    user: () => auth.currentUser,
    onUser: (cb) => authMod.onAuthStateChanged(auth, cb),
    async signIn() {
      const provider = new authMod.GoogleAuthProvider();
      try {
        await authMod.signInWithPopup(auth, provider);
      } catch (e) {
        if (e.code === "auth/popup-blocked") await authMod.signInWithRedirect(auth, provider);
        else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") throw e;
      }
    },
    signOut: () => authMod.signOut(auth),
    async send(text) {
      const u = auth.currentUser;
      await db.set(db.child(chatRef(), "name"), (u.displayName || "Mystery woman").slice(0, 40));
      await db.push(db.child(chatRef(), "messages"), { from: "her", text, ts: Date.now() });
      await db.set(db.child(chatRef(), "updated"), Date.now());
    },
    // Returns an unsubscribe function.
    onMessages(cb) {
      const q = db.query(db.child(chatRef(), "messages"), db.orderByChild("ts"));
      return db.onValue(q, (snap) => {
        const msgs = [];
        snap.forEach((m) => { msgs.push(m.val()); });
        cb(msgs);
      });
    },
  };
  window.dispatchEvent(new Event("livechat-ready"));
}
