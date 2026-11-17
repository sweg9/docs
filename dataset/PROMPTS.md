# Prompts

The product uses no prompts: all recognition runs on local models (see [Models](/product/models)). The only prompts here are the text queries that draft the boxes. This page also covers the fixed photo set that model checks need.

## 1. Text queries for drafting boxes

Grounding DINO or OWL-ViT drafts the boxes from text queries, without retraining. The queries below are drafts, to be tuned on the first photos.

| Kind | Query |
|---|---|
| `switch` | "wall switch" |
| `toggle` | "toggle switch" |
| `power_strip` | "power strip" |

## 2. Drafting rules

1. Drafted boxes are candidates. People correct every box before a record becomes `reviewed`.
2. Keep the detector version, the queries and the score threshold with each batch, so a draft can be reproduced.
3. Drafting runs on photos that are already cleaned and masked.

## 3. Fixed photo set for model checks

The `model-regression` skill runs each new model version on a fixed set of photos (A-06). The set comes from the `eval` records.

| Model | Input from the set | Answer from the set |
|---|---|---|
| M-S1a | Photo | `controls[].kind`, `bbox` |
| M-S1b | Crop of a control | `controls[].state` |
| M-S2 | Photo | `devices[].type`, `bbox` |
| M-S5 | Before and after crops of a device | `evidence.change` |

## 4. Rules for the set

1. Adding failure cases makes a new version of the set. A fixed version does not change.
2. Compare model versions only on the same version of the set.
3. No photo of the set is sent to a model API.
