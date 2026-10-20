// The Erik quiz and the date planner. Loaded after app.js and uses its helpers
// ($, confetti, openChat, addBonusMatch).

const QUIZ = [
  { q: "What's Erik's favorite color?", a: ["Walgreens red", "Purple", "Toad green", "Beige"], right: 1,
    yes: "Purple. Royalty. Like the overlord he is.", no: "It's purple. He'd be hurt, but he's used to it." },
  { q: "What makes Erik sniffle?", a: ["Pollen", "Rom-coms", "Low humidity", "Your rejection"], right: 2,
    yes: "Low humidity. Bring a humidifier on the first date.", no: "Low humidity. Rejection doesn't make him sniffle anymore. He's numb to it." },
  { q: "Erik's favorite animal?", a: ["Toad", "Golden retriever", "Dragon", "Bat"], right: 0,
    yes: "Toads. Obviously. Have you seen the photos?", no: "Toads. He is also a bat, but that's a separate issue." },
  { q: "Erik's favorite quote?", a: ["\"Fus Ro Dah\"", "\"Carpe diem\"", "\"Arrow to the knee\"", "\"yes\""], right: 3,
    yes: "yes.", no: "It's \"yes\". Profound, really." },
  { q: "Where is Erik an overlord?", a: ["The Walgreens photo lab", "Immaculata freshman football", "Skyrim", "His own apartment, in the dark"], right: 1,
    yes: "The freshmen fear him. As they should.", no: "Immaculata freshman football. Show some respect." },
  { q: "Erik's favorite food spot?", a: ["Wawa", "Olive Garden", "He's open to suggestions", "The Walgreens snack aisle"], right: 2,
    yes: "Open to suggestions. Just like with women.", no: "He's open to suggestions. About food. And women. Some call it desperate." },
  { q: "Erik's favorite hobby?", a: ["Partying", "Toad photography", "Lockpicking", "Sitting at home in the dark"], right: 3,
    yes: "In the dark. He was a party animal in college, though. Was.", no: "Sitting at home in the dark. The partying ended with college." },
];

const QUIZ_RESULTS = [
  [7, "Certified Erik Expert. You know him better than he knows himself."],
  [5, "Basically his girlfriend already. He doesn't know that yet."],
  [3, "You know Erik about as well as Erik knows women."],
  [0, "Did you even look at the profiles? Don't worry, Erik is used to being ignored."],
];

// Scoring at least this many earns a bonus match.
const QUIZ_BONUS_AT = 5;

let quizIndex = 0, quizScore = 0;

function openQuiz() {
  quizIndex = 0;
  quizScore = 0;
  $("quizRetake").hidden = true;
  $("quiz").hidden = false;
  showQuestion();
}

function showQuestion() {
  const item = QUIZ[quizIndex];
  $("quizProgress").textContent = `Question ${quizIndex + 1} of ${QUIZ.length}`;
  $("quizQ").textContent = item.q;
  $("quizFeedback").textContent = "";
  $("quizNext").hidden = true;
  const opts = $("quizOpts");
  opts.replaceChildren();
  item.a.forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "btn quiz-opt";
    b.textContent = text;
    b.addEventListener("click", () => answer(i));
    opts.append(b);
  });
}

function answer(i) {
  const item = QUIZ[quizIndex];
  const correct = i === item.right;
  if (correct) quizScore++;
  sfx.play(correct ? "right" : "wrong");
  [...$("quizOpts").children].forEach((b, j) => {
    b.disabled = true;
    if (j === item.right) b.classList.add("right");
    else if (j === i) b.classList.add("wrong");
  });
  $("quizFeedback").textContent = (correct ? "✅ " : "❌ ") + (correct ? item.yes : item.no);
  $("quizNext").textContent = quizIndex === QUIZ.length - 1 ? "See results" : "Next";
  $("quizNext").hidden = false;
}

function nextQuestion() {
  quizIndex++;
  if (quizIndex < QUIZ.length) return showQuestion();
  const verdict = QUIZ_RESULTS.find(([min]) => quizScore >= min)[1];
  $("quizProgress").textContent = "Results";
  $("quizQ").textContent = `You got ${quizScore} of ${QUIZ.length}.`;
  $("quizFeedback").textContent = verdict + (quizScore >= QUIZ_BONUS_AT ? " 💘 Bonus match unlocked!" : "");
  $("quizOpts").replaceChildren();
  $("quizNext").textContent = "Back to swiping";
  $("quizRetake").hidden = false;
  if (quizScore >= QUIZ_BONUS_AT) {
    addBonusMatch();
    sfx.play("match");
    confetti();
  }
}

$("quizNext").addEventListener("click", () => {
  if (quizIndex >= QUIZ.length) $("quiz").hidden = true;
  else nextQuestion();
});
$("quizClose").addEventListener("click", () => { $("quiz").hidden = true; });
$("quizRetake").addEventListener("click", openQuiz);
$("quizBtn").addEventListener("click", openQuiz);
$("doneQuiz").addEventListener("click", openQuiz);

// Date planner: three picks, each roasted, then a summary to send to Erik.
const DATE_STEPS = [
  { q: "Where are you going?", opts: [
    ["🌑 His place, lights off", "A candle-free, light-free evening. He'll describe the furniture to you."],
    ["🐸 Toad hunting at night", "Bring a flashlight. Erik will bring his good toad hand."],
    ["🚗 A drive in the red car", "Heat on full blast, windows up. The humidifier is plugged into the cigarette lighter."],
    ["📸 The Walgreens photo kiosk", "He still knows the kiosk password. Romantic."],
  ] },
  { q: "What are you eating?", opts: [
    ["🍕 You pick", "Erik is open to suggestions. Extremely open. Pick anything."],
    ["🥪 Wawa", "A classic. He gets nervous ordering, so you order for him."],
    ["🍝 Olive Garden", "Unlimited breadsticks. Limited conversation."],
    ["🥣 Whatever's in his fridge", "Bold. It's mostly freshman football snacks."],
  ] },
  { q: "And after dinner?", opts: [
    ["⚔️ Skyrim marathon", "He'll let you be the Dragonborn. He'll watch. In the dark."],
    ["🏈 Watch him coach freshmen", "Witness the overlord in his natural habitat."],
    ["💧 Humidifier shopping", "The most intimate thing you can do with Erik."],
    ["🛋️ Sit quietly", "His favorite. You'll know it's going well if he says \"yes\"."],
  ] },
];

let datePicks = [];

function openDate() {
  datePicks = [];
  $("date").hidden = false;
  showDateStep();
}

function showDateStep() {
  const body = $("dateBody");
  body.replaceChildren();
  const step = DATE_STEPS[datePicks.length];
  if (!step) return showDatePlan();
  const progress = document.createElement("p");
  progress.className = "panel-sub";
  progress.textContent = `Step ${datePicks.length + 1} of ${DATE_STEPS.length}`;
  const q = document.createElement("h3");
  q.className = "quiz-q";
  q.textContent = step.q;
  const opts = document.createElement("div");
  opts.className = "quiz-opts";
  step.opts.forEach((opt) => {
    const b = document.createElement("button");
    b.className = "btn quiz-opt";
    b.textContent = opt[0];
    b.addEventListener("click", () => {
      sfx.play("pop");
      datePicks.push(opt);
      showDateStep();
    });
    opts.append(b);
  });
  body.append(progress, q, opts);
}

function showDatePlan() {
  const body = $("dateBody");
  const title = document.createElement("h3");
  title.className = "quiz-q";
  title.textContent = "Your date with Erik";
  const list = document.createElement("ol");
  list.className = "date-plan";
  for (const [pick, roast] of datePicks) {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = pick;
    li.append(b, document.createElement("br"), roast);
    list.append(li);
  }
  const verdict = document.createElement("p");
  verdict.className = "quiz-feedback";
  verdict.textContent = "Erik's response: \"yes\". Chance of a second date: 100% (he has no other options).";
  const send = document.createElement("button");
  send.className = "btn primary";
  send.textContent = "Send Erik the plan";
  send.addEventListener("click", () => {
    $("date").hidden = true;
    openChat();
    $("msgInput").value = "Date idea: " + datePicks.map(([pick]) => pick).join(", then ");
  });
  const again = document.createElement("button");
  again.className = "btn ghost";
  again.textContent = "Plan another date";
  again.addEventListener("click", openDate);
  body.append(title, list, verdict, send, again);
  sfx.play("match");
}

$("dateClose").addEventListener("click", () => { $("date").hidden = true; });
$("dateBtn").addEventListener("click", openDate);
$("doneDate").addEventListener("click", openDate);
