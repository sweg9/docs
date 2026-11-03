# PRD

## 1. Summary

| Item | Content |
|---|---|
| Product | A system that recognizes unconnected switches with a camera, operates them with a robot arm, and brings them into proactive home routines. The deliverable of this repo is a simulator demo that shows that process |
| Problem | To use an unconnected switch in a routine, a person has to register it by hand, one by one |
| Solution | Join recognition, mapping verification, routine proposal, wireless control with a physical fallback, and learning from results into one flow |
| Basis | Requirements are written in the style of ISO/IEC/IEEE 29148: each requirement states one thing, can be verified, and can be traced |

## 2. Process stages

| Stage | Name | What it does | What the demo shows |
|---|---|---|---|
| S1 | Recognize | Find switches, buttons, dials and remotes in video and classify the type | Detection boxes in the camera view, confidence, rejection of decoys |
| S2 | Map and verify | Link a switch to a device and confirm it with a test signal | Brightness change (CV) after a test pulse |
| S3 | Integrate | Propose a verified mapping as a routine and add it on approval | Proposal dialog (auto-approved in auto mode) |
| S4 | Trigger and intent | Receive time, sensor and routine events and infer intent and target device | Trigger log, intent and confidence |
| S5 | Wireless control | Send the command by the channel plan and check the state with CV | Channel ranking and result |
| S6 | Physical fallback | If wireless fails, run the safety check, then the robot arm presses the control | Safety guard, path planning, arm motion |
| S7 | Learn | Update channel priority and mapping confidence from the result | Change in channel success estimates |

## 3. Functional requirements

Priority is M (must), S (should) or C (could).

| ID | Requirement | Priority | Stage | Component | Verification |
|---|---|---|---|---|---|
| FR-01 | Detect controls (switch, button, dial, remote) in video and classify their type | M | S1 | Actuator Perception | Precision and recall on a labeled set |
| FR-02 | Generate candidate mappings between a control and a target device from spatial context and observed user actions | M | S2 | Mapping Builder | Top-1 mapping accuracy |
| FR-03 | Register a control method (IR, Wi-Fi, BT or physical) per device | M | S2 | Control Orchestrator | Registration scenario test |
| FR-04 | After sending a command, check the expected state change with CV; on failure, ask for re-registration | M | S2, S5 | State Verifier | State-judgment accuracy |
| FR-05 | Store verified mappings durably and look them up before acting | M | S2, S5 | Mapping Registry | Unit tests |
| FR-06 | Receive sensor, time and routine events as situation triggers | M | S4 | Routine Engine | Event-injection test |
| FR-07 | Extract intent and target device with the cloud VLM | M | S4 | Intent Service | Intent accuracy, latency |
| FR-08 | For an unregistered device, guide the user through pre-mapping before acting | S | S2, S5 | Mapping Builder | Scenario test |
| FR-09 | When wireless verification fails, locate the control with CV | M | S6 | Actuator Perception | Localization error |
| FR-10 | Plan the approach path and the manipulation with a VLA model | S (L3) | S6 | VLA Planner | Plan success rate |
| FR-11 | Check for obstacles and hazards; if the check fails, cancel and notify the user | M | S6 | Safety Guard | Hazard-injection test |
| FR-12 | After a physical action, verify the result with CV | M (L3) | S6 | Manipulator Adapter | Action success rate |
| FR-13 | Update channel priority and mapping confidence from results | S | S7 | Learning & Priority | Update-rule unit tests |
| FR-14 | Propose a verified mapping as a routine and add it on approval | M | S3 | Routine Engine | Proposal-approval scenario |
| FR-15 | Measure capability with the Capability Probe and gate stages by level (L0 to L3) | M | all | Capability Probe | Level-downgrade test |
| FR-16 | Log the outcome and latency of every stage so that a run can be traced end to end | M | all | All components | End-to-end scenario runs |

## 4. Non-functional requirements (targets)

| ID | Requirement |
|---|---|
| NFR-01 | Performance: median time from trigger to a verified wireless command is 5 s or less |
| NFR-02 | Recognition: control detection precision 0.90 or higher and recall 0.85 or higher in the test room |
| NFR-03 | Accuracy: confirmed mappings that cause a wrong action are 1% or fewer |
| NFR-04 | Safety: no physical action after a failed safety check; at L3 or above, motion stops within 1 s of a stop command |
| NFR-05 | Privacy: no raw video leaves the home; only crops and metadata go out |
| NFR-06 | Availability: if the robot or cloud fails, drop to a lower level; manual control is never affected |
| NFR-07 | Extensibility: a new control channel is added as an adapter without changing the core |
| NFR-08 | Explainability: every automatic action keeps its intent, confidence, channel and reason in a log |
| NFR-09 | User control: proactive features can be paused at once or switched off one by one |

## 5. Evaluation metrics

A failed run is attributed to the first stage that failed, using the FR-16 logs.

| Metric | Definition | Target |
|---|---|---|
| E1 | End-to-end success rate per scenario | 90 / 80 / 70 % (scenario 1 / 2 / 3) |
| E2 | Success rate of each stage S1 to S7 | No stage below 80% |
| E3 | Latency per stage, and total from trigger to verified | 5 s or less (scenario 1) |
| E4 | Share of runs that reach S6, with causes | Report only |
| E5 | Control detection precision / recall (S1) | 0.90 / 0.85 |
| E6 | Top-1 accuracy of candidate mappings (S2) | 80% or more |
| E7 | CV state-check accuracy (S5) | 95% or more |
| E8 | Physical action success rate (S6, L3) | 90% or more |
| E9 | Proposal acceptance / false-trigger rate (S3, S4) | 70% / under 10% |
| E10 | Time to register a device, compared with manual | Shorter than manual |

Manual registration is the baseline for E10.

## 6. Behavior rules of the simulator demo

The demo does not use real models. It produces values with the rules below. When a rule changes, this table is updated with it.

| Item | Rule |
|---|---|
| Recognition confidence | Computed from whether the control is in view, occlusion (Linecast), and distance and angle. Decoys such as a thermostat are rejected |
| Channel order | Channels are tried in descending order of success probability p minus cost |
| Channel demotion | A channel whose p falls below 0.40 is moved down the ranking |
| Learning | Success or failure updates an exponential moving average (EMA, alpha 0.32) |
| Hazard injection | The `H` key puts a person near the switch, and S6 cancels the action |
| Path finding | A* on a 0.1 m grid, robot radius 0.40 m, replan when blocked |

## 7. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R1 | No access to a robot API or SDK | Stand in with a webcam or simulator; do L0 to L2 first |
| R2 | The VLM misreads or is slow | Validate structured output; ask the user; cache results |
| R3 | Privacy of home video | Edge processing, crop-only upload, opt-in |
| R4 | Safety of physical action | Safety Guard; no action on high-risk devices; level drop |
| R5 | A device has no known IR code | Learning IR hub; physical fallback |
| R6 | Wrong proactive action | Risk-class policy; lower autonomy after rejections |
| R7 | One failing stage stops the end-to-end demo | Stage-wise logs, retries and fallbacks; a recorded run as backup |

## 8. Open items

- The devices and environment for the real demo are not fixed.
- The targets above are hypotheses and are adjusted in the test environment.
