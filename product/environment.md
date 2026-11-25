# Development environment

## Platforms

| Item | Choice | Notes |
|---|---|---|
| Operating systems | Windows, macOS | The team uses both. Code stays cross-platform; the hardware drivers (camera and actuator controller) are tested on both. Speed reference: Windows 11 laptop, 16 GB RAM |
| Main language | Python 3.11 | Edge hub, AI parts and backend. PyTorch, OpenCV and Ultralytics YOLO are Python libraries |
| Dashboard (web app) | TypeScript 5, React 18 | Runs in any browser; the resident installs nothing |
| Simulator | Unity 6 LTS (C#) | Auxiliary only: switch panel and robot simulator for the rough demo and for tests when the real robot is not available. Connects to the Python hub over a WebSocket |
| Deployment | Kubernetes (k3s) on AWS EC2, Nitro Enclaves, S3, KMS | The server, the Dashboard and the logging (Loki, Grafana) run as containers on one EC2 instance. The models run in a Nitro Enclave on it. The hub runs on a laptop at home outside k8s, because it needs the webcam and the Arduino on USB (decision of 2026-11-20) |
| Tools | VS Code, GitHub, Overleaf, Claude Opus 5.5 | Claude Opus 5.5, an AI model from Anthropic, helps draft and review code and documents. Members decide and test everything, and Claude is not part of the product. The code is in public repositories, and the photo dataset and the trained detector are in a private repository |

## Software in use

We reuse existing software and build only the parts that connect it.

| Software | Use |
|---|---|
| YOLO (Ultralytics) | Fast detector, fine-tuned on our switch-panel photos |
| Grounding DINO, OWL-ViT | Open-vocabulary detection to draft labels and find controls before training |
| DINOv2 | Image encoder; its embedding is the control's fingerprint |
| OpenCV | Camera capture and image handling, such as cropping a control and comparing two pictures |
| Linear actuators and a driver board | 12 V, 100 mm actuators mounted side by side on the cart, placed so that one of them faces the control. A BTS7960 motor driver module powers an actuator in either direction (out or back), and an Arduino Nano takes `push` and `release` from the Python hub over USB and tells the driver what to do. A 12 V, 2 A adapter supplies the power. No joints, so nothing to plan: the system chooses the actuator and how long to push |
| VLA models (RT-2, OpenVLA, π0) | Candidates to replace the motion script later |
| FastAPI, SQLite | Backend framework on AWS, and the hub's database for the registry, routines and log |
| AWS EC2, Nitro Enclaves, KMS, S3 | The server, the TEE for the models, the key that only the enclave can use, and the sealed photos |
| Streamlit | The hub's local read-only screen |
| Docker, k3s, kubectl | Container images and a one-node Kubernetes cluster on the EC2 instance |
| Grafana Loki, Grafana Alloy, Grafana | Collecting, storing and searching the operational logs |
| React | Dashboard UI |

## Versions

Python 3.11, PyTorch 2, Ultralytics YOLO, OpenCV 4, FastAPI, Node.js 20, TypeScript 5, React 18, Unity 6 LTS, Kubernetes 1.31 (k3s), Grafana Loki 3, pinned in each repository.

Fine-tuning runs on a separate AWS training instance with a GPU, or on a team laptop's GPU (Apple `mps`) during development. The small detector runs on the enclave's CPU because the scene is mostly still; this will be measured.

## Prototype cost (KRW)

| Item | Purpose | Cost |
|---|---|---|
| Laptops (4 members, 2,000,000 each) | Development and tests | 8,000,000 |
| Linear actuator (12 V, 100 mm) | Physical press (S6) | 37,000 |
| BTS7960 motor driver module | Drives the actuator | 5,300 |
| Arduino Nano (USB-C) | Controller board, takes commands over USB | 3,490 |
| 12 V 2 A power adapter and DC jack | Powers the actuator | 16,210 |
| Jumper wires (40 pin) | Wiring | 1,500 |
| USB webcam (C270) | Camera feed | 23,040 |
| Shipping | For the parts above | 8,700 |
| Software | VS Code, GitHub, Overleaf, Unity (free plans); Docker, k3s, Loki, Grafana (open source) | 0 |
| AWS | EC2 with Nitro Enclaves, the training instance, S3, KMS | To be estimated |
| **Total** (without AWS) | | **8,095,240** |

Each of the four members counts one laptop of 2,000,000 KRW. The software tools are free or open source. The prices of the actuator, the controller parts and the webcam are those in our shopping cart before purchase (November 2026), and the shipping cost of that order is included.
