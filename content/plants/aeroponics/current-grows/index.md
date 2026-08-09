---
title: Current Grow Systems
weight: 1
type: docs
todo: "- Flesh out the Notes and Narrative section with dates and specifics"
---

What the current aeroponic systems at Curated Forest look like in
practice. Small scale today, but with the failure modes (clogged
nozzles, power-loss handling) worked out well enough that I've been
running the design in the living room. Next step is scaling.

{{< gallery sort="desc" >}}

## Notes and Narrative

### Grow System

The current grow system builds directly on the plastic-tote design from
[plastic-tote design]({{< ref "plants/aeroponics/past-designs" >}}) — the last of the old
iterations, and the first that was both easy to build and didn't leak.
The failure modes that matter at this scale (clogged nozzles,
power-loss handling) are worked out well enough that the system runs in
the living room.

### Water System

The current water supply is recirculating, carrying forward the main
lesson of the previous design: drain-to-waste wasted both water and
fertilizer, and recirculation simplifies the plumbing considerably.
Pump priming remains the thing to watch — a pump that runs dry may not
self-prime unless there is water on the output side.

### Monitoring

Control and telemetry run on the same stack as before: ESPHome on the
micro-controllers, Home Assistant for switches, operations (misting,
draining) and live sensor state, and Grafana for historical graphs.
