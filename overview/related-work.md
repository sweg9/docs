# Related work

Several platforms and research systems cover part of the problem. None of them combines recognition of unconnected controls, device mapping, verified wireless control, a safety-gated physical fallback and learning.

| System | What it offers | What it leaves open |
|---|---|---|
| LG ThinQ and ThinQ ON | AI home platform and hub; many connected appliances. LG bought 80% of Athom (Homey) in 2024 | Public descriptions do not cover operating unconnected switches or checking by camera that a command worked |
| Homey (Athom) | Local hub with Wi-Fi, BLE, Matter, Thread, Zigbee, Z-Wave and IR; rules in Flow | Users write the rules, an IR command returns no confirmation, a wall switch needs an extra button pusher |
| SwitchBot Bot | Small adhesive button pusher over Bluetooth, no rewiring | One unit and battery per switch; no check that the device really turned on |
| SwitchBot AI Hub | Home AI agent that uses cameras and a VLM to understand the home | Does not describe checking a single command or switching to a physical press |
| Home robot arms | SO-101 (open source, about 100 USD base kit), DOBOT Magician, Kinova Jaco | Move to a given position, but know nothing about which control is where, what it operates or whether the press worked |
| VLA models | RT-2, OpenVLA (7B, 970k demonstrations), π0 | Give the skill to press, not which device is behind a control or whether the press worked |
| Open-vocabulary detection | OWL-ViT, Grounding DINO find objects from a text query | Locate objects only; do not say what a control operates |
| Closed-loop embodied agents | SayCan, Inner Monologue, VLM success detection | Check a robot's own tasks, not a mixed set of household devices and channels |

Platforms reach many devices but treat a sent command as done. Pushers and robots can press things but do not know which control needs which method. Our system is the layer that connects these pieces and works with different robots.
