# HearthOS — Bill of Materials

Companion to `PLAN.md`. Everything you need to buy, why, when, and what
to buy instead.

---

## How to read this

**Price basis.** Every price is an *estimated US street price* from my
training data, not a live quote. Component prices (especially NVMe, Pi
boards, and anything Amazon-sold) move constantly, and some SKUs go
end-of-life. **Verify every price and availability before ordering.**
Totals below are for budgeting, not procurement.

**Status column.**
- `REQ` — required, the system does not work without it
- `REC` — recommended, meaningful quality-of-life or reliability gain
- `OPT` — optional, tied to a specific feature you selected
- `OWN` — you already have it; listed so the BOM is complete + to flag
  anything to verify

**Phase column** maps to the roadmap in `PLAN.md` §6. Don't buy Phase 4
hardware during Phase 0.

**Three quantities are still unknown** (see `PLAN.md` §8) and are shown
as variables:
- `N_sat` = number of voice satellite rooms
- `N_zone` = number of whole-house audio zones
- `AMP` = which of the three §5b audio paths applies

Worked totals at the bottom assume `N_sat = 4`, `N_zone = 6`.

---

## A. Core hub — Raspberry Pi 5

Buy this first. Nothing else matters until this boots.

| # | Item | Qty | Est. unit | Est. ext. | Status | Phase | Notes |
|---|---|---|---|---|---|---|---|
| A1 | Raspberry Pi 5, **16 GB** | 1 | $120 | $120 | REQ | 0 | Get 16 GB, not 8 GB. Whisper + a 3B fallback model + NATS + SQLite + a dozen adapters will use it. The $40 delta is the cheapest headroom you will ever buy. |
| A2 | Official Raspberry Pi 27 W USB-C PSU | 1 | $12 | $12 | REQ | 0 | Do **not** substitute a phone charger. Pi 5 + NVMe browns out on underpowered supplies and the failure mode looks like random SD corruption. |
| A3 | Argon NEO 5 M.2 NVMe case | 1 | $45 | $45 | REC | 0 | Bundles case + active cooling + M.2 2280 carrier in one. Alternative below (A3-alt) is cheaper but three separate parts. |
| A3-alt | *Alt:* RPi M.2 HAT+ ($12) + Active Cooler ($5) + basic case ($10) | 1 | $27 | $27 | — | 0 | Cheaper, fiddlier, worse thermals. Pick A3 **or** A3-alt, not both. |
| A4 | NVMe SSD 500 GB, **2280**, DRAM-less OK | 1 | $45 | $45 | REQ | 0 | Known-good on Pi 5: WD Blue SN570 / SN770, Crucial P3, Samsung 980 (non-Pro). **Avoid** Samsung 990 Pro and most Phison E18 drives — known Pi 5 enumeration issues. 500 GB is plenty; vCon audio is Opus and tiny. |
| A5 | microSD 32 GB (SanDisk Extreme or similar) | 1 | $10 | $10 | REQ | 0 | For initial flash and as a recovery boot. You boot from NVMe after setup. |
| A6 | Cat6 patch cable, 3 ft | 1 | $5 | $5 | REQ | 0 | **Wire the hub.** Do not run the house's brain over Wi-Fi. |
| A7 | Hailo-8L M.2 AI accelerator | 1 | $70 | $70 | OPT | 5 | Only worth it if you want face-ID / camera inference to survive the GPU box being down. Conflicts with A3/A4 for the single M.2 slot — you'd need a dual-slot HAT. **Defer this decision to Phase 5.** |

**Section A subtotal (A1–A6, with A3):** ≈ **$237**

---

## B. Radios & bridges

| # | Item | Qty | Est. unit | Est. ext. | Status | Phase | Notes |
|---|---|---|---|---|---|---|---|
| B1 | Home Assistant Connect ZBT-1 (formerly SkyConnect) | 1 | $35 | $35 | REQ | 2 | Zigbee + Thread/Matter in one dongle. Silicon Labs EFR32MG21. |
| B1-alt | *Alt:* Sonoff ZBDongle-E | 1 | $20 | $20 | — | 2 | Same chip family, cheaper, slightly rougher firmware story. Fine if budget matters. |
| B2 | **USB 2.0 extension cable, 3 ft** | 2 | $6 | $12 | REQ | 2 | Not optional. Plugging a Zigbee stick directly into a Pi 5 puts it inside a cloud of USB 3 / HDMI RF noise and range collapses. Get the stick 3 ft away from the Pi. This $6 part prevents the single most common "my Zigbee is flaky" support thread. |
| B3 | Zooz ZST39 800-series Z-Wave Long Range stick | 1 | $30 | $30 | REC | 3 | Needed **only** if you buy Z-Wave devices. The water shutoff valve (E4) and most quality smart locks are Z-Wave, so in practice: yes, you need this. |
| B4 | Powered USB 2.0 hub, 4-port | 1 | $15 | $15 | REC | 2 | Two RF sticks + occasional peripherals on a Pi 5's four ports gets tight, and a powered hub isolates the sticks from Pi rail noise. |

**Section B subtotal (B1, B2, B3, B4):** ≈ **$92**

---

## C. Voice satellites — per room

This is where `N_sat` multiplies. Pick **one option per room** — you can
mix, and you should.

### Option C-A: Far-field with hardware AEC (rooms with ceiling speakers)

Use this in any room where music will be playing through the whole-house
system while you talk to it. Hardware acoustic echo cancellation is the
difference between "works" and "can't hear you over the music."

| # | Item | Qty/room | Est. unit | Status | Notes |
|---|---|---|---|---|---|
| C-A1 | ReSpeaker USB Mic Array v2.0 | 1 | $79 | REQ | 4-mic circular array, XMOS XVF-3000: on-board beamforming, AEC, noise suppression, DOA. The AEC is the whole point. |
| C-A2 | Raspberry Pi Zero 2 W (with headers) | 1 | $18 | REQ | Runs openWakeWord + audio streamer. |
| C-A3 | Pi Zero PSU (5 V 2.5 A micro-USB) | 1 | $8 | REQ | |
| C-A4 | Pi Zero case | 1 | $10 | REQ | |
| C-A5 | microSD 16 GB | 1 | $7 | REQ | |
| C-A6 | micro-USB OTG adapter | 1 | $5 | REQ | To connect C-A1 to the Zero. |
| | **Per-room total** | | **$127** | | |

### Option C-B: Budget satellite (quiet rooms — office, bedroom, hallway)

| # | Item | Qty/room | Est. unit | Status | Notes |
|---|---|---|---|---|---|
| C-B1 | Raspberry Pi Zero 2 W WH (headers pre-soldered) | 1 | $18 | REQ | |
| C-B2 | ReSpeaker 2-Mics Pi HAT | 1 | $25 | REQ | Software AEC only. Fine when the room is quiet. |
| C-B3 | 3 W 8 Ω speaker | 1 | $5 | REQ | Local chime/response if the room has no ceiling speaker. |
| C-B4 | PSU + case + microSD | 1 | $25 | REQ | |
| | **Per-room total** | | **$73** | | |

### Option C-C: Prebuilt, zero assembly

| # | Item | Qty/room | Est. unit | Status | Notes |
|---|---|---|---|---|---|
| C-C1 | ESP32-S3-BOX-3 | 1 | $50 | REQ | All-in-one: mic, speaker, screen, enclosure. Weakest mic of the three, best time-to-first-demo. **Buy exactly one of these first** regardless of your final plan — it gets Phase 1 voice working in an evening while you assemble the real satellites. |

**Recommendation:** 1× C-C for immediate Phase 1 bring-up, then C-A in
music rooms and C-B everywhere else.

**Section C worked total** (`N_sat = 4`: 1 prebuilt + 2 far-field + 1 budget):
$50 + (2 × $127) + $73 ≈ **$377**

---

## D. Whole-house audio

**Blocked on an answer.** Which of these applies determines whether this
section costs $0 or $900. See `PLAN.md` §8 item 4.

### Path A — You already have a LAN-controllable multi-zone amp

Sonos Amp, Denon HEOS, Russound MCA-series, Nuvo, WiiM Amp, Arylic, etc.

**Cost: $0.** We write an adapter. This is the best case and costs only
software.

### Path B — "Dumb" multi-zone amp, needs one source per zone

Monoprice 6-zone, Dayton MA1240a, older Russound. The amp has per-zone
inputs but no network control.

| # | Item | Qty | Est. unit | Est. ext. | Status | Notes |
|---|---|---|---|---|---|---|
| D-B1 | Raspberry Pi Zero 2 W | `N_zone` | $15 | $90 | REQ | One Snapcast client per zone. |
| D-B2 | Pimoroni Audio DAC SHIM (or HiFiBerry DAC Zero) | `N_zone` | $25 | $150 | REQ | Line-out into the amp's zone input. Pi Zero has no analog out. |
| D-B3 | PSU + case + microSD per client | `N_zone` | $25 | $150 | REQ | |
| D-B4 | RCA cable, 3 ft | `N_zone` | $6 | $36 | REQ | |
| | **Path B total @ N_zone = 6** | | | **$426** | | |

*Cheaper Path B variant:* one mid-size x86 box with a multi-output USB
audio interface (Behringer UMC1820, 8 outs, ~$300) running all Snapcast
streams. Fewer devices to maintain, single point of failure, similar cost.

### Path C — Single stereo amp, all speakers in parallel

| # | Item | Qty | Est. unit | Est. ext. | Status | Notes |
|---|---|---|---|---|---|---|
| D-C1 | Pi Zero 2 W + DAC SHIM + PSU/case/SD | 1 | $65 | $65 | REQ | One Snapcast client, one zone. |
| | **Path C total** | | | **$65** | | |

### Path D — Wire dead-ends at a panel with no amp at all

If some or all of the speaker wire terminates unpowered, you need
amplification. Two approaches:

| # | Item | Qty | Est. unit | Est. ext. | Status | Notes |
|---|---|---|---|---|---|---|
| D-D1 | *Budget:* Fosi Audio V3 / ZK-502 class-D amp | `N_zone` | $35 | $210 | — | One small amp per zone, fed by a Snapcast client. Add Path B costs on top. Cheap, many boxes, many wall warts. |
| D-D2 | *Better:* WiiM Amp | `N_zone` | $299 | $1,794 | — | Network-native, becomes Path A automatically. Expensive per zone but zero DIY and excellent per-zone control. |
| D-D3 | *Middle:* Dayton Audio MA1240a 12-ch distribution amp | 1 | $400 | $400 | — | One rack unit drives 6 stereo zones. Combine with Path B sources ($426) = ~$826 total. **This is usually the right answer for a dead panel.** |

**I cannot finalize this section without knowing what's at the panel.**
Send me a photo of the equipment closet / structured-wiring panel and I'll
resolve it to a single line item.

---

## E. Sensors & actuators — by feature

Only buy the rows for features you want live in that phase.

### E1. Water leak + auto-shutoff (Phase 3) — *highest value per dollar in this BOM*

| # | Item | Qty | Est. unit | Est. ext. | Status | Notes |
|---|---|---|---|---|---|---|
| E1a | Zooz ZAC36 Titan water valve actuator (Z-Wave) | 1 | $180 | $180 | REQ | Clamps onto your existing 1/4-turn main ball valve — no plumber, no pipe cutting. Fully local Z-Wave. Requires B3. |
| E1b | Aqara / Third Reality Zigbee leak sensors | 6 | $15 | $90 | REQ | Water heater, under both sinks, dishwasher, washer, HVAC pan. |
| | | | | **$270** | | |

### E2. Presence (Phase 3) — *unlocks 5 of your 16 features*

| # | Item | Qty | Est. unit | Est. ext. | Status | Notes |
|---|---|---|---|---|---|---|
| E2a | Everything Presence Lite (mmWave + ESPHome) | 4 | $40 | $160 | REC | Native ESPHome, fully local, room-level occupancy including "sitting still." Required for follow-me media, climate zones, movie mode, auto-arm reliability. |
| E2b | Zigbee door/window contact sensors | 8 | $10 | $80 | REC | Exterior doors + garage. Feeds auto-arm and security timeline. |
| | | | | **$240** | | |

### E3. Climate zones (Phase 4)

| # | Item | Qty | Est. unit | Est. ext. | Status | Notes |
|---|---|---|---|---|---|---|
| E3a | Zigbee temp/humidity sensors (Sonoff SNZB-02P) | 8 | $10 | $80 | REQ | One per room you want zoned. |
| E3b | Smart thermostat with local API (Ecobee / Zooz ZEN series) | 1 | $180 | $180 | REQ | Only if your current one isn't already local-controllable. |
| E3c | Smart vents (Flair / Keen) | 6 | $85 | $510 | OPT | **Read this before buying:** smart vents in a single-zone forced-air system can raise static pressure and stress the blower. Get an HVAC opinion first. Skip unless you have a specific hot/cold room problem. |
| | **without E3c** | | | **$260** | | |

### E4. Energy dashboard + solar/EV optimization (Phase 4–5)

| # | Item | Qty | Est. unit | Est. ext. | Status | Notes |
|---|---|---|---|---|---|---|
| E4a | Emporia Vue Gen 3 + 16 CT clamps | 1 | $180 | $180 | REQ | Whole-panel + per-circuit monitoring. Ships cloud-first but has a documented local API and an ESPHome reflash path — we use local only. **Panel work: hire an electrician unless you're qualified.** |
| E4a-alt | *Alt:* Shelly Pro 3EM | 1 | $140 | $140 | — | Fully local out of the box, DIN-rail, but fewer circuits and needs panel DIN space. |
| E4b | Zigbee smart plugs with energy metering | 6 | $13 | $78 | REC | Dryer, dishwasher, entertainment center, etc. Drives "dryer left running" alerts. |
| | | | | **$258** | | |

### E5. Security & locks (Phase 4)

| # | Item | Qty | Est. unit | Est. ext. | Status | Notes |
|---|---|---|---|---|---|---|
| E5a | Z-Wave deadbolt (Schlage BE469ZP or Yale Assure 2 Z-Wave) | 2 | $190 | $380 | OPT | Needed for auto-arm's "lock the doors" step and guest access codes. Z-Wave, not Wi-Fi — stays local. |
| E5b | Zigbee sirens / indicator | 1 | $30 | $30 | OPT | |
| | | | | **$410** | | |

### E6. Lighting (any phase)

Not itemized — depends entirely on how many switches/bulbs you want and
whether you're replacing switches (Inovelli Blue 2-1 Zigbee, ~$50 ea) or
using bulbs. **Budget $50/switch** and decide room by room. Do not buy
lighting in bulk before Phase 2 proves the Zigbee mesh is solid.

---

## F. GPU inference box — verification, not purchase

You own this. Confirm these before Phase 4 or you'll discover the problem
at the worst time.

| # | Check | Why it matters |
|---|---|---|
| F1 | **VRAM is 16 GB, not 8 GB** | The 4060 Ti ships in both. Qwen2.5-14B-AWQ needs ~9 GB weights + KV cache. On an 8 GB card we drop to a 7B model and the automation-authoring quality falls off noticeably. |
| F2 | PSU headroom ≥ 550 W total system | 4060 Ti is only 165 W, so this is usually fine — verify anyway. |
| F3 | NVIDIA driver ≥ 550, CUDA 12.4 | Required for current vLLM containers. |
| F4 | NVIDIA Container Toolkit installed | Docker can't see the GPU without it. |
| F5 | ≥ 100 GB free disk for model weights | 14B AWQ ≈ 9 GB, plus Whisper large-v3 ≈ 3 GB, plus face/speaker-ID models, plus room to try alternatives. |
| F6 | **Wired ethernet to the same subnet as the Pi** | Voice latency budget is 1.5 s end to end. Wi-Fi jitter on the inference hop eats it. |
| F7 | Box stays powered on 24/7 | If it sleeps, the house drops to degraded mode. Disable suspend. |

**Cost: $0**, assuming F1 passes. If F1 fails (8 GB card), budget ~$450
for a 16 GB replacement, or accept 7B-class smart-tier.

---

## G. Power & network reliability

Skipping this section is the most common way a self-hosted hub becomes
untrustworthy.

| # | Item | Qty | Est. unit | Est. ext. | Status | Phase | Notes |
|---|---|---|---|---|---|---|---|
| G1 | UPS, ~600–900 VA w/ USB monitoring (CyberPower CP900AVR or APC BE600M1) | 1 | $110 | $110 | **REQ** | 0 | Protects Pi + NVMe + network gear. An unclean shutdown mid-write is how you lose the vCon store and the device registry. Also lets HearthOS keep announcing during a blackout. USB link so the Pi can shut down gracefully. |
| G2 | Second UPS for the GPU box | 1 | $200 | $200 | OPT | 4 | Only if you care about smart-tier surviving flickers. Degraded-mode fallback already covers this. |
| G3 | PoE/gigabit switch port availability | — | — | $0 | OWN | 0 | You have UniFi; just confirm a free port near the hub. |
| G4 | Wi-Fi coverage check for satellite rooms | — | — | $0 | OWN | 3 | Pi Zero 2 W is 2.4 GHz only and its antenna is mediocre. Verify signal in each `N_sat` room *before* buying satellites. |

**Section G subtotal (G1 only):** ≈ **$110**

---

## H. Consumables & workshop

| # | Item | Qty | Est. unit | Est. ext. | Status | Notes |
|---|---|---|---|---|---|---|
| H1 | microSD card reader (USB 3) | 1 | $10 | $10 | REQ | |
| H2 | Assorted USB-C / micro-USB cables | — | $20 | $20 | REC | |
| H3 | Label maker or label tape | 1 | $25 | $25 | REC | You will have 15+ near-identical Pi Zeros. Label them on day one. |
| H4 | Velcro/3M Command strips for satellite mounting | — | $15 | $15 | REC | |
| | | | | **$70** | | |

---

## Cost roll-up

### Tier 1 — "Prove it works" (Phases 0–2)

Minimum to have a voice-controlled house with cameras and Zigbee.

| Section | Items | Est. |
|---|---|---|
| A. Core hub | A1–A6 | $237 |
| B. Radios | B1, B2, B4 | $62 |
| C. Voice | 1× ESP32-S3-BOX-3 | $50 |
| G. Power | G1 UPS | $110 |
| H. Workshop | H1, H3 | $35 |
| **Total** | | **≈ $494** |

### Tier 2 — "Recommended build" (Phases 0–4)

Everything in Tier 1, plus real satellites, presence, water safety, energy.

| Section | Items | Est. |
|---|---|---|
| Tier 1 | | $494 |
| B3 Z-Wave stick | | $30 |
| C. Voice satellites | 2× far-field, 1× budget | $327 |
| D. Whole-house audio | **Path B assumed, N_zone = 6** | $426 |
| E1. Water leak + shutoff | | $270 |
| E2. Presence | | $240 |
| E4. Energy | | $258 |
| H. Remaining workshop | | $35 |
| **Total** | | **≈ $2,080** |

### Tier 3 — "All 16 features"

| Section | Est. |
|---|---|
| Tier 2 | $2,080 |
| E3. Climate zones (no smart vents) | $260 |
| E5. Locks + siren | $410 |
| E6. Lighting (assume 10 switches) | $500 |
| G2. Second UPS | $200 |
| A7. Hailo-8L | $70 |
| **Total** | **≈ $3,520** |

**Wildcard:** if the audio panel turns out to be Path D (no amp at all),
add **$400–$1,800** depending on which amp route you pick. This is the
single largest uncertainty in the BOM.

---

## Purchase order — what to buy when

**Buy now (this week):** A1–A6, G1, H1, H3, plus one ESP32-S3-BOX-3.
≈ **$494**. This is everything needed for Phases 0 through 1 and it
proves the concept before you spend real money.

**Buy at Phase 2 start:** B1, B2, B4 (+B3 if you've confirmed Z-Wave
devices). ≈ **$92**. Order the Zigbee stick only once the hub is running —
no reason to have it sitting in a drawer.

**Buy at Phase 3 start:** C satellites for the rooms you've actually
decided on, D audio path once we know the amp, E1 water safety, E2
presence. This is the big spend, ≈ **$1,300**, and by then you'll have
used the system for a month and will know which rooms you actually care
about.

**Buy at Phase 4+:** E3, E4, E5, E6, G2 — feature by feature, only after
the feature before it works.

---

## Things NOT to buy — and traps

- **Don't buy the 8 GB Pi 5** to save $40. You will regret it by Phase 3.
- **Don't buy a Samsung 990 Pro** or other high-end NVMe for the Pi.
  Several fast drives have known Pi 5 compatibility problems, and the Pi's
  PCIe link is the bottleneck anyway. Boring mid-range drive wins.
- **Don't skip the USB extension cable (B2).** $6 prevents the most common
  Zigbee reliability failure.
- **Don't buy Wi-Fi smart devices** for anything you want under the
  strictly-local rule. Zigbee, Z-Wave, Thread, or ESPHome only. A Wi-Fi
  device that phones home to a vendor cloud violates the whole premise.
- **Don't buy smart vents (E3c) reflexively.** They can damage a
  single-zone HVAC system. Get an HVAC opinion.
- **Don't bulk-buy lighting** before the Zigbee mesh is proven in Phase 2.
- **Don't buy satellites for rooms you haven't verified 2.4 GHz coverage
  in** (G4). The Pi Zero 2 W's Wi-Fi is weak.
- **Don't buy the Hailo-8L (A7) yet.** It competes for the same M.2 slot
  as your boot NVMe and you may not need it at all once the GPU box is up.

---

## Open questions blocking a final BOM

1. **Whole-house audio panel** — brand/model of the amp or matrix driving
   the speaker wire, number of zones, and whether every zone has a live
   source. *A photo of the structured-wiring panel resolves this.*
   Swings the BOM by up to $1,800.
2. **GPU box VRAM** — is the 4060 Ti the 16 GB or 8 GB variant? (F1)
3. **`N_sat` and which rooms** — how many voice satellites, where.
4. **Existing Zigbee/Z-Wave devices** — do you own any already? If yes,
   B3 becomes required and E-section quantities drop.
5. **Existing thermostat/locks** — brand and model, so I can tell you
   whether E3b and E5a are needed or already covered.

Answer 1 and 2 and I can turn this into a single ordered cart.
