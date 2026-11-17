# Models

All recognition runs on the hub with models we train. The proposal sends crops to a cloud VLM; the team replaced it with local models (decision of 2026-11-17), so no frame or crop is sent to a model API and nothing is paid per call. The rules for every model are the [AI output rules](/standards/ai-output) (A-01 to A-08).

## List

| ID | Stage | Requirement | Input | Output | How |
|---|---|---|---|---|---|
| M-S1a | S1 Recognize | FR-01 | Camera frame | Boxes of controls with kind: `switch`, `toggle`, `power_strip` | YOLO detector, fine-tuned on our photos (exists) |
| M-S1b | S1 Recognize | FR-01 | Crop of one control | State `on`, `off` or `unknown` | YOLO classifier on the crop. Below the confidence threshold the state is `unknown` |
| M-S2 | S2 Map | FR-02 | Region that changed after a control was used | Device type and box, such as `light` or `fan` | YOLO detector for devices, trained on our photos of devices |
| M-S5 | S5, S6 Verify | FR-08 | Device crop before and after the command, the expected effect | `yes`, `no` or `unsure` | No training. A measure per device type: brightness for a `light`, motion between frames for a `fan` |

Intent (S4, FR-05) needs no model. The Routine Engine takes the device and the action from the routine that fired.

Whether a crop is clear enough (FR-01) is decided from the detector's confidence and the sharpness of the crop (variance of the Laplacian), each against a threshold in the settings file.

## M-S5 in more detail

The main check measures the device itself and the second check the surroundings, as FR-08 asks.

| Device type | Main check (device crop) | Second check (whole frame) |
|---|---|---|
| `light` | Mean brightness after minus before, as a share of before | Mean brightness of the frame |
| `fan` | Mean difference between frames over about 1 s, after compared with before | None |
| Other | `unsure`: the resident is asked | None |

Each measure has two thresholds in the settings file: above the upper one the answer is `yes`, below the lower one `no`, in between `unsure`. Turning a device off uses the same measure with the sign reversed.

## Rules

1. Keep each trained model as a versioned file in `ai-engine`, with a model card: training data, date, reason for the change and evaluation result (A-05).
2. Train and tune on `revise` photos only. `eval` photos are for measuring (see [Labeling](/dataset/labeling)).
3. Every result has `confidence` (0 to 1) and `reason`, a short sentence from a fixed template (A-02). They feed the log and the plain-language explanations (FR-12).
4. When unsure, a model answers `unknown` or `unsure` and does not guess (A-03).
5. Thresholds are settings, not code (C-12).
6. Before a new version is adopted, run the `model-regression` skill on the fixed `eval` set and check it is not worse than the previous one (A-06). Add failure cases to the set.

## Data each model needs

| Model | Labels | Status |
|---|---|---|
| M-S1a | `controls[].kind` and `bbox` | Exists |
| M-S1b | `controls[].state` | Missing: no photo has a state yet. Frames from a video of the demo switch, flipped on and off, are the quickest start |
| M-S2 | `devices[]` with `type` and `bbox` | Missing. Start with the demo devices, a lamp and a fan |
| M-S5 | Before and after pairs with the real result | Missing. Record the demo devices being switched on and off; used to set the thresholds |
