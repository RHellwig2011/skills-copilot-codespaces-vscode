# Project "HearthOS" — A Self-Hosted, AI-Native Home Hub

> Goal: a Home Assistant-style hub that runs on a Raspberry Pi 5, owns its own
> AI brain **entirely on the LAN** (no cloud round-trips, ever), auto-discovers
> devices (TVs, UniFi cameras, Echos, ESPHome, Matter, Zigbee…), and treats
> voice as a first-class input on whatever microphone is closest — the TV
> remote, a Pi satellite, or a phone PWA.
>
> "Better than HA" here means: (1) a real LLM-driven planner instead of
> hand-written YAML automations, (2) zero-config device onboarding, (3) one
> coherent voice layer across every room/device, and (4) replayable, auditable
> automations.

## 0. Decisions locked in (from Q&A)

- **Compute split**: Pi 5 = always-on coordinator; **Linux + Docker box with
  RTX 4060 Ti** = inference server (vLLM/Ollama in a container with NVIDIA
  Container Toolkit). Pi calls it over the LAN via HTTP/gRPC.
- **Cloud policy**: **strictly local**. No AWS Lambda, no Cloudflare Tunnel,
  no hosted LLMs. Remote access (later) only via Tailscale, which is P2P.
- **Existing setup**: greenfield. Fresh Pi, no HA migration.
- **Alexa**: **control-only**. Echos are output devices and HearthOS exposes
  itself as a local Smart Home target; **no Echo mic capture** in this build.
- **Mic coverage**: TV remote mics + Pi-Zero-2-W satellites + phone PWA. All
  three paths in the MVP.
- **Project name**: working name **HearthOS**, wake word "Hey Hearth" — both
  renameable before v1.
- **Whole-house audio**: speaker wire already run to **9+ zones** (in-ceiling
  indoor + outdoor), but it **dead-ends at a panel** — no amp installed.
  Greenfield amp spec: **AmpliPro controller + Zone Expander (12 zones)**,
  driven by HearthOS over its REST API. See §5b.
- **GPU VRAM**: 4060 Ti is the **16 GB** variant (confirmed). See §3a for the
  VRAM budget and what that does and does not fit.

---

## 1. Hardware target

| Role                | Device                                              | Notes |
|---------------------|-----------------------------------------------------|-------|
| Hub                 | Raspberry Pi 5, 8 GB RAM, NVMe HAT + 512 GB NVMe    | Required for LLM + Whisper; SD card is too slow. |
| Radio bridge        | SkyConnect / Sonoff ZBDongle-E (Zigbee + Thread)    | Plus optional Z-Wave stick. |
| Mic array (fallback)| ReSpeaker 4-mic or 2-mic HAT                        | For rooms without a TV/Echo. |
| AI accelerator (opt)| Hailo-8L M.2 on the Pi 5 NVMe HAT                   | Optional. Speeds up local Whisper + small LLM if the GPU box is offline. |
| **GPU box**         | **Linux + Docker, RTX 4060 Ti 16 GB**               | **Confirmed 16 GB variant.** Runs vLLM for the smart-tier model. VRAM budget in §3a. |
| Voice satellites    | Pi Zero 2 W + ReSpeaker 2-mic, one per room         | Always-on wake word + audio streaming back to the Pi 5. |
| **Multi-zone amp**  | **AmpliPro controller + 1 Zone Expander (12 zones)**| Open-source, Pi-based, REST API. Drives the existing ceiling + outdoor wiring. See §5b. |

The Pi 5 is the always-on coordinator. The 4060 Ti box is the inference
server; the Pi calls it over HTTP/gRPC. If the GPU box is down, the Pi
gracefully falls back to a 3B Q4 model on-device so the house never goes
"dumb".

---

## 2. High-level architecture

```
                ┌────────────────────────────────────────────┐
                │                 HearthOS Core              │
                │                                            │
   Devices ──▶  │  Discovery  ──▶  Device Registry  ──┐      │
   (LAN/RF)     │                                     ▼      │
                │  Event Bus (NATS)  ◀──▶  State Store (SQLite + Redis) │
                │       ▲                              │      │
   Voice  ──▶   │  Voice Pipeline ──▶ Intent Router ──▶│      │
   (any mic)    │  (wake → STT → LLM → TTS)            │      │
                │                                      ▼      │
                │                              Automation Engine
                │                              (LLM planner + rules)
                └────────────────────────────────────────────┘
                         ▲                         │
                         │                         ▼
                  Web/Mobile UI            Device adapters (out)
```

Components, all running as systemd units (or one Docker compose stack):

1. **Discovery service** — mDNS/Zeroconf, SSDP/UPnP, Matter commissioner,
   Zigbee2MQTT, BLE scanner, UniFi API poller, LG/Samsung/Roku/Android-TV
   probes, Alexa Smart Home bridge. Anything found gets a stable internal ID
   and is published to the event bus.
2. **Device registry** — single source of truth: capabilities, rooms,
   credentials (in `sops`-encrypted store), last-seen, online state.
3. **Event bus** — NATS JetStream. Every state change, voice event, and
   automation step is a message. This is what makes the system **replayable
   and auditable**, which HA's YAML model is bad at.
4. **State store** — SQLite for durable state + Redis for hot cache.
5. **Conversation store (vCon)** — see §4a. Every voice interaction is
   persisted as a signed [vCon](https://datatracker.ietf.org/doc/draft-ietf-vcon-vcon-container/)
   (IETF Virtualized Conversations container). This is the canonical record
   of "who said what to which device when," and the unit the automation
   engine and UI replay against.
6. **Voice pipeline** — see §4.
7. **Intent router** — turns transcribed text into a structured
   `{device, action, params}` call. Tries fast local grammar first
   (openWakeWord + Rhasspy-style intents), falls back to the LLM planner.
   Each routed turn appends a `dialog` + `analysis` entry to the active vCon.
8. **Automation engine** — LLM-driven, but compiles each automation to a
   deterministic rule the user can read, edit, and version. The LLM is the
   author; the runtime is boring and predictable. Source of truth for "why
   did this fire?" is the linked vCon.
9. **UI** — web app + PWA (works on phones/TVs). Real-time via SSE off the
   event bus; conversation history view reads vCons directly.

### Why not just fork Home Assistant?

We will **reuse HA's integrations where it makes sense** (it has hundreds of
maintained device adapters) by embedding `hass-core` as one of several
adapter sources behind our registry. The differentiation is the AI layer,
event bus, and zero-config onboarding — not redoing every Tuya/Hue driver.

---

## 3. Self-hosted AI

Two-tier model strategy:

| Tier        | Model                                  | Where it runs                          | Used for |
|-------------|-----------------------------------------|----------------------------------------|----------|
| Fast        | Llama-3.2-3B / Qwen3-4B (Q4, llama.cpp) | Pi 5 (CPU or Hailo)                    | Intent classification, short replies, automation triage; also the **fallback** if the GPU box is offline. Kept resident at all times. |
| Smart       | **7B/8B-class instruct at W4A16 on vLLM** | **4060 Ti 16 GB, sole GPU tenant**   | Automation authoring, ambiguous requests, multi-step plans. **Revised down from 14B — see §3a.** |
| STT (fast)  | `whisper.cpp` small                     | Pi 5                                   | The normal voice path. |
| STT (accurate)| faster-whisper large-v3-turbo, int8   | **GPU-box CPU**, not the GPU           | Long-form / high-accuracy path. |
| TTS         | Piper                                   | Pi 5                                   | All voice output. |
| Wake        | openWakeWord                            | Pi 5 + each satellite                  | "Hey Hearth" + custom phrases, fully on-device. |
| Speaker ID  | ECAPA-TDNN (22M)                        | **Pi 5 CPU**                           | Survives GPU-box failure, so "turn on *my* lights" still works in degraded mode. |
| Face ID     | InsightFace SCRFD + ArcFace             | **GPU-box CPU**                        | ~2 events/hour; 100–200 ms on CPU. Not worth permanent VRAM. |

Routing rule: if the fast model's structured-output confidence ≥ threshold,
ship it; otherwise escalate to the smart model on the 4060 Ti. If the GPU
box is unreachable, we fall back to the fast model with a degraded-mode
banner in the UI. Token-level streaming so spoken replies start while the
model is still generating.

A **tool-use loop** is the LLM's only way to act: it can call
`devices.list`, `device.set_state`, `automation.create`,
`scene.activate`, etc. It cannot execute arbitrary code. Every tool call is
logged on the bus.

---

## 3a. GPU box configuration (4060 Ti 16 GB — confirmed)

**The plan as originally written does not fit.** Confirming the 16 GB
variant did not rescue the 14B; it made the ceiling precise enough to prove
it fails. Two exactly-computed numbers settle it before any estimate enters:

- **Qwen2.5-14B-Instruct-AWQ weights = 9.29 GiB.**
- **Its KV cache = 192 KiB/token** (48 layers × 2 × 8 GQA KV heads × 128
  head-dim × 2 bytes). At 32k context that is **6.00 GiB**.

9.29 + 6.00 = **15.29 GiB** against a card that reports 15.99 GiB total and
~15.2 GiB safely allocatable headless — with **zero** CUDA context, zero
activations, and none of Whisper/face-ID/speaker-ID loaded. Adding those
takes the full original plan to ~25 GiB, a ~10 GiB shortfall. No plausible
correction to a soft estimate closes that.

### Revised budget — 7B, single tenant

| Item | GiB | Notes |
|---|---:|---|
| CUDA context + torch runtime | 0.5–0.7 | measure |
| Model weights (7B-class AWQ/W4A16) | 5.19 | exact for Qwen2.5-7B-AWQ |
| Activations (`max_num_batched_tokens=2048`) | 0.5–0.7 | measure |
| CUDA graphs (capture sizes `[1,2,4]`) | 0.1–0.2 | keep graphs; eager costs 15–30% decode |
| **Fixed subtotal** | **≈ 6.5** | |
| KV pool @ `--gpu-memory-utilization 0.75` | ≈ 5.5 | 56 KiB/token → **~100k tokens** |
| **vLLM total** | **≈ 12.0** | |
| **Unallocated headroom** | **≈ 3.6** | absorbs estimate error and fragmentation |

FP16 KV throughout — we don't need FP8, which removes a whole class of
backend-compatibility and scale-calibration risk from the critical path.

### Two decisions this forces

**1. Smart tier drops to a 7B/8B-class model.** Baseline
`Qwen2.5-7B-Instruct-AWQ` (arithmetic verified, official quant, known-good
vLLM path); a Qwen3 8B-class W4A16 is preferable if it validates on the box.
This is a *bandwidth* decision as much as capacity — the 4060 Ti has only
~288 GB/s, and decode streams weights + the entire live KV every token:

| Model | Realistic tok/s @4k | @16k |
|---|---:|---:|
| 14B-AWQ | ~23 | ~19 |
| 7B-AWQ | **~45** | **~40** |

**2. The GPU becomes a single-tenant vLLM box.** Every auxiliary model
moves to the GPU-box CPU or the Pi (see the §3 table). Reasons, in order of
force: each extra GPU process costs 0.3–0.7 GiB of CUDA context before a
single weight loads; vLLM profiles once at startup and *never shrinks*, so
whatever grows later is what dies — months on, unattended; and collisions
are correlated, not random (doorbell → face-ID → "who's at the door?" → LLM
within two seconds). Moving face-ID off the GPU makes that failure
structurally impossible.

### Honest note on latency

**The 2–5 s smart-tier target is not met for long outputs by any model that
fits this card.** At ~40 tok/s a 300-token response is ~7.5 s of decode.
Mitigations, in order of value: (1) design the smart tier to emit terse
schema-constrained JSON of 60–100 tokens and template the spoken reply on
the Pi — 100 tokens at 40 tok/s is 2.5 s; (2) stream to Piper sentence-by-
sentence so perceived latency collapses to TTFT (~0.4–0.6 s warm);
(3) n-gram speculative decoding, zero VRAM, strong on edit-shaped authoring.
Note the 1.5 s round-trip target belongs to the **Pi's fast path**, not the
smart tier.

### Prefix caching is the highest-leverage flag

The tool schemas and device registry are a large constant prompt prefix.
`--enable-prefix-caching` takes warm TTFT from ~5–7 s to ~0.4–0.6 s — but
only if the prompt is ordered **static block first, volatile last**. A
timestamp near the top drives the hit rate to zero. Serialize the registry
deterministically (sorted by entity ID, fixed float formatting). Better
still: get the registry out of the prompt entirely behind a
`find_devices(query)` tool — smaller context, stable prefix across device
additions, and hallucinated entity IDs become impossible.

Drive structure with `response_format: {"type":"json_schema"}` or
`tool_choice: "required"` — **not** `--enable-auto-tool-choice` with a text
parser, the most common source of silent failures in production vLLM tool
loops. Generate the `entity_id` `enum` from the live registry.

### Security posture

**vLLM ships with no authentication.** Four layers, all of them:

1. `VLLM_API_KEY` via `env_file` (0600, root) — not `--api-key`, which
   leaks into `docker inspect` and argv.
2. Bind to the LAN IP explicitly: `ports: ["192.168.x.x:8000:8000"]`, never
   `"8000:8000"`.
3. **A `DOCKER-USER` iptables rule — `ufw deny 8000` does not work.**
   Docker's DNAT sits in `PREROUTING`, evaluated before the `INPUT` chain
   ufw manages. Insert DROP, then RETURN for the Pi's IP only. Verify from
   a third LAN host; the curl must time out.
4. Treat `/health` and `/metrics` as unauthenticated — exemptions have
   varied by version, so the firewall is what protects them.

### Reliability for 24/7 unattended

- `apt-mark hold` the NVIDIA driver packages and blacklist them in
  `unattended-upgrades`. An unattended driver upgrade without a reboot is
  the **#1 cause** of "worked for two months, died overnight".
- Boot to `multi-user.target` (headless) — recovers 0.3–1.0 GiB.
- **Docker healthchecks mark a container unhealthy but never restart it.**
  Add a systemd timer that polls `docker inspect` and restarts on
  `unhealthy`, plus a canary issuing a real completion — `/health` can
  return 200 on a wedged engine.
- Watch `dmesg` for Xid errors; **Xid 79 is unrecoverable without a host
  reboot** and is the classic silent-death mode for a consumer card.
- Alert on `vllm:num_preemptions_total`, prefix-cache hit rate < 0.80, and
  per-process VRAM drift (catches slow leaks no aggregate metric shows).
- **Degradation must be audible.** Identity is enrichment, never a gate: if
  face-ID is down the doorbell still announces "someone at the front door."

### What changes if…

| If we want… | Change | Cost |
|---|---|---|
| 32k context | `--max-model-len 32768` | Fits (4×32k = 7.0 GiB). Decode ~40 → ~34 tok/s. |
| 128k context | Don't | Qwen's YaRN is static scaling — degrades everything under 32k, which is all real traffic. |
| Face-ID on GPU | Drop util to ~0.62, strict ORT caps, start before vLLM | ~1.0 GiB + a 4–8 s first-inference cuDNN search. **Not recommended** — CPU is 100–200 ms/frame at zero VRAM. |
| The 14B anyway | Separate process, vLLM sleep mode, woken on demand | ~10 GiB host RAM, 3–6 s wake. Experiment, not a shipped path. |
| Both a 14B and full aux residency | A second GPU (used 3060 12 GB ≈ $200) or a 24 GB card | A 3090 also triples decode — **bandwidth, not capacity, is the real constraint on this design.** |

### Caveat on these numbers

The two exact figures above (9.29 GiB weights, 192 KiB/token) are derived
from published architecture parameters and are load-bearing — they alone
kill the 14B. **Most other figures are estimates that were not
web-verified** (the research pass lost network access mid-run). Before
committing hardware time, measure on the actual box:

1. **Single-stream tok/s for the chosen model.** The 75% bandwidth-
   efficiency haircut is an estimate and this one benchmark decides the
   model-size question outright.
2. vLLM flag names on the pinned version — several have churned
   (`--disable-log-requests` was inverted in some releases; the
   structured-output backend flag was renamed around 0.11).
3. Measured CUDA context per process.
4. Whisper CPU real-time factor on the actual GPU-box CPU.
5. A 72-hour soak with per-process VRAM sampling before calling it
   production.

A **tool-use loop** is the LLM's only way to act: it can call
`devices.list`, `device.set_state`, `automation.create`,
`scene.activate`, etc. It cannot execute arbitrary code. Every tool call is
logged on the bus.

---

## 4. Voice pipeline — "every mic is our mic"

The novel piece. We don't ship a single voice puck; we use whatever's
already in the room.

| Source              | How we capture audio                                              |
|---------------------|-------------------------------------------------------------------|
| LG WebOS TV         | WebOS app + `webOSTV.audio` API; remote mic streamed over WS.      |
| Samsung Tizen TV    | Tizen app + Bixby remote mic via SmartThings local API where allowed. |
| Android TV / Google TV | Sideloaded companion APK using Android's `SpeechRecognizer` w/ on-device model; raw PCM streamed to hub. |
| Apple TV            | Shortcut → HomeKit intent → bridge (limited; see risks).           |
| Amazon Echo         | **Control-only** in this build (strictly local). HearthOS appears as a local Smart Home target via the `node-alexa-smart-home` LAN bridge / `ha-alexa-local` style adapter. We can also send announcements/audio to Echos. **No mic capture** (would require a cloud relay we've ruled out). |
| Pi mic HAT          | Direct ALSA capture.                                              |
| Phone               | PWA with `getUserMedia`, push-to-talk and continuous modes.       |

All sources funnel into a single `audio.stream` topic on the bus, tagged
with `room_id`. The voice pipeline does **room-scoped wake detection** and
**speaker echo cancellation** (so the TV's own audio doesn't trigger it).

Output (TTS) plays back on the **closest active speaker** to whoever spoke,
chosen by last-known presence. Falls back to TV if it's on, else the
nearest whole-house-audio zone (§5b), else Echo/HomePod/Pi speaker.

---

## 4a. Conversation format — vCon

Every voice interaction is recorded as a [vCon](https://datatracker.ietf.org/doc/draft-ietf-vcon-vcon-container/)
(IETF Virtualized Conversations, JSON container). vCon is to a voice
session what an email message is to a thread: a single signed,
self-contained, portable record. Using it instead of a homegrown schema
gives us interop, signing/provenance, and a clean replay primitive.

**One vCon per "conversation"**, where a conversation = wake word →
silence-out plus any follow-up turns within an idle window. Schema we
populate:

```jsonc
{
  "vcon": "0.0.2",
  "uuid": "018f8e…",              // ULID, also the NATS subject suffix
  "created_at": "2026-05-04T18:22:11Z",
  "subject": "kitchen lights off",
  "parties": [
    { "role": "user",      "name": "Ryan",        "tel": null,
      "meta": { "presence_room": "kitchen" } },
    { "role": "assistant", "name": "HearthOS",    "uuid": "hearth-core" },
    { "role": "device",    "name": "Kitchen LED", "uuid": "zigbee:0x84fd…" }
  ],
  "dialog": [
    { "type": "recording", "start": "...", "duration": 2.1,
      "parties": [0], "mediatype": "audio/opus",
      "url": "file:///var/lib/hearthos/audio/018f8e.opus",
      "signature": "..." },
    { "type": "text", "parties": [0],
      "body": "hey hearth turn off the kitchen lights" },
    { "type": "text", "parties": [1],
      "body": "ok, turning off the kitchen lights" }
  ],
  "analysis": [
    { "type": "transcript", "vendor": "whisper.cpp",
      "schema": "whisper.v1",
      "body": { "text": "...", "segments": [...], "lang": "en" } },
    { "type": "intent", "vendor": "hearthos.fast",
      "schema": "hearthos.intent.v1",
      "body": { "device": "zigbee:0x84fd…", "action": "off",
                "confidence": 0.94, "model": "phi-3-mini-q4" } },
    { "type": "tool_calls", "vendor": "hearthos.router",
      "body": [ { "tool": "device.set_state",
                  "args": { "id": "zigbee:0x84fd…", "state": "off" },
                  "result": "ok", "latency_ms": 142 } ] }
  ],
  "attachments": [
    { "type": "automation_link", "url": "hearthos://automation/00f2…" }
  ]
}
```

How the system uses it:

- **Storage**: vCons live as files in `/var/lib/hearthos/vcons/` (one
  JSON per conversation, audio stored alongside, referenced by URL),
  indexed in SQLite for search. Older ones can be moved to cold storage.
- **Signing**: each finalized vCon is signed (JWS, Ed25519 key on the Pi)
  so tampering is detectable. Audio chunks carry hash refs from the
  `dialog[].signature` field.
- **Bus integration**: voice pipeline emits NATS events
  `vcon.dialog.appended`, `vcon.analysis.appended`, `vcon.finalized`.
  The vCon UUID is the correlation ID across the whole stack — the
  automation engine, UI, and audit log all key off it.
- **Replay**: the automation engine can re-run a vCon's `analysis.intent`
  through a different model to A/B router changes. The UI can scrub
  through any past conversation, see the transcript and the tool calls
  that resulted, and "why did the lights turn off?" answers itself.
- **Privacy controls**: per-room retention windows; "forget last
  conversation" is `rm` on a single file; export/share is just copying
  the (signed) JSON.
- **Interop**: because it's the IETF format, third-party tools (analytics,
  contact-center QA, transcript search) can consume them unchanged.

We follow the latest `draft-ietf-vcon-*` revision and pin a version
field in our store so we can migrate forward. We do **not** invent
proprietary extension types where a standard one exists; custom analysis
goes under our own `vendor: "hearthos.*"` namespace per the spec.

---

## 5. Device-class plan

What we discover and how, in priority order:

1. **UniFi gear (cameras, doorbells, NVR)** — UniFi Protect local API with a
   service-account token. We pull RTSP streams, motion events, smart-detect
   events (person/vehicle/package). Optional: run a tiny YOLO on the Pi
   for cross-camera identity.
2. **TVs** — LG (WebOSTV API), Samsung (SmartThings + Tizen WS), Sony/Android
   TV (ADB + Google Cast), Roku (ECP), Apple TV (pyatv).
3. **Alexa / Echo** — local-only and one-directional: HearthOS appears on
   the LAN as a Smart Home endpoint Alexa can control, and we use Echos as
   announcement speakers. **No utterance capture** in this build.
4. **Matter / Thread** — native commissioner via `chip-tool` / Matter SDK on
   the SkyConnect.
5. **Zigbee / Z-Wave** — Zigbee2MQTT and Z-Wave JS UI as managed sidecars;
   their MQTT topics are bridged to our event bus.
6. **ESPHome / Tasmota** — auto-discovered over mDNS, adopted on first sight.
7. **Generic IP** — any device answering on common ports gets a "candidate"
   record the user can confirm in the UI.

Discovery is **continuous**, not one-shot. New devices show up as a
notification: "Found a UniFi G4 Doorbell at 10.0.0.42 — adopt?".

---

## 5a. Feature set (user-selected)

All 16 requested. Grouped by capability, tagged by which phase they land in.
Each is expressed as user-visible behavior, not implementation detail — the
implementation slots into the architecture from §2–§5.

### Security & cameras

| Feature | Phase | Notes |
|---|---|---|
| **Person / package / vehicle alerts** | 2 | UniFi Protect smart-detect events → NATS → phone push + TV overlay + spoken announcement on nearest speaker. Cheap; ships with the UniFi adapter. |
| **Face recognition** | 5 | Local model (InsightFace / ArcFace) on the GPU box. Faces enrolled per-person; feeds "who's home" presence signal. Photos never leave the LAN. |
| **Auto-arm on leave** | 4 | Presence rule: when last known phone leaves geofence for >5 min, arm cameras, lock smart locks, set thermostat to away. Undoable via voice. |
| **Cross-camera tracking** | 6 | Re-identification model correlates a person across UniFi cams; UI shows one timeline: "front door → hallway → kitchen at 8:14". Expensive; last. |

### Media & communication

| Feature | Phase | Notes |
|---|---|---|
| **Voice-controlled TV** | 2 | LG WebOS adapter first ("play Severance on the living room"), then Android TV. Deep-links into apps where possible. |
| **Whole-house audio + intercom** | 3 | TTS/music routed to any zone of the existing wired speaker system (see §5b). "Announce dinner" fans out to every zone. Snapcast handles multi-zone sync when the amp doesn't natively. |
| **Movie mode auto-scene** | 4 | "Netflix launched on living room TV" event → dim lights, close blinds, set thermostat, pause vacuum. Editable as a rule. |
| **Follow-me media** | 6 | Music/podcast hand-off between speakers based on presence. Needs solid room-level presence (BLE + mmWave) — that's why it's late. |

### Energy & climate

| Feature | Phase | Notes |
|---|---|---|
| **Water leak + auto-shutoff** | 3 | Highest-value safety feature. Zigbee leak sensors + smart shutoff valve; rule fires before the phone push arrives. |
| **Per-room climate zones** | 4 | Presence + temp sensors per room; smart vents or per-room mini-splits. Learns occupancy schedules. |
| **Energy dashboard + alerts** | 4 | Live watts per device (Emporia Vue / Shelly EM / smart plugs). "Dryer's been running 2 h — done?" nudges. Monthly cost forecast. |
| **Solar / EV charging optimization** | 5 | Watches inverter + utility rate API; shifts EV, dryer, dishwasher, water heater to solar-peak or off-peak. Explains its choices in the UI. |

### AI behavior & family

| Feature | Phase | Notes |
|---|---|---|
| **Natural conversation** | 1 | Free-form Q&A ("what's on TV tonight?", "how's the house?") via the smart-tier LLM. Not just command grammar. |
| **Per-person voice profiles** | 3 | Speaker-ID model (pyannote / SpeechBrain) tags each vCon with a party. "Turn on my lights" resolves per-speaker. |
| **Proactive routines learned from behavior** | 5 | Pattern miner over the event log proposes rules: "You dim the office at sunset 6 days a week — automate it?" User approves/edits/rejects; nothing auto-fires. |
| **Kid mode + guest mode** | 4 | Per-person policy: content filters, quiet hours, no smart-lock control for kids; time-boxed access codes and Wi-Fi/scene bundles for guests. |

## 5b. Whole-house audio — 9+ zones, greenfield amp

**Confirmed situation**: speaker wire is run throughout (in-ceiling indoor
+ outdoor pairs), 9+ independent zones, and the wire **dead-ends at a
panel** — no amp installed. That's the best case: we spec the amplifier
rather than working around one. All four capabilities are in scope: TTS/
announcements everywhere, per-zone music streaming, room-to-room intercom,
and doorbell/alert chimes.

### Recommended hardware: AmpliPro (open-source AmpliPi)

[AmpliPro](https://github.com/micro-nova/AmpliPi) by MicroNova is a
rack-mount multi-zone amplifier + matrix built on a Raspberry Pi Compute
Module, **fully open source** (software, firmware, and schematics), with a
documented **OpenAPI REST API**. It is the closest thing to a
purpose-built appliance for exactly this plan.

| Spec | Value |
|---|---|
| Zones per controller | 6 |
| Max zones | 36 (controller + Zone Expanders, 6 each) |
| Simultaneous independent audio programs | **4** (see limitation below) |
| Built-in sources | AirPlay, Spotify Connect, DLNA, LMS, Bluetooth, internet radio, Pandora, USB, + 4 analog RCA in |
| Control | REST API (OpenAPI), self-hosted web app; existing Home Assistant + openHAB integrations to crib from |
| Platform | Raspberry Pi CM3+, Python + C firmware, I²C zone/volume control |

For 9+ zones: **1 controller + 1 Zone Expander = 12 zones**, one rack, one
API. Add a second expander later for 18 if the outdoor/garage runs grow.

### How HearthOS uses it

We treat AmpliPro as a **controllable amplifier and matrix**, not as the
brain. HearthOS owns the audio content and the routing policy:

- HearthOS runs **Snapcast** servers and feeds AmpliPro's analog/stream
  inputs. Zone routing, per-zone volume, and mute are driven through
  AmpliPro's REST API from a HearthOS adapter.
- Each AmpliPro zone becomes an **`audio_zone`** object in the device
  registry (`kitchen`, `patio`, `primary_bath`, …). Automations and voice
  target zones and zone groups — never hardware. "Announce dinner
  everywhere", "play jazz on the patio only", "mute the kids' rooms".
- **TTS ducking**: HearthOS lowers music on the target zone, plays the
  Piper output, restores volume. Because we own both the Snapcast stream
  and the zone volume API, ducking is ours to implement correctly rather
  than something we hope the amp does.
- **Announcement priority queue**: doorbell and leak/security chimes
  preempt music and TTS; a leak alarm interrupts everything in every zone.
  Priority levels are a first-class concept, not a race.
- **Intercom** is a routed vCon: mic in room A → zone B's speakers, with
  the whole exchange recorded as a normal signed vCon (§4a).

### Known limitation — 4 simultaneous programs

AmpliPro plays **4 independent audio programs at once**, routed to any
number of zones. With 12 zones that means at most 4 different things
playing; zones sharing a program stay in sync. In practice 4 concurrent
distinct programs in one household is generous, and announcements
temporarily borrow a source slot rather than needing their own.

If that ceiling ever binds, the escape hatch is **full Snapcast-per-zone**:
a Pi Zero 2 W + USB DAC per zone feeding a dumb rack power amp (e.g. a
multichannel Dayton/Monoprice). Unlimited independent streams and perfect
sync, at the cost of a box per zone and losing the single-API convenience.
We keep the `audio_zone` abstraction identical either way, so this swap is
an adapter change, not a rewrite.

### Outdoor zones

Outdoor pairs need their own attention: verify impedance and whether the
runs are 8Ω direct or 70V distributed (older outdoor installs sometimes
are). Outdoor zones also get **separate volume curves and quiet hours** —
an announcement that's right indoors is a neighbor complaint at 11pm.

### Mics are separate

Ceiling speakers are the house's **mouth, not its ears**. Every room that
needs voice input still gets a **Pi Zero 2 W + ReSpeaker 2-mic HAT**
(~$45/room) near the doorway, or relies on a TV remote mic / phone PWA.
Room-to-room intercom in particular requires a mic in every participating
room — worth budgeting for up front given 9+ zones.

### Budget sketch

| Item | Qty | Notes |
|---|---|---|
| AmpliPro controller | 1 | 6 zones, streaming, REST API |
| AmpliPro Zone Expander | 1 | +6 zones (12 total) |
| Pi Zero 2 W + ReSpeaker 2-mic | per voice room | ~$45 each |
| Rack, cabling, panel terminations | 1 | Depends on existing panel |

Verify current AmpliPro pricing directly — public figures are stale, and
a 12-zone build is the single largest line item in this project.

### Cross-cutting requirements this pulls in

Adding all 16 forces a few things earlier than the base plan had them —
folding these into the roadmap:

- **Presence subsystem** (Phase 3): phone geofence + BLE room-level + optional
  mmWave. Needed by auto-arm, per-person voice, follow-me media, climate
  zones, movie mode.
- **Person/policy service** (Phase 4): per-person profiles, ACLs, quiet
  hours. Needed by voice profiles, kid mode, guest mode.
- **GPU-node inference gateway** (Phase 4): face-ID, speaker-ID, and the
  smart LLM all live here. Single gRPC surface, Pi is a client.
- **Pattern miner + suggestion inbox** (Phase 5): reads the event log +
  vCons, proposes rules, never auto-applies.

---

## 6. Phased roadmap

**Phase 0 — Skeleton (1–2 weeks)**
- Repo scaffold, NATS + SQLite + Redis up on the Pi via Docker compose.
- Device registry schema + REST + event-bus contract.
- Stub web UI showing live event stream.

**Phase 0.5 — vCon plumbing (3–5 days, before voice)**
- Pick a vCon library (`vcon-py` if it fits; otherwise a thin wrapper —
  the spec is small). Pin to a draft revision.
- Conversation store: filesystem layout, SQLite index, JWS signing key
  generation on first boot.
- NATS subjects + JSON contracts for `vcon.*` events.
- Tiny CLI: `hearthctl vcon show <uuid>`, `hearthctl vcon verify <uuid>`.

**Phase 1 — Voice loop on a Pi mic (2–3 weeks)**
- openWakeWord + whisper.cpp + Piper end-to-end.
- Every interaction creates and finalizes a signed vCon end-to-end.
- Fast LLM (Phi-3-mini, llama.cpp) doing intent → tool calls.
- 5 hard-coded tools: lights on/off, scene, timer, weather, status.
- Success criterion: "Hey Hearth, turn off the kitchen lights" works end to
  end in < 1.5 s on a cold Pi.

**Phase 2 — First real integrations (3 weeks)**
- LG WebOS TV (control + remote mic capture).
- UniFi Protect (cameras + motion events).
- Zigbee2MQTT bridge.
- Web UI: device list, room assignment, manual control.

**Phase 3 — Multi-room voice + whole-house audio (3–4 weeks)**
- **Rack the AmpliPro controller + expander**; terminate the 12 zones at the
  panel, label and verify every run (including outdoor impedance check).
- AmpliPro REST adapter; `audio_zone` device class in the registry.
- Snapcast servers on the Pi feeding AmpliPro inputs; TTS ducking.
- Announcement priority queue (leak/security > doorbell > TTS > music).
- Room-to-room intercom over vCon.
- Pi Zero 2 W satellite image: openWakeWord + audio streamer + speaker out.
- Room-scoped wake routing; echo cancellation against TV / ceiling audio.
- Outdoor zone quiet hours + separate volume curves.
- Phone PWA push-to-talk over LAN.
- Alexa control-only adapter (HearthOS devices show up in Alexa).

**Phase 4 — LLM automation authoring (3 weeks)**
- **Benchmark single-stream tok/s on the actual 4060 Ti first** — this
  decides the final model size (§3a) before anything is built on top.
- Stand up vLLM on the 4060 Ti (7B-class W4A16, sole GPU tenant),
  OpenAI-compatible API, prefix caching verified by warm-vs-cold A/B.
- Lock the security posture: API key, LAN-IP bind, `DOCKER-USER` rule
  verified from a third host.
- Pi-side router that picks fast vs. smart tier and falls back on GPU outage.
- "When the doorbell rings after 10 pm, flash the bedroom lamp" → the LLM
  emits a deterministic rule, shows it to the user, saves it on approval.
- Replay/undo from the event log.

**Phase 5 — Polish (ongoing)**
- Mobile PWA, presence detection, energy dashboards, HA-integration adapter
  to inherit hundreds of existing device drivers.

---

## 7. Risks & honest limitations

- **Apple TV voice** is heavily sandboxed; we will likely only get control,
  not Siri-mic capture. Acceptable.
- **Echo mic capture is out of scope** under the strictly-local rule. If you
  ever relax that, a single AWS Lambda + Cloudflare Tunnel re-enables it.
- **GPU-box single point of failure**: smart-tier replies depend on the
  4060 Ti box. Mitigation: Pi-side fast-model fallback kept resident at all
  times + a clear "degraded mode" UI banner. Speaker-ID lives on the Pi
  specifically so per-person voice survives a GPU outage.
- **The 4060 Ti is bandwidth-starved, not just VRAM-limited** (~288 GB/s).
  This caps the smart tier at ~40 tok/s for a 7B and is not fixable by
  tuning — only by a different card. See §3a.
- **Smart-tier latency**: the 2–5 s target is not met for long outputs by
  any model that fits 16 GB. We work around it with terse JSON output and
  streaming TTS rather than pretending the number is achievable.
- **Pi 5 LLM perf**: a 3B Q4 model runs ~6–10 tok/s on CPU; usable for short
  intents, slow for paragraphs. The fallback is functional, not great.
- **Echo cancellation** on TV audio is non-trivial; we'll start with
  push-to-talk on the remote and add full-duplex AEC later.
- **Security**: every adapter handles credentials. We mandate `sops` +
  age-encrypted secrets at rest, scoped service accounts, and no inbound
  ports — all remote access via Tailscale.
- **Scope**: "better than Home Assistant" is a years-long claim. The MVP
  goal is "better at voice + AI automation than HA, equal-ish at device
  coverage via the HA adapter shim."

---

## 8. Still open

1. **Language**: Python (fastest device-adapter ecosystem) vs. Go/Rust
   (better runtime). Recommend Python for Phases 0–3, rewrite hot paths
   later. Confirm before Phase 0 scaffolding.
2. **Project rename**: HearthOS / "Hey Hearth" is a placeholder — pick the
   final name before we train a custom wake word.
3. **Satellite count + rooms**: how many Pi Zero 2 W satellites to budget
   for, and which rooms get them vs. relying on the TV remote / phone.
4. **Exact zone count + room names**: "9+" needs to become a list before we
   order. 12 zones (controller + 1 expander) is the working assumption —
   confirm, and name each zone so the registry and voice targets match how
   you actually talk about the house.
5. **Outdoor speaker wiring**: are the outdoor runs 8Ω direct or 70V
   distributed? Changes the amp/transformer spec. Needs a physical check at
   the panel.
6. **Which rooms get mics**: ceiling speakers give us output in 12 zones,
   but intercom and voice control need a mic per room (~$45 each). Which
   rooms actually need to *hear* you vs. just talk to you?
7. **AmpliPro current pricing**: public figures are stale and this is the
   biggest line item. Verify before committing to the design.

Phase 0 can start as soon as #1 is answered — it's pure software and
doesn't depend on any hardware decision.
