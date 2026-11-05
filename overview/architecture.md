# Architecture

## Where things run

| Place | What runs there |
|---|---|
| Edge hub (inside the home, Python) | Camera and microphone capture, control detection, channel adapters (IR, Wi-Fi, Bluetooth), control of the hand through the Robot Abstraction Layer, Safety Guard. Video never leaves the hub |
| Backend (AWS EC2, FastAPI) | Mapping Registry, routines and the log (SQLite in the prototype), VLM calls |
| Cloud VLM (API) | Reads the type and state of a control, infers intent, answers yes-or-no questions when a result is checked |
| Private GitHub repository | Photo dataset, trained detector |
| Web app (React, TypeScript) | The resident's screens: mappings, routine feedback, log, notifications, emergency stop |
| Hand or simulator | In the prototype, the hand is on a wheeled cart that a team member pushes to each spot. Option A: SO-101 arm with LeRobot. Option B: two linear actuators on a driver board, commanded over USB. Or the Unity simulator or a simple script. All behind the RAL |

Only small crops of controls and short notes go to the cloud.

## Main parts

| Part | Job | Requirement |
|---|---|---|
| Control recognition | Finds controls, reads type and state, keeps a fingerprint | 1 |
| Mapping Registry | Stores which control operates which device, with confidence and status | 2 |
| Channel adapters | One small adapter per wireless channel | 3, 7 |
| Routine Engine | Creates routines from habits, handles feedback, starts runs | 4, 5 |
| Autonomy policy | Decides act, ask or suggest from risk and confidence | 6 |
| Control Orchestrator | Looks up the mapping, ranks channels, sends commands, falls back to the arm | 7 |
| State Verifier | Main check on the device, second checks on surroundings and sound | 8 |
| Motion planner | Option A: turns a control into an arm path (script by default, a VLA model later). Option B: picks the actuator that faces the control | 9 |
| Safety Guard | Checks people, pets, risk class and position before any movement; emergency stop | 10 |
| Manipulator Adapter | Executes the press through the RAL, with the arm or an actuator | 11 |
| Learning and log | Updates channel scores and link confidence; writes every run to the log | 12 |

## Main flow

```text
camera, mic ──> recognition ──> Mapping Registry <──── learning
                                    │                    ▲
trigger ──> Routine Engine ──> Control Orchestrator ─────┤
               │                    │        │           │
          cloud VLM           channel     Safety Guard   │
          (intent)            adapters        │          │
                                  │      motion planner  │
                                  ▼           ▼          │
                               device <── hand (RAL) ────┤
                                  │                      │
                                  └──> State Verifier ───┘
```

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
- **Hand.** One common interface: `go_to_spot`, `press`, `release`, `stop`. In the prototype, `go_to_spot` asks a team member to push the cart there. The SO-101 arm, the linear actuators, the Unity simulator or a simple script can be swapped in.
- **Wireless channel.** Each adapter has two abilities: tell whether the device can be reached, and send a command.
