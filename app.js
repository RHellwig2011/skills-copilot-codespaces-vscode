// Every profile is Eric. Drop photos into photos/ named eric1.jpg, eric2.jpg, ...
// A profile whose photo is missing shows its emoji placeholder instead.
const PROFILES = [
  {
    photo: "photos/eric1.jpg", emoji: "🤓", color: "#7b2ff7",
    name: "Eric", age: "26", ageNote: "(old man)",
    job: "📍 Round Valley, NJ",
    bio: "Single. Like, extremely single. I'm always cold, so you'd basically be a full-time space heater.",
    roast: "Has been \"about to get back out there\" since 2019.",
    tags: ["👓 Glasses", "💜 Purple", "🐸 Toads", "🚗 Drives red"],
  },
  {
    photo: "photos/eric2.jpg", emoji: "📸", color: "#e11d48",
    name: "Eric", age: "26",
    job: "📷 Former Walgreens photo department",
    bio: "I've developed a lot of photos. Now I'm ready to develop feelings. Your 4x6 prints are ready for pickup.",
    roast: "Will print your photos in one hour. Will text you back in three to five business weeks.",
    tags: ["🖨️ Glossy or matte?", "🧾 1-hour service"],
  },
  {
    photo: "photos/eric3.jpg", emoji: "🐸", color: "#16a34a",
    name: "Eric", age: "26",
    job: "🐸 Professional toad enjoyer",
    bio: "Looking for someone who loves toads as much as I do. Bonus points if you are, in fact, a toad. I will not kiss you to find out.",
    roast: "Has more photos of toads on his phone than photos of friends. Allegedly.",
    tags: ["🐸 Toads", "🌧️ Wet weather", "🪨 Rocks"],
  },
  {
    photo: "photos/eric4.jpg", emoji: "🌑", color: "#1f2937",
    name: "Eric", age: "26",
    job: "🛋️ Hobby: sitting at home in the dark",
    bio: "Netflix and chill, minus the Netflix, minus the lights. Just two people, sitting. In the dark. Wrapped in a blanket because I'm cold.",
    roast: "Turns the lights off to save energy. And so he can't see his DMs, which are empty.",
    tags: ["🌑 Dark mode IRL", "🧣 Blankets", "🏠 Homebody"],
  },
  {
    photo: "photos/eric5.jpg", emoji: "🏈", color: "#b45309",
    name: "Eric", age: "26",
    job: "👑 Overlord of the freshman football players at Immaculata",
    bio: "They fear me. They respect me. Some of them are 14. My kingdom is vast and smells like a locker room.",
    roast: "Commands an army of 14-year-olds. Still gets nervous ordering at Wawa.",
    tags: ["👑 Overlord", "🏈 Football", "📣 Leadership"],
  },
  {
    photo: "photos/eric6.jpg", emoji: "💊", color: "#0891b2",
    name: "Eric", age: "26",
    job: "🎓 Education & 💊 Pharmaceuticals",
    bio: "I can teach you something AND tell you what not to mix it with. Brains and benefits.",
    roast: "Knows every drug interaction on the planet. Still can't figure out flirting.",
    tags: ["📚 Smart", "💊 Pharma bro (the nice kind)"],
  },
  {
    photo: "photos/eric7.jpg", emoji: "🛡️", color: "#4338ca",
    name: "Eric", age: "26",
    job: "🧬 Scandinavian · Scottish · Dutch",
    bio: "Basically a Viking in a kilt wearing wooden clogs. Built for cold weather, yet somehow always cold.",
    roast: "Descended from Vikings. Needs a hoodie in July.",
    tags: ["🪓 Viking", "🏴 Kilt-adjacent", "👞 Clogs"],
  },
  {
    photo: "photos/eric8.jpg", emoji: "🦇", color: "#6d28d9",
    name: "Eric", age: "26",
    job: "🏫 Del Val High School alum",
    bio: "Hasn't peaked yet. The best is literally still coming. \"Once I was a boy, I know I'm a bat.\" Favorite quote: \"yes.\"",
    roast: "Hasn't peaked yet. Experts say any decade now.",
    tags: ["🦇 Bat", "📈 Pre-peak", "✅ yes"],
  },
];

const ERIC_REPLIES = [
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
  "I'm not saying we're soulmates, but there's literally no one else on this app.",
];

// Shown on the match screen, one per match.
const MATCH_ROASTS = [
  "Wow, an actual woman. Eric's heart rate just hit 70.",
  "Statistically, you're his first match this year. Congrats?",
  "He's already told his mom about you.",
  "Eric would stand up and cheer, but he's sitting in the dark.",
  "This is the most attention he's gotten since the Walgreens photo kiosk broke.",
  "He's putting on a second hoodie for the occasion.",
  "Don't worry, he only practiced his \"hey\" 40 times.",
  "The toads have been informed.",
];

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

  lastMatched = PROFILES[deckIndex];
  deckIndex++;
  setTimeout(() => {
    renderDeck();
    showMatch(dir);
  }, 380);
}

// Auto-match: every swipe is a match, including the left ones.
function showMatch(dir) {
  matches++;
  $("matchCount").textContent = `${matches} match${matches === 1 ? "" : "es"}`;
  const notes = {
    right: "Eric swiped right on you before you even opened the app.",
    super: "A Super Like! Eric is blushing. Or cold. Hard to tell.",
    left: "You swiped left. Eric doesn't believe in that. Matched anyway. 💜",
  };
  $("matchNote").textContent = notes[dir];
  $("matchRoast").textContent = MATCH_ROASTS[(matches - 1) % MATCH_ROASTS.length];
  $("matchText").textContent = `You and Eric (#${deckIndex} of ${PROFILES.length}) liked each other.`;
  paintPhoto($("matchEric"), lastMatched, false);
  $("match").hidden = false;
  confetti();
}

function closeMatch() {
  $("match").hidden = true;
  if (deckIndex >= PROFILES.length) show("done");
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

// Chat
function addMsg(text, who) {
  const m = document.createElement("div");
  m.className = `msg ${who}`;
  m.textContent = text;
  $("messages").appendChild(m);
  $("messages").scrollTop = $("messages").scrollHeight;
  return m;
}

function ericSays() {
  const typing = addMsg("Eric is typing…", "them typing");
  setTimeout(() => {
    typing.remove();
    addMsg(ERIC_REPLIES[replyIndex++ % ERIC_REPLIES.length], "them");
  }, 900 + Math.random() * 900);
}

// With live chat set up (see live-chat.js), messages go to the real Eric and his
// replies show up here. Without it, joke-bot Eric answers instead.
let liveStarted = false;

function startLiveChat() {
  liveStarted = true;
  $("chatStatus").textContent = "The real Eric · replies when his eyes adjust to the light";
  window.liveChat.onMessages((msgs) => {
    $("messages").replaceChildren();
    addMsg("Messages go to the real Eric. He'll reply here, so come back to this site later. Yes, he's actually going to read this.", "them system");
    if (!window.liveChat.name()) addMsg("First things first: what's your name?", "them system");
    msgs.forEach((m) => addMsg(m.text, m.from === "eric" ? "them" : "me"));
  });
  $("msgInput").placeholder = window.liveChat.name() ? "Say something to Eric…" : "Your name";
}

function openChat() {
  $("match").hidden = true;
  paintPhoto($("chatAvatar"), lastMatched, false);
  $("chat").hidden = false;
  if (window.liveChat) {
    if (!liveStarted) startLiveChat();
  } else if (!$("messages").children.length) {
    ericSays();
  }
  $("msgInput").focus();
}

$("composer").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("msgInput").value.trim();
  if (!text) return;
  $("msgInput").value = "";
  if (window.liveChat) {
    try {
      if (!window.liveChat.name()) {
        await window.liveChat.setName(text.slice(0, 40));
        $("msgInput").placeholder = "Say something to Eric…";
        addMsg(`Nice to meet you, ${text.slice(0, 40)}. Now say something to Eric.`, "them system");
      } else {
        await window.liveChat.send(text.slice(0, 1000));
      }
    } catch {
      addMsg("That didn't send. Eric's Wi-Fi is probably also sitting in the dark. Try again.", "them system");
    }
    return;
  }
  addMsg(text, "me");
  ericSays();
});

$("closeChat").addEventListener("click", () => {
  $("chat").hidden = true;
  if (deckIndex >= PROFILES.length) show("done");
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
  card.style.transform = "translateY(-120vh)";
  lastMatched = PROFILES[deckIndex];
  deckIndex++;
  setTimeout(() => { renderDeck(); showMatch("super"); }, 380);
});
$("keepSwiping").addEventListener("click", closeMatch);
$("sendMsg").addEventListener("click", openChat);
$("openChat").addEventListener("click", openChat);
$("restart").addEventListener("click", startSwiping);
