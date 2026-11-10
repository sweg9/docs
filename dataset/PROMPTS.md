# Prompts

The VLM prompts of the product are in [Prompts](/product/prompts). The dataset uses no VLM prompt of its own. This page covers the text queries that draft the boxes, and the fixed photo set that prompt checks need.

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

## 3. Fixed photo set for prompt checks

[Prompt rule 8](/product/prompts) runs each new prompt version on a fixed set of photos. The set comes from the test records.

| Prompt | Input from the set | Answer from the set |
|---|---|---|
| P-S1 | Crop of a control | `kind`, `state` |
| P-S2 | Before and after crops of a device | `changed_device` |
| P-S5 | After crop of a device, and the expected effect | `change` |

P-S4 has no cases in the set for now.

## 4. Rules for the set

1. Only crops are sent, never full frames, and no personal information.
2. Adding failure cases makes a new version of the set. A fixed version does not change.
3. Compare prompt versions only on the same version of the set.
