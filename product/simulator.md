# Simulator

Unity 6 LTS is an **auxiliary tool**, not the main result of the project. It simulates the switch panel and the robot (the linear actuators on the cart) so that the team can run a rough demo before the real one and test without the real hardware.

## How it fits

- It stands behind the Robot Abstraction Layer like the real hand, with the same interface: `go_to_spot`, `press`, `release`, `stop`.
- It connects to the Python hub over a WebSocket.
- The executor (linear actuators, simulator or a simple script) is chosen in a settings file (FR-11).

## Current state

The [sim-demo](https://github.com/sweg9/sim-demo) repo holds a furnished house in which a robot finds wall switches and runs S1 to S7 with scripted rules inside Unity. The start screen offers two robot bodies:

- **Rail and piston cart**: a tracked cart with a vertical rail. A carriage on the rail holds the camera and a piston (linear) actuator; the carriage moves to the height of the control and the rod pushes straight ahead (stroke at most 0.40 m). This is the closest match to the linear actuators on a cart in the proposal. In the simulator the cart drives itself; in the prototype a team member pushes it.
- **CLOiD**: a two-arm home robot that presses with one arm, kept for comparison with a general-purpose robot.

A quick demo of about 20 seconds runs S1 to S7 for one switch: the switch is recognized and mapped to its light with a `WIFI` test pulse, an evening arrival trigger fires, `WIFI` fails, the Safety Guard checks run, the robot presses the switch through `ARM` and the camera confirms the light is on. If the robot cannot reach the press spot, it does not press and the action ends as `failure`. Names follow `data-model.md`. A three.js version of the quick demo (`web/index.html`) runs in a browser without Unity or internet and is used for presentations.

To match the proposal, the simulator needs:

| Item | Status |
|---|---|
| A switch panel with wall switches, a toggle and a power strip, plus a lamp and a fan | Not started. Controls are wall switches on the walls of the house; there is no toggle, power strip, panel or fan yet |
| Linear actuators on a cart in front of the panel, driven through the RAL | In progress. The rail and piston cart exists, but the director calls it directly instead of through `go_to_spot`, `press`, `release` and `stop` |
| WebSocket connection to the Python hub | Not started |
| Camera view of the panel and the actuators | In progress. A first-person camera on the carriage shows the rod and the control, beside a third-person view and the stage log; there is no panel yet |
