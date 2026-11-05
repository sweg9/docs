# Prompts

The list, rules and templates are in [Prompts](/product/prompts). This page covers only how the demo uses those prompts and how the screens handle their answers. `ai-engine` and `backend-server` run the prompts, and the front end holds none.

## 1. Prompts in the demo

| ID | Stage | Requirement | Scenarios | Values on screen |
|---|---|---|---|---|
| P-S1 | S1 Recognize | FR-01 | 1 | Type, state, whether the picture is clear |
| P-S2 | S2 Map | FR-02 | 1 | Whether the change fits the device, confidence, reason |
| P-S4 | S4 Intent | FR-05 | 2, 3, 4, 5 | Intent, target device, action, confidence, reason |
| P-S5 | S5, S6 Verify | FR-08 | 1, 2, 3 | Yes, no or unsure, confidence, reason |

The motion planner (FR-09) is a script or a VLA model, not a prompt.

## 2. Demo rules

1. Fix the prompt and model versions before the demo, and do not change them during it.
2. Use only versions that passed the check on the fixed set of photos. See the [dataset PRD](/dataset/PRD).
3. Record the prompt ID, its version and the model name in the log, so the log alone shows which version produced a result.
4. The front end never calls a prompt or model directly. It uses only the `backend-server` API.
5. Failure cases from the demo become candidates for the fixed set, after people and personal information are masked.

## 3. Screen handling

| Answer | Screen | Next step |
|---|---|---|
| Normal | Show the values and `reason` | Next stage |
| `unsure` from P-S5 | Check once more without operating the device. If it is still unsure, stop and let the resident choose | Follows FR-08 |
| `clear: false` from P-S1 | Show the control as not clear yet | Skipped until a clearer frame is available |
| Schema error | Show that the server is retrying once | A second failure counts as a failure of that stage |
| Timeout or no cloud | Show the cause | The system only suggests |

## 4. Evaluation

Check each prompt against the rules in [Prompts](/product/prompts). Record the result on the fixed set next to the result in real runs. If they differ a lot, look at the failure cases and add them to the set.
