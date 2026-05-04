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

---

## 1. Hardware target

| Role                | Device                                              | Notes |
|---------------------|-----------------------------------------------------|-------|
| Hub                 | Raspberry Pi 5, 8 GB RAM, NVMe HAT + 512 GB NVMe    | Required for LLM + Whisper; SD card is too slow. |
| Radio bridge        | SkyConnect / Sonoff ZBDongle-E (Zigbee + Thread)    | Plus optional Z-Wave stick. |
| Mic array (fallback)| ReSpeaker 4-mic or 2-mic HAT                        | For rooms without a TV/Echo. |
| AI accelerator (opt)| Hailo-8L M.2 on the Pi 5 NVMe HAT                   | Optional. Speeds up local Whisper + small LLM if the GPU box is offline. |
| **GPU box**         | **Linux + Docker, RTX 4060 Ti (16 GB)**             | **Confirmed.** Runs vLLM/Ollama for the smart-tier model. |
| Voice satellites    | Pi Zero 2 W + ReSpeaker 2-mic, one per room         | Always-on wake word + audio streaming back to the Pi 5. |

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
5. **Voice pipeline** — see §4.
6. **Intent router** — turns transcribed text into a structured
   `{device, action, params}` call. Tries fast local grammar first
   (openWakeWord + Rhasspy-style intents), falls back to the LLM planner.
7. **Automation engine** — LLM-driven, but compiles each automation to a
   deterministic rule the user can read, edit, and version. The LLM is the
   author; the runtime is boring and predictable.
8. **UI** — web app + PWA (works on phones/TVs). Real-time via SSE off the
   event bus.

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
| Fast        | Phi-3-mini / Llama-3.2-3B (Q4, llama.cpp)| Pi 5 (CPU or Hailo)                    | Intent classification, short replies, automation triage; also the **fallback** if the GPU box is offline. |
| Smart       | **Qwen2.5-14B-Instruct (AWQ) on vLLM**  | **4060 Ti box, Linux + Docker**        | Automation authoring, ambiguous requests, multi-step plans. 16 GB VRAM fits 14B AWQ comfortably with room for KV cache. |
| STT         | `whisper.cpp` small (Pi) / large-v3 (GPU)| Pi 5 default; GPU for long-form        | All voice input. |
| TTS         | Piper                                   | Pi 5                                   | All voice output. |
| Wake        | openWakeWord                            | Pi 5 + each satellite                  | "Hey Hearth" + custom phrases, fully on-device. |

Routing rule: if the fast model's structured-output confidence ≥ threshold,
ship it; otherwise escalate to the smart model on the 4060 Ti. If the GPU
box is unreachable, we fall back to the fast model with a degraded-mode
banner in the UI. Token-level streaming so spoken replies start while the
model is still generating.

**Inference-server stack on the 4060 Ti** (Linux + Docker):
- `vllm/vllm-openai` container, OpenAI-compatible endpoint on port 8000.
- Bound to the LAN interface only; firewall blocks WAN.
- NVIDIA Container Toolkit + driver 550+; CUDA 12.4.
- Model files on local NVMe; warm-up on container start.
- A second container runs `whisper.cpp` server for long-form transcription.

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
chosen by last-known presence. Falls back to TV if it's on, else nearest
Echo/HomePod/Sonos/Pi speaker.

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

## 6. Phased roadmap

**Phase 0 — Skeleton (1–2 weeks)**
- Repo scaffold, NATS + SQLite + Redis up on the Pi via Docker compose.
- Device registry schema + REST + event-bus contract.
- Stub web UI showing live event stream.

**Phase 1 — Voice loop on a Pi mic (2–3 weeks)**
- openWakeWord + whisper.cpp + Piper end-to-end.
- Fast LLM (Phi-3-mini, llama.cpp) doing intent → tool calls.
- 5 hard-coded tools: lights on/off, scene, timer, weather, status.
- Success criterion: "Hey Hearth, turn off the kitchen lights" works end to
  end in < 1.5 s on a cold Pi.

**Phase 2 — First real integrations (3 weeks)**
- LG WebOS TV (control + remote mic capture).
- UniFi Protect (cameras + motion events).
- Zigbee2MQTT bridge.
- Web UI: device list, room assignment, manual control.

**Phase 3 — Multi-room voice (2 weeks)**
- Pi Zero 2 W satellite image: openWakeWord + audio streamer + speaker out.
- Room-scoped wake routing; echo cancellation against TV audio.
- TTS playback routing to the nearest speaker (TV / satellite / Echo).
- Phone PWA push-to-talk over LAN.
- Alexa control-only adapter (HearthOS devices show up in Alexa).

**Phase 4 — LLM automation authoring (3 weeks)**
- Stand up vLLM on the 4060 Ti (Qwen2.5-14B AWQ), OpenAI-compatible API.
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
  4060 Ti box. Mitigation: Pi-side fast-model fallback + a clear
  "degraded mode" UI banner when the GPU host is unreachable.
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

Phase 0 can start as soon as #1 is answered.
