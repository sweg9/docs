# Architecture

The system runs on four tiers. All robot functions pass through a Robot Abstraction Layer (RAL), and the level from the Capability Probe gates what the Control Orchestrator may do.

| Tier | Components |
|---|---|
| Cloud | Intent Service (VLM), VLA Planner |
| Edge (home hub) | Actuator Perception, Mapping Registry, Learning & Priority, Control Orchestrator, Routine Engine, trigger sources |
| Robot | Vision Module (RGB-D), Capability Probe, Safety Guard, Manipulator Adapter (L3) |
| Home | Smart devices (IR, Wi-Fi, BT), legacy controls (switch, button, dial) |

Raw video is processed at the edge or below. The cloud only receives crops and metadata.

## Main flow

```text
Vision Module ──frames──> Actuator Perception ──> Mapping Registry <──> Learning & Priority
                                                        │                      │
Trigger sources ──> Routine Engine <──> Control Orchestrator <─────────────────┘
                         │                 │      │
                  Intent Service       VLA Planner │
                                                   ├──wireless command──> Smart devices
                                                   └──> Safety Guard ──> Manipulator Adapter ──press──> Legacy controls
```

## Data model

A **Mapping** links an **Actuator** to a **Device**. A device has one or more **ControlChannel**s, and every execution leaves an **ExecutionLog** entry, which makes a run traceable from S1 to S7.

| Entity | Fields |
|---|---|
| Actuator | `actuator_id`, `kind`, `pose`, `embedding`, `affordance` |
| Mapping | `mapping_id`, `status`, `confidence`, `verified_at` |
| Device | `device_id`, `name`, `type`, `room`, `risk_class` |
| Routine | `routine_id`, `trigger`, `condition`, `action`, `autonomy_level` |
| ControlChannel | `channel_id`, `type`, `params`, `success_rate`, `latency` |
| ExecutionLog | `log_id`, `channel`, `outcome`, `verify_result`, `reason`, `ts` |

Exact enumerations and rules are in [Data model](/standards/data-model).
