# Database

::: warning Draft
A first proposal for the cloud's tables. `backend-server` owns the schema; Alembic migrations are the source, and this page follows them once they exist.
:::

The cloud keeps everything the system remembers (see [What the system remembers](./architecture#what-the-system-remembers)) in one SQLite file, `app.db`, in WAL mode. The hub keeps no database: it gets what a run needs in `run.start` (see [Hub messages](/api/hub-messages)). Field names and values follow the [data model](/standards/data-model) and the [run log](/standards/execution-log).

## Rules for every table

- **Identifiers** are text: a prefix and a ULID, for example `ctl_01JD3Q…`. They sort by creation time and are never reused. Prefixes: `ctl` control, `dev` device, `mp` mapping, `rt` routine, `r` run, `sc` scan, `cr` crop, `use` use, `fb` feedback.
- **Times** are text, UTC ISO 8601 with milliseconds. The one exception is a routine's time of day, which is local time (`"21:00"`); the time zone is in the cloud settings file (`Asia/Seoul`).
- **Enumerations** are text with a `CHECK` constraint that lists the exact values of the data model.
- **Lists and small objects** (a box, a point, a list of actions) are JSON text. Anything the cloud searches or joins on is a real column.
- **Foreign keys** are on (`PRAGMA foreign_keys = ON`). Nothing is deleted with `CASCADE`: records that a run refers to are kept, and a removed routine is only marked `removed_at`.
- **Every number** that the code compares against (thresholds, weights, the number of days for a habit) is in the settings file, not in a table.

## Tables at a glance

| Table | One row per | Written by | Requirement |
|---|---|---|---|
| `scans` | Scan started from the app | `scan.start`, `scan.done` | FR-01 |
| `crops` | Picture the hub sent | `control.found`, `mapping.candidate` | FR-01, FR-02, FR-08 |
| `controls` | Physical control | `control.found`, `run.result` | FR-01, FR-09, FR-12 |
| `devices` | Device | `mapping.candidate`, the resident | FR-02, FR-06 |
| `mappings` | Link from a control to a device | `mapping.candidate`, the resident, learning | FR-02, FR-12 |
| `channels` | Device and channel | FR-03 tests, learning | FR-03, FR-07, FR-12 |
| `uses` | Time the resident used a device | Watching | FR-04 |
| `routines` | Routine | Habit finder, the resident | FR-04, FR-06 |
| `feedback` | Answer from the resident | The app | FR-04, FR-05, FR-06 |
| `open_runs` | Run that has started but not ended | Routine Engine | FR-05, FR-06 |
| `runs` | Ended run, the log | `run.result` | FR-12 |
| `hub_messages` | Message `id` already handled | Every hub message | Hub messages |
| `app_state` | Setting the resident can change | The app | FR-06 |
| `sessions` | Signed-in app | `POST /login` | Sign-in |

## Setup: S1 and S2

### `scans`

| Column | Type | Rule |
|---|---|---|
| `scan_id` | text, key | |
| `spot_id` | text | From `scan.start` |
| `started_at` | time | |
| `done_at` | time or null | Null until `scan.done`; the app shows a scan with no `done_at` after a disconnect as interrupted |
| `found`, `skipped` | integer or null | From `scan.done` |
| `reason` | text or null | From `scan.done` |

### `crops`

The JPEG files are on disk, not in the database, so the database stays small. The daily [backup](./stack#backups) copies the folder with the file.

| Column | Type | Rule |
|---|---|---|
| `crop_id` | text, key | The hub's `crop_id` (`cr-h-…`), kept as it is |
| `kind` | `control` `device_before` `device_after` `check` | |
| `path` | text | Relative to the crop folder in the settings file, for example `2026/11/cr-h-0121.jpg` |
| `w`, `h` | integer | |
| `received_at` | time | |

Crops are never shown in the log (L-07); a run names a crop only by `crop_id`. A crop that no record refers to is deleted after 30 days.

### `controls`

| Column | Type | Rule |
|---|---|---|
| `control_id` | text, key | |
| `kind` | `switch` `toggle` `power_strip` | |
| `state` | `on` `off` `unknown` | Last state seen |
| `state_confidence` | number | |
| `actions` | JSON list | From the kind, for example `["press"]` for a `switch` |
| `panel_point` | JSON `[x, y]` or null | Null when no marker was in view |
| `fingerprint` | blob | 384 float32 numbers, little-endian (1,536 bytes) |
| `crop_id` | text → `crops` | The newest clear crop, for the app |
| `seen_spot_id` | text | Where it was last seen |
| `press_spot_id` | text or null | Saved after a successful press (FR-12) |
| `seen_at` | time | |
| `created_at` | time | |

**Same control or new one.** On `control.found` the cloud compares the fingerprint with every saved control of the same `kind` (cosine similarity, in Python; a home has tens of controls, so no vector index is needed). Above the threshold in the settings file, it updates that row. Otherwise it inserts a new one. If the best match is close but its `panel_point` moved more than the set distance, the control's `Verified` mappings become `Stale` (FR-02).

### `devices`

| Column | Type | Rule |
|---|---|---|
| `device_id` | text, key | |
| `name` | text | Starts as the type, for example `light`; the resident can rename it |
| `type` | device type | |
| `room` | text | From the candidate; the resident can change it |
| `risk` | `low` `high` | From the risk sorting in the settings file; `high` for an unknown type. The resident can change it |
| `created_at`, `updated_at` | time | |

The `channels` list in the API is read from the `channels` table.

### `mappings`

| Column | Type | Rule |
|---|---|---|
| `mapping_id` | text, key | |
| `control_id` | text → `controls` | |
| `device_id` | text → `devices`, or null | Null only while `Pending` and the device detector found no device; the app then asks the resident which device it is |
| `status` | `Pending` `Verified` `Rejected` `Stale` | |
| `confidence` | number | 0 to 1 |
| `method` | `watch` `test` | |
| `control_before`, `control_after` | `on` `off` `unknown` | From `control_state` |
| `device_box` | JSON box | Sent back in `run.start` |
| `verify_spot_id` | text | Where the change was seen; the robot goes here for a camera check |
| `change_score` | number | |
| `device_type_seen` | device type or null | What the device detector said |
| `device_score` | number or null | |
| `before_crop_id`, `after_crop_id` | text → `crops` | |
| `status_reason` | text or null | Why it was last changed, for example `"rejected by the resident"`, `"confidence below 0.2"` |
| `created_at`, `updated_at` | time | |

At most one mapping that is not `Rejected` per pair of control and device (a partial unique index on `control_id, device_id` where `status <> 'Rejected'`). A new candidate for the same pair updates that row instead of adding one. One control can have mappings to several devices, as a power strip feeds several.

### `channels`

The Channel record of the data model. One row per device and channel that FR-03 kept, plus one `ARM` row for every device with a `Verified` mapping, so the physical press is scored like the others.

| Column | Type | Rule |
|---|---|---|
| `device_id` | text → `devices` | Key, with `channel` |
| `channel` | `IR` `WIFI` `BT` `ARM` | |
| `address` | JSON or null | What the adapter needs: IR code name, plug IP and type, BLE address. Null for `ARM` |
| `success_score` | number | Running average, the newest result counts 30% |
| `latency_ms` | integer | Running average, the same weight |
| `tries` | integer | |
| `updated_at` | time | |

`run.start` lists the device's wireless rows, best first; `ARM` is never listed (see [`run.start`](/api/hub-messages#run-start-cloud-to-hub)).

## Routines: S3 and S4

### `uses`

Each time the resident is seen using a device by hand: a flip seen while watching, with a `Verified` mapping for that control. The habit finder of FR-04 reads this table.

| Column | Type | Rule |
|---|---|---|
| `use_id` | text, key | |
| `device_id` | text → `devices` | |
| `action` | `on` `off` | |
| `at` | time | |
| `source` | `watch` `seed` | `seed` for rows the demo script adds |

Runs started by the system are not uses; they are in `runs`.

### `routines`

| Column | Type | Rule |
|---|---|---|
| `routine_id` | text, key | |
| `mapping_id` | text → `mappings` | Must be `Verified` when the routine is created (`409` otherwise) |
| `action` | `on` `off` | |
| `time` | text or null | Local time of day, `"21:00"`. Null for a routine started only by a sensor |
| `source` | `habit` `manual` | |
| `independence` | `act_and_tell` `ask_first` `suggest_only` | |
| `priority` | number | Higher when accepted, lower when rejected |
| `reject_streak` | integer | Rejections in a row; at 3, `independence` moves one step down and this goes back to 0 (FR-04) |
| `created_at`, `updated_at` | time | |
| `removed_at` | time or null | Set by the `remove` feedback. Removed routines never fire, but old runs still point to them |

### `feedback`

Every answer from the resident, kept as it was given. `confidence` in a run (FR-05) uses the share of accepted answers for its routine.

| Column | Type | Rule |
|---|---|---|
| `feedback_id` | text, key | |
| `routine_id` | text → `routines` | |
| `run_id` | text or null | Set when the answer is about one run |
| `kind` | `keep` `change` `remove` `accept` `reject` | The first three are routine feedback; `accept` and `reject` answer an `ask` or a `suggest`, or reject the result of a run |
| `detail` | JSON or null | For `change`: the new `time` or `independence` |
| `at` | time | |

## Runs: S4 to S7

A run has two parts in the database. While it is going on, it is a row in `open_runs`. When `run.result` arrives (or the cloud cancels it), the cloud writes the full [run entry](/standards/execution-log) to `runs` and deletes the `open_runs` row in the same transaction.

### `open_runs`

| Column | Type | Rule |
|---|---|---|
| `run_id` | text, key | |
| `trigger` | `sensor` `time` `routine` | |
| `routine_id` | text or null | |
| `device_id`, `mapping_id` | text | |
| `action` | `on` `off` | |
| `decision` | `act` `ask` `suggest` | |
| `confidence`, `risk` | | As decided at the start |
| `phase` | `waiting_answer` `sent` `running` | `waiting_answer` while an `ask` waits for the resident; `sent` once `run.start` went to the hub; `running` once the hub's `ack` for it came |
| `started_at` | time | |
| `dedup_key` | text | Trigger and routine; a second trigger with the same key within 10 s joins this run (FR-05) |

When the cloud starts, it ends every row still in `waiting_answer` as `cancelled`, `reason: "cloud restarted"`: the resident's answer may come too late. Rows in `sent` or `running` wait for the hub, as [How the cloud ends a run](/api/hub-messages#how-the-cloud-ends-a-run) says.

### `runs`

Append-only (L-02): rows are inserted and never updated or deleted. A trigger on the table raises an error on `UPDATE` and `DELETE`.

| Column | Type | Rule |
|---|---|---|
| `run_id` | text, key | |
| `started_at`, `ended_at` | time | |
| `trigger` | | |
| `routine_id`, `device_id`, `mapping_id` | text or null | For filters in the app |
| `decision` | `act` `ask` `suggest` | |
| `channel` | channel or null | |
| `result` | `success` `failure` `unsure` `cancelled` | |
| `last_crop_id` | text or null | For an `unsure` result |
| `entry` | JSON | The whole run entry, exactly as the [run log](/standards/execution-log) defines it |

The columns repeat a few fields of `entry` so the app can filter and sort. `entry` is the record: the harness reads it, and `GET /runs` returns `explanation` from it. The JSON Lines file of L-08 is made from `entry`, one row per line, by `backend-server`'s export command.

Learning (FR-12) runs in the same transaction as the insert: it updates `channels`, the mapping's `confidence` and `status`, the control's `press_spot_id`, and the routine's `priority`.

## Other tables

### `hub_messages`

The `id` of every hub message already handled, so a message resent after a reconnect is handled once. Columns: `id` (key), `type`, `received_at`. Rows older than 7 days are deleted; the hub drops outbox messages older than that (see [Delivery](/api/hub-messages#delivery)).

### `app_state`

Key and JSON value, for the few settings the resident changes in the app. In the prototype, one key: `proactive_paused` (`PUT /proactive`).

### `sessions`

One row per signed-in app (see [Sign-in](./stack#sign-in)).

| Column | Type | Rule |
|---|---|---|
| `token_hash` | text, key | SHA-256 of the cookie's random value. The value itself is never stored |
| `created_at` | time | |
| `expires_at` | time | 30 days after the last use; moved forward at most once an hour |

`POST /logout` deletes the row. Expired rows are deleted once a day.

## What is not stored

- **Frames and video.** They never leave the hub.
- **Spots and rooms.** `spot_id` and room names come from the hub settings file; the database keeps them as text.
- **Hub status.** `hub.status` is kept in memory; after a cloud restart the hub counts as offline until its next heartbeat.

## Open questions

| Question | Why it matters |
|---|---|
| When the hub watches for uses outside a scan | `uses` only fills while the hub watches, and today it watches only after a scan (`watch_s`). Habits (FR-04) need watching through the day. Not needed for the demo, which builds its routine by hand |
