# Development environment

## Platforms

| Item | Choice | Notes |
|---|---|---|
| Operating systems | Windows, macOS | The team uses both. Code stays cross-platform; camera, microphone and arm drivers are tested on both. Speed reference: Windows 11 laptop, 16 GB RAM |
| Main language | Python 3.11 | Edge hub, AI parts and backend. PyTorch, OpenCV, Ultralytics YOLO and LeRobot are Python libraries |
| Web app | TypeScript 5, React 18 | Runs in any browser; the resident installs nothing |
| Simulator | Unity 6 LTS (C#) | Auxiliary only: switch panel and arm simulator for the rough demo and for tests without the real arm. Connects to the Python hub over a WebSocket |
| Cloud | AWS EC2, AWS S3 | One small EC2 machine for the backend; a GPU machine rented only to tune the detector. S3 holds the dataset, the detector and log backups |
| Tools | VS Code, GitHub, Overleaf, Claude | Claude helps draft and review code and documents. Members decide and test everything, and Claude is not part of the product |

## Software in use

We reuse existing software and build only the parts that connect it.

| Software | Use |
|---|---|
| YOLO (Ultralytics) | Fast detector, fine-tuned on our switch-panel photos |
| Grounding DINO, OWL-ViT | Open-vocabulary detection to draft labels and find controls before training |
| Cloud VLM (API) | Reads type and state, infers intent, answers yes-or-no checks. Not trained by us; chosen after testing |
| DINOv2 | Image encoder; its embedding is the control's fingerprint |
| YAMNet | Audio event classifier for clicks and fan hum |
| OpenCV | Capture, ArUco markers, homography from image to panel |
| LeRobot, SO-101 (option A) | Arm control and inverse kinematics for the motion script |
| Linear actuators and a driver board (option B) | Two actuators, each fixed in front of one control, driven by a small controller board that takes `push` and `release` from the Python hub over USB. No joints, so nothing to plan: the system chooses the actuator and how long to push |
| VLA models (RT-2, OpenVLA, π0) | Candidates to replace the motion script later |
| FastAPI, SQLite | Backend framework and database for the registry, routines and log in the prototype |
| React | Web app UI |

## Versions

Python 3.11, PyTorch 2, Ultralytics YOLO, OpenCV 4, LeRobot, FastAPI, Node.js 20, TypeScript 5, React 18 and Unity 6 LTS, pinned in each repository.

Fine-tuning runs on a rented cloud GPU. The small detector is expected to run on a laptop CPU because the scene is mostly still; this will be measured.

## Prototype cost (KRW, estimates)

| Item | Purpose | Cost |
|---|---|---|
| Option A: SO-101 robot arm kit | Physical press (S6) | 150,000 |
| Option B: two linear actuators and a driver board | Physical press (S6) | 70,000 |
| USB camera with microphone | Video and sound | 30,000 |
| Wi-Fi plug, IR blaster | Wireless channels | 40,000 |
| Cloud use | AWS (EC2, S3), VLM API calls, GPU time | 100,000 |
| Software | VS Code, GitHub, Overleaf, Unity (free plans) | 0 |
| **Total with option A** | | **about 320,000** |
| **Total with option B** | | **about 240,000** |

We choose one of the two actuator options, so each total counts only one of them. The SO-101 price follows its listed base kit, about 100 USD at about 1,400 KRW per dollar. The linear actuator price is our own estimate.
