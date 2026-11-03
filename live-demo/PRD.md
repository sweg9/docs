# PRD

## 1. Summary

| Item | Content |
|---|---|
| Product | A front end that runs and shows the process with the real camera and arm |
| Problem | The simulator cannot show how the system behaves with real video, devices and an arm |
| Solution | Connect to `backend-server` and show results, reasons and failure behavior in one place |
| Reference | The [proposal](/papers/proposal). This document adds only the screen requirements (LD), each linked to [FR-01 to FR-12](/product/requirements) |
| Stack | TypeScript 5 and React 18, in a browser. See [Development environment](/product/environment) |

## 2. Screens per stage

| Stage | Name | Where it is processed | What the screen shows |
|---|---|---|---|
| S1 | Recognize | Edge hub, cloud VLM | Boxes, type, state and whether the picture is clear |
| S2 | Map | Edge hub, cloud VLM, backend | Candidate devices, confidence, status (`Pending`, `Verified`, `Rejected`, `Stale`) |
| S3 | Routines | Backend | The proposed routine, with accept and reject, and saved routines, with change and remove |
| S4 | Trigger and intent | Backend, cloud VLM | Trigger, intent, target device, confidence |
| S5 | Wireless control | Backend, edge hub | Channel order, result per channel, main and second checks |
| S6 | Arm press | Edge hub, arm | Safety gate result, press, tries, reason for a cancellation |
| S7 | Learning and log | Backend | Channel scores, mapping confidence, plain-language explanation |

## 3. Functional requirements

Priority is M (must), S (should) or C (could).

| ID | Requirement | Priority | Stage | Linked to | Verification |
|---|---|---|---|---|---|
| LD-01 | Show the camera view | M | S1 | FR-01 | Scenario 1 |
| LD-02 | Show the box, type and state of each detected control over the view | M | S1 | FR-01 | Screen test with stored responses |
| LD-03 | Show candidate mappings with confidence, and let the resident confirm or reject them | M | S2 | FR-02 | Scenario test |
| LD-04 | Show when a mapping becomes `Stale` and is checked again | S | S2 | FR-02, FR-12 | Move a control |
| LD-05 | Ask the resident to pick a method or check the device after failed registration tests | M | Setup | FR-03 | Failed registration test |
| LD-06 | Show each proposed routine, let the resident accept or reject it, and let the resident change or remove saved routines | M | S3 | FR-04 | Scenario test |
| LD-07 | Let the resident build a routine by hand from a verified control | M | S3 | FR-04 | Scenario 1 |
| LD-08 | Let the resident set how independently a routine acts: do it and tell, ask first, or only suggest | M | S3 | FR-04, FR-06 | Scenario test |
| LD-09 | Let the presenter start sensor, time and routine triggers by hand | M | S4 | FR-05 | Event injection test |
| LD-10 | Ask first or only suggest according to the risk and confidence of the device | M | S4 | FR-06 | Low, medium and high-risk cases |
| LD-11 | Offer mapping first when a target has no verified mapping | M | S5 | FR-07 | Unmapped device test |
| LD-12 | Show channel order and the result of each channel | M | S5 | FR-07 | Wireless failure test |
| LD-13 | Show `success`, `failure` or `unsure`, with main and second checks, and show an unsure result to the resident | M | S5, S6 | FR-08 | Response injection test |
| LD-14 | Show the safety gate result and the reason for a cancellation | M | S6 | FR-09, FR-10 | Scenario 4 |
| LD-15 | Keep an emergency stop button on every screen | M | All | FR-10 | Stop test |
| LD-16 | Show the arm's tries and result | S | S6 | FR-11 | Scenario 3 |
| LD-17 | Show channel scores and mapping confidence before and after a run | S | S7 | FR-12 | Consecutive runs |
| LD-18 | Show every run, including cancelled ones, in plain language, and export the log to a file | M | All | FR-12 | End-to-end run |
| LD-19 | Keep proactive features off until the resident turns them on, and allow pausing them at any time | M | All | Proposal, Section I.C | Pause test |
| LD-20 | Show a setup guide | S | Setup | Proposal, Roles | Walkthrough |
| LD-21 | Show the cause when the server, cloud or camera connection drops, without freezing the screen | M | All | FR-05 | Connection cut test |

## 4. Quality checks

| Item | Rule | How to check |
|---|---|---|
| Privacy | Video stays on the edge hub, and only crops and short notes go to the cloud. The front end calls only `backend-server` | Inspect browser and server request records |
| Emergency stop | The button sends the stop at once, which turns off the arm's motors (FR-10) | Stop test |
| Explanations | What the screen shows matches the log | Compare screen and log |
| Live updates | New controls, routines and run progress appear without a reload | Scenario 1 and 3 |

## 5. What to measure

The proposal gives starting values, not success targets, so the demo reports what it measures. Starting values are listed in [Requirements](/product/requirements).

| Item | Requirement | Method |
|---|---|---|
| Control detection | FR-01 | Results on the kept-aside photo session (see the [dataset PRD](/dataset/PRD)) and on the live view |
| Mapping result | FR-02 | Share of mappings that reach `Verified` and are correct |
| Registration time | FR-03 | Compare with registering the same device by hand |
| Run result per stage | FR-12 | Log of repeated runs. A failed run counts against the first stage that failed |
| Time from trigger to checked result | FR-05, FR-07, FR-08 | Log |
| Share of runs that reach the arm, and why | FR-07 | Log. Failures created on purpose are counted separately |
| Arm press result | FR-11 | Repeat scenario 3 |
| Routine feedback | FR-04 | Share of proposals accepted, and of routines changed or removed |

## 6. Behavior rules

| Item | Rule |
|---|---|
| Source of values | Every value on screen comes from a server response. The front end does not create or change results |
| Fake responses | For development only, always marked on screen when on, and never measured |
| Routines | The system proposes a routine to the resident, and the resident can also add one by hand |
| Low-risk devices (lights, fans) | Act and tell at high confidence, ask first at medium, otherwise only suggest (FR-06) |
| Medium-risk devices (TV, air purifier) | Always ask first, if confidence is not too low (FR-06) |
| High-risk devices (heaters, power strips) | Only suggest, with no action button. The arm never presses them (FR-06, FR-10) |
| Log | Each run also records the executor (real arm, simulator or script) and the prompt and model versions |

## 7. Risks

| Risk | Response |
|---|---|
| The real arm is not ready | Use the Unity simulator or a simple script through the settings file, and show which one is in use |
| The VLM misreads or is slow | Show a waiting state. On `unsure` or a timeout, ask or only suggest |
| Privacy of video in a home | Keep people and personal items out of recordings and logs |
| Safety of the arm | Keep the emergency stop on every screen, and show no press action for high-risk devices |
| One stage fails during the demo | Show the failure per stage, allow a retry, and keep a recorded backup |

## 8. Open items

- The final demo devices are not fixed.
- The team has agreed that routines are proposed to the resident. FR-04 and the proposal still say they are registered without approval until they are updated.
- The hand is not decided: option A is the SO-101 arm, and option B is two linear actuators. Only one is used.
- The relation between `live-demo` and the resident's web app is not settled. The [repository page](/overview/repositories) lists them together, and these documents treat them as the same front end.
- The number of repeated runs per scenario is decided once the hardware is ready.
