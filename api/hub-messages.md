# Hub messages

::: warning Draft
A first proposal for the messages between the hub and the cloud. `backend-server` owns the contract and changes this page as it builds both modes. Numbers are starting values and belong in settings files.
:::

The hub opens one WebSocket to the cloud and keeps it open (see [Stack](/overview/stack#two-run-modes-of-one-backend)). This page lists every message on that connection, with its payload. Names and values follow the [data model](/standards/data-model) and the [run log](/standards/execution-log).

## Envelope

Every message is one JSON object.

| Field | Type | Rule |
|---|---|---|
| `v` | integer | Contract version, `1` |
| `type` | string | One of the types below |
| `id` | string | Unique per message. The receiver ignores an `id` it has already seen, so a message resent after a reconnect is handled once |
| `run_id` | string or `null` | Set on every message that belongs to a run |
| `sent_at` | UTC ISO 8601 | |
| `payload` | object | Depends on `type` |

```json
{"v":1,"type":"run.progress","id":"m-h-000412","run_id":"r-0007","sent_at":"2026-11-17T12:05:03.120Z","payload":{}}
```

## Shared shapes

| Shape | Fields | Notes |
|---|---|---|
| `crop` | `crop_id`, `jpeg_b64`, `w`, `h` | A JPEG of one control or one device, longest side at most 256 px, base64. The hub names it; the log refers to it only by `crop_id` (L-07) |
| `box` | `[x1, y1, x2, y2]` | Ratios from 0 to 1 of the image size |
| `spot_id` | string | A place where the cart stands. In the prototype, a name the team member picks in the hub settings, such as `living_wall_1` |

The hub never sends a whole frame. Before it sends a crop it runs the person detector on it and drops the crop if a person is in it (C-05).

## Messages at a glance

| Direction | `type` | When | Stage |
|---|---|---|---|
| cloud to hub | `scan.start` | The presenter starts a scan in the app | S1, S2 |
| hub to cloud | `control.found` | The detector finds a control | S1 |
| hub to cloud | `scan.done` | The scan ends | S1 |
| hub to cloud | `mapping.candidate` | A control changed and a device changed with it | S2 |
| cloud to hub | `run.start` | A run is decided as `act` | S4 |
| hub to cloud | `run.progress` | Each step of the run | S5, S6 |
| hub to cloud | `check.ask` | The hub needs the VLM for a camera check | S5, S6 |
| cloud to hub | `check.answer` | The VLM answered | S5, S6 |
| hub to cloud | `run.result` | The run ends, in any way | S7 |
| cloud to hub | `stop` | Emergency stop | Any |
| hub to cloud | `hub.status` | Every 5 s | Any |

`scan.done`, `check.ask` and `check.answer` are new compared with the first list in [Stack](/overview/stack). The camera check (FR-08) needs a VLM answer in the middle of a run, the VLM is called from the cloud, and the hub has to know the answer before it decides whether to press again. The app needs `scan.done` to know when a scan is over.

## Setup: S1 and S2

### `scan.start` (cloud to hub)

| Field | Type | Rule |
|---|---|---|
| `scan_id` | string | Made by the cloud |
| `spot_id` | string | Where the cart stands for this scan |
| `scan_s` | integer | How long to look for controls, for example `10` |
| `watch_s` | integer | How long to keep watching the found controls for a flip afterwards (FR-02 watching). `0` turns watching off |

```json
{"scan_id":"sc-0003","spot_id":"living_wall_1","scan_s":10,"watch_s":120}
```

### `control.found` (hub to cloud)

One message per control. The hub sends what the detector sees; the cloud does the rest. It asks the VLM for the kind, the state and whether the crop is clear (FR-01), compares the fingerprint with the saved controls, and either creates a `Control` or updates the one it matches. The hub keeps no registry.

| Field | Type | Rule |
|---|---|---|
| `scan_id` | string | |
| `local_id` | string | The hub's name for this control during the scan, used again in `mapping.candidate` |
| `kind` | `switch` `toggle` `power_strip` | The detector's class |
| `score` | number | The detector's confidence |
| `box` | box | In the frame |
| `panel_point` | `[x, y]` or `null` | From the ArUco homography; `null` when no marker is in view |
| `fingerprint` | array of 384 numbers | DINOv2 small embedding of the crop |
| `crop` | crop | |
| `spot_id` | string | |

```json
{"scan_id":"sc-0003","local_id":"c1","kind":"switch","score":0.91,"box":[0.42,0.31,0.51,0.44],"panel_point":[0.12,0.40],"fingerprint":[0.013,-0.207,"…"],"crop":{"crop_id":"cr-h-0121","jpeg_b64":"/9j/4AAQ…","w":180,"h":256},"spot_id":"living_wall_1"}
```

The cloud pushes the new or updated control to the app and sends nothing back to the hub. A control the detector cannot tell clearly is not sent (FR-01).

### `scan.done` (hub to cloud)

| Field | Type | Rule |
|---|---|---|
| `scan_id` | string | |
| `found` | integer | Number of `control.found` sent |
| `skipped` | integer | Detections dropped as unclear or with a person in the crop |
| `reason` | string or `null` | Set when the scan did not run, for example `"camera not ready"` or `"a run is in progress"` |

Watching for flips continues after `scan.done` for `watch_s` seconds.

### `mapping.candidate` (hub to cloud)

The hub saw a found control change state, and within the watch window (about 3 s, FR-02) a region outside the control changed too, such as a lamp lighting up. The hub sends the control and the before and after crops of that region. The cloud asks the VLM whether the change fits a device, matches it to a `Device`, and creates a `Pending` mapping. The mapping becomes `Verified` only when the change is clear and the VLM agrees.

| Field | Type | Rule |
|---|---|---|
| `scan_id` | string | |
| `local_id` | string | The control from `control.found` |
| `method` | `watch` `test` | `watch` when the resident flipped it. `test` is for later, when the actuator presses to test; not in the demo |
| `control_state` | `{"before": "off", "after": "on"}` | As the hub saw it |
| `device_box` | box | The region that changed |
| `before` | crop | The region just before the flip |
| `after` | crop | The same region at the end of the watch window |
| `change_score` | number | How much the region changed, 0 to 1 (OpenCV frame difference) |
| `spot_id` | string | Saved with the mapping when it becomes `Verified` (FR-02) |

```json
{"scan_id":"sc-0003","local_id":"c1","method":"watch","control_state":{"before":"off","after":"on"},"device_box":[0.70,0.10,0.88,0.45],"before":{"crop_id":"cr-h-0130","jpeg_b64":"…","w":200,"h":256},"after":{"crop_id":"cr-h-0131","jpeg_b64":"…","w":200,"h":256},"change_score":0.64,"spot_id":"living_wall_1"}
```

The cloud stores `device_box` with the mapping and sends it back in `run.start`, so the hub knows where to look when it checks the device later.

## Runtime: S4 to S7

### `run.start` (cloud to hub)

The cloud resolves the intent (FR-05) and applies the autonomy policy (FR-06) before it sends `run.start`. It sends it only when the decision is `act`, or when the resident answered yes to an `ask`. The hub never asks the resident itself. It still checks the risk class in the Safety Guard before a press (FR-10).

| Field | Type | Rule |
|---|---|---|
| `mapping_id` | string | Always `Verified` (C-08) |
| `device` | object | `device_id`, `name`, `risk` |
| `action` | `on` `off` | |
| `decision` | `act` `ask` | `ask` means the resident already said yes |
| `control` | object | `control_id`, `kind`, `fingerprint`, `panel_point`, `press_spot_id` |
| `check` | object | `device_box`, `spot_id` (where the device is in view), `question` for the VLM, for example `"Is the lamp on?"` |
| `channels` | array | One item per channel the device has: `channel`, `success_score`, `latency_ms`. Empty when the device has no wireless channel; `ARM` is never listed, it is always the last resort |

```json
{"mapping_id":"mp-0002","device":{"device_id":"dev_lamp_01","name":"lamp","risk":"low"},"action":"on","decision":"act","control":{"control_id":"ctl-0005","kind":"switch","fingerprint":["…"],"panel_point":[0.12,0.40],"press_spot_id":"living_wall_1"},"check":{"device_box":[0.70,0.10,0.88,0.45],"spot_id":"living_wall_1","question":"Is the lamp on?"},"channels":[]}
```

The hub holds one run at a time. A `run.start` that arrives while another run is in progress is answered at once with `run.result`, `result: cancelled`, `reason: "another run is in progress"`.

### `run.progress` (hub to cloud)

One message per step, for the live screen. The log does not depend on these: `run.result` carries the full record, so a lost `run.progress` changes nothing but the screen.

| Field | Type | Rule |
|---|---|---|
| `stage` | `S5` `S6` | |
| `step` | `channel` `gate` `move` `press` `check` | |
| `status` | `started` `ok` `fail` `unsure` `skipped` | |
| `channel` | `IR` `WIFI` `BT` `ARM` or `null` | |
| `detail` | string or `null` | Short note for the screen, for example `"no wireless channel"`, `"person in work area"` |
| `latency_ms` | integer or `null` | Set when a step ends |

```json
{"stage":"S6","step":"gate","status":"ok","channel":"ARM","detail":null,"latency_ms":420}
```

For the demo device, scenario 3 sends, in order: `S5 channel skipped "no wireless channel"`, `S6 move started` (the team member pushes the cart; the hub waits for the presenter to confirm in the app), `S6 gate ok`, `S6 press ok`, `S6 check started`, `S6 check ok`.

### `check.ask` (hub to cloud)

The main check of FR-08 asks the VLM a yes-or-no question about the device. The hub makes the crops; the cloud calls the VLM.

| Field | Type | Rule |
|---|---|---|
| `check_id` | string | Made by the hub |
| `kind` | `main` `second` | `second` looks at the surroundings |
| `question` | string | From `run.start` |
| `before` | crop | The device before the command |
| `after` | crop | The device after the wait for effect (up to 3 s) |
| `local_diff` | number | The hub's own before and after comparison, 0 to 1 |

### `check.answer` (cloud to hub)

| Field | Type | Rule |
|---|---|---|
| `check_id` | string | |
| `answer` | `yes` `no` `unsure` | |
| `note` | string or `null` | The VLM's short reason |

If no `check.answer` arrives within the VLM timeout (about 8 s, FR-05), the hub treats the answer as `unsure`. An unsure result gets one second look after about 3 s, without operating the device, and then the run stops (FR-08). It is never followed by another press (FR-11).

### `run.result` (hub to cloud)

Sent once per run, for every ending: success, failure, unsure, cancelled, or emergency stop. It carries the parts of the [run entry](/standards/execution-log) that the hub knows. The cloud adds `trigger`, `intent`, `confidence`, `decision` and `explanation`, writes the entry, and updates the channel scores and the mapping confidence (FR-12).

| Field | Type | Rule |
|---|---|---|
| `result` | `success` `failure` `unsure` `cancelled` | |
| `reason` | string or `null` | Required unless `success` |
| `channel` | `IR` `WIFI` `BT` `ARM` or `null` | Channel of the last attempt |
| `checks` | object | `main`, `second`, `disagree`, as in the run entry |
| `stages` | array | `stage`, `status`, `latency_ms`, `reason`, for S5 and S6 |
| `attempts` | array | `channel`, `latency_ms`, `answer`, and `gate` for `ARM` (L-04, L-05) |
| `press_spot_id` | string or `null` | Set after a successful press; the cloud saves it as the control's press spot (FR-12) |
| `last_crop_id` | string or `null` | Set when `unsure`, so the app can show the resident the picture (FR-08) |

```json
{"result":"success","reason":null,"channel":"ARM","checks":{"main":"yes","second":null,"disagree":false},"stages":[{"stage":"S5","status":"skipped","latency_ms":3,"reason":"no wireless channel"},{"stage":"S6","status":"ok","latency_ms":6400,"reason":null}],"attempts":[{"channel":"ARM","latency_ms":6400,"answer":"yes","gate":"pass"}],"press_spot_id":"living_wall_1","last_crop_id":null}
```

### `stop` (cloud to hub)

| Field | Type | Rule |
|---|---|---|
| `source` | `app` `key` | Who pressed it |

The hub sends `STOP` to the RAL before it does anything else, then ends the current run with `run.result`, `result: cancelled`, `reason: "emergency stop"`. With no run in progress, it only reports `ral: stopped` in the next `hub.status`, which it sends at once.

### `hub.status` (hub to cloud)

| Field | Type | Rule |
|---|---|---|
| `camera` | `ok` `down` | |
| `ral` | object | `impl` (`linear_actuators` `unity_sim` `script`), `state` (`idle` `busy` `stopped` `error`) |
| `run_id` | string or `null` | The run the hub holds |
| `queued` | integer | Messages waiting to be sent after a reconnect |

The cloud marks the hub offline after 3 missed heartbeats and does not send `run.start` until it is back.

## When the connection drops

| Situation | Hub | Cloud |
|---|---|---|
| During a scan | Ends the scan, queues its messages | Shows the scan as interrupted until `scan.done` arrives |
| During a run, before a press | Cancels the run: `reason: "cloud not reached"` | Never counts the run as successful without `run.result` |
| During a camera check | Treats the answer as `unsure`; the run stops without another press | |
| After reconnect | Sends the queue in order | Ignores `id`s it has already handled |

## Open questions

| Question | Why it matters |
|---|---|
| How a `Device` is registered before S2 | `mapping.candidate` gives a changed region, not a device. The cloud can match it by VLM and room, or the resident can name it in the app |
| Whether the hub should ask the VLM directly | Saves the round trip of `check.ask`, but puts an API key on the laptop |
| Crop size | 256 px is a guess; it depends on what the VLM needs to read a state |
