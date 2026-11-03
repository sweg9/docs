# Introduction

We build a system that lets a proactive smart-home agent operate controls that are not on the network: wall switches, push buttons, toggles, knobs and remotes. A camera finds the controls, the system works out which device each one operates, and routines can then use them. Wireless control (IR, Wi-Fi, Bluetooth) comes first. When a camera check shows that a wireless command failed, and a safety check has passed, a small robot arm presses the control.

## Motivation

Smart-home routines work only if every control the resident cares about is on the network and registered. Many are not, and in rented homes the wiring often cannot be changed. Low-cost robot arms and cameras, together with vision-language models (VLMs) and VLA research such as RT-2 and OpenVLA, now make it realistic for a machine to find a control, understand it and press it.

A robot arm alone does not know which control to press, how to press it, or whether the press worked. A system that only sends commands repeats the weakness of today's routines: a command that is sent is assumed to have worked. So the system has to recognize controls, choose how each one is best operated, and check the result.

## Client needs

The client is the resident of a home with both connected devices and unconnected controls. The resident needs a system that:

| Need | Description |
|---|---|
| N1 | Works with unconnected controls without replacing them |
| N2 | Needs little manual setup |
| N3 | Checks that an action worked and recovers when it did not |
| N4 | Stays safe, private and under the resident's control |
| N5 | Works with a simple robot arm now and with other robots later |
| N6 | Acts before being asked and improves with use |

## The robot arm

A small robot arm is placed next to a switch panel, with a camera that sees both the panel and the arm. The arm receives a target position and an action, such as press or flip, and does nothing more. It sits behind a Robot Abstraction Layer (RAL), so a different arm, the Unity simulator or a simple script can be swapped in. One arm reaches a limited area, so we start with one arm per switch panel and treat a mobile robot as a later extension.

Finding the control, deciding how to operate it and checking the result are the work of the system, not of the arm.

## The process

Seven stages in three phases. Every stage defines what goes in, what comes out, and what happens on failure.

| Phase | Stage | What happens |
|---|---|---|
| Setup | S1 Recognize | A detector finds switches, push buttons, toggles, knobs and remotes. A VLM reads the type and state. Each control is saved with a picture fingerprint (embedding), and a microphone, if present, hears clicks |
| Setup | S2 Map | The system links each control to a device, by watching the resident use it or by pressing it and comparing before and after. A link is confirmed only when the change is clear and the VLM agrees |
| Setup | S3 Routine | A confirmed link becomes a routine, created from repeated habits or built by hand. The resident is told and can keep, change or remove it |
| Runtime | S4 Trigger and intent | A sensor, a time or a routine starts a run. A cloud VLM works out the intent and the target device |
| Runtime | S5 Wireless control | The system ranks the device's wireless channels by learned score, sends the command through the best one, and checks whether the device changed |
| Runtime | S6 Physical fallback | If every wireless channel fails or none exists, CV finds the control, a motion planner plans the movement, the Safety Guard checks for people and obstacles, and the arm presses |
| Learning | S7 Learn | Every run, even a cancelled one, updates channel scores, link confidence and routine usefulness |

## Autonomy by risk

What the system does depends on the risk of the device and on its confidence.

| Risk | Examples | High confidence | Medium | Low |
|---|---|---|---|---|
| Low | Lights, fans | Act, then tell the resident | Ask first | Only suggest |
| Medium | TV, air purifier | Ask first | Ask first | Only suggest |
| High | Heaters, power strips | Only suggest; the arm never presses | Only suggest | Only suggest |

The starting thresholds are 0.8 (high) and 0.5 (low). If the resident keeps rejecting a routine, its independence goes down one step.

## Privacy

Frames are processed at the edge, inside the home. Only small crops of controls and short notes go to the cloud. Proactive features stay off until the resident turns them on.

## Where to go next

- [Requirements](/product/requirements): requirements 1 to 12 and how each is built
- [Architecture](./architecture): parts, data and interfaces
- [Related work](./related-work): what existing products and research leave open
