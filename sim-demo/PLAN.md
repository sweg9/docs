# Plan

## 1. One-line definition

The demo shows the whole process for wall switches, push buttons and dials that are not connected to any network: find them with a camera, confirm which device each one controls, use a wireless channel when it works, let a robot arm press the control when it does not, put it into a routine, and learn from the result.

## 2. Background and problem

- Many homes have switches that are not connected to a network. To use them in a smart-home routine, a person has to register each device by hand.
- From the outside we do not know how much a robot can do. The design therefore does only as much as each level allows and steps down to a lower level when something is not possible.
- The goal of this demo is to show the whole process on one screen, from start to end. It does not compete on the performance of any single technology.

## 3. Goals

| Item | Content |
|---|---|
| What to show | Seven stages: S1 recognize, S2 map and verify, S3 propose a routine, S4 trigger, S5 wireless control, S6 physical operation, S7 learn |
| What matters in the show | Failure behavior (physical fallback after a wireless failure, cancel on a hazard) is shown as clearly as normal behavior |
| What not to do | No real robot control and no training of a real recognition model. The demo is a simulation, and recognition results and verification values are produced by rules |

## 4. Users and stakeholders

| Role | What they do |
|---|---|
| Resident | Approves or rejects routine proposals. Ultimately responsible |
| Robot | Provides observation, movement and manipulation |
| Cloud VLM | Infers intent and target device from the situation |
| Smart-home hub | Sends IR, Wi-Fi and Bluetooth commands |

## 5. Demo setup

- A modern house (living room, kitchen, hall, bedroom) with 5 switches and 1 thermostat that is not an operable control (a decoy to test false recognition).
- The robot is driven by hand (WASD, click on the floor) or moves on its own in the auto demo. Path finding uses A*.
- The screen shows the house, the robot camera feed (detection boxes and confidence), a minimap and a log per stage.

## 6. Scenarios

| No. | Situation | Stages | Success criterion |
|---|---|---|---|
| 1 | Wireless works | S4, S5, S7 | The lamp turns on and CV confirms it within 5 s |
| 2 | Wireless fails and the robot falls back to physical operation | S4 to S7 | The switch is pressed and CV confirms it. If an obstacle (a person) is on the path, the action is cancelled |
| 3 | A new switch becomes a routine | S1 to S3 (then S4 to S7) | The mapping is verified, the routine is approved and runs once |

Running scenario 2 on the same switch right after scenario 3 is the full end-to-end demo. In the simulator, `R` (evening routine), `G` (goodnight routine), `H` (inject a hazard) and `Space` (auto demo) reproduce this flow.

## 7. Scope

| In scope | Out of scope |
|---|---|
| Visualization of stages S1 to S7, channel selection and fallback, safety guard, learning | Real hardware integration, real data collection |
| Three scenarios and metric display | Multiple homes, multiple users |
| The demo with a real camera and AI is a separate repo | Not covered in this repo |

## 8. Schedule (four iterations)

| Iteration | Content |
|---|---|
| 1 | Base environment and S1 (house, robot, recognition view) |
| 2 | S2, S3 and the mapping registry |
| 3 | S4 to S6 and the safety guard |
| 4 | S7, full end-to-end runs and evaluation |

Each iteration ends with tests for the requirements it covers.

## 9. Success criteria

Metrics E1 to E10 in the PRD are the basis. The key points are an end-to-end success rate per scenario of 90 / 80 / 70 % and no stage below 80 %.
