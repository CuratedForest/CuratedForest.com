---
title: Misting Schedule
type: docs
weight: 1
author_reviewed: true
editor_reviewed: false
---

Currently I have my plants on a 5 seconds on / 3 minutes off schedule.
This does OK. Clearly a bit over watered (some roots are brown), but it has
been enough to keep the plants alive, so a good control.

In academics, aeroponic information is sparse, so when things are truly
specific to the technique I've recognized the need to do my own
research. How to optimize the misting schedule is one such area.

## Calibrated Misting

One of the ideas in aeroponics is to tune the misting well enough such that the plant
barely hits water stress — it dries out — and then gets misted again.
There is plenty of advice on the internet that says 5s every 5 minutes.
The reality is it's crop, life cycle, and light level dependent. So the
trick is spotting when this happens. I've identified 3 approaches:

- **IR (Infra Red)**
  - When plants enter water stress they close their stomata to stop
    evapo-transpiration. Because a part of the evapo-transpiration process is converting liquid
    water to water vapor, it cools the leaf. Ultimately this means when
    the plant enters water stress and stops this process, and the cooling, you can see it show up as a rise in
    leaf temperature.
  - To test this, I have a high quality IR camera that I'll calibrate
    and use to watch this happen.
- **Organic Volatiles**
  - Another way plants express water stress is through organic
    volatiles. I'm skeptical that this signal will show up before IR
    does, but strawberries are known for having a lot of volatiles so
    I'm curious to see if it shows up.
  - I have a handful of different home IoT / ESP sensors that mention
    measuring organic volatiles.
- **Back of Hand**
  - Touch the roots with the back of your hand. If they feel dry or
    cool, they need water.
  - Will utilize hands.
## Day vs Night

Plants transpire (and thus dry out the roots) significantly more when
they're exposed to light. In aeroponics this means we need to have
different misting schedules for the different environments. To test
what this should be in the dark, I'll start by doubling the wait found with light, and then calibrate the needed misting frequency again.

### The Protocol

Outside of the 5s on / 3m off baseline, I don't have any set points or
targets, so the first steps are to identify where the water stress
point is, and then come up with new schedules from there.

#### Getting the Water Stress Point

This is an iterative process.

- Set up the equipment for the experiments.
- Take a day and get a baseline.
- Next day, an hour after lights turn on, turn off the water
  - Wait until water stress appears
  - Reset water wait timer(s) according to results and the schedule
    below
  - Retest & refine until water stress consistently appears right
    before misting.
- Do the same for night schedule, but an hour before the lights turn
  on.

#### Creating the Schedule

Once a water stress point is identified, then the question becomes what
is the ideal time to mist in relation to that interval? Initially I'd
like to try:

- 1 minute in water stress
- 0 time before water stress
- 1 minute before water stress
- 3/5/10 minutes before stress (depending on set point range)

## Follow Up Experiments

This experiment isolated misting frequency (with a 5s mist) as the
independent variable. Once an optimum frequency is identified, I'd like
to experiment with increasing and decreasing the length of time the
mist is on for.

The other experiment I'd like to follow up on is with droplet and nozzle
size. It'd exercise a similar parameter search in that we'd ultimately be
looking at water volume, but with different delivery methods.
