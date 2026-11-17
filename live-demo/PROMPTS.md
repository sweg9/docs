# Prompts

The demo uses no prompts. All recognition runs on local models on the hub; the list and rules are in [Models](/product/models). This page covers only how the demo uses those models and how the screens handle their answers. `ai-engine` and `backend-server` run the models, and the front end holds none.

## 1. Models in the demo

| ID | Stage | Requirement | Scenarios | Values on screen |
|---|---|---|---|---|
| M-S1a | S1 Recognize | FR-01 | 1 | Boxes and kind of each control |
| M-S1b | S1 Recognize | FR-01 | 1 | State, whether the picture is clear |
| M-S2 | S2 Map | FR-02 | 1 | Device type and box where the change happened, confidence, reason |
| M-S5 | S5, S6 Verify | FR-08 | 1, 3 | Yes, no or unsure, confidence, reason (for example "brightness rose 42%") |

Intent (S4) comes from the routine, not a model. The motion planner (FR-09) is a script, not a model.

## 2. Demo rules

1. Fix the model versions and thresholds before the demo, and do not change them during it.
2. Use only versions that passed `model-regression` on the fixed set. See the [dataset PRD](/dataset/PRD).
3. Record the model id and its version in the log, so the log alone shows which version produced a result.
4. The front end never calls a model directly. It uses only the `backend-server` API.
5. Failure cases from the demo become candidates for the fixed set, after people and personal information are masked.

## 3. Screen handling

| Answer | Screen | Next step |
|---|---|---|
| Normal | Show the values and `reason` | Next stage |
| `unsure` from M-S5 | Check once more without operating the device. If it is still unsure, stop and let the resident choose | Follows FR-08 |
| State `unknown` or not clear from M-S1b | Show the control as not clear yet | Skipped until a clearer frame is available |
| No device found by M-S2 | Show the change without a device | The mapping stays `Pending` |
| Hub cannot reach the cloud | Show the cause | The system only suggests |

## 4. Evaluation

Record the result of each model on the fixed set next to its result in real runs. If they differ a lot, look at the failure cases and add them to the set.
