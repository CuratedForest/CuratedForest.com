---
title: Water Supplies
weight: 2
type: docs
author_reviewed: false
editor_reviewed: false
---

The water side of the Seedships: making and storing the misting water.
Listed in reverse chronological order.

## Water Supply V2 (Plastic Tote) [07/2021]

The most recent water supply design before the current setup. The tote
frame worked well enough — it was a lot more cramped than the wire
cart, but that encouraged me to rethink whether all of the bits were
necessary (some weren't). The main change from V1 was that the system
became recirculating rather than drain-to-waste. The original idea was
to still have the water go through the RO process before misting, but
that caused other issues, so that component ended up unused.

Another challenge was priming pumps if they ran dry. Turns out the
conditions on the output end matter a lot — if there isn't any water on
that side, it can prevent the pump from self-priming.

{{< gallery match="water-supply-v2-*" sort="asc" >}}

## Water Supply V1 (Wire Cart) [07/2019 – 06/2021]

This was connected to the house's water line and drainage and made
small, consistent batches of water when the PSI dropped below 80. It
would first run the water through a reverse osmosis system, then add
small amounts of fertilizer, and finally pump the water to an
accumulator/bladder that stored it under pressure until a Seedship
misted and used it.

This was inspired by LED Gardner's build, with two big differences:
this one was drain-to-waste while LED Gardner's is recirculating, and
the Seedship Water Supply handled the logic on the ESPs while LED
Gardner's build has the logic in Home Assistant.

{{< gallery match="water-supply-v1-*" sort="asc" >}}
