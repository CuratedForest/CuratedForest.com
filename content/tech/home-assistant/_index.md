---
title: Home Assistant
type: docs
weight: 2
---

Home Assistant is the central nervous system of Curated Forest. It
aggregates sensor data from ESPHome devices, manages automation rules,
and provides the dashboard used day-to-day. When root zone EC drifts
outside the target window, Home Assistant fires the nutrient dosing
sequence. When ambient temperature spikes, it adjusts fan speeds and
misting intervals. Because it runs locally on the site's own
hardware, there is no cloud dependency — the farm keeps running even
when the internet doesn't.

It's extended with custom integrations for the aeroponic-specific
controls this site cares about: spray timing, reservoir cycling, and
pH drift correction. The documentation below covers the patterns and
blueprints used to wire everything together.
