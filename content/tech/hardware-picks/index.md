---
title: Hardware Picks
weight: 99
type: docs
draft: false
aliases:
  - /tech/running-software/hardware-picks/
---

The physical layer underneath the stack. Hardware choices at Curated Forest
favor quiet, low-power, and repairable machines over raw peak performance —
the farm runs 24/7, so idle draw and reliability matter more than
benchmarks.

## Compute

- **Cluster nodes** running the [k3s](/software/kubernetes/) cluster, sized for
  steady-state load with headroom for spikes.

## Storage

- **Bulk disks** for the [SeaweedFS](/software/seaweed-fs/) object store.
- **Fast local storage** for databases and workloads that need low latency.

## Edge & sensors

- **ESP32 microcontrollers** running [ESPHome](/software/esphome/) for the
  sensor and actuator network.

## Selection criteria

- **Low idle power** — it's on all the time.
- **Quiet** — much of this lives in living space.
- **Repairable / upgradeable** — standard parts over soldered-down ones.
- **Off-the-shelf** — easy to source a replacement when something dies.
