# Simulator

Unity 6 LTS is an **auxiliary tool**, not the main result of the project. It simulates the switch panel and the robot arm so that the team can run a rough demo before the real one and test without the real arm.

## How it fits

- It stands behind the Robot Abstraction Layer like the real arm, with the same interface: `move`, `press`, `release`, `stop`.
- It connects to the Python hub over a WebSocket.
- The executor (real SO-101, simulator or a simple script) is chosen in a settings file (FR-11).

## Current state

The [sim-demo](https://github.com/sweg9/sim-demo) repo holds an earlier prototype: a furnished house with a mobile robot that finds wall switches and runs the seven stages with rules. It does not yet match the setup in the proposal (one arm next to one switch panel) and does not connect to the hub.

To match the proposal, the simulator needs:

| Item | Status |
|---|---|
| A switch panel with switches, buttons, a dial, a lamp and a fan | Not started |
| A small arm next to the panel, driven by `move`, `press`, `release`, `stop` | Not started |
| WebSocket connection to the Python hub | Not started |
| Camera view of the panel and the arm, with ArUco markers at the corners | Not started |
