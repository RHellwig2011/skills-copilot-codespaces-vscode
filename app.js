// Every profile is Erik. Drop photos into photos/ named eric1.jpg, eric2.jpg, ...
// A profile whose photo is missing shows its emoji placeholder instead.
// photo-base.js can point PHOTO_BASE somewhere else (the deployed site loads photos from GitHub).
const PHOTO_BASE = window.PHOTO_BASE || "photos/";
const PROFILES = [
  {
    photo: PHOTO_BASE + "eric1.jpg", emoji: "🤓", color: "#7b2ff7",
    name: "Erik", age: "26", ageNote: "(old man)",
    job: "📍 Round Valley, NJ",
    bio: "Single. Like, extremely single. I'm always cold, and low humidity makes me sniffle, so you'd basically be a full-time space heater and humidifier.",
    roast: "Has been \"about to get back out there\" since 2019.",
    tags: ["👓 Glasses", "👱 Golden blonde", "💜 Purple", "🐸 Toads", "🚗 Drives red", "🤧 Humidity-sensitive"],
  },
  {
    photo: PHOTO_BASE + "eric2.jpg", emoji: "📸", color: "#e11d48",
    name: "Erik", age: "26",
    job: "📷 Former Walgreens photo department",
    bio: "I've developed a lot of photos. Now I'm ready to develop feelings. Your 4x6 prints are ready for pickup.",
    roast: "Will print your photos in one hour. Will text you back in three to five business weeks.",
    tags: ["🖨️ Glossy or matte?", "🧾 1-hour service"],
  },
  {
    photo: PHOTO_BASE + "eric3.jpg", emoji: "🐸", color: "#16a34a",
    name: "Erik", age: "26",
    job: "🐸 Professional toad enjoyer",
    bio: "Looking for someone who loves toads as much as I do. Bonus points if you are, in fact, a toad. I will not kiss you to find out.",
    roast: "Has more photos of toads on his phone than photos of friends. Allegedly.",
    tags: ["🐸 Toads", "🌧️ Wet weather", "🪨 Rocks"],
  },
  {
    photo: PHOTO_BASE + "eric4.jpg", pos: "center top", emoji: "🌑", color: "#1f2937",
    name: "Erik", age: "26",
    job: "🛋️ Hobby: sitting at home in the dark",
    bio: "Was a total party animal in college. Now the party is just me, sitting at home in the dark. Netflix and chill, minus the Netflix, minus the lights. Wrapped in a blanket because I'm cold.",
    roast: "Turns the lights off to save energy. And so he can't see his DMs, which are empty.",
    tags: ["🎉 Ex-party animal", "🌑 Dark mode IRL", "🧣 Blankets", "🏠 Homebody"],
  },
  {
    photo: PHOTO_BASE + "eric5.jpg", emoji: "🏈", color: "#b45309",
    name: "Erik", age: "26",
    job: "👑 Overlord of the freshman football players at Immaculata",
    bio: "They fear me. They respect me. Some of them are 14. My kingdom is vast and smells like a locker room.",
    roast: "Commands an army of 14-year-olds. Still gets nervous ordering at Wawa.",
    tags: ["👑 Overlord", "🏈 Football", "📣 Leadership"],
  },
  {
    photo: PHOTO_BASE + "eric6.jpg", emoji: "💊", color: "#0891b2",
    name: "Erik", age: "26",
    job: "🎓 Education & 💊 Pharmaceuticals",
    bio: "I can teach you something AND tell you what not to mix it with. Brains and benefits. Favorite food spot? Open to suggestions. Same goes for women. Some call it desperate. I call it flexible.",
    roast: "Knows every drug interaction on the planet. Still can't figure out flirting.",
    tags: ["📚 Smart", "💊 Pharma bro (the nice kind)", "🍽️ Open to suggestions"],
  },
  {
    photo: PHOTO_BASE + "eric7.jpg", emoji: "🛡️", color: "#4338ca",
    name: "Erik", age: "26",
    job: "🧬 Scandinavian · Scottish · Dutch",
    bio: "Basically a Viking in a kilt wearing wooden clogs. Rocks the golden blonde hair of his ancestors, who used it to terrify villages. Built for cold weather, yet somehow always cold.",
    roast: "Descended from Vikings. Needs a hoodie in July.",
    tags: ["👱 Golden blonde", "🪓 Viking", "🏴 Kilt-adjacent", "👞 Clogs"],
  },
  {
    photo: PHOTO_BASE + "eric8.jpg", emoji: "🦇", color: "#6d28d9",
    name: "Erik", age: "26",
    job: "🏫 Del Val High School alum",
    bio: "Hasn't peaked yet. The best is literally still coming. \"Once I was a boy, I know I'm a bat.\" Favorite quote: \"yes.\"",
    roast: "Hasn't peaked yet. Experts say any decade now.",
    tags: ["🦇 Bat", "📈 Pre-peak", "✅ yes"],
  },
];

const ERIK_REPLIES = [
  "yes",
  "Hey there 😎 Are you a toad? Because you make my heart hop.",
  "Do you have a blanket? Because I'm cold. Also, hi.",
  "Are you a Walgreens photo order? Because I've been waiting for you for 1 hour.",
  "yes",
  "Is it hot in here or is it just you? (It's not hot in here. I'm freezing.)",
  "I'd turn the lights on for you. Maybe. Let's start with a lamp.",
  "You must be purple, because you're my favorite color.",
  "yes",
  "Want to go for a ride in the red car? I'll crank the heat.",
  "Where do you want to eat? I'm open to suggestions. I'm open to pretty much anything, honestly.",
  "Sorry, sniffling. The humidity is like 30% in here.",
  "I'm not saying we're soulmates, but there's literally no one else on this app.",
];

// Shown on the match screen, one per match.
const MATCH_ROASTS = [
  "Wow, an actual woman. Erik's heart rate just hit 70.",
  "Statistically, you're his first match this year. Congrats?",
  "He's already told his mom about you.",
  "Erik would stand up and cheer, but he's sitting in the dark.",
  "This is the most attention he's gotten since the Walgreens photo kiosk broke.",
  "He's putting on a second hoodie for the occasion.",
  "Don't worry, he only practiced his \"hey\" 40 times.",
  "The toads have been informed.",
];

// Erik's socials unlock as you message him.
const INSTA = { at: 3, handle: "@toast_livingston", url: "https://www.instagram.com/toast_livingston" };
const SNAP = { at: 200, handle: "eriklivingston7", url: "https://www.snapchat.com/add/eriklivingston7" };

// The lockpicking mini-game blocks the deck after this many cards.
const LOCK_AT = 4;

const $ = (id) => document.getElementById(id);
let deckIndex = 0;
let matches = 0;
let replyIndex = 0;
let lastMatched = PROFILES[0];

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
}

// Sets an element's background to the profile photo, or falls back to the emoji.
function paintPhoto(el, p, big) {
  el.style.backgroundColor = p.color;
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `url("${p.photo}")`;
    if (p.pos) el.style.backgroundPosition = p.pos;
    el.textContent = "";
  };
  img.onerror = () => {
    el.innerHTML = big ? `${p.emoji}<small>photo coming soon</small>` : p.emoji;
  };
  img.src = p.photo;
}

function buildCard(p) {
  const card = document.createElement("div");
  card.className = "card";
  const photo = document.createElement("div");
  photo.className = "photo placeholder";
  paintPhoto(photo, p, true);
  card.appendChild(photo);
  card.insertAdjacentHTML("beforeend", `
    <div class="stamp like">LIKE</div>
    <div class="stamp nope">NOPE</div>
    <div class="info">
      <h3>${p.name} <span>${p.age}${p.ageNote ? " " + p.ageNote : ""}</span></h3>
      <p class="job">${p.job}</p>
      <p class="bio">${p.bio}</p>
      <p class="roast">🙃 Real talk: ${p.roast}</p>
      <div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
    </div>`);
  return card;
}

function renderDeck() {
  const deck = $("deck");
  deck.innerHTML = "";
  // Render the next two cards so there's always one peeking underneath.
  PROFILES.slice(deckIndex, deckIndex + 2).reverse().forEach((p) => deck.appendChild(buildCard(p)));
  const top = deck.lastElementChild;
  if (top) enableDrag(top);
}

function enableDrag(card) {
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
  const like = card.querySelector(".stamp.like");
  const nope = card.querySelector(".stamp.nope");

  card.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    card.classList.remove("snap");
    card.setPointerCapture(e.pointerId);
  });
  card.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - startX; dy = e.clientY - startY;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 15}deg)`;
    like.style.opacity = Math.max(0, dx / 100);
    nope.style.opacity = Math.max(0, -dx / 100);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(dx) > 100) {
      swipe(dx > 0 ? "right" : "left");
    } else {
      card.classList.add("snap");
      card.style.transform = "";
      like.style.opacity = nope.style.opacity = 0;
    }
    dx = dy = 0;
  };
  card.addEventListener("pointerup", end);
  card.addEventListener("pointercancel", end);
}

function swipe(dir) {
  const card = $("deck").lastElementChild;
  if (!card || card.classList.contains("leaving")) return;
  const x = dir === "left" ? -1 : 1;
  card.classList.add("leaving");
  card.style.transform = `translate(${x * window.innerWidth}px, -60px) rotate(${x * 30}deg)`;
  card.querySelector(dir === "left" ? ".stamp.nope" : ".stamp.like").style.opacity = 1;
  sfx.play("whoosh");

  lastMatched = PROFILES[deckIndex];
  deckIndex++;
  setTimeout(() => {
    renderDeck();
    if (dir === "right") showMatch(dir);
    else afterCard();
  }, 380);
}

// Every like (or super like) is a match. Nope just moves on.
function updateMatchCount() {
  $("matchCount").textContent = `💘 ${matches}`;
  $("matchCount").title = `${matches} match${matches === 1 ? "" : "es"}`;
}

// The quiz hands out a match without a swipe.
function addBonusMatch() {
  matches++;
  updateMatchCount();
}

function showMatch(dir) {
  matches++;
  updateMatchCount();
  sfx.play("match");
  const notes = {
    right: "Erik swiped right on you before you even opened the app.",
    super: "FUS RO DAH! You shouted Erik clean off the screen and straight into your matches.",
  };
  $("matchNote").textContent = notes[dir];
  $("matchRoast").textContent = MATCH_ROASTS[(matches - 1) % MATCH_ROASTS.length];
  $("matchText").textContent = `You and Erik (#${deckIndex} of ${PROFILES.length}) liked each other.`;
  paintPhoto($("matchErik"), lastMatched, false);
  $("match").hidden = false;
  // Compatibility always lands somewhere absurdly high.
  const compat = [100, 99.8, 101, 112, 100, 147, 99.9, 1000][(matches - 1) % 8];
  $("compatFill").style.width = "0";
  $("compatNum").textContent = "…";
  setTimeout(() => {
    $("compatFill").style.width = Math.min(compat, 100) + "%";
    $("compatNum").textContent = compat + "%";
  }, 300);
  confetti();
}

function closeMatch() {
  $("match").hidden = true;
  afterCard();
}

// Runs once a card is dealt with: the lock blocks the deck once, partway through.
let lockDone = false;
function afterCard() {
  if (deckIndex >= PROFILES.length) show("done");
  else if (deckIndex === LOCK_AT && !lockDone) openLock();
}

// Skyrim-style lockpicking. Turning the lock rotates it further the closer the
// pick is to the sweet spot; too far off and the pick snaps.
let sweetSpot = 0, lockpicks = 5;
function openLock() {
  sweetSpot = 15 + Math.random() * 150;
  $("lpStatus").textContent = "";
  $("lpPicks").textContent = `Lockpicks: ${lockpicks}`;
  $("lpAngle").value = 90;
  aimPick();
  $("lockpick").hidden = false;
}

function aimPick() {
  const a = -Number($("lpAngle").value);
  $("lpPick").style.setProperty("--a", a + "deg");
  $("lpPick").style.transform = `rotate(${a}deg)`;
}

function turnLock() {
  const off = Math.abs(Number($("lpAngle").value) - sweetSpot);
  const cyl = $("lpCylinder");
  if (off <= 10) {
    cyl.style.transform = "rotate(90deg)";
    $("lpStatus").textContent = "🔓 Unlocked! Erik's heart is open. Lockpicking skill increased.";
    lockDone = true;
    sfx.play("unlock");
    setTimeout(() => {
      $("lockpick").hidden = true;
      cyl.style.transform = "";
    }, 1400);
    return;
  }
  // Partial turn as a hint, then spring back.
  cyl.style.transform = `rotate(${Math.max(0, 80 - off * 1.6)}deg)`;
  setTimeout(() => { cyl.style.transform = ""; }, 400);
  if (off > 35) {
    sfx.play("snap");
    lockpicks--;
    const pick = $("lpPick");
    pick.classList.add("broken");
    setTimeout(() => { pick.classList.remove("broken"); aimPick(); }, 450);
    if (lockpicks <= 0) {
      lockpicks = 5;
      $("lpStatus").textContent = "Out of lockpicks. Erik used to sell them at Walgreens. Here's 5 more.";
    } else {
      $("lpStatus").textContent = ["*snap* Your lockpick broke.", "*snap* Erik's heart remains locked.", "*snap* Have you tried being a Khajiit?"][lockpicks % 3];
    }
  } else {
    sfx.play("turn");
    $("lpStatus").textContent = off > 20 ? "The lock budges a little…" : "So close. The lock almost turns.";
  }
  $("lpPicks").textContent = `Lockpicks: ${lockpicks}`;
}

function confetti() {
  const bits = ["💜", "🐸", "👓", "❤️", "🔥", "🦇"];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.textContent = bits[i % bits.length];
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDuration = 2 + Math.random() * 2 + "s";
    c.style.animationDelay = Math.random() * 0.6 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5000);
  }
}

// Messages she's sent, which unlock Erik's socials.
function sentCount() {
  try { return Number(localStorage.getItem("erikderSent")) || 0; } catch { return 0; }
}
function setSentCount(n) {
  const before = sentLocal;
  sentLocal = n;
  try { localStorage.setItem("erikderSent", n); } catch {}
  renderUnlocks();
  for (const s of [INSTA, SNAP]) {
    if (before < s.at && n >= s.at) {
      sfx.play("unlock");
      addMsg(s === INSTA
        ? `🎉 3 messages! You unlocked Erik's Instagram: ${s.handle}`
        : `👻 200 messages. Erik is now legally required to give you his Snap: ${s.handle}`, "them system");
    }
  }
}
let sentLocal = sentCount();

function renderUnlocks() {
  for (const [id, s, icon, name] of [["instaUnlock", INSTA, "📸", "Instagram"], ["snapUnlock", SNAP, "👻", "Snapchat"]]) {
    const el = $(id);
    el.replaceChildren();
    if (sentLocal >= s.at) {
      el.append(`${icon} ${name}: `);
      const a = document.createElement("a");
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = s.handle;
      el.append(a);
    } else {
      const left = s.at - sentLocal;
      el.append(`${icon} ${name} unlocks in ${left} message${left === 1 ? "" : "s"}`);
      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("div");
      fill.style.width = (sentLocal / s.at) * 100 + "%";
      bar.append(fill);
      el.append(bar);
    }
  }
}

// Chat
function addMsg(text, who) {
  const m = document.createElement("div");
  m.className = `msg ${who}`;
  m.textContent = text;
  $("messages").appendChild(m);
  $("messages").scrollTop = $("messages").scrollHeight;
  return m;
}

function erikSays() {
  const typing = addMsg("Erik is typing…", "them typing");
  setTimeout(() => {
    typing.remove();
    sfx.play("pop");
    addMsg(ERIK_REPLIES[replyIndex++ % ERIK_REPLIES.length], "them");
  }, 900 + Math.random() * 900);
}

// With live chat set up (see live-chat.js), women sign in with Google, messages go
// to the real Erik, and his replies show up here. Without it, joke-bot Erik answers.
let stopMessages = null;

function showLiveChat(user) {
  if (stopMessages) { stopMessages(); stopMessages = null; }
  $("messages").replaceChildren();
  $("composer").hidden = !user;
  $("signin").hidden = !!user;
  $("chatStatus").textContent = "The real Erik · replies when his eyes adjust to the light";
  if (!user) {
    addMsg("Sign in with Google to message the real Erik. You can come back anytime, on any device, to see his replies.", "them system");
    return;
  }
  stopMessages = window.liveChat.onMessages((msgs) => {
    $("messages").replaceChildren();
    addMsg(`Signed in as ${user.displayName || user.email}. Messages go to the real Erik. Yes, he's actually going to read this.`, "them system");
    msgs.forEach((m) => addMsg(m.text, m.from === "erik" ? "them" : "me"));
    const hers = msgs.filter((m) => m.from === "her").length;
    if (hers !== sentLocal) setSentCount(hers);
  });
}

let liveStarted = false;
function openChat() {
  $("match").hidden = true;
  paintPhoto($("chatAvatar"), lastMatched, false);
  $("chat").hidden = false;
  renderUnlocks();
  if (window.liveChat) {
    if (!liveStarted) {
      liveStarted = true;
      window.liveChat.onUser(showLiveChat);
    }
  } else if (!$("messages").children.length) {
    erikSays();
  }
  if (!$("composer").hidden) $("msgInput").focus();
}

$("googleBtn").addEventListener("click", async () => {
  try {
    await window.liveChat.signIn();
  } catch {
    addMsg("Google sign-in didn't work. Try again?", "them system");
  }
});

$("composer").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("msgInput").value.trim();
  if (!text) return;
  $("msgInput").value = "";
  if (window.liveChat) {
    try {
      await window.liveChat.send(text.slice(0, 1000));
    } catch {
      addMsg("That didn't send. Erik's Wi-Fi is probably also sitting in the dark. Try again.", "them system");
    }
    return;
  }
  addMsg(text, "me");
  setSentCount(sentLocal + 1);
  erikSays();
});

$("closeChat").addEventListener("click", () => {
  $("chat").hidden = true;
  if ($("app").classList.contains("active") || deckIndex >= PROFILES.length) afterCard();
});

// Wiring
function startSwiping() {
  deckIndex = 0;
  renderDeck();
  show("app");
}

document.querySelectorAll("[data-gender]").forEach((b) =>
  b.addEventListener("click", () => (b.dataset.gender === "woman" ? startSwiping() : show("nope")))
);
$("lied").addEventListener("click", startSwiping);
$("backToStart").addEventListener("click", () => show("splash"));
$("btnLike").addEventListener("click", () => swipe("right"));
$("btnNope").addEventListener("click", () => swipe("left"));
$("btnSuper").addEventListener("click", () => {
  const card = $("deck").lastElementChild;
  if (!card || card.classList.contains("leaving")) return;
  card.classList.add("leaving");
  card.style.transform = "translateY(-120vh) rotate(-25deg) scale(.6)";
  $("shout").hidden = false;
  sfx.play("shout");
  setTimeout(() => { $("shout").hidden = true; }, 900);
  lastMatched = PROFILES[deckIndex];
  deckIndex++;
  setTimeout(() => { renderDeck(); showMatch("super"); }, 380);
});
$("keepSwiping").addEventListener("click", closeMatch);
$("sendMsg").addEventListener("click", openChat);
$("openChat").addEventListener("click", openChat);
$("myMsgs").addEventListener("click", openChat);
$("restart").addEventListener("click", startSwiping);
$("lpAngle").addEventListener("input", aimPick);
$("lpTurn").addEventListener("click", turnLock);

function showSoundState() {
  $("soundBtn").textContent = sfx.on ? "🔊" : "🔇";
  $("soundBtn").setAttribute("aria-label", sfx.on ? "Sound on" : "Sound off");
}
$("soundBtn").addEventListener("click", () => {
  sfx.toggle();
  showSoundState();
  sfx.play("pop");
});
showSoundState();
