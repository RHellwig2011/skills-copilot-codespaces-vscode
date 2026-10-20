// Real chat backed by Firebase Realtime Database. Women chat from index.html;
// Eric reads and replies from eric.html.
import { firebaseConfig } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_ME") {
  const { initializeApp } = await import(SDK + "firebase-app.js");
  const db = await import(SDK + "firebase-database.js");
  const database = db.getDatabase(initializeApp(firebaseConfig));

  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  // Each visitor gets an unguessable chat id, remembered so she can come back for Eric's replies.
  let chatId = store.get("ericderChatId");
  if (!chatId) {
    chatId = crypto.randomUUID();
    store.set("ericderChatId", chatId);
  }
  const chatRef = db.ref(database, `chats/${chatId}`);

  window.liveChat = {
    name: () => store.get("ericderName"),
    async setName(name) {
      store.set("ericderName", name);
      await db.set(db.child(chatRef, "name"), name);
    },
    async send(text) {
      await db.push(db.child(chatRef, "messages"), { from: "her", text, ts: Date.now() });
      await db.set(db.child(chatRef, "updated"), Date.now());
    },
    onMessages(cb) {
      const q = db.query(db.child(chatRef, "messages"), db.orderByChild("ts"));
      db.onValue(q, (snap) => {
        const msgs = [];
        snap.forEach((m) => { msgs.push(m.val()); });
        cb(msgs);
      });
    },
  };
  window.dispatchEvent(new Event("livechat-ready"));
}
