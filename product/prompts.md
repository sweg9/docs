# Prompts

The cloud VLM is used in four places. Each has one prompt. This page lists them, the rules for managing them, and template drafts. The templates are drafts until they are checked with the chosen VLM and real photos.

## List

| ID | Stage | Requirement | Input | Output |
|---|---|---|---|---|
| P-S1 | S1 Recognize | FR-01 | Crop of one detected control | Type, state, whether the picture is clear enough |
| P-S2 | S2 Map | FR-02 | Before and after crops of a candidate device, the control's type | Whether the change fits the device |
| P-S4 | S4 Intent | FR-05 | Situation (time, room, nearby device states) and up to 3 crops | Intent, target device, confidence |
| P-S5 | S5, S6 Verify | FR-08 | Crop of the device after the command, and the expected effect | Yes, no or unsure |

The motion planner (FR-09) is a script or a VLA model, not a prompt.

## Rules

1. Keep one prompt per file at `prompts/<ID>/v<number>.md`. Do not edit a used file; make a new version.
2. Put the model name, date, reason for the change and evaluation result at the top of the file.
3. The output is always JSON with a stored schema. Output that does not match is rejected in code and retried once.
4. Every output has `confidence` (0 to 1) and `reason` (one sentence). They feed the log and the plain-language explanations (FR-12).
5. When unsure, the model answers `unsure` and does not guess.
6. Only crops of controls and devices are sent, never full frames, and no personal information.
7. Respect the time limit of the stage, for example about 8 s for P-S4. On timeout the system only suggests.
8. Before a new version is adopted, run it on a fixed set of photos and check it is not worse than the previous one. Add failure cases to that set.

## Template drafts

### P-S1 Read a control

```text
Role: read one control in a crop from a camera next to a switch panel.
Types: switch, toggle, power_strip
Rules:
- Answer only from what is visible.
- If the crop is blurry, cut off or hidden, set clear to false.
Output (JSON): {"type":"","state":"on|off|unknown","clear":true,"confidence":0.0,"reason":""}
```

### P-S2 Check a mapping

```text
Role: decide whether a change seen after a control was used belongs to this device.
Input: device crop before, device crop after, device type, control type
Rules:
- Base the answer on the device itself, such as light or movement.
- If the change could come from something else, answer "unsure".
Output (JSON): {"fits":"yes|no|unsure","confidence":0.0,"reason":""}
```

### P-S4 Infer intent

```text
Role: decide what the resident most likely wants now.
Input: trigger, time, room, states of nearby devices, up to 3 crops
Rules:
- Name one target device from the given list.
- Do not propose an action the resident rejected recently.
Output (JSON): {"intent":"","device":"","action":"on|off","confidence":0.0,"reason":""}
```

### P-S5 Verify a result

```text
Role: answer one yes-or-no question about a device after a command.
Input: device crop after the command, expected effect (for example "the lamp is on")
Rules:
- Look at the device itself first.
- If it is hard to tell, answer "unsure".
Output (JSON): {"answer":"yes|no|unsure","confidence":0.0,"reason":""}
```
