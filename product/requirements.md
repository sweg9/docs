# Requirements

What the system must do, and how each requirement is built. The resident gives feedback on routines and has the final say. The robot moves to a control and presses it when needed; in the prototype it is linear actuators on a cart. The cloud VLM works out the intent. The smart-home hub sends IR, Wi-Fi and Bluetooth commands.

All numbers are **starting values** to be tuned after the first measurements. Keep them in settings files, not in code.

## Summary

| ID | Requirement | Stage | Owner |
|---|---|---|---|
| FR-01 | Control recognition | S1 | Geonhak Lee |
| FR-02 | Device mapping | S2 | Jiwon Han |
| FR-03 | Control-method registration | Setup | Jemin An |
| FR-04 | Routine registration and feedback | S3 | Jiwon Han |
| FR-05 | Trigger and intent | S4 | Jiwon Han |
| FR-06 | Autonomy by risk | Runtime | Jemin An |
| FR-07 | Channel selection and wireless command | S5 | Jemin An |
| FR-08 | State verification | S5, S6 | Geonhak Lee |
| FR-09 | Robot motion planning | S6 | Geonhak Lee |
| FR-10 | Safety gate | S6 | Jemin An |
| FR-11 | Physical execution and result check | S6 | Jemin An |
| FR-12 | Learning and log | S7 | Jiwon Han (log), Jemin An and Jiwon Han (learning) |

`FR-xx` is requirement *xx* of the paper. The web app screens (Hyunseo Choi) serve FR-02, FR-04, FR-10 and FR-12.

## FR-01 Control recognition

From the robot's camera feed, find wall switches, toggles and power strips and decide the type of each one. Save a record per control with the type, the visible state, the possible actions, its position and a picture fingerprint (embedding), so the same control is recognized later and no duplicate is created. A control that cannot be told clearly is skipped until a clearer frame is available.

| How | Value |
|---|---|
| Detector | Small YOLO model fine-tuned on our photos, three classes: wall switch, toggle, power strip |
| Frame rate | Every fifth frame |
| Type and state | Each crop goes to the VLM, which returns type, state (on or off) and whether the picture is clear enough |
| Duplicate check | Fingerprint compared with saved ones; very similar means the same control |
| Training photos | Real wall switches, toggles and power strips in different places, angles and light. A tool drafts boxes, people correct them |
| Sessions | A session is one visit to one place at one time of day, with its own light and angles |
| Split | 80% of the photos revise the prompts and labels; 20% are kept for evaluation only and never used for revision |
| Evaluation set | Every session gives 20% of its own photos, so the evaluation set has the same mix of places and light as all the data. Photos taken within a few seconds of each other go to the same side |
| Measured on the 20% | For example, how many controls are found with the right type and state |

## FR-02 Device mapping

Suggest which device each control operates, by **watching** (the resident uses a control and a nearby device visibly changes: a switch is flipped and a fan starts to turn) or by **testing** (the robot presses the control and the system compares the device before and after by camera). Each candidate starts as `Pending` with a confidence value. It becomes `Verified` only when the change is clear and the VLM agrees. The resident can reject a mapping at any time (`Rejected`). If a control looks different or has moved, its mapping becomes `Stale` and is verified again before use.

| How | Value |
|---|---|
| Watch window | About 3 s of camera pictures of nearby devices after the resident uses a control |
| Ranking hints | Same room, short distance in the picture, VLM thinks the change fits the device |
| Saved spot | When a mapping becomes `Verified`, the spot from which the robot saw the change is saved with it |

## FR-03 Control-method registration

For each device, register the methods that might work: IR, Wi-Fi, Bluetooth, or a physical press by the actuator. Send a test command by each wireless method and keep it only if the change is confirmed as in FR-08: by the state the platform reports, or by a camera check for IR. A device with no working wireless method is saved as an actuator target.

| How | Value |
|---|---|
| IR | Wi-Fi IR blaster |
| Wi-Fi | Smart plug or bulb |
| Bluetooth | Python Bluetooth library |
| Wait per test | Up to about 5 s |
| Retries | Up to 3, then the app asks the resident to pick a method or check the device |

## FR-04 Routine registration and feedback

A verified mapping can become a routine without waiting for approval. When the system notices a repeated habit it registers a routine and tells the resident what was added. The resident can also build one by hand. The resident can keep, change or remove a routine, or change how independently it acts. Often-rejected routines get lower priority, accepted ones higher.

| How | Value |
|---|---|
| Habit | Same device and action at about the same time of day, within a 30-minute window, on at least 3 days |
| Independence | Do it and tell, ask first, or only suggest |
| Demotion | Rejected 3 times in a row, one step less independent |

## FR-05 Trigger and intent

Accept sensor, time and routine events as triggers and attach the situation: time, room, state of nearby devices. Each trigger starts one run with its own ID. The Routine Engine sends the situation and crops of the relevant controls to the cloud VLM, which returns the intent, the target device and a confidence value. If the cloud cannot be reached, the system does not act and only suggests.

| How | Value |
|---|---|
| Duplicate merge | Same event twice within 10 s counts once |
| VLM input | Situation description and up to 3 crops |
| VLM timeout | About 8 s |
| Final confidence | Mix of VLM confidence, trigger reliability, and how often the resident accepted this routine |

## FR-06 Autonomy by risk

| Risk | Devices | Policy |
|---|---|---|
| Low | Lights, fans, TV, air purifier | High confidence: act and tell. Medium: ask first. Low: only suggest |
| High | Heaters, electric blankets, microwaves, and the power strips that feed them | A warning when the routine is registered and a notification on every run. Turning off follows the low-risk rules; turning on always asks first and does nothing without an answer. The hand presses them only when this policy allows it |

Thresholds start at 0.8 (high) and 0.5 (low). The risk sorting lives in a settings file.

## FR-07 Channel selection and wireless command

The Control Orchestrator looks up the target in the Mapping Registry. Without a verified mapping the system does not act, unless the resident agrees to map the device first. It ranks the wireless channels, preferring ones that often worked and are fast, sends through the best one, and tries the next if the result is a failure (FR-08). The physical press is used only when the device has no wireless channel or every channel failed.

| How | Value |
|---|---|
| Time per channel | Up to 5 s, then the result is checked |

## FR-08 State verification

After each command, decide whether the device really changed. How depends on the channel:

| Channel | How the result is decided |
|---|---|
| Wireless, the device reports its state (ThinQ, Matter, Wi-Fi, Bluetooth) | The state and errors the platform reports. No camera check. An error or no report within the channel's time limit is a failure |
| Wireless, no response (IR) | Camera check. The robot goes to the spot saved with the mapping, unless the device is already in view |
| Physical press | Camera check, always. The robot is already at the control |

A camera check has two parts. The **main check** looks at the device itself (a lit lamp, a spinning fan, a lit display). The **second check** looks at the surroundings (the room getting brighter). The main check decides; the second check decides only when it is unsure. Disagreements are logged. The result is `success`, `failure` or `unsure`. Failure moves on to the next channel or, when no wireless channel is left, to the actuator. An unsure result is checked once more after a short wait, without operating the device again. If it is still unsure, the run stops, and the resident gets a picture of the device and chooses whether to try again or leave it as it is.

| How | Value |
|---|---|
| Reported state | Read from the platform after the command, within the channel's time limit (FR-07) |
| Main check | VLM answers a yes-or-no question on the device crop ("is the lamp on?"), plus a before and after comparison |
| Wait for effect | Up to 3 s |
| Second look after unsure | About 3 s more, without operating the device |

## FR-09 Robot motion planning

The robot first moves to the control's saved press spot, where the control is visible and within reach of an actuator. Find the control again in the current image, starting from its saved position and fingerprint, and turn it into something the actuator can act on. If it cannot be found or its position is not reliable enough, cancel and tell the resident. Otherwise the planner receives the control, its position and the expected effect, and returns which actuator to use and how long to push. Linear actuators have no joints, so there is no path to plan. The planner is a simple script, used through the RAL so that a VLA model or a different robot can replace it later.

| How | Value |
|---|---|
| Getting there | In the prototype, the actuators are on a wheeled cart that stands in for a mobile base, and a team member pushes it to the spot |
| Re-finding | Fingerprint similarity at least 0.7 near the saved place, otherwise cancel |
| Press depth | Set per kind of control |
| Planner | A simple script; a VLA model can replace it later |
| Actuator choice | The cart is placed so that one actuator faces the control; the system only chooses which actuator to use and how long to push. No path to plan |

## FR-10 Safety gate

Before any movement, check that no person or pet is near the robot's route or the actuators' work area, that the risk class allows a press, and that the control's position is reliable. If any check fails, cancel and tell the resident why. High-risk devices (heaters, electric blankets, microwaves and the power strips that feed them) are pressed only when the risk policy of FR-06 allows it.

| How | Value |
|---|---|
| People and pets | Camera model watches the robot's route and the work area of the actuators, before and during movement |
| Motion | The linear actuators have a short stroke and a limited force |
| Emergency stop | Button in the app or a key; turns off the motors of the robot at once. The power adapter can also be switched off by hand |

## FR-11 Physical execution and result check

The actuator presses through the Manipulator Adapter and state verification runs again. If the check reports a failure, retry a limited number of times with the safety gate before each try, then cancel and tell the resident. An unsure result is handled as in FR-08 and never leads to another press.

| How | Value |
|---|---|
| Motion | The actuator facing the control pushes out, holds briefly and pulls back |
| Executor | Linear actuators, Unity simulator (rough demo and tests) or a simple script, chosen in a settings file |
| Tries | At most 2, made only after a failed check; an unsure result never leads to another press |

## FR-12 Learning and log

After each run, update how often the used channel worked and how fast it was, weighting recent results more. A mapping loses confidence when a later check disagrees, gains it when one agrees, and becomes `Stale` if confidence gets too low or the resident rejects the result. After a successful press, the spot where the robot stood is saved as the control's press spot. Every run, including a cancelled one, writes a log entry: trigger, intent, confidence, channel, result of each stage, main and second checks, and the reason for any cancellation. The resident can read the intent, channel and reason of any automatic action in plain language.

| How | Value |
|---|---|
| Channel score | Running average; the newest result counts 30% |
| Link confidence | +0.05 when a later check agrees, down when it disagrees; `Stale` below 0.2 |
| Explanations | Fixed sentence templates, for example "I switched on the fan at 21:05 by IR because of your evening routine. Checked: it worked." |
