---
outline: false
---

# Proposal

**Vision-Based Recognition and Actuation of Unconnected Home Controls.** Geonhak Lee, Jemin An, Jiwon Han, Hyunseo Choi. Department of Information Systems, Hanyang University.

This paper is the reference for every page in this wiki. When a page and the paper disagree, the paper wins.

::: warning Two changes since the paper
- The paper sends crops to a cloud VLM to read controls, infer intent and check results. The team replaced it with local models on the hub (2026-11-17), so the system calls no model API. See [Models](/product/models).
- The paper runs the backend on AWS EC2. The team runs it on the laptop at home instead, on Kubernetes, so that no crop, usage time or log leaves the home (2026-11-17). See [Stack](/overview/stack).

Everything else follows the paper.
:::

<PdfViewer src="/papers/proposal.pdf" title="Vision-Based Recognition and Actuation of Unconnected Home Controls" />
