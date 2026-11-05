# Plan

## 1. One-line definition

Create a small labeled set of photos, taken by the 4 team members, to fine-tune the control detector (FR-01) and to run a rough test of the stages that read photos.

## 2. Background and problem

- Controls come in many shapes, and fixed-category detectors do not cover them well, so the detector needs our own photos.
- Without a fixed set of photos, there is no way to tell whether a new prompt version is better.
- Photos can contain personal information, so they have to be checked before they are shared.

## 3. Goals

| Category | Content |
|---|---|
| What to make | About 200 to 300 labeled photos, with 20% of the photos from each session kept aside for testing |
| What matters | A rough test to check direction. If the results are good, this scale carries through to the final presentation |
| What not to do | Large-scale collection, strict statistical validation, model training or prompt writing (`ai-engine`) |

## 4. Users and stakeholders

| Role | What they do |
|---|---|
| 4 team members | Each takes about 50 photos, corrects the drafted boxes, writes labels and checks another member's labels |
| Anyone in a photo or whose space appears | Gives consent, recorded in `consent` |
| `ai-engine` | Fine-tunes the detector and checks prompts with the data |
| `harness` | Runs the tests and evaluation |

## 5. Collection method

Each member takes about 50 photos of appliances and light switches. Whole homes are not photographed. The same subject is photographed under these conditions.

| Condition | Values |
|---|---|
| Subject | Appliances and light switches, covering the five control kinds: switch, push button, toggle, knob, remote |
| Angle | Top, bottom, left, right |
| Light | Lighting on, lighting off |
| Device state | On, off |

All conditions combined give 16 photos per subject, so 3 to 4 subjects per member comes to about 50 photos. Labels follow the [labeling spec](./labeling).

## 6. Data use

One set of photos serves several stages. Nothing is collected separately.

| Use | Stage | Requirement | How it is used |
|---|---|---|---|
| Detector | S1 | FR-01 | `bbox` and `kind` train and test the detector |
| P-S1 check | S1 | FR-01 | Crops with `kind` and `state` as answers |
| P-S2 check | S2 | FR-02 | `before_image` and `after_image` crops, with `changed_device` as the answer |
| Role prediction test | S2 | FR-02 | The image and `context` as input, and `role` as the answer. `evidence` is never input |
| P-S5 check | S5, S6 | FR-08 | `after_image` crops, with `change` as the answer |

Arm planning (FR-09) and physical execution (FR-11) are measured in [real runs](/live-demo/PRD). Intent cases for P-S4 are not included for now. Events are assumed to come from sensors and the hub.

## 7. Scope

| Included | Excluded |
|---|---|
| About 200 to 300 photos and labels from the 4 members | Public data and simulator images |
| All five control kinds, with a box on each control, including light switches and controls on appliances | Boxes around a whole appliance. Appliances are recorded by name only |
| Drafted boxes corrected by hand, cross-checks, personal information checks | Large-scale collection |
| Fixing the test photos and version management | Automated measurement (`harness`) |

## 8. Schedule (proposed)

| Order | Content | Done when |
|---|---|---|
| 1 | Agree on photo criteria, and try the labeling spec | One member has labeled a few photos |
| 2 | The 4 members take photos and correct labels | About 200 to 300 photos are collected |
| 3 | Cross-check, personal information check, keep the test photos aside | Version `v1` is `frozen` |
| 4 | Rough test | Per-stage results are in. If they are good, this scale carries through to the final presentation |

## 9. Success criteria

The test can be rerun on `v1` with the same results, and the team can use the results to decide whether to collect more data. The results are small-scale, so they are a reference for direction.
