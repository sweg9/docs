---
outline: false
---

# Proposal

**NOVA: Non-connected Object Vision and Actuation for Proactive Smart Homes.** Geonhak Lee, Jemin An, Jiwon Han, Hyunseo Choi. Department of Information Systems, Hanyang University.

This paper is the reference for every page in this wiki. When a page and the paper disagree, the paper wins.

::: warning Two changes since the paper
- The paper sends crops to a cloud VLM to read controls, infer intent and check results. The team replaced it with its own models (2026-11-17), so the system calls no model API. See [Models](/product/models).
- The paper runs the backend on AWS EC2, and so does the team (2026-11-20, after a home-only plan on 2026-11-17).
  - The models and the autonomy policy run in a Nitro Enclave on the instance.
  - Crops are encrypted at the hub and decrypted only inside the enclave.
  - The records stay in the hub's database at home.
  - See [Stack](/overview/stack).

Everything else follows the paper.
:::

<PdfViewer src="/papers/proposal.pdf" title="NOVA: Non-connected Object Vision and Actuation for Proactive Smart Homes" />
