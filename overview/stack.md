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
| Home: `hub` | A laptop at home, directly (`uv run`), outside Kubernetes | Reader (asks the robot for photos over USB, talks to the server), SQLite with every record, Safety Guard, Dashboard (Streamlit), Control Orchestrator, channel adapters, Robot Abstraction Layer | FR-02 to FR-05, FR-07, FR-10 to FR-12 |
| AWS: `server` | A pod on k3s on one EC2 instance | Ingress (Traefik, TLS), FastAPI, the web app, Monitoring (Grafana, Loki) | FR-12 (monitoring) |
| AWS: Nitro Enclave | An isolated enclave on the same EC2 instance, reached only over vsock | ML Engine from `ai-engine` (YOLO11n, Linker, MobileNet) and the autonomy Policy | FR-01, FR-02, FR-06, FR-08 |
| AWS: S3 and KMS | Managed services | S3 keeps encrypted crops and model files. KMS keeps the key that decrypts the crops | C-05 |
| AWS: training instance | A separate EC2 instance, started only to train (offline) | Collect (team dataset and photos), train (PyTorch), publish the model | A-05, A-06 |

- **The hub stays at home and outside Kubernetes** because it needs the webcam and the Arduino's serial port.
- **The hub keeps the records.** There is no database on AWS; the hub sends the context a decision needs with each request.
- **The hub connects over TLS.** It opens a WebSocket to the server through the ingress (`wss://`) and keeps it open. The server returns decisions on this connection, and the hub sends photos, progress and results.

**The TEE.**
- The hub encrypts every crop before it leaves the home.
- FastAPI only passes the encrypted crop to the enclave over vsock.
- Inside the enclave, the crop is decrypted with a KMS key. KMS releases that key only to an enclave whose attestation matches the published image.
- So the EC2 instance, its administrators and S3 never see a crop in the clear.
- Whole frames never leave the hub.

<StackDiagram />

::: info Diagram
The diagram above still shows the 2026-11-17 design. It is replaced by the new architecture figure once it is final.
:::

### One run, end to end

1. A trigger fires on the hub (the scheduler or the resident in the app). The Reader asks the robot for a photo and sends the encrypted crop to the server with the run's context: the device, its risk, the mapping.
2. FastAPI passes it to the enclave. The ML Engine recognizes the control (FR-01), and the Policy decides act, ask or suggest (FR-06). The decision goes back to the hub.
3. If the decision is act, or the resident said yes, the hub ranks the channels and sends the command (FR-07). If wireless fails, it runs the Safety Guard and presses (FR-10, FR-11).
4. The hub sends the before and after crops. MobileNet in the enclave checks the effect (FR-08).
5. The hub writes the run to its SQLite log and updates scores and confidence (FR-12). The Dashboard and the web app show the result.

If the connection drops, the hub finishes or cancels the run it holds. It keeps its messages in an outbox file until the server confirms them with `ack` (see [Delivery](/api/hub-messages#delivery)).

## Libraries

### Python (hub and server)

| Area | Choice | Notes |
|---|---|---|
| Language and tools | Python 3.11, `uv`, `ruff`, `pytest` | `ai-engine` already uses `uv` |
| Models and settings | Pydantic v2, YAML settings files | Every number in settings, not in code |
| Web framework | FastAPI, Uvicorn | The server API and the WebSocket endpoints, on AWS |
| Database | SQLite in WAL mode, SQLAlchemy 2, Alembic | Hub only, at home; no database on AWS. Alembic records every schema change. Tables in [Database](./database) |
| Time triggers | APScheduler | In process, no separate queue |
| Recognition | Ultralytics YOLO11n, Linker (probability table), MobileNetV3-small (PyTorch, CPU) | In `ai-engine`, built into the Nitro Enclave image. No model API (see [Models](/product/models)) |
| TEE | AWS Nitro Enclaves (`nitro-cli`, vsock), AWS KMS | Decrypts crops only inside the attested enclave (C-05) |
| Storage | Amazon S3, `boto3` | Encrypted crops and model files |
| Dashboard | Streamlit | On the hub; reads the hub's SQLite and works offline |
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

### Web app (live-demo)

| Area | Choice | Notes |
|---|---|---|
| Build | Vite, React 18, TypeScript 5, Node.js 20 | |
| Server data | TanStack Query | Lists of controls, mappings, routines, runs |
| Live updates | Browser WebSocket | New control, new routine, run progress |
| API types | `openapi-typescript` from [backend-server.yaml](/api/backend-server) | The app and the backend share one contract |

### Simulator

The Unity simulator is a WebSocket client of the hub and uses the same messages as the RAL (see [Simulator](/product/simulator)).

## Hub to server messages

JSON objects over the hub's WebSocket: a scan (`scan.start`, `control.found`, `scan.done`), a mapping candidate (`mapping.candidate`), watching for uses (`watch.set`, `control.used`), a run (`run.start`, `run.progress`, `run.result`), the emergency `stop`, the `hub.status` heartbeat, and `ack`. The payloads are in [Hub messages](/api/hub-messages).

## Sign-in

The server answers nothing without a sign-in: it is on the internet. The app and the hub sign in differently.

| Who | How | Secret |
|---|---|---|
| Web app | One resident account with a password. `POST /login` checks it and sets a session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`. Every API call and the app's WebSocket must carry it, or get `401` | `APP_PASSWORD_HASH` (argon2), a Kubernetes Secret |
| Hub | `Authorization: Bearer <token>` when it opens its WebSocket. A wrong token closes the connection | `HUB_TOKEN`, in the same Secret and in the hub's environment |
| Grafana | Its own admin account | `GRAFANA_ADMIN_PASSWORD`, a Kubernetes Secret |

- **Sessions** are rows in the database (see [Database](./database#sessions)), so `POST /logout` ends one for good. A session lasts 30 days and is renewed while the app is used, so the emergency stop in the app is not lost to an expired sign-in in the middle of a demo.
- **The stop needs no app.** The key on the hub and the switch on the power adapter work without signing in (FR-10).
- **Same origin.** The ingress serves the app at `/` and the API under `/api` from one host, so the browser sends the cookie on its own and `SameSite=Strict` blocks requests from other sites. The domain and the source of its TLS certificate are open (see [Open questions](#open-questions)).
- **Guessing.** After 5 wrong passwords within a minute, `POST /login` answers `429` for a minute.
- **No secrets in a repo** (C-10). Secrets are created with `kubectl create secret` on the EC2 instance, never committed. `backend hash-password` prints the hash for a new password.

## Deployment on AWS

The server runs on a one-node k3s cluster on one EC2 instance that supports Nitro Enclaves (4 vCPUs or more, for example `m5.xlarge`; burstable `t3` types do not). The manifests are in `backend-server/deploy/k8s/` and are applied with `kubectl apply -k`.

| Workload | Kind | Image | Notes |
|---|---|---|---|
| `server` | Deployment, 1 replica | `sweg9/backend-server` | FastAPI. Holds no database. Readiness and liveness on `GET /healthz` |
| `ml-engine` | Deployment, 1 replica, with the Nitro Enclaves device plugin | `sweg9/ml-engine` | Starts the enclave image (EIF) built from `ai-engine` with `nitro-cli`, and relays vsock to `server` |
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
- **Data.** Loki's files are on the instance's EBS volume. Crops and model files are in S3, encrypted. Nothing else is kept on AWS.
- **Settings.** `settings/server.yaml` and `settings/risk.yaml` go into a ConfigMap; the image never holds settings (C-12).
- **Training** runs on a separate instance with a GPU, started only to train. Its output goes to S3 as a new model and into a new enclave image.
- **Tests** still run with `uv run pytest` outside the cluster.

```bash
kubectl create secret generic app -n sweg9 --from-literal=HUB_TOKEN=... --from-literal=APP_PASSWORD_HASH=...
kubectl apply -k deploy/k8s                         # on the EC2 instance
HUB_TOKEN=... uv run backend hub                    # the hub, on the laptop at home
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
- **Dashboards.** Grafana gets one dashboard, provisioned from the repo: errors per module, gaps in `hub.status`, the outbox size, and a search by `run_id`.

## Backups

The hub's SQLite file holds every mapping, routine and run, so the hub backs it up once a day.

1. At 03:00 Seoul time the hub runs `sqlite3 app.db ".backup backups/app-<date>.db"`. `.backup` gives a consistent copy while the hub keeps writing in WAL mode. It keeps the last 7 days and deletes older ones.
2. To restore, stop the hub, put the backup file in place of `app.db`, and start it again. Alembic upgrades an older schema at start.
3. S3 keeps versions of the encrypted crops and the model files.

**Known limit.** Every copy of the records is on the hub laptop, so a lost or broken laptop loses them. The team accepts this: the database holds demo data that a new scan recreates.

## Open questions

| Question | Why it matters |
|---|---|
| Which Wi-Fi plug and IR blaster to support | Decides the adapter libraries. The demo device has no wireless channel (see the [live-demo plan](/live-demo/PLAN)), so none is bought for the demo, and the adapters are tested with stubs |
| The server's domain and TLS certificate | The ingress needs a public name and a certificate, for example from Let's Encrypt |
| How the web app reads the hub's records | AWS keeps no database, so the lists the app shows must come from the hub through the server |
| Whether photos may be used for training | Crops are decrypted only in the enclave, which has no GPU. Training uses the team dataset unless the resident agrees and a separate decryption step is designed |
| The protocol pages | [Hub messages](/api/hub-messages) and the [backend-server API](/api/backend-server) still describe the 2026-11-17 split and are being revised |
