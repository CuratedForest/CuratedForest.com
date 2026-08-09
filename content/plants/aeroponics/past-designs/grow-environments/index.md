---
title: Grow Environments
weight: 1
type: docs
---

At its core, a Seedship is a controlled growing environment. The
micro-controllers (ESP8266 & ESP32s) and their various sensors and
switches are programmed using ESPHome, can be controlled in Home
Assistant, and have history available via Grafana.

These are listed in reverse chronological order. They've all had issues
of various degrees — the biggest one across all of these designs has
been water leakage.

## Seedship V6 (Plastic Totes) [11/2021]

This was the most recent Seedship design before the current Curated
Forest setup. It was both easier to build and didn't leak. Using
magnets to mount the power strip and LED driver worked better than
velcro strips, without having to put additional holes in the shoot
zone. Future builds needed to either use 1ft LED strips or a tote that
is at least 2ft.

{{< gallery match="v6-*" sort="asc" >}}

## Seedship V5 (Styrofoam) [06/2021 – 10/2021]

The idea was simple enough: cut up insulation and use silicone caulk to
"glue" the pieces together. Lots of issues though. The biggest was that
it took a week to cure — I didn't let it go that long and the root
zones ended up leaking because of it. The thickness of the styrofoam
also made it hard to mount and consistently aim the nozzles. Looking
into the way styrofoam burns made me think it was a fire risk, too.

{{< gallery match="v5-*" sort="asc" >}}

## Seedship V4 (PVC Pipes and Pond Liner) [07/2019 – 06/2021]

I used this for nearly 2 years, leaks and all, and managed to get a
couple of strawberry harvests out of the build. Working with PVC turned
out to be a mess to cut to size and it took a day or two for the glue
to set. Because I was simply taping the pond liner together, it leaked
like crazy, even after using a rubber sealing tape on the bottom.

Originally I had planned to use the PVC of each frame as an accumulator
to store a "buffer" of pressure rather than use a single bladder. It
turned out that it was hard to glue well enough to support 100 PSI, and
that PVC isn't great to pressurize — it can shatter dangerously.

{{< gallery match="v4-*" sort="asc" >}}

## Seedship V3 (Cardboard, Metal Drywall Corner Bead, and Aluminum Extrusion) [2018]

All with pond liner — and all of these frame materials were rapid
failures. The designs weren't waterproof enough for cardboard, the
corner bead wasn't strong enough, and the aluminum extrusion was harder
to work with than I expected.

{{< gallery match="v3-*" sort="asc" >}}

## Seedship V2 (Wood) [2018]

I never actually used this design. It was clear fairly rapidly that it
would be too heavy, WAY too much work to put together, and too big.

{{< gallery match="v2-*" sort="asc" >}}

## Seedship V1 (PFC - MVP) [12/2017]

This was MIT's Personal Food Computer Minimum Viable Product. When I
found it, I bought the materials needed within a week. Ultimately I
found the system was WAY basic, not aeroponic, and that programming was
actually done in cron scripts. Not ideal, but it grew something!

{{< gallery match="2017-pfc-*" sort="asc" >}}
