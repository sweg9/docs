# Plan

## 1. One-line definition

A front end that shows the whole process running on real hardware: a camera finds the controls, the system works out which device each one operates, routines run through wireless channels first, and a physical hand presses the control when a camera check shows that wireless failed.

## 2. Background and problem

- The [simulator](/product/simulator) is an auxiliary tool for the rough demo. It cannot show that the system works with a real camera, devices and actuators.
- A command that is sent is usually assumed to have worked. The demo has to show the check after each command, and what happens when it fails.
- The resident has the final say, so the reason for each automatic action has to be readable on screen.

## 3. Goals

| Category | Content |
|---|---|
| What to show | Stages S1 to S7 on real hardware |
| What matters | Failure behavior is as clear as normal behavior: the next channel, the actuator press, a cancelled press |
| What not to do | Train models, collect or label data, or implement backend logic. This repo holds the screens and the demo flow |

## 4. Users and stakeholders

| Role | What they do |
|---|---|
| Resident | Confirms or rejects mappings, gives feedback on routines, answers questions, uses the emergency stop |
| Presenter | Runs the demo, starts triggers and creates the failure cases |
| Evaluator | Reads the results and reasons on screen and in the log |
| `backend-server` | Provides the API and live updates. See the [API reference](/api/backend-server) |
| `ai-engine` | Provides recognition, state checks and the motion planner |

## 5. Demo setup

```text
USB webcam ────────────────> edge hub ──> backend-server ──> live-demo (screens)
                                 │
                                 ├──> Wi-Fi plug, IR blaster ──> lamp, fan
                                 └──> linear actuators on a cart ──> control
```

- The robot is [linear actuators on a wheeled cart](/overview/) that a team member pushes to each control, with a camera that sees the control. The cart is placed so that one actuator faces the control; there is no path to plan (FR-09). A general-purpose home robot is a later extension.
- 12 V, 100 mm actuators are driven by a BTS7960 motor driver and an Arduino Nano that takes `push` and `release` from the hub over USB. In these documents, "actuator" means this hand.
- The demo devices include a lamp and a fan. The final devices are not fixed. See [Development environment](/product/environment).
- The system recognizes three control kinds: wall switches, toggles and power strips. The demo focuses on wall switches.
- The actuators stay behind the Robot Abstraction Layer, so the Unity simulator or a simple script can replace it through a settings file (FR-11).

## 6. Scenarios

| No. | Situation | Stages | Requirements | Success criterion |
|---|---|---|---|---|
| 1 | A new control becomes part of a routine | S1 to S3 | FR-01 to FR-04 | The control is found, its mapping becomes `Verified`, and a routine is added and shown to the resident |
| 2 | Wireless works | S4, S5, S7 | FR-05 to FR-08, FR-12 | The device changes, the main check confirms it, and the log explains the run |
| 3 | Wireless fails and the actuator presses | S4 to S7 | FR-07 to FR-12 | The next channels are tried, the actuator presses after the safety gate, and the state check confirms it |
| 4 | A person is near the actuators | S6, S7 | FR-10, FR-12 | The press is cancelled, the resident is told why, and the run is logged |
| 5 | A high-risk device | S4, S7 | FR-06, FR-12 | Turning it on asks the resident first and does nothing without an answer; turning it off follows the low-risk rules |

A habit needs at least 3 days to be noticed (FR-04), so scenario 1 builds the routine by hand in the app. Running scenario 3 right after scenario 1 on the same control is the full end-to-end demo.

The presenter creates the failure cases by hand.

| Failure | How to create it (proposed) |
|---|---|
| Wireless failure | Turn off the Wi-Fi plug or block the IR blaster |
| Person near the actuators | Stand in the actuators' work area |
| Cloud not reachable | Disconnect the network. The system only suggests (FR-05) |
| Wrong mapping | Move a control or change how it looks. The mapping becomes `Stale` (FR-02) |

## 7. Scope

| Included | Excluded |
|---|---|
| Screens that show results and reasons for S1 to S7 | Models and prompts (`ai-engine`) |
| Mapping confirmation, routine feedback, notifications, setup guide | API, registry, routines and safety gate logic (`backend-server`) |
| Plain-language log, pause switches, emergency stop button | Training and evaluation data (`dataset`) |
| Trigger controls for the presenter, recorded backup of the demo | A mobile robot, several robots, several homes |

## 8. Schedule (proposed)

| Round | Content | Done when |
|---|---|---|
| 1 | Camera view and S1 | Detected controls appear on the live camera view |
| 2 | S2, S3 and mapping confirmation | Scenario 1 runs once |
| 3 | S4, S5, log, pause switches and emergency stop | Scenario 2 runs once on a real device |
| 4 | S6, S7 and the failure cases | Scenarios 1 to 5 run repeatedly and a backup is recorded |

Each round needs the matching `backend-server` and `ai-engine` features. If they are late, build the screens against fake responses in the same API format, and measure only on the real connection.

## 9. Success criteria

All five scenarios run on the real hardware, and each result and reason on screen matches the log. If the real actuators are not ready, the demo uses the simulator for scenario 3 and says so.
