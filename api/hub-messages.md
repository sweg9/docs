# Hub messages

::: warning Draft
A first proposal for the messages between the hub and the server, for the design of 2026-11-20. `backend-server` owns the contract and changes this page as it builds the modes. Numbers are starting values and belong in settings files.
:::

The hub keeps every record and carries out every run, at home. The server on AWS keeps no records. It is the hub's way to the Nitro Enclave, where the models and the autonomy policy run, and the Dashboard's way to the hub (see [Stack](/overview/stack#where-each-part-runs)).

The hub opens one WebSocket to the server through the ingress (`wss://`) and keeps it open. It signs in with `HUB_TOKEN` when it connects (see [Sign-in](/overview/stack#sign-in)). This page lists every message on that connection, with its payload. Names and values follow the [data model](/standards/data-model) and the [run log](/standards/execution-log).

## Envelope

Every message is one JSON object.

| Field | Type | Rule |
|---|---|---|
| `v` | integer | Contract version, `2` |
| `type` | string | One of the types below |
| `id` | string | Unique per message |
| `re` | string or `null` | In an answer, the `id` of the request it answers |
| `run_id` | string or `null` | Set on every message that belongs to a run |
| `sent_at` | UTC ISO 8601 | |
| `payload` | object | Depends on `type` |

```json
{"v":2,"type":"decide","id":"m-h-000412","re":null,"run_id":"r-0007","sent_at":"2026-11-20T12:05:03.120Z","payload":{}}
```

## Shared shapes

| Shape | Fields | Notes |
|---|---|---|
| `sealed` | `photo_id`, `key`, `nonce`, `data`, `w`, `h` | One JPEG photo, encrypted by the hub (see [Sealed photos](#sealed-photos)). `key` is the photo's data key, encrypted by KMS; `data` is the photo, encrypted with AES-256-GCM. Both base64 |
| `box` | `[x1, y1, x2, y2]` | Ratios from 0 to 1 of the image size |
| `spot_id` | string | A place where the cart stands. In the prototype, a name the team member picks in the hub settings, such as `living_wall_1` |

### Sealed photos

- The hub never sends video. It takes a single photo only when a step needs one, with the longest side at most 1,280 px.
- For each photo it asks AWS KMS for a new data key, encrypts the photo with it, and sends the photo together with the data key that KMS has encrypted.
- The KMS key policy lets only an enclave whose attestation matches the published image decrypt that data key (C-05). So the server, the EC2 instance and S3 see only ciphertext.
- The server stores every sealed photo in S3 as it is, under `photo_id`. The log refers to a photo only by `photo_id` (L-07).

## Messages at a glance

| Direction | `type` | Answer | When | Stage |
|---|---|---|---|---|
| hub to server | `recognize` | `recognize.result` | Find controls in a photo: during a scan, and while watching for uses | S1, S2, S3 |
| hub to server | `check` | `check.result` | Compare a photo before with one after: which device changed, or did the command work | S2, S5, S6 |
| hub to server | `refind` | `refind.result` | Find a saved control at the press spot and plan the press | S6 |
| hub to server | `people` | `people.result` | Is anyone in the work area, just before a press | S6 |
| hub to server | `decide` | `decide.result` | Act, ask or suggest, for a run that a trigger opened | S4 |
| hub to server | `app.event` | none | A record changed or a run moved on, for the app's live screen | Any |
| hub to server | `hub.status` | none | Every 5 s | Any |
| server to hub | `app.request` | `app.response` | The Dashboard called the API | Any |
| server to hub | `stop` | `stop.done` | Emergency stop from the app | Any |

The server hands `recognize`, `check`, `refind`, `people` and `decide` to the enclave over vsock ([The enclave link](#the-enclave-link)), unopened, and sends the enclave's answer back with `re` set. The enclave answers in the same shapes as the [ai-engine interface](/api/ai-engine): every result has `confidence` and `reason` (A-02), and below its threshold a result is `unknown` or `unsure` (A-03).

## The enclave link

Between the server and the enclave, on the same EC2 instance. The server connects; the enclave listens on vsock (CID 16, port 5000). For tests and development the same program listens on TCP instead (`backend enclave --tcp`); there KMS opens no sealed photo, so only `decide` answers.

Each frame is a 4-byte big-endian length, then that many bytes of UTF-8 JSON, at most 16 MiB. The `kind` field says which frame it is:

| `kind` | From | Fields | When |
|---|---|---|---|
| `init` | server | `risk`, `enclave`, `engine` (the parsed `risk.yaml`, `enclave.yaml` and ai-engine's `settings.yaml`), `credentials` | First, on every new connection. The enclave loads the `Engine` on the first `init`, and again only when the settings changed |
| `ready` | enclave | | The answer to `init` |
| `credentials` | server | `credentials` | New temporary AWS credentials of the instance role, before the old ones expire |
| `ask` | server | `envelope`: a request from the hub, unopened | One at a time |
| `answer` | enclave | `re`, `envelope` | The answer envelope, or `envelope: null` when the request failed (a model error, a photo that does not open) |

`credentials` holds `access_key_id`, `secret_access_key`, `session_token` and `expires_at`, or is null outside AWS. The enclave keeps them in memory only and uses them for KMS Decrypt with its attestation (C-05, C-10).

On a timeout, a closed connection or a frame that does not fit, the server closes the connection and gives the hub no answer; the next request opens a new connection, with `init` again, so an enclave that restarted gets its settings back. The server's own limit (`enclave_timeout_s`, 12 s) is a little over the hub's longest wait, so the hub's time limit decides first (see [Answers that do not come](#answers-that-do-not-come)). The server reads the hub's other messages while the enclave works, so `stop.done` is never held up (C-04).

## Requests to the enclave

### `recognize` (hub to server)

| Field | Type | Rule |
|---|---|---|
| `purpose` | `scan` `watch` | |
| `spot_id` | string | Where the cart stands |
| `room` | room type | From the hub settings; the Linker uses it |
| `photo` | sealed | |
| `known` | array or `null` | For `watch`: the controls to look for, each with `control_id`, `kind` and the last `box` at this spot |

### `recognize.result` (server to hub)

| Field | Type | Rule |
|---|---|---|
| `controls` | array | One item per control found |
| `controls[].kind` | `switch` `toggle` `power_strip` | M-S1a |
| `controls[].box` | box | |
| `controls[].score` | number | The detector's confidence |
| `controls[].clear` | boolean | Clear enough to save (FR-01) |
| `controls[].state` | `on` `off` `unknown` | M-S1b; `unknown` until that model exists |
| `controls[].state_confidence` | number | |
| `controls[].gang` | object | `count` and `index` of the key on its plate |
| `controls[].link_guess` | object | The device class the key most likely runs and its probability, from the Linker (M-S2a) |
| `controls[].control_id` | string or `null` | For `watch`: the known control this one is |
| `person` | boolean | A person is in the photo. The hub then saves nothing from it (C-05) |

```json
{"controls":[{"kind":"switch","box":[0.42,0.31,0.51,0.44],"score":0.91,"clear":true,"state":"off","state_confidence":0.93,"gang":{"count":2,"index":1},"link_guess":{"device_class":"ceiling_light","p":0.74},"control_id":null}],"person":false}
```

### `check` (hub to server)

| Field | Type | Rule |
|---|---|---|
| `purpose` | `map` `verify` | `map` while finding which device a control runs (FR-02); `verify` after a command (FR-08) |
| `before`, `after` | list of sealed | The same view just before and after: one photo, or a few about 0.2 s apart when motion matters, as for a `fan` |
| `device_box` | box or `null` | For `verify`: where the device is in view. `null` for `map` |
| `device_type` | device type or `null` | For `verify` |
| `action` | `on` `off` or `null` | For `verify`: what the command should have done |

### `check.result` (server to hub)

| Field | Type | Rule |
|---|---|---|
| `change` | `off_to_on` `on_to_off` `none` | What changed. `map`: the direction of `measure_change` on the whole photo. `verify`: from `check_effect`, `none` unless the answer is `yes`. The learned MobileNet check (M-S5) is not wired in yet |
| `answer` | `yes` `no` `unsure` or `null` | For `verify`: did the command work. `null` for `map` |
| `device_box` | box or `null` | The region that changed |
| `device_type` | device type or `null` | `null` when no device was found in the region; then a mapping cannot become `Verified` (C-08) |
| `confidence`, `reason` | | A-02 |

### `refind` (hub to server)

| Field | Type | Rule |
|---|---|---|
| `photo` | sealed | Taken at the press spot |
| `control` | object | `control_id`, `kind`, `box` (the saved box at this spot), `fingerprint` (`null` until fingerprints exist) |
| `actuators` | array | From the hub settings: `id` and `faces`, the part of the image each actuator faces |

### `refind.result` (server to hub)

| Field | Type | Rule |
|---|---|---|
| `found` | boolean | The same kind near the saved box |
| `box` | box or `null` | |
| `plan` | object or `null` | `actuator` and `push_ms`, from the motion planner (FR-09) |
| `confidence`, `reason` | | |

### `people` (hub to server)

| Field | Type | Rule |
|---|---|---|
| `photo` | sealed | Taken just before the press |
| `work_area` | box | The actuator's work area |

`people.result` has `clear` (boolean), `confidence` and `reason`. The Safety Guard on the hub presses only on `clear: true` (FR-10).

### `decide` (hub to server)

The Routine Engine on the hub sends it when a trigger opens a run (FR-05). No photo is needed.

| Field | Type | Rule |
|---|---|---|
| `trigger` | `sensor` `time` `routine` | |
| `device` | object | `type` and `risk` |
| `action` | `on` `off` | |
| `mapping` | object | `status` and `confidence` |
| `routine` | object or `null` | `independence` and the share of accepted answers |
| `confidence` | number | The run's confidence (FR-05) |

`decide.result` has `decision` (`act` `ask` `suggest`), `confidence` and `reason`, from the autonomy policy and `risk.yaml` (FR-06, C-03). With `ask`, the hub asks the resident through the app and acts only on yes. It never asks the resident itself.

## Toward the app

### `app.request` (server to hub)

The Dashboard (the resident's web app) calls the [backend-server API](/api/backend-server) on the server, and the server relays each call to the hub, which answers from its database.

| Field | Type | Rule |
|---|---|---|
| `method`, `path`, `query`, `body` | | The app's call, as it came |
| `session` | string or `null` | The value of the app's session cookie. The hub checks it against its `sessions` table and answers `401` when it is missing or expired |

`app.response` has `status`, `body` and, for `POST /login` and `POST /logout`, `set_session`: the cookie the server sets or clears. When the hub is offline or does not answer within 5 s, the server answers the app with `503`, `"hub offline"`.

### `app.event` (hub to server)

| Field | Type | Rule |
|---|---|---|
| `kind` | `control` `mapping` `routine` `scan` `run.progress` `run.result` `notification` `situation` `visits` `robot` `robot.route` | `situation`, `visits` and `robot` since API 0.4.0: a Situation, `{visits: Visit[]}`, and the Robot. `robot.route` since 0.5.0: a RobotRoute. `run.progress`, `run.result` and `notification` are the schemas RunProgress, Run and Notification |
| `data` | object | The record or the step, in the API's shapes |

The server pushes it to the app's WebSocket and keeps nothing. A lost `app.event` changes only the screen; the app reads the lists again after a reconnect.

### `stop` (server to hub)

| Field | Type | Rule |
|---|---|---|
| `source` | `app` | The key on the hub and the power switch work without the server |

The hub sends `STOP` to the RAL before it does anything else, then ends the current run as `cancelled`, `reason: "emergency stop"`, and answers `stop.done` once `ral.stop()` has returned. Without `stop.done` within 2 s, the app tells the resident to use the key on the hub or the power switch.

### `hub.status` (hub to server)

| Field | Type | Rule |
|---|---|---|
| `camera` | `ok` `down` | |
| `ral` | object | `impl` (`linear_actuators` `unity_sim` `script`), `state` (`idle` `busy` `stopped` `error`) |
| `run_id` | string or `null` | The run the hub holds |
| `watching` | integer | Number of controls watched now |

The server marks the hub offline after 3 missed heartbeats, shows it in the app, and answers the app's calls with `503` until it is back.

## Answers that do not come

The records are written on the hub before anything is sent, and the server keeps no state. So no message is sent again after a reconnect. A request that gets no answer in time is handled on the safe side:

| Request | Waits | Without an answer |
|---|---|---|
| `recognize` | 10 s | A scan ends as interrupted; watching skips the round |
| `check` | 10 s | `verify`: the result is `unsure` (FR-08), and the device is never pressed again (FR-11). `map`: no mapping is made |
| `refind` | 10 s | The press is cancelled, `reason: "control not found"` |
| `people` | 3 s | Not clear: the press is cancelled (FR-10) |
| `decide` | 5 s | The system only suggests (FR-05) |

The times are in the hub settings.

## Traffic

Photos go up only when a step needs one: each photo of a scan, one photo every `watch_interval_s` while watching for uses (FR-04), and the photos of a run's press and check. If the connection is too slow, `watch_interval_s` is raised first (5th meeting); scans and runs are not slowed down.

## When the connection drops

| Situation | Hub | Server |
|---|---|---|
| During a scan | Ends the scan as interrupted | Answers the app's calls with `503` |
| During a run, before a press | No decision means suggest only; no `people` answer means no press | |
| During a run, after the press started | Finishes the press; the check without an answer is `unsure` | |
| After reconnect | Sends `hub.status` at once | Shows the hub online again; the app reads its lists again |
