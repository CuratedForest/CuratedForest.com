---
title: World Record Size
type: docs
weight: 2
todo: |-
  - Give an academic voice
  - Document what probably works
  - NASA research is a bit of a myth (or put in Aeroponics)
---
# Having a Goal
To learn about a thing, I've always known I need a direction and to be solving a problem. As I've picked strawberries to specialize in, I needed a topic to drive my research. While I think strawberry quality is what will differentiate a good product, it's easier to quantify the biggest (by weight) berry. 

## Current Record
### World Record
Current world record is held by Chaohi Ariel (Israel) at 322g (11.35oz). There were a couple of [conditions that contributed to this record](https://www.guinnessworldrecords.com/news/2022/2/worlds-heaviest-strawberry-grown-in-israel-breaks-record-692512):
- Ilan, the variety grown, is bred for size.
- The strawberry itself was multiple berries growing and fusing together.
- Colder winter resulted in a long 45 days of development from flower to ripe.

## What doesn't work
When I started this experiment, I had a couple comically ignorant initial ideas I wanted to try. Upon further research there are pretty good reasons these won't work out.
### Like a Pumpkin (Not!)
My first plan was to treat the strawberry like a pumpkin. Figured if I pruned everything but one berry it'd get all the nutrients and grow huge. In actuality, the berries ultimate growth ceiling is limited by it's number of achene (seeds). These are the the little black dots on your red berry. 

### Light cycle
Originally I had understood that the photo efficiency of a strawberry leaf decreases as the day goes on as the sugars build up in the leaf and slow down with the chemical processes. I figured one way to address this is to split the light period into four 6 hour periods: light, dark, light, dark, with the idea that the plant would more efficiently utilize the same amount of light. 

The gotcha here is that strawberries are short day plants (at least the June bearing ones are). This means they flower best when the hours of day light is on the shorter side (less than 13 hours plus/minus). While they're called short _day_ plants, the biology is driven by a long _night_. Splitting the light period up will break the long night detection and thus stop flowering.

# What does work
## Flower size
### Number of crows
### Fascinations 
### Cooler temperature
This is critical because 

# Experiments
After nearly a decade of work, I'll finally have a grow system running well enough that I can run controlled experiments that can hit the targets for optimum growth. These are the first set of experiments I'd like to try.

## Misting Schedule
Currently I have my plants on a 5 seconds on 3 minutes off schedule. This does OK. Clearly a bit over watered (roots are brown), but it has been enough to keep the plants alive, so a good control. 

In aeroponics, academic information is spars, so when things are truly specific to the technique I've recognized the need to do my own research. How to optimize the misting schedule is one such area. 

### Day vs Night
Plants transpire (and thus dry out the roots) significantly more when they're exposed to light. In aeroponics how this means we need to have different misting schedules for the different environments. To test this, I'll double the wait and have 1 root zone mist every 6 minutes at night. 

### Calibrated Misting
Part of the idea is to tune the misting well enough such that the plant barely hit's water stress - it dries out - and then gets misted again. There are plenty of advice on the internet  that say 5s every 5 minutes. The reality is it's crop, life cycle, and light level dependent. So the trick is spotting when this happens. I've identified 3 approaches:
- IR (Infra Red)
	- When plants enter water stress they close their stomata to stop evapo-transporation. Because a part of this is converting liquid water to water vapor, it cools the leaf. Ultimately this means when the plant enters water stress you can see it show up as a rise in leaf temperate. 
	- To test this, I have a high quality IR camera that I'll calibrate and use to watch this happen.
- Organic Volatiles
	- Another way plants express water stress is through organic volatiles. I'm skeptical that this signal will show up before IR does, but strawberries are known for having a lot of volatiles so I'm curious to see if it shows up.
	- I have a handful of different home IoT / ESP sensors that mention measuring organic volatiles.
- Back of Hand
	- Touch the roots with the back of your hand. If they feel dry or cool, they need water.
	- Will utilize hands.

#### The Protocol
Outside of the 5s on / 5m off baseline, I don't have any set points or targets, so the first steps are to identify where the water stress point is, and then come up with new schedules from there.

##### Getting the Water Stress Point
This is an iterative process. 
- Set up the equipment for the experiments. 
- Take a day and get a baseline.
- Next day, an hour after lights turn on, turn off the water
	- Wait until water stress appears
	- Reset water wait timer(s) according to results and the schedule below
	- Retest & refine until water stress consistently appears right before misting.
- Do the same for night schedule, but an hour before the lights turn on.

##### Creating the Schedule
Once a water stress point is identified, then the question becomes what is the ideal time to mist in relation to that interval? Initially I'd like to try:
- 1 minute in water stress
- 0 time before water stress
- 1 minute before water stress
- 3/5/10 minutes before stress (depending on set point range)

### Follow Up Experiments
This experiment isolated misting frequency (with a 5s mist) as the independent variable. Once an optimum frequency is identified, I'd like to experiment with increasing and decreasing the length of time the mist is on for. 

The other experiment I'd like to follow up is with droplet and nozzle size. It'd exercise a similar parameter in that we'd ultimately be looking at water volume, but with different delivery methods.
## Hormone Treatments
As I've read over the academic literature, what's jumped out at me is there are hormone treatments that have a positive impact on berry size. Often at the expense of overall harvest, as well as taste and aroma, but these are trade offs I'm happy to make (for the size experiments). I've identified 3 hormones to start with, but expect to expand that as I learn more.

### Which Hormones (Auxins)
PP333
CCC 
NAA
CPPU

### The Protocol
I'm not only curious about which hormones produce big fruit, but also how and when it's delivered. Because the structures setting the upper size limit are in place before the strawberry even flowers, I'd like to understand when it actually makes sense to apply hormones.

### The conditions
##### In Tissue Culture
I'd like to start some plants in tissue culture. The idea being here I can experiment with initial amounts of the various hormones. Then when they grow I can see the impact of the initial hormone does.
##### Across Life Span
In addition to the plants started in tissue culture, I'll have a condition where hormone treatment continues via root update throughout the plants life.
##### Stop Before Flowering
Because the fruit structures are in place before flowering, there should be a condition that stops treatment at this point to see if reducing the hormone load at this point negates the negative flavor impacts.

##### Target time period specifically
Finally, I'd like to time hormone treatment specifically to when the size determining structures (achene) are actually being formed. This may need to lead the flower formation by some days or weeks. The hope being 

#### Follow Up Experiments
Once I have an idea which hormones are effective or not, I'll explore further the optimal dose at the given life cycle.

## Temperature 
One of the variables that repeatedly comes up when looking atincreasing berry size is temperature. It seems the optimal for berry production is around 68F or 20C. I know there is a day/night temperature difference/interaction at play. I'll experiment with this variable  more once the misting schedule is dialed in.



