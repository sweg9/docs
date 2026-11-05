# Requirements

What the system must do, and how each requirement is built. The resident gives feedback on routines and has the final say. A physical hand presses controls when needed: option A is the SO-101 arm, option B is two linear actuators. The cloud VLM works out the intent. The smart-home hub sends IR, Wi-Fi and Bluetooth commands.

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
| FR-09 | Arm motion planning | S6 | Geonhak Lee |
| FR-10 | Safety gate | S6 | Jemin An |
| FR-11 | Physical execution and result check | S6 | Jemin An |
| FR-12 | Learning and log | S7 | Jiwon Han (log), Jemin An and Jiwon Han (learning) |

`FR-xx` is requirement *xx* of the paper. The web app screens (Hyunseo Choi) serve FR-02, FR-04, FR-10 and FR-12.

## FR-01 Control recognition

From the robot's camera feed, find switches, push buttons, toggles, knobs and remotes and decide the type of each one. Save a record per control with the type, the visible state, the possible actions, its position and a picture fingerprint (embedding), so the same control is recognized later and no duplicate is created. A control that cannot be told clearly is skipped until a clearer frame is available.

| How | Value |
|---|---|
| Detector | Small YOLO model fine-tuned on our photos, five classes: switch, push button, toggle, knob, remote |
| Frame rate | Every fifth frame |
| Type and state | Each crop goes to the VLM, which returns type, state (on or off) and whether the picture is clear enough |
| Duplicate check | Fingerprint compared with saved ones; very similar means the same control |
| Sound | If a microphone is present, a sound model notes clicks when a control is used |
| Training photos | Real switches, buttons and dials in different places, angles and light. A tool drafts boxes, people correct them |
| Sessions | A session is one visit to one place at one time of day, with its own light and angles |
| Split | 80% of the photos revise the prompts and labels; 20% are kept for evaluation only and never used for revision |
| Evaluation set | Every session gives 20% of its own photos, so the evaluation set has the same mix of places and light as all the data. Photos taken within a few seconds of each other go to the same side |
| Measured on the 20% | For example, how many controls are found with the right type and state |

## FR-02 Device mapping

Suggest which device each control operates, by **watching** (the resident uses a control and a nearby device changes, seen or heard) or by **testing** (the robot presses the control and the system compares the device before and after, by camera and by sound). Each candidate starts as `Pending` with a confidence value. It becomes `Verified` only when the change is clear and the VLM agrees. The resident can reject a mapping at any time (`Rejected`). If a control looks different or has moved, its mapping becomes `Stale` and is verified again before use.

| How | Value |
|---|---|
| Watch window | About 3 s of pictures and sound after the resident uses a control |
| Ranking hints | Same room, short distance in the picture, VLM thinks the change fits the device |
| Saved spot | When a mapping becomes `Verified`, the spot from which the robot saw the change is saved with it |

## FR-03 Control-method registration

For each device, register the methods that might work: IR, Wi-Fi, Bluetooth, or a press by the arm. Send a test command by each wireless method and keep it only if state verification confirms the change. A device with no working wireless method is saved as an arm target.

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
| Low | Lights, fans | High confidence: act and tell. Medium: ask first. Low: only suggest |
| Medium | TV, air purifier | Always ask first, if confidence is not too low |
| High | Heaters, power strips | Only suggest; never act alone; the arm never presses |

Thresholds start at 0.8 (high) and 0.5 (low). The risk sorting lives in a settings file.

## FR-07 Channel selection and wireless command

The Control Orchestrator looks up the target in the Mapping Registry. Without a verified mapping the system does not act, unless the resident agrees to map the device first. It ranks the wireless channels, preferring ones that often worked and are fast, sends through the best one, and tries the next if verification fails. The arm is used only when the device has no wireless channel or every channel failed.

| How | Value |
|---|---|
| Time per channel | Up to 5 s, then the result is checked |

## FR-08 State verification

After each command, check whether the device really changed. The **main check** looks at the device itself (a lit lamp, a spinning fan, a lit display): unless the device is already in view, the robot goes to the spot saved with the mapping. **Second checks** look at the surroundings (the room getting brighter) and, with a microphone, at sound (a fan hum, a click). The main check decides; second checks decide only when it is unsure. Disagreements are logged. The result is `success`, `failure` or `unsure`. Failure moves on to the next channel or, when no wireless channel is left, to the arm. An unsure result is checked once more after a short wait, without operating the device again. If it is still unsure, the run stops, and the resident gets a picture of the device and chooses whether to try again or leave it as it is.

| How | Value |
|---|---|
| Main check | VLM answers a yes-or-no question on the device crop ("is the lamp on?"), plus a before and after comparison |
| Wait for effect | Up to 3 s |
| Second look after unsure | About 3 s more, without operating the device |

## FR-09 Arm motion planning

The robot first moves to the control's saved press spot, where the control is visible and within reach of the hand. Find the control again in the current image, starting from its saved position and fingerprint, and turn it into something the hand can act on. If it cannot be found or its position is not reliable enough, cancel and tell the resident. With the arm, a motion planner receives the control, its position and the expected effect, and returns a path and a way to press. With linear actuators, there is no path to plan.

| How | Value |
|---|---|
| Getting there | In the prototype, the hand is on a wheeled cart that stands in for a mobile base, and a team member pushes it to the spot |
| Re-finding | Fingerprint similarity at least 0.7 near the saved place, otherwise cancel |
| Option A, panel coordinates | Four ArUco markers at the panel corners; homography from image point to panel point, then the arm's kinematics give joint angles |
| Option A, press depth | Set per kind of control |
| Option A, planner | Simple script by default; a VLA model can replace it |
| Option B, actuator choice | The cart is placed so that one actuator faces the control; the system only chooses which actuator to use and how long to push |

## FR-10 Safety gate

Before any movement, check that no person or pet is near the robot's route or the path of the hand, that the risk class allows a press, and that the control's position is reliable. If any check fails, cancel and tell the resident why. Heaters and power strips are never pressed.

| How | Value |
|---|---|
| People and pets | Camera model watches the robot's route and the work area of the arm or the actuators, before and during movement |
| Motion | The arm stays inside its work area at low speed; the linear actuators have a short stroke and a limited force |
| Emergency stop | Button in the app or a key; turns off the motors of the arm or the actuators at once. The power adapter can also be switched off by hand |

## FR-11 Physical execution and result check

The arm or the actuator presses through the Manipulator Adapter and state verification runs again. If the check reports a failure, retry a limited number of times with the safety gate before each try, then cancel and tell the resident. An unsure result is handled as in FR-08 and never leads to another press.

| How | Value |
|---|---|
| Option A motion | Move above the control, press, hold briefly, release, move back |
| Option B motion | Push out, hold briefly, pull back |
| Executor | SO-101 arm, linear actuators, Unity simulator or a simple script, chosen in a settings file |
| Tries | At most 2 |

## FR-12 Learning and log

After each run, update how often the used channel worked and how fast it was, weighting recent results more. A mapping loses confidence when a later check disagrees, gains it when one agrees, and becomes `Stale` if confidence gets too low or the resident rejects the result. After a successful press, the spot where the robot stood is saved as the control's press spot. Every run, including a cancelled one, writes a log entry: trigger, intent, confidence, channel, result of each stage, main and second checks, and the reason for any cancellation. The resident can read the intent, channel and reason of any automatic action in plain language.

| How | Value |
|---|---|
| Channel score | Running average; the newest result counts 30% |
| Link confidence | +0.05 when a later check agrees, down when it disagrees; `Stale` below 0.2 |
| Explanations | Fixed sentence templates, for example "I switched on the fan at 21:05 by IR because of your evening routine. Checked: it worked." |
