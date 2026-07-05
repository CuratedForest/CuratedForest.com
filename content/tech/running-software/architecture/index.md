---
title: Architecture
weight: 2
type: docs
draft: false
---

A high-level look at how the pieces fit together at Curated Forest.


## Acceptance Criteria
- Container Based
- Modifiable
- Git optional
- Build on community

## Drawing the Line

## Layers

- **Hardware** — the physical nodes and storage the stack runs on
  (see [Hardware Picks](/tech/hardware-picks/)).
- **Orchestration** — a [k3s](/software/kubernetes/) cluster schedules and
  restarts workloads.
- **Storage** — distributed object storage plus per-node filesystems,
  backed up off-site.
- **Applications** — the individual services (Home Assistant, Immich,
  Grafana, …) that people actually use.

## Principles

- Declarative everything: cluster state and app config live in Git.
- Stateless where possible; stateful workloads keep their data on
  clearly-defined volumes that are backed up.
- Local-first: the farm keeps running even when the internet doesn't.

More detail on each layer lives in the dedicated sections under
[Technology](../../).
