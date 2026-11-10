# Simulator

Unity 6 LTS is an **auxiliary tool**, not the main result of the project. It simulates the switch panel and the robot (the linear actuators on the cart) so that the team can run a rough demo before the real one and test without the real hardware.

## How it fits

- It stands behind the Robot Abstraction Layer like the real hand, with the same interface: `go_to_spot`, `press`, `release`, `stop`.
- It connects to the Python hub over a WebSocket.
- The executor (linear actuators, simulator or a simple script) is chosen in a settings file (FR-11).

## Current state

The [sim-demo](https://github.com/sweg9/sim-demo) repo holds an earlier prototype: a furnished house with a mobile robot that finds wall switches and runs the seven stages with rules. It does not yet match the setup in the proposal (linear actuators on a cart in front of a switch panel) and does not connect to the hub.

To match the proposal, the simulator needs:

| Item | Status |
|---|---|
| A switch panel with wall switches, a toggle and a power strip, plus a lamp and a fan | Not started |
| Linear actuators on a cart in front of the panel, driven through the RAL | Not started |
| WebSocket connection to the Python hub | Not started |
| Camera view of the panel and the actuators | Not started |
