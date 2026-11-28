# Architecture

## Where things run

| Place | What runs there |
|---|---|
| Edge hub (inside the home, Python) | Reader (asks the robot for photos), Encryption (seals each photo before it leaves the home), the records in SQLite (Mapping Registry, routines, the log), Routine Engine and triggers, Control Module, channel adapters (IR, Wi-Fi, Bluetooth), control of the hand through the Robot Abstraction Layer, Safety Guard, learning, Streamlit (a read-only screen on the hub). No video leaves the hub |
| Server (AWS EC2, FastAPI on k3s) | The API for the Dashboard, relayed to the hub; the way from the hub to the enclave; the Dashboard and monitoring. Keeps no database (decision of 2026-11-20, for scalability) |
| Nitro Enclave (on the same EC2 instance) | Decryption, then the ML Engine (YOLO11n, Linker, MobileNet, the people detector, the motion planner), then the autonomy policy. Photos are opened only here, with a KMS key released to the attested enclave |
| S3 | Sealed photos and model files |
| Offline training (a team laptop) | Trains once, on the team dataset and the synthetic renders, with PyTorch; the trained models are built into the enclave image. No continuous training: the hub's records and the residents' photos are never used to train |
| Logging (Loki and Grafana on k3s) | The operational logs of the hub and the server, for finding faults. The run log of FR-12 stays in the hub's database |
| Private GitHub repository | Photo dataset |
| Dashboard (web app, React, TypeScript) | The resident's screens: mappings, routine feedback, log, notifications, emergency stop |
| Robot or simulator | In the prototype, 12 V linear actuators on a wheeled cart that a team member pushes to each spot. An Arduino Nano takes push and release commands from the hub over USB and drives a BTS7960 motor driver; a 12 V 2 A adapter powers them. Or the Unity simulator or a simple script. All behind the RAL, so a general-purpose home robot can replace them later |

Only sealed photos and short notes go to the server. Both the edge hub and the backend run from the `backend-server` repository, in its `hub` and `server` modes; the hub keeps a WebSocket open to the server over TLS. See [Stack](./stack) for the libraries and messages.

## Main parts

| Part | Job | Requirement |
|---|---|---|
| Control recognition | Finds controls, reads type and state, keeps a fingerprint | 1 |
| Mapping Registry | Stores which control operates which device, with confidence and status | 2 |
| Channel adapters | One small adapter per wireless channel | 3, 7 |
| Routine Engine | Creates routines from habits, handles feedback, starts runs | 4, 5 |
| Autonomy policy | Decides act, ask or suggest from risk and confidence | 6 |
| Control Module (`orchestrator.py`) | Looks up the mapping, ranks channels, sends commands, falls back to the physical press | 7 |
| State Verifier | Decides each command's result: the state the platform reports for a device that reports one; for IR and every physical press, a camera check (main check on the device, second check on its surroundings, such as the room getting brighter) | 8 |
| Motion planner | Picks the actuator that faces the control and how long to push; no path to plan. A simple script now, swappable for a VLA model later | 9 |
| Safety Guard | Checks people, pets, risk class and position before any movement; emergency stop | 10 |
| Manipulator Adapter | Executes the press through the RAL with an actuator | 11 |
| Learning and log | Updates channel scores and link confidence; writes every run to the log | 12 |

## Main flow

A trigger fires on the hub. The Routine Engine sends the context to the Nitro Enclave on AWS, where the autonomy policy decides; the hub carries out the run. Recognition and the result check also run in the enclave, on encrypted crops, and the result goes back to learning on the hub. Wireless channels come first (1), the press only after them (2), and every press passes the Safety Guard. The numbers are the requirements. Where each part runs is on the [Stack](./stack#where-each-part-runs) page.

<ArchitectureDiagram />

## What the system remembers

| Record | Fields |
|---|---|
| Control | Type, how it looks now, what can be done with it, position on the panel, picture fingerprint, the spot where the robot stands to press it |
| Device | Name, type, room, risk, channels that can operate it |
| Mapping | Control, device, the spot from which the robot saw the device change, confidence, status: `Pending`, `Verified`, `Rejected`, `Stale` |
| Channel | For each device and channel (IR, Wi-Fi, Bluetooth, physical press): how often it works and how fast it is |
| Routine | Habit, priority, how independently it acts |
| Run | Trigger, intent, channel used, result, and the reason if it was cancelled |

## Interfaces

- **App and backend.** The app asks for the lists of controls, mappings and routines, and sends the resident's choices: confirm or reject a mapping, feedback on a routine, and the emergency stop. The backend pushes live updates: a new control, a new routine, the progress of a run. See the [API reference](/api/backend-server).
- **Hand.** One common interface: `go_to_spot`, `press`, `release`, `stop`. In the prototype, `go_to_spot` asks a team member to push the cart there. The linear actuators on the cart, the Unity simulator or a simple script can be swapped in.
- **Wireless channel.** Each adapter has two abilities: tell whether the device can be reached, and send a command.
