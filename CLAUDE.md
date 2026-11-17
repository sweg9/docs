# Project rules

This repo (docs) is the development wiki. Its reference document is the proposal at `public/papers/proposal.pdf`. When a page and the proposal disagree, the proposal wins.

- Requirement numbers are FR-01 to FR-12, the same as requirements 1 to 12 in the proposal. They are never renumbered.
- Numbers from the proposal are starting values to be tuned, not facts.
- Write everything in English. Write ranges as "S1 to S3", not with a tilde.
- Model changes follow the rules in `product/models.md`.
- The team made two known changes to the proposal on 2026-11-17, and pages describe the new design: the cloud VLM is replaced with local models on the hub, and the backend runs on the laptop at home (mode `server`, on k8s) instead of AWS EC2, so nothing leaves the home.
- Standards and skills live in https://github.com/sweg9/harness. The wiki copies them at build time; do not edit them here.
