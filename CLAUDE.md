# Project rules

This repo (docs) is the development wiki. Its reference document is the proposal at `public/papers/proposal.pdf`. When a page and the proposal disagree, the proposal wins.

- Requirement numbers are FR-01 to FR-12, the same as requirements 1 to 12 in the proposal. They are never renumbered.
- Numbers from the proposal are starting values to be tuned, not facts.
- Write everything in English. Write ranges as "S1 to S3", not with a tilde.
- Model changes follow the rules in `product/models.md`.
- The team changed the proposal twice, and pages describe the result:
  - On 2026-11-17 the cloud VLM was replaced with local models.
  - On 2026-11-20 (5th meeting) the server moved back to AWS EC2 (mode `server`, on k3s), for scalability.
  - The hub at home keeps the records, the Safety Guard and the Dashboard.
  - The models and the autonomy policy run in a Nitro Enclave (TEE) on the EC2 instance. Crops are encrypted at the hub and decrypted only there.
- Standards and skills live in https://github.com/sweg9/harness. The wiki copies them at build time; do not edit them here.
