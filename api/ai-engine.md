# ai-engine interface

::: warning Draft
A first proposal for the Python interface that the enclave calls. `ai-engine` owns it and changes this page as it builds it. Numbers are starting values and belong in `ai-engine`'s `settings.yaml` (C-12).
:::

Since 2026-11-20 `ai-engine` runs inside the Nitro Enclave on AWS (see [Stack](/overview/stack#where-each-part-runs)). The enclave program imports it, opens the sealed photos the hub sends, and calls it for each request of the [hub messages](/api/hub-messages). This page lists every call. The hub and the server never import `ai_engine`. The `Engine` is on the `ai-engine` branch `yolo11n-640-synth`, next to the training scripts of the control detector, the Linker and the effect check. Calls marked below as not built or not trained answer safely. The models behind each call are in [Models](/product/models); the rules for their answers are the [AI output rules](/standards/ai-output).

## Use

```python
from ai_engine import Engine

engine = Engine.load(settings)           # settings come over vsock; loads every model once
found = engine.detect_controls(frame)    # list[ControlBox]
```

| Rule | |
|---|---|
| Package | `ai_engine`, in the `ai-engine` repo next to the training code (`detector/`, `linker/`, `effect_check/`) |
| Loading | `Engine.load(settings, root=None)` takes the settings as a dict and loads every model file named under `paths` in them, relative to `root` (the repo root by default). It fails at once if a named file or a needed setting is missing; a path set to `null` means that model is not trained yet. The enclave has no disk or network and no image holds settings (C-12), so the server reads `ai-engine`'s `settings.yaml` from the ConfigMap and passes it over vsock when the enclave starts, as it does with `risk.yaml`. Model files are built into the enclave image. The enclave program calls `load` at start, not during a run. Training scripts may still read `settings.yaml` from the repo |
| Images | NumPy arrays as OpenCV gives them: `uint8`, height × width × 3, BGR |
| Boxes and points | Ratios from 0 to 1 of the image size, `[x1, y1, x2, y2]`, the same as in the [hub messages](/api/hub-messages#shared-shapes) |
| Threads | One call at a time. The enclave program calls the engine from one worker thread |
| Results | Frozen Pydantic models, checked when they are made (A-01). Every result has `confidence` (0 to 1) and `reason`, one sentence from a fixed template (A-02) |
| Unsure | Below its threshold a call answers `unknown` or `unsure` and does not guess (A-03) |
| Errors | A bad input (empty image, box outside 0 to 1) raises `ValueError`. A model failure raises `EngineError` with a reason; the enclave answers the request with it, and the hub fails the stage (A-04) |
| Not trained yet | A call whose model does not exist yet still answers, safely: `read_state` gives `unknown`, `detect_devices` gives nothing, `check_effect` gives `unsure`, `fingerprint` gives `null`. So the hub and the enclave program can be built and tested before the models are trained. `detect_controls` and `find_people` instead raise `EngineError` without their model, because an empty answer would read as "nothing there" (C-04) |

## Calls

| Call | Returns | Stage | Model |
|---|---|---|---|
| `detect_controls(frame)` | `list[ControlBox]` | S1 | M-S1a |
| `read_state(crop, kind)` | `StateResult` | S1 | M-S1b |
| `is_clear(crop, score)` | `ClearResult` | S1 | Sharpness and score thresholds |
| `link_guess(controls, room)` | `list[LinkGuess]` | S1, S2 | M-S2a Linker |
| `fingerprint(crop)` | `Fingerprint` or `null` | S1, S6 | DINOv2 small, not built: `null` |
| `measure_change(before, after)` | `ChangeResult` | S2 | Frame difference on a grid of cells (NumPy) |
| `detect_devices(image)` | `list[DeviceBox]` | S2 | M-S2 |
| `check_effect(before, after, device_box, device_type, action)` | `CheckResult` | S5, S6 | M-S5 baseline measure; the learned MobileNet check is not wired in yet |
| `find_people(image)` | `list[PersonBox]` | S1, S6 | Pretrained YOLO |
| `refind_control(frame, saved)` | `RefindResult` | S6 | M-S1a and fingerprints |
| `plan_press(control, kind, actuators)` | `PressPlan` | S6 | Script (FR-09) |
| `versions()` | `dict[str, str]` | Any | Model file names and hashes, for reports and model cards (A-05) |

### `detect_controls(frame)` (FR-01)

Runs the control detector on one photo. The hub decides when to send a photo (FR-01).

| `ControlBox` field | Type | Rule |
|---|---|---|
| `kind` | `switch` `toggle` `power_strip` | Always a kind of the [data model](/standards/data-model) |
| `box` | box | |
| `confidence` | number | The detector's score |
| `reason` | string | `"switch found with score 0.91"` |

Detections below `predict.conf` are dropped. The detector's classes become kinds through `kind_map` in the settings, and a class with no entry is dropped. The current model, `yolo11n-640-synth`, is trained on the three kinds and needs no map. The map is only for falling back to detector-v1, which was trained on five earlier classes: `switch` and `push_button` → `switch`, `toggle` → `toggle`; `knob` and `remote` are dropped. It has no `power_strip` class and finds power strip switches as `switch`, as its training labels did.

### `read_state(crop, kind)` (FR-01)

| `StateResult` field | Type | Rule |
|---|---|---|
| `state` | `on` `off` `unknown` | `unknown` below `state.threshold` |
| `confidence` | number | |
| `reason` | string | `"looks off (0.93)"`, `"state classifier not trained"` |

### `is_clear(crop, score)` (FR-01)

| `ClearResult` field | Type | Rule |
|---|---|---|
| `clear` | boolean | `true` only if `score` and the sharpness (variance of the Laplacian) both pass their thresholds |
| `sharpness` | number | |
| `confidence`, `reason` | | `"too blurry (sharpness 41 < 80)"` |

### `link_guess(controls, room)` (FR-02)

Guesses, before any press, which class of device each switch key runs. `controls` is the list from `detect_controls` for one photo; `room` is the room type from the `recognize` request. The Linker groups keys whose boxes are closer than `linker.plate_gap` key widths into one plate, then looks up P(device class | room, gang count, gang index) in its probability table. It answers one item per control, in the same order, and fills `gang` and `link_guess` of `recognize.result` (see [hub messages](/api/hub-messages#recognize-result-server-to-hub)).

| `LinkGuess` field | Type | Rule |
|---|---|---|
| `gang` | object or `null` | `count` and `index` of the key on its plate; `null` for a control that is not a `switch` |
| `device_class` | string or `null` | The most likely class of the Linker's table, such as `ceiling_light` or `exhaust_fan`; `null` with `gang` |
| `p` | number | Its probability. `linker.floor` keeps every guess below 1 before a press |
| `confidence`, `reason` | | `confidence` is `p`; `"key 1 of 2 in a living room: ceiling light (0.74)"` |

A guess is never a mapping: only a press with a clear change (C-08) links a control to a device.

### `fingerprint(crop)` (FR-01, FR-09)

| `Fingerprint` field | Type | Rule |
|---|---|---|
| `vector` | 384 numbers | Normalized to length 1, so the cosine similarity is a dot product |
| `model` | string | Model file, so fingerprints of different models are never compared |

Until DINOv2 is built the call returns `null`, and the hub stores no fingerprint ([Database](/overview/database#controls)). `Fingerprint.similarity(other)` returns the cosine similarity and raises `ValueError` if the models differ. The hub keeps the fingerprints and compares them itself (see [Database](/overview/database#controls)) with the same formula and does not import `ai_engine`. The server keeps no database.

### `measure_change(before, after)` (FR-02)

Compares two crops of the same region, taken before and after the resident flipped a control.

| `ChangeResult` field | Type | Rule |
|---|---|---|
| `change_score` | number | 0 to 1, returned in `check.result` while mapping |
| `clear` | boolean | Above `change.threshold`, the clear change that C-08 needs |
| `confidence`, `reason` | | `"region got 38% brighter"` |

### `detect_devices(image)` (FR-02)

Runs the device detector on the region that changed (the enclave crops it with some margin).

| `DeviceBox` field | Type | Rule |
|---|---|---|
| `type` | device type | Only types the model was trained on, starting with `light` and `fan` |
| `box` | box | In the image passed |
| `confidence`, `reason` | | |

An empty list means no device was found; the mapping then stays `Pending` (C-08).

### `check_effect(before, after, device_box, device_type, action)` (FR-08)

The camera check of one command. `before` and `after` are short lists of whole frames: about 1 s of frames before the command, and about 1 s after the wait for effect. A `fan` needs several frames to see motion; a `light` needs one.

| `CheckResult` field | Type | Rule |
|---|---|---|
| `main` | `yes` `no` `unsure` | On the device crop: brightness for `light`, motion for `fan`, `unsure` for any other type |
| `second` | `yes` `no` `unsure` or `null` | On the whole frame: brightness for `light`; `null` for types without a second check |
| `answer` | `yes` `no` `unsure` | `main`, unless `main` is `unsure`; then `second` if it is not `null` (FR-08) |
| `disagree` | boolean | `main` and `second` are both `yes` or `no` and differ (L-06) |
| `measures` | object | The raw numbers, for example `{"brightness_change": 0.42}`, to tune the thresholds |
| `confidence`, `reason` | | `"lamp area 42% brighter; room 9% brighter"` |

`action: off` uses the same measure with the sign reversed. The hub's verifier, not the engine, decides on the second look after `unsure` and never presses again because of it (C-09).

### `find_people(image)` (FR-10, C-05)

| `PersonBox` field | Type | Rule |
|---|---|---|
| `kind` | `person` `cat` `dog` | The COCO classes of the pretrained YOLO model |
| `box` | box | |
| `confidence`, `reason` | | |

Its threshold is low on purpose (`people.conf`): a missed person is worse than a cancelled press. The engine only reports what it saw. The Safety Guard in the hub decides whether the gate passes (A-08), from the enclave's `people.result`. The enclave also runs this call on every `recognize` photo and sets `person` in `recognize.result`; the hub then saves nothing from that photo (C-05).

### `refind_control(frame, saved)` (FR-09)

Finds the saved control again when the cart stands at the press spot. `saved` holds the control's `kind`, `fingerprint` and last `box` at this spot.

| `RefindResult` field | Type | Rule |
|---|---|---|
| `found` | boolean | `true` only if a detection of the same kind near the saved box has fingerprint similarity of at least `fingerprint.similarity_to_refind` (0.7) |
| `box` | box or `null` | |
| `similarity` | number or `null` | `null` when no fingerprint was compared. Until fingerprints exist, `found` is `false` while `refind.require_fingerprint` is `true`; set it to `false` only for a demo, to re-find by place alone |
| `confidence`, `reason` | | `"no switch near the saved place"` |

When `found` is `false`, the run is cancelled and the resident is told (FR-09).

### `plan_press(control, actuators)` (FR-09)

The motion planner: a simple script now, replaceable by a VLA model later behind the same call (C-13). `control` is the `RefindResult`, `kind` the control's kind. `actuators` is the layout from the hub settings: for each actuator, its id and the part of the image it faces.

| `PressPlan` field | Type | Rule |
|---|---|---|
| `actuator` | string or `null` | The actuator whose part of the image holds the control's center. `null` if none does |
| `push_ms` | integer | From `press.push_ms` for the control's kind |
| `confidence`, `reason` | | `"actuator A2 faces the switch"`, `"no actuator faces the switch"` |

A plan with `actuator: null` cancels the run. The Safety Guard runs after the plan and before the press (C-04).

## Settings

Sections in `ai-engine`'s `settings.yaml`. Values below are starting values. The enclave gets this file over vsock at start (see [Use](#use)). Model files are under `paths`, next to the paths the training scripts use, so each file is named once; `null` means not trained yet.

| Key | Start | Used by |
|---|---|---|
| `paths.detector_weights` | `models/detector-yolo11n-640-synth.pt` | `detect_controls`, `refind_control` |
| `paths.state_weights` | `null` | `read_state` |
| `paths.devices_weights` | `null` | `detect_devices` |
| `paths.people_weights` | `models/yolo11s.pt` | `find_people` |
| `paths.fingerprint_weights` | `null` (DINOv2 small, planned) | `fingerprint` |
| `paths.prior` | `linker/prior.json` | `link_guess` |
| `engine.device` | `cpu` | Every model |
| `detector.predict.conf`, `detector.predict.imgsz` | 0.3, 640 | `detect_controls` |
| `detector.kind_map` | `null` for `yolo11n-640-synth`. Only for detector-v1: `{switch: switch, push_button: switch, toggle: toggle}` | `detect_controls` |
| `linker.alpha`, `linker.floor`, `linker.plate_gap` | 3.0, 0.1, 1.0 | `link_guess` |
| `state.threshold` | 0.7 | `read_state` |
| `clear.min_score`, `clear.min_sharpness` | 0.5, 80 | `is_clear` |
| `change.grid`, `change.cell_min`, `change.threshold` | 8, 0.06, 0.3 | `measure_change` |
| `devices.conf` | 0.5 | `detect_devices` |
| `check.light.upper`, `check.light.lower` | 0.25, 0.05 | `check_effect`, on the lamp area |
| `check.light.scene_upper`, `check.light.scene_lower` | 0.08, 0.02 | `check_effect`, on the whole frame (`second`) |
| `check.fan.upper`, `check.fan.lower` | `null`, to be measured | `check_effect` |
| `people.conf` | 0.25 | `find_people` |
| `fingerprint.similarity_to_refind` | 0.7 | `refind_control` |
| `refind.max_shift`, `refind.require_fingerprint` | 0.1, `true` | `refind_control` |
| `press.planner` | `script` | `plan_press`: which planner answers (C-13). An unknown name fails `load` |
| `press.push_ms` | `{switch: 400, toggle: 400, power_strip: 400}` | `plan_press` |

Model files used by the enclave go in `models/` with a model card each (A-05); `runs/` stays for training output.

## Testing without models

`ai_engine.testing.FakeEngine` has the same calls and answers from a script given in the test, for example `fake.script("check_effect", result)` for "the next `check_effect` answers this". A call with nothing scripted gives the safe not-trained answer, and `detect_controls`, `measure_change` and `find_people` raise `EngineError`. The enclave program's tests use it, so they need no model files (see [Modules](/overview/modules#tests)).

## Open questions

| Question | Why it matters |
|---|---|
| How fast the calls are on the enclave's CPU | The enclave has no GPU, and the detector, the link guess, the people check and the effect check share its vCPUs. To be measured on the EC2 instance |
