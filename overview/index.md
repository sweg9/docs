# Introduction

We build a system that lets a proactive smart-home agent operate controls that are not on the network: wall switches, toggles and power strips. A camera finds the controls, the system works out which device each one operates, and routines can then use them. Wireless control (IR, Wi-Fi, Bluetooth) comes first. When a wireless command fails (the platform reports an error or, for IR, which gives no response, a camera check shows no change) and a safety check has passed, a robot presses the control and the camera checks the result. In the prototype the robot is linear actuators on a cart.

## Motivation

Smart-home routines work only if every control the resident cares about is on the network and registered. Many are not, and in rented homes the wiring often cannot be changed. Low-cost robot arms, linear actuators and cameras, together with vision-language models (VLMs) and VLA research such as RT-2 and OpenVLA, now make it realistic for a machine to find a control, understand it and press it.

A robot that presses controls reaches only a limited area, and by itself it does not know which control to press, how to press it, or whether the press worked. A system that only sends commands repeats the weakness of today's routines: a command that is sent is assumed to have worked. So the system has to recognize controls, choose how each one is best operated, and check the result.

## Client needs

The client is the resident of a home with both connected devices and unconnected controls. The resident needs a system that:

| Need | Description |
|---|---|
| N1 | Works with unconnected controls without replacing them |
| N2 | Needs little manual setup |
| N3 | Checks that an action worked and recovers when it did not |
| N4 | Stays safe, private and under the resident's control |
| N5 | Works with simple linear actuators now and with other robots later |
| N6 | Acts before being asked and improves with use |

## The robot

We assume a general-purpose home robot, with a camera head, arms and a mobile base (wheels, tracks or legs), that can move to a control, see both the control and its own hand, and press it. The robot receives a target position and an action, such as press or flip, and does nothing more. It sits behind a Robot Abstraction Layer (RAL), so a different robot, the Unity simulator or a simple script can be swapped in.

In the prototype, linear actuators that push straight stand in for such a robot. They are carried on a wheeled cart that a team member pushes to each spot, and the cart is placed so that one actuator faces the control. Linear actuators have no joints, so there is no path to plan: the system only chooses which actuator to use and how long to push.

| Part | Purpose | Cost (KRW) |
|---|---|---|
| Linear actuator (12 V, 100 mm) | Physical press (S6) | 37,000 |
| BTS7960 motor driver module | Drives the actuator in either direction | 5,300 |
| Arduino Nano (USB-C) | Controller board, takes push and release commands from the Python hub over USB | 3,490 |
| 12 V 2 A power adapter and DC jack | Powers the actuator | 16,210 |
| Jumper wires (40 pin) | Wiring | 1,500 |
| USB webcam (C270) | Camera feed | 23,040 |
| Shipping | For the parts above | 8,700 |

Prices are those in the shopping cart before purchase (November 2026). Finding the control, deciding how to operate it and checking the result are the work of the system, not of the robot.

## The process

Seven stages in three phases. Every stage defines what goes in, what comes out, and what happens on failure.

| Phase | Stage | What happens |
|---|---|---|
| Setup | S1 Recognize | A detector that works from text descriptions finds wall switches, toggles and power strips. A VLM reads the type and state, and depth data, if the camera provides it, helps place each control. Each control is saved with a picture fingerprint (embedding) |
| Setup | S2 Map | The system links each control to a device, by watching the resident use it or by pressing it and comparing before and after. A link is confirmed only when the change is clear and the VLM agrees |
| Setup | S3 Routine | A confirmed link becomes a routine, created from repeated habits or built by hand. The resident is told and can keep, change or remove it |
| Runtime | S4 Trigger and intent | A sensor, a time or a routine starts a run. A cloud VLM works out the intent and the target device |
| Runtime | S5 Wireless control | The system ranks the device's wireless channels by learned score, sends the command through the best one, and checks whether the device changed: from the state the platform reports, or by camera for IR |
| Runtime | S6 Physical fallback | If every wireless channel fails or none exists, the robot goes to the control's press spot, CV finds the control, the planner chooses which actuator to use and how long to push, the Safety Guard checks for people and obstacles, the actuator presses, and the camera checks the result |
| Learning | S7 Learn | Every run, even a cancelled one, updates channel scores, link confidence and routine usefulness |

## Autonomy by risk

What the system does depends on the risk of the device and on its confidence.

| Risk | Examples | High confidence | Medium | Low |
|---|---|---|---|---|
| Low | Lights, fans, TV, air purifier | Act, then tell the resident | Ask first | Only suggest |
| High | Heaters, electric blankets, microwaves, power strips that feed them | Off: act, then tell. On: ask first | Ask first | Only suggest |

High-risk devices also show a warning when a routine with them is registered, and every run sends a notification. Turning one on always asks first and does nothing without an answer.

The starting thresholds are 0.8 (high) and 0.5 (low). If the resident keeps rejecting a routine, its independence goes down one step.

## Privacy

Frames are processed at the edge, inside the home. Only small crops of controls and short notes go to the cloud. Proactive features stay off until the resident turns them on.

## Where to go next

- [Requirements](/product/requirements): requirements 1 to 12 and how each is built
- [Architecture](./architecture): parts, data and interfaces
- [Related work](./related-work): what existing products and research leave open
