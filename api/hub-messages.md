# Hub messages

::: warning Draft
A first proposal for the messages between the hub and the cloud. `backend-server` owns the contract and changes this page as it builds both modes. Numbers are starting values and belong in settings files.
:::

The hub opens one WebSocket to the cloud and keeps it open (see [Stack](/overview/stack#two-run-modes-of-one-backend)). The hub signs in with `HUB_TOKEN` when it connects (see [Sign-in](/overview/stack#sign-in)). This page lists every message on that connection, with its payload. Names and values follow the [data model](/standards/data-model) and the [run log](/standards/execution-log).

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
| cloud to hub | `watch.set` | Which controls to watch for uses, or stop watching | S3 |
| hub to cloud | `control.used` | The resident flipped a watched control | S3 |
| cloud to hub | `run.start` | A run is decided as `act` | S4 |
| hub to cloud | `run.progress` | Each step of the run | S5, S6 |
| hub to cloud | `run.result` | The run ends, in any way | S7 |
| cloud to hub | `stop` | Emergency stop | Any |
| hub to cloud | `hub.status` | Every 5 s | Any |
| both | `ack` | A message was handled (see [Delivery](#delivery)) | Any |

`scan.done` is new compared with the first list in [Stack](/overview/stack): the app needs it to know when a scan is over. All recognition and every camera check run on the hub (see [Models](/product/models)), so no message asks the cloud to look at a picture.

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

One message per control. The hub has already found the control (M-S1a) and read its state (M-S1b), and sends only controls whose crop is clear (FR-01). The cloud compares the fingerprint with the saved controls and either creates a `Control` or updates the one it matches. The hub keeps no registry.

| Field | Type | Rule |
|---|---|---|
| `scan_id` | string | |
| `local_id` | string | The hub's name for this control during the scan, used again in `mapping.candidate` |
| `kind` | `switch` `toggle` `power_strip` | The detector's class |
| `score` | number | The detector's confidence |
| `state` | `on` `off` `unknown` | From the state classifier; `unknown` below its threshold |
| `state_confidence` | number | |
| `box` | box | In the frame |
| `panel_point` | `[x, y]` or `null` | From the ArUco homography; `null` when no marker is in view |
| `fingerprint` | array of 384 numbers | DINOv2 small embedding of the crop |
| `crop` | crop | |
| `spot_id` | string | |

```json
{"scan_id":"sc-0003","local_id":"c1","kind":"switch","score":0.91,"state":"off","state_confidence":0.93,"box":[0.42,0.31,0.51,0.44],"panel_point":[0.12,0.40],"fingerprint":[0.013,-0.207,"…"],"crop":{"crop_id":"cr-h-0121","jpeg_b64":"/9j/4AAQ…","w":180,"h":256},"spot_id":"living_wall_1"}
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

The hub saw a found control change state, and within the watch window (about 3 s, FR-02) a region outside the control changed too, such as a lamp lighting up. The hub sends the control and the before and after crops of that region. It also runs the device detector (M-S2) on that region. The cloud finds or creates the device (see [Which device changed](#which-device-changed)) and creates a `Pending` mapping. The mapping becomes `Verified` only when the change is clear (`change_score` above its threshold) and the device detector found a device in the region (C-08).

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
| `device_type` | device type or `null` | From the device detector; `null` when it found no device in the region |
| `device_score` | number or `null` | The device detector's confidence |
| `spot_id` | string | Saved with the mapping when it becomes `Verified` (FR-02) |
| `room` | string | The room of `spot_id`, from the hub settings |

```json
{"scan_id":"sc-0003","local_id":"c1","method":"watch","control_state":{"before":"off","after":"on"},"device_box":[0.70,0.10,0.88,0.45],"before":{"crop_id":"cr-h-0130","jpeg_b64":"…","w":200,"h":256},"after":{"crop_id":"cr-h-0131","jpeg_b64":"…","w":200,"h":256},"change_score":0.64,"device_type":"light","device_score":0.88,"spot_id":"living_wall_1","room":"living_room"}
```

The cloud stores `device_box` with the mapping and sends it back in `run.start`, so the hub knows where to look when it checks the device later.

### Which device changed

The resident does not register devices by hand (proposal, section I-B, second problem). The cloud finds or creates the `Device` from the candidate:

1. It takes the device type from `device_type`. When it is `null`, the mapping stays `Pending` and the app asks the resident which device it is.
2. It ranks the saved devices with the hints of FR-02: same `room`, same type, and a `device_box` that overlaps the new one at the same `spot_id`. If one fits, the mapping points to it.
3. If none fits, it creates a `Device`: `name` and `type` from `device_type`, `room` from the candidate, `risk` from the risk sorting in the settings file (FR-06), `channels` empty until FR-03 registers them.
4. A type that is not in the risk sorting, or `other`, gets `risk: high`, the safe side, until the resident sets it.

The mapping card in the app shows the device it points to. The resident can rename the device, change its room or risk, or reject the mapping. A changed risk takes effect from the next run.

## Uses for habits: S3

A habit (FR-04) is the same device and action at about the same time on several days, so the cloud needs to know each time the resident uses a device by hand. While proactive features are on, the hub keeps watching the controls in view at the spot where the cart stands, between scans and runs. Frames stay on the hub; only the control and its new state go up (C-05).

### `watch.set` (cloud to hub)

The current list, sent whenever it changes: when the hub connects, when the resident turns proactive features on or off, when a mapping becomes `Verified`, `Stale` or `Rejected`, and when a run or a scan ends (the cart may stand somewhere else). Each `watch.set` replaces the last one.

| Field | Type | Rule |
|---|---|---|
| `enabled` | boolean | `false` while proactive features are off or paused (C-05, C-06). Off until the resident turns them on |
| `controls` | array | Controls with a `Verified` mapping: `control_id`, `kind`, `fingerprint`, `seen_spot_id`, `box` (last box at that spot) |

```json
{"enabled":true,"controls":[{"control_id":"ctl-0005","kind":"switch","fingerprint":["…"],"seen_spot_id":"living_wall_1","box":[0.42,0.31,0.51,0.44]}]}
```

The hub watches only the controls whose `seen_spot_id` is the spot where the cart stands now: the spot of the last scan, or the press spot of the last run.

### Watching on the hub

Every `watch.interval_s` (2 s) the hub takes a frame, re-finds each watched control near its box (the same check as before a press, FR-09), and reads its state (M-S1b). A flip counts when the new state is read the same way twice in a row, neither read is `unknown`, and it differs from the last state. The hub does not watch:

- during a scan, which has its own watching for `mapping.candidate`;
- during a run, and for `watch.quiet_s` (10 s) after it ends, so that the system's own presses are not counted as the resident's;
- while `enabled` is `false`.

### `control.used` (hub to cloud)

| Field | Type | Rule |
|---|---|---|
| `control_id` | string | |
| `before`, `after` | `on` `off` | The states read before and after the flip |
| `at` | UTC ISO 8601 | The time of the first read of the new state |
| `confidence` | number | The lower state confidence of the two reads |

```json
{"control_id":"ctl-0005","before":"off","after":"on","at":"2026-11-17T12:04:58.000Z","confidence":0.91}
```

The cloud writes one row in `uses` for each `Verified` mapping of the control, with `action` equal to `after`: a switch that is on means its device has power. No crop is sent.

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
| `check` | object | `device_box`, `spot_id` (where the device is in view), `device_type`, which picks the measure of M-S5 |
| `channels` | array | One item per channel the device has: `channel`, `success_score`, `latency_ms`. Empty when the device has no wireless channel; `ARM` is never listed, it is always the last resort |

```json
{"mapping_id":"mp-0002","device":{"device_id":"dev_lamp_01","name":"lamp","risk":"low"},"action":"on","decision":"act","control":{"control_id":"ctl-0005","kind":"switch","fingerprint":["…"],"panel_point":[0.12,0.40],"press_spot_id":"living_wall_1"},"check":{"device_box":[0.70,0.10,0.88,0.45],"spot_id":"living_wall_1","device_type":"light"},"channels":[]}
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

### Camera check on the hub

The hub runs the check of FR-08 itself (M-S5): it compares the device crop before the command with the crop after the wait for effect (up to 3 s), with the measure for `check.device_type`. An `unsure` result gets one second look after about 3 s, without operating the device, and then the run stops (FR-08). It is never followed by another press (FR-11).

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
| `watching` | integer | Number of controls watched now; `0` when watching is off or no watched control is at this spot |

The cloud marks the hub offline after 3 missed heartbeats and does not send `run.start` until it is back.

## Delivery

A WebSocket can drop a message that was written just before the connection broke, and either side can restart. So the messages that change a record are confirmed with `ack`, and only the hub ever sends a message again.

### `ack` (both directions)

| Field | Type | Rule |
|---|---|---|
| `ids` | array of strings | The `id`s of the messages handled since the last `ack`. A side may collect them for up to 200 ms and send one `ack` |

`ack` itself is never confirmed.

### Which messages are confirmed

| Message | Confirmed when | If no `ack` comes |
|---|---|---|
| `control.found`, `scan.done`, `mapping.candidate`, `control.used`, `run.result` (hub to cloud) | The cloud has committed the message and its `id` to the database in one transaction | The hub sends it again after the next reconnect |
| `scan.start` (cloud to hub) | The hub has started the scan, or answered with `scan.done` and a `reason` | After 5 s the app shows that the scan did not start. Not sent again |
| `run.start` (cloud to hub) | The hub holds the run, or has already answered it with `run.result` `cancelled` | The run stays open and the cloud waits for the hub's own word (see below). Not sent again |
| `watch.set` (cloud to hub) | The hub has applied the list | Sent again when the hub reconnects, like every `watch.set`. It holds a state, not a command, so a late one does no harm |
| `stop` (cloud to hub) | The hub's `ral.stop()` has returned | After 2 s the app says the stop was not confirmed and tells the resident to use the key on the hub or the power switch. Sent again at once if the hub reconnects, because a stop is always safe |
| `run.progress`, `hub.status` | Never | Lost. Progress is only for the screen, and the next status replaces the last one |

**Why the cloud does not send `run.start` again.** A command that arrives late would switch a device at a moment the resident did not choose. The hub cancels a run it cannot report anyway (`reason: "cloud not reached"`), so a run is started by the cloud once or not at all.

### The hub's outbox

The hub appends every message that needs an `ack` to `outbox.jsonl` in its data folder before it sends it, and removes it when the `ack` arrives. After a reconnect, or after the hub restarts, it sends what is left in the original order. `hub.status.queued` is the number of messages in the file. Messages older than 7 days are dropped with a warning in the hub's own log, because the cloud forgets handled `id`s after 7 days.

### How the cloud ends a run

The cloud closes a run that went to the hub only from the hub's own word:

1. `run.result` arrives: the run entry is written as usual.
2. The hub reconnects, its outbox is empty (`queued: 0`), and its `run_id` is not this run: the hub never got `run.start`, or its result is lost with its outbox file. If the cloud had an `ack` for `run.start`, the run ends as `unsure`, `reason: "the hub's result was lost; check the device"`, and the resident chooses what to do (C-09). Otherwise it ends as `cancelled`, `reason: "the hub did not get the start"`.

While the hub stays offline, the run stays open and the app shows the hub as offline. A run is never closed as `success` by the cloud alone.

## When the connection drops

| Situation | Hub | Cloud |
|---|---|---|
| During a scan | Ends the scan; its messages wait in the outbox | Shows the scan as interrupted until `scan.done` arrives |
| During a run, before a press | Cancels the run: `reason: "cloud not reached"` | Keeps the run open (see [How the cloud ends a run](#how-the-cloud-ends-a-run)) |
| During a run, after the press started | Finishes the press and the check; `run.result` waits in the outbox | Keeps the run open |
| After reconnect | Sends the outbox in order, then `hub.status` | Handles each message once, by its `id`, and answers with `ack` |
