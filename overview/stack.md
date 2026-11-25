# Stack

::: warning Draft
The stack for the demo. Libraries marked *not in the demo* are for wireless channels: the demo device has none, so no plug or blaster is bought and the adapters are tested with stubs (see the [live-demo plan](/live-demo/PLAN)).
:::

The [architecture](./architecture) says what the parts are. This page says which machine runs each part, how the machines talk, and which libraries they use. The tables are in [Database](./database), and the code layout in [Modules](./modules).

## Where each part runs

The team moved the server to AWS on 2026-11-20 (5th meeting). The 2026-11-17 plan ran everything on one laptop at home. The new plan follows the proposal's AWS backend again, for scalability, and protects the photos with a trusted execution environment (TEE). `backend-server` is still one repository with two run modes, because the hub needs the hardware and the server does not.

| Place | Runs | Parts | Requirements |
|---|---|---|---|
| Home: robot | Camera, Arduino Nano, linear actuators | Takes photos on request, presses on command | FR-01, FR-11 |
| Home: `hub` | A laptop at home, directly (`uv run`), outside Kubernetes | Reader (asks the robot for photos over USB), Encryption (seals each photo before it leaves the home), SQLite with every record, Mapping Registry, Routine Engine and triggers, Control Orchestrator, channel adapters, Safety Guard, Robot Abstraction Layer, learning and the run log, Streamlit (a read-only screen) | FR-02 to FR-05, FR-07, FR-10 to FR-12 |
| AWS: `server` | A pod on k3s on one EC2 instance | Ingress (Traefik, TLS); FastAPI, which relays the hub's requests to the enclave and the app's calls to the hub and puts sealed photos in S3; the Dashboard (web app); Monitoring (Grafana, Loki) | FR-12 (monitoring) |
| AWS: Nitro Enclave | An isolated enclave on the same EC2 instance, reached only over vsock | Decryption of the sealed photos, then the ML Engine from `ai-engine` (YOLO11n, Linker, MobileNet, the people detector, the motion planner), then the autonomy Policy | FR-01, FR-02, FR-06, FR-08, FR-09 |
| AWS: S3 and KMS | Managed services | S3 keeps sealed photos and model files. KMS keeps the key that opens the photos | C-05 |
| AWS: training instance | A separate EC2 instance, started only to train (offline) | Collect (the team dataset, synthetic renders and the hub's records), train (PyTorch), publish the model | A-05, A-06 |

- **The hub stays at home and outside Kubernetes** because it needs the webcam and the Arduino's serial port.
- **The hub keeps the records.** There is no database on AWS. The hub sends the context a decision needs with each request, and the server relays the Dashboard's calls to the hub. So the app works only while the hub is connected.
- **The hub connects over TLS.** It opens a WebSocket to the server through the ingress (`wss://`) and keeps it open. Requests and answers go over it (see [Hub messages](/api/hub-messages)).

**The TEE.**
- Encryption on the hub seals every photo before it leaves the home: a new data key from KMS for each photo, AES-256-GCM.
- FastAPI passes the sealed photo to the enclave over vsock unopened, and puts it in S3 as it is.
- Decryption comes first inside the enclave: KMS decrypts the data key, the enclave opens the photo, and only then do the ML Engine and the Policy see it. KMS does this only for an enclave whose attestation matches the published image.
- So the EC2 instance, its administrators and S3 never see a photo in the clear.
- No video leaves the home: the hub sends a single photo only when a step needs one.

![NOVA architecture: the robot and the hub at home. The hub encrypts each photo before it leaves and sends records from SQLite over TLS; the Orchestrator asks the cloud for a decision and hands it to the Safety Guard, then the press. On AWS, S3, KMS and one EC2 instance with k3s (the ingress sends /api to FastAPI, / to the Dashboard and a subdomain to Grafana and Loki) and a Nitro Enclave (decryption, then the ML Engine, then the Policy); a separate EC2 instance for offline training](/architecture.png)

### One run, end to end

1. A trigger fires on the hub: the scheduler, a sensor, or the resident in the app. The Routine Engine builds the context (device, risk, mapping, confidence) and sends `decide` (FR-05).
2. The Policy in the enclave answers act, ask or suggest (FR-06). With ask, the hub waits for the resident's answer in the app.
3. The hub ranks the channels and sends the command (FR-07). If wireless fails, it re-finds the control and gets a press plan (`refind`), the Safety Guard checks for people (`people`), and the hub presses (FR-09 to FR-11).
4. The hub sends sealed photos from before and after (`check`). MobileNet in the enclave answers yes, no or unsure (FR-08).
5. The hub writes the run entry, updates scores and confidence (FR-12), and sends `app.event`. The Streamlit screen and the Dashboard show the result.

If the connection drops, a request without an answer is handled on the safe side: no decision means the system only suggests, no people check means no press, no check means `unsure` (see [Answers that do not come](/api/hub-messages#answers-that-do-not-come)).

## Libraries

### Python (hub and server)

| Area | Choice | Notes |
|---|---|---|
| Language and tools | Python 3.11, `uv`, `ruff`, `pytest` | `ai-engine` already uses `uv` |
| Models and settings | Pydantic v2, YAML settings files | Every number in settings, not in code |
| Web framework | FastAPI, Uvicorn | The server API and the WebSocket endpoints, on AWS |
| Database | SQLite in WAL mode, SQLAlchemy 2, Alembic | Hub only, at home; no database on AWS. Alembic records every schema change. Tables in [Database](./database) |
| Time triggers | APScheduler | On the hub, in process, no separate queue |
| Recognition | Ultralytics YOLO11n, Linker (probability table), MobileNetV3-small, a pretrained YOLO for people (PyTorch, CPU) | In `ai-engine`, built into the Nitro Enclave image. No model API (see [Models](/product/models)) |
| TEE | AWS Nitro Enclaves (`nitro-cli`, vsock), AWS KMS | Opens photos only inside the attested enclave (C-05) |
| Sealing | `cryptography` (AES-256-GCM), KMS data keys | The hub seals each photo before it sends it |
| Storage | Amazon S3, `boto3` | Sealed photos and model files |
| Local screen | Streamlit | On the hub; reads the hub's SQLite and works offline |
| Serial | `pyserial` | Hub to Arduino |
| Wi-Fi plug | `python-kasa` (TP-Link Tapo or Kasa) or `tinytuya` (Tuya) | *Not in the demo*; depends on the plug chosen later |
| IR | `python-broadlink` (Broadlink RM4 mini) | *Not in the demo*; depends on the blaster chosen later |
| Bluetooth | `bleak` | *Not in the demo* |
| Logging | Standard `logging` with a JSON formatter | One JSON object per line; see [Logging](#logging) |

### Interfaces inside the hub

| Interface | Methods | Implementations |
|---|---|---|
| Channel adapter (FR-07) | `reachable(device)`, `send(device, action)` | `WIFI`, `IR`, `BT` |
| Robot Abstraction Layer (FR-11) | `go_to_spot`, `press`, `release`, `stop` | `linear_actuators` (serial), `unity_sim` (WebSocket), `script`, chosen in a settings file |

### Arduino firmware

A line protocol over USB serial at 115200 baud: `PUSH <actuator> <ms>`, `REL <actuator>`, `STOP`, each answered with `OK` or `ERR <reason>`. The firmware itself caps the push time and releases the actuator when the cap is reached or when no command arrives for a set time. The actuator then stops even if the hub crashes (FR-10).

### Dashboard (live-demo)

| Area | Choice | Notes |
|---|---|---|
| Build | Vite, React 18, TypeScript 5, Node.js 20 | |
| Server data | TanStack Query | Lists of controls, mappings, routines, runs |
| Live updates | Browser WebSocket | New control, new routine, run progress |
| API types | `openapi-typescript` from [backend-server.yaml](/api/backend-server) | The app and the backend share one contract |

### Simulator

The Unity simulator is a WebSocket client of the hub and uses the same messages as the RAL (see [Simulator](/product/simulator)).

## Hub to server messages

Requests and answers over the hub's WebSocket:
- `recognize`, `check`, `refind`, `people` and `decide` go to the enclave through the server, and their answers come back.
- `app.request` brings the Dashboard's calls down to the hub, which answers with `app.response`.
- `app.event` and the `hub.status` heartbeat go up for the live screen and monitoring.
- `stop` comes down and is answered with `stop.done`.

The payloads are in [Hub messages](/api/hub-messages).

## Sign-in

The server answers nothing without a sign-in: it is on the internet. The app and the hub sign in differently.

| Who | How | Secret |
|---|---|---|
| Dashboard | One resident account with a password. `POST /login` is relayed to the hub, which checks the password and creates the session; the server sets the cookie: `HttpOnly`, `Secure`, `SameSite=Strict`. Every API call and the app's WebSocket must carry it, or get `401` | `APP_PASSWORD_HASH` (argon2), in the hub's environment |
| Hub | `Authorization: Bearer <token>` when it opens its WebSocket. A wrong token closes the connection | `HUB_TOKEN`, in the same Secret and in the hub's environment |
| Grafana | Its own admin account | `GRAFANA_ADMIN_PASSWORD`, a Kubernetes Secret |

- **Sessions** are rows in the hub's database (see [Database](./database#sessions)). The server passes the cookie with every relayed call, and the hub checks it, so `POST /logout` ends a session for good. A session lasts 30 days and is renewed while the app is used, so the emergency stop in the app is not lost to an expired sign-in in the middle of a demo.
- **The stop needs no app.** The key on the hub and the switch on the power adapter work without signing in (FR-10).
- **Same origin.** The ingress serves the app at `/` and the API under `/api` from one host, so the browser sends the cookie on its own and `SameSite=Strict` blocks requests from other sites. The domain and the source of its TLS certificate are open (see [Open questions](#open-questions)).
- **Guessing.** After 5 wrong passwords within a minute, `POST /login` answers `429` for a minute.
- **No secrets in a repo** (C-10). Secrets are created with `kubectl create secret` on the EC2 instance or set in the hub's environment, never committed. `backend hash-password` prints the hash for a new password.

## Deployment on AWS

The server runs on a one-node k3s cluster on one EC2 instance that supports Nitro Enclaves (4 vCPUs or more, for example `m5.xlarge`; burstable `t3` types do not). The manifests are in `backend-server/deploy/k8s/` and are applied with `kubectl apply -k`.

| Workload | Kind | Image | Notes |
|---|---|---|---|
| `server` | Deployment, 1 replica | `sweg9/backend-server` | FastAPI. Holds no database; relays to the hub and the enclave and puts sealed photos in S3. Readiness and liveness on `GET /healthz` |
| `ml-engine` | Deployment, 1 replica, with the Nitro Enclaves device plugin | `sweg9/ml-engine` | Starts the enclave image (EIF) built from `ai-engine` with `nitro-cli`, and runs the vsock proxy the enclave uses for KMS. The server reaches the enclave over vsock |
| `web` | Deployment, 1 replica | `sweg9/live-demo` (nginx with the app build) | Static files only |
| `loki` | StatefulSet, 1 replica | `grafana/loki` | See [Logging](#logging) |
| `alloy` | DaemonSet | `grafana/alloy` | Reads the pods' logs and sends them to Loki |
| `grafana` | Deployment, 1 replica | `grafana/grafana` | Loki is provisioned as its data source |
| Ingress | Traefik (built into k3s) | | One host for the app, the API and the hub's WebSocket; a second host for Grafana |

| Namespace | What |
|---|---|
| `sweg9` | `server`, `ml-engine`, `web`, the app Secret, the settings ConfigMap |
| `logging` | `loki`, `alloy`, `grafana` |

- **Images** are built by GitHub Actions and pushed to the GitHub Container Registry (GHCR). k3s pulls them from there.
- **The enclave image** is rebuilt when a new model is published. Its attestation value then changes, so the KMS key policy is updated with it.
- **Data.** Loki's files are on the instance's EBS volume. Sealed photos and model files are in S3. Nothing else is kept on AWS.
- **Settings.** `settings/server.yaml` goes into a ConfigMap. The Policy runs in the enclave, which has no network, so `settings/risk.yaml`, `settings/enclave.yaml` and `ai-engine`'s `settings.yaml` go into the ConfigMap too and are passed to it over vsock when it starts. No image holds settings (C-12).
- **Training** runs on a separate instance with a GPU, started only to train. Its output goes to S3 as a new model and into a new enclave image.
- **Training data** (decision of 2026-11-24): the team dataset, the synthetic renders and the hub's records, such as verified links for the Linker. The residents' sealed photos are never opened for training. They are opened only in the enclave, which has no GPU. Real before and after pairs for M-S5 come from the team's own recordings of the demo devices, added to the dataset.
- **Tests** still run with `uv run pytest` outside the cluster.
- **Setting up the instance** (k3s, the Nitro Enclaves allocator and device plugin, the KMS key policy, the S3 bucket) is in `backend-server/deploy/README.md`.

```bash
kubectl create secret generic app -n sweg9 --from-literal=HUB_TOKEN=...
kubectl apply -k deploy/k8s                         # on the EC2 instance
HUB_TOKEN=... APP_PASSWORD_HASH=... uv run backend hub   # the hub, on the laptop at home
```

## Logging

Two kinds of logs, kept apart:

| Log | What | Where | Rules |
|---|---|---|---|
| Run log | One entry per run (FR-12) | The `runs` table in the hub's SQLite | [Run log](/standards/execution-log): append-only, the record for evaluation |
| Operational logs | What the hub and the server did and what went wrong: connections, messages, errors, timings | Loki on AWS, searched in Grafana | Below |

- **Format.** One JSON object per line: `ts` (UTC ISO 8601), `level`, `mode` (`hub` or `server`), `module`, `msg`, and `run_id`, `scan_id`, `msg_id` when they apply.
- **Collection.**
  - The server writes to stdout, and Alloy reads the pod logs.
  - The hub writes to `hub.log` (rotated at 10 MiB, 5 files kept). An Alloy agent on the hub laptop pushes the file to Loki through the ingress.
  - Loki labels are few: `mode`, `level`, `module`.
- **Content.** No images, no base64, no fingerprints, no secrets, no cookies (C-05, C-10, as L-07 asks of the run log). A message is logged by its `type` and `id`, never with its payload. The enclave logs nothing but counts and timings.
- **Retention.** Loki keeps 14 days, then deletes. The run log is not affected.
- **Dashboards.** Grafana gets one dashboard, provisioned from the repo: errors per module, gaps in `hub.status`, requests without an answer, and a search by `run_id`.

## Backups

The hub's SQLite file holds every mapping, routine and run, so the hub backs it up once a day.

1. At 03:00 Seoul time the hub runs `sqlite3 app.db ".backup backups/app-<date>.db"`. `.backup` gives a consistent copy while the hub keeps writing in WAL mode. It keeps the last 7 days and deletes older ones.
2. To restore, stop the hub, put the backup file in place of `app.db`, and start it again. Alembic upgrades an older schema at start.
3. S3 keeps versions of the sealed photos and the model files.

**Known limit.** Every copy of the records is on the hub laptop, so a lost or broken laptop loses them. The team accepts this: the database holds demo data that a new scan recreates.

## Open questions

| Question | Why it matters |
|---|---|
| Which Wi-Fi plug and IR blaster to support | Decides the adapter libraries. The demo device has no wireless channel (see the [live-demo plan](/live-demo/PLAN)), so none is bought for the demo, and the adapters are tested with stubs |
| The server's domain and TLS certificate | The ingress needs a public name and a certificate, for example from Let's Encrypt |
