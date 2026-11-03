# PRD

## 1. Summary

| Item | Content |
|---|---|
| Product | About 200 to 300 photos taken by the team, with labels |
| Problem | The detector needs our own photos, and without a fixed set, results and prompt versions cannot be compared |
| Solution | Fix a small dataset as a version and use it for fine-tuning and a rough test |
| Reference | The [proposal](/papers/proposal). The format is in the [labeling spec](./labeling). This document adds only the data requirements (DS) |

## 2. Pipeline stages

| Stage | Name | What it does | Output |
|---|---|---|---|
| 1 | Photograph | Take photos per condition, including before and after pairs | Originals |
| 2 | Clean | Remove blurry photos, delete metadata, mask people | Cleaned photos |
| 3 | Draft boxes | Grounding DINO or OWL-ViT drafts the boxes | Draft records (`draft`) |
| 4 | Label | Correct the boxes by hand and fill in the fields | Label files |
| 5 | Check | Another member checks the labels and masking | Checked records (`reviewed`) |
| 6 | Fix | Keep the test sessions aside and fix the version | Fixed records (`frozen`) |

## 3. Data requirements

Priority is M (must), S (should) or C (could).

| ID | Requirement | Priority | Linked to | Verification |
|---|---|---|---|---|
| DS-01 | Each member collects about 50 photos, for about 200 to 300 in total | M | FR-01 | Count |
| DS-02 | Photos show appliances and light switches, not whole homes, and vary in angle, lighting and device state | M | FR-01, FR-08 | Count per condition |
| DS-03 | Each record holds shooting conditions in `capture` | M | FR-01 | Schema check |
| DS-04 | Each control, including light switches and controls on appliances, has `bbox` and `kind`, for all five kinds | M | FR-01 | Schema check |
| DS-05 | Look-alikes such as thermostats and outlets are labeled with `decoy` | S | FR-01 | Count |
| DS-06 | Each control has `context` and `role` where they are known | M | FR-02 | Schema check |
| DS-07 | On and off photos of the same device, angle and light can be paired, and the pair is recorded in `evidence` | M | FR-02, FR-08 | Count pairs |
| DS-08 | `evidence` is never a model input when training or predicting a role | M | FR-02 | Input check |
| DS-09 | Unknown values are `null`, never guessed | M | Labeling spec | Cross-check |
| DS-10 | Each member keeps one separately shot session of about 10 photos for testing, on a subject that is not in the development set. A session or subject never appears in both sets | M | FR-01 | Split check |
| DS-11 | Fixed records are not edited. A change makes a new version | M | Prompt rule 8 | Hash comparison |
| DS-12 | Failure cases from tests and the demo can be added to the next version | C | Prompt rule 8 | Addition history |

## 4. Quality rules

| ID | Rule |
|---|---|
| DS-N1 | Privacy: fill `consent` for every image. Mask people before upload. Mask or remove documents, screens and addresses, and delete GPS metadata |
| DS-N2 | Storage: photos go in AWS S3, not in git. Git holds labels, manifests and code |
| DS-N3 | Cloud: only crops of controls and devices that have been cleaned and checked are sent to the VLM |
| DS-N4 | Reproducibility: the same data can be retrieved by version and hash |

## 5. Sets and quantities

| Set | Share | Quantity | Use |
|---|---|---|---|
| Development | About 80% | About 160 to 240 photos | Fine-tuning and prompt revision |
| Test | About 20% | About 40 to 60 photos | Version comparison and results |

The test set is about 10 photos per member, or about 40 in total, with more if the total goes above 200 so it stays near 20%. About 10 photos cannot cover all 16 condition combinations, so each member spreads them across the conditions.

The test set is small, so the error is large. Treating 50 photos as independent samples, the 95% confidence interval is about ±6% near 95% accuracy and about ±11% near 80% accuracy. Photos of the same control resemble each other, so the real error is larger. The results show direction and do not prove performance.

## 6. Quality checks

| ID | Definition | Target |
|---|---|---|
| Q1 | Test records checked by another member | 100% |
| Q2 | Labels corrected during cross-checking | Report only |
| Q3 | Schema check pass rate | 100% |
| Q4 | Unhandled items found in the personal information check | 0 |
| Q5 | Count per condition and per control kind | No empty group |

Detection results are matched as the same `kind` with IoU of at least 0.5 (proposed). Precision and recall are reported per kind.

## 7. Risks

| ID | Risk | Response |
|---|---|---|
| D1 | Too little data to trust the results | Treat results as a reference, and take more photos only for conditions that came out badly |
| D2 | The 4 members photograph and label differently | Align after the first photos, and cross-check |
| D3 | Test photos leak into prompt revision | Revise prompts with the development set only |
| D4 | Drafted boxes leave errors in the answers | People correct every box |
| D5 | Close photos do not show much of the surroundings, so room clues in `context` are often `null` | Report results as results on these photos, and do not read them as performance in a whole home |
| D6 | Personal information appears in photos | Follow DS-N1 to DS-N3, and check again before fixing the test set |

## 8. Open items

- The team has decided to photograph appliances and light switches. The [labeling spec](./labeling) does not mention appliances yet.
- The ratio of control kinds in the photos is not decided. A kind with few photos has a larger error.
- Whether P-S4 needs its own intent cases is decided later.
- The labeling tool is not decided.
- The numbers above are starting values to be tuned after the rough test.
