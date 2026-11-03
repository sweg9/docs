# Prompt management

Each stage where an AI makes a judgment (S1, S2, S4, S5, S6) has one prompt. This document is the list, the management rules and the template drafts. The templates are drafts and are not final until they are checked with real models and data.

## 1. List

| ID | Stage | Input | Output | Requirement |
|---|---|---|---|---|
| P-S1 | Recognize | Camera frame | List of controls (type, position, confidence) | FR-01 |
| P-S2 | Map | Spatial context, observed actions, candidate devices | Candidate mappings (top-k, reasons) | FR-02 |
| P-S4 | Intent | Trigger, time, sensors, recent actions | Intent, target device, confidence | FR-07 |
| P-S5 | State check | Images before and after a command | Whether the expected change happened (yes, no, uncertain) | FR-04 |
| P-S6 | Manipulation plan | Control position, obstacle information | Approach path, manipulation | FR-10 |

## 2. Management rules

1. Keep one prompt per file at `prompts/<ID>/v<number>.md`. Do not edit a file that has been used; make a new version.
2. Put the model name, date, reason for the change and evaluation result (metric and value) at the top of the file.
3. The output is always JSON, and the schema is stored with it. Output that does not match the schema is rejected in code and retried once.
4. Every output has `confidence` (0 to 1) and `reason` (one sentence). They go straight into the log of an automatic action (NFR-08).
5. When unsure, the model returns `"uncertain"` and does not guess. The user is then asked (R2).
6. No personally identifiable information in prompts. Only cropped images are used (NFR-05).
7. Before a new version is adopted, run it on the fixed evaluation set and check that it is not worse than the previous version.
8. Failure cases are added to the evaluation set.

## 3. Template drafts

### P-S1 Recognize

```text
Role: find the controls a person operates in an image from a camera in the home.
Types: switch, button, dial, remote
Rules:
- Answer only with what is visible. If a control is hidden or blurry, lower the confidence.
- Thermostats, outlets and decorations are not targets.
- Write coordinates as ratios from 0 to 1 of the image size.
Output (JSON): {"controls":[{"type":"","bbox":[x,y,w,h],"confidence":0.0,"reason":""}]}
```

### P-S2 Map

```text
Role: decide which device a control turns on and off.
Input: position of the control, devices in the same room, recently observed user actions
Rules:
- Prefer devices in the same room and give the reason in one sentence.
- List at most 3 candidates in order of confidence.
- If there is no clear candidate, return "uncertain".
Output (JSON): {"candidates":[{"device":"","confidence":0.0,"reason":""}]}
```

### P-S4 Intent

```text
Role: decide the action the user is most likely to want in the current situation.
Input: trigger (time, sensor, routine), current time, room, recent actions
Rules:
- Do not raise devices with a high risk class (heating) as targets of automatic action.
- Do not propose the same action as a recently rejected proposal.
Output (JSON): {"intent":"","device":"","action":"on|off","confidence":0.0,"reason":""}
```

### P-S5 State check

```text
Role: compare the images before and after a command and decide whether the expected change happened.
Input: image before, image after, expected change (for example lamp off -> on)
Rules:
- Base the answer on a change in brightness or light.
- If it is hard to tell, answer "uncertain".
Output (JSON): {"changed":"yes|no|uncertain","confidence":0.0,"reason":""}
```

### P-S6 Manipulation plan

```text
Role: plan how the robot arm presses a control safely.
Input: 3D position and type of the control, nearby obstacles, position of people
Rules:
- If a person or an obstacle is on the path, do not make a plan and return {"abort":true}.
- Motion by control type: press a rocker once, press a push button briefly, turn a dial.
Output (JSON): {"abort":false,"approach":[[x,y,z]],"action":"press|turn","reason":""}
```

## 4. Evaluation

| Prompt | Metric | Target |
|---|---|---|
| P-S1 | E5 precision / recall | 0.90 / 0.85 |
| P-S2 | E6 Top-1 accuracy | 80% or more |
| P-S4 | E9 false-trigger rate | under 10% |
| P-S5 | E7 state-check accuracy | 95% or more |
| P-S6 | E8 press success rate | 90% or more |
