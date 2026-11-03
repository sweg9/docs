# Introduction

We build a system that finds wall switches, push buttons and dials with a camera, confirms which device each one controls, and operates it, through a wireless channel when one works and with a robot arm when it does not. Verified controls become part of proactive home routines, and every result feeds back into the next decision.

## Why

Many homes still have controls that are not connected to any network. A smart-home routine cannot use them unless someone registers each device by hand. We also cannot assume how much a given robot can do, so the system does as much as its measured capability allows and falls back to a lower level when something is not possible.

## The process

| Stage | Name | What happens |
|---|---|---|
| S1 | Recognize | Detect controls in the camera feed and classify their type |
| S2 | Map and verify | Link a control to a device and confirm it with a test signal |
| S3 | Integrate | Propose the verified mapping as a routine; add it on approval |
| S4 | Trigger and intent | Receive an event and infer the intent and target device |
| S5 | Wireless control | Send the command over the best channel and check the result with CV |
| S6 | Physical fallback | After a safety check, press the control with the robot arm |
| S7 | Learn | Update channel priority and mapping confidence from the outcome |

Setup is S1 to S3, runtime is S4 to S6, and learning is S7. See the [PRD](/sim-demo/PRD) for the requirements behind each stage.

## Capability levels

| Level | Adds | What the system can do |
|---|---|---|
| L0 | Video stream | Detect controls, watch the user, propose candidate mappings |
| L1 | Movement, voice or screen | Re-observe from a better view, ask the user to confirm |
| L2 | Wireless commands with CV check | Control devices in a closed loop, act proactively on low-risk devices |
| L3 | Arms and hands | Fall back to physical operation when wireless control is missing or fails |

Each level includes the one below it. If a measurement falls under its threshold, the system drops one level at once.

## Where to go next

- [Repositories](./repositories): what each repo owns
- [Architecture](./architecture): components, tiers and the data model
- [Standards](/standards/): the rules every repo must follow
