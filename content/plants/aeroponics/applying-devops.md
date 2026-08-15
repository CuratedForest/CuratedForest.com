---
title: DevOps Approach
weight: 3
type: docs
todo: |-
  - Link easy to update to a new Best Practices: Updates page
  - Link easy to add to to a new Contributors page.
author_reviewed: true
editor_reviewed: false
---
I've been playing in the tech and the startup world for over a decade. Here, some of the highest performing teams share their practices, tools, and culture, many of which get lumped into "DevOps". This page outlines how various DevOps approaches synergies with the needs of growing hydroponically.
# What is DevOps?
DevOps is a combination of **dev**elopment and **op**eration**s**. These are historically two separate teams in a company, with one responsible for developing software and solutions, and operations being responsible for running and maintaining solutions. DevOps is a mindset/culture that finds practices and tools to combines those domains in ways that create efficiencies. It encompass a lot of best practices and has evolved to address two major challenged faced by anyone running software:
## 1) Keeping services running around the clock.
The way the big companies look at downtime and outages is how many **millions** of dollars per _minute_ of downtime. The crux to handling these risks well is well planned highly available infrastructure and rock solid reporting, monitoring, and alerting. Similarly, aeroponics requires _near_ round the clock up time.
### Monitoring and Alerting
The DevOps practice that most impacts aeroponics is in the monitoring and alerting frameworks. There are two main avenues for this impact.

The first is in responsiveness. A greenhouse grower checking the crops daily _will_ result in disaster if practicing aeroponics without alerting. For more on how this is addressed in Curated Forest, see the [alerting](/tech/home-assistant/alerting/) page. 

The second is in the data collection needed for alerting. Because the pipeline from sensors to graphs is already in place, it's really easy to reuse these monitoring tools for reporting on plant growing conditions. This is further outlined on the [data collection](/plants/aeroponics/data-collection/) page.

### High Availability
Admittedly the highly available requirement isn't quite so strict with aeroponics - I can take 5 or 10 minutes to reboot my server without too much impact to my plants. Though it does take similar disaster recovery planning; have to keep extra pumps and other spare parts just in case something break, as well as backup power in case that goes out.

## 2) Making systems that are easy to create and run software with.
The other major way DevOps impacts my aeroponics practice is in terms of user empowerment. At the end of the day I want to solve problems, not futz with frameworks, and I've spent SO much time futzing with frameworks. At this point I've followed what are the industry's best practices for a decade, and have boiled them down to whats documented on this site. The key things are:
### Easy to run
The software has to be easy to setup and run. My belief is even though the software is complex, the barrier to entry can be relatively low. For more on how the Curated Forest achieves that, see [Beginning With the End in Mind](/tech/running-software/beginning-with-the-end-in-mind/) page. 
### Easy to update
One of the constant issues facing large companies is how to manage updates. Many industrial environments see so much risk in these updates that their policy is to not. But regardless of features, security updates demand consistent updates, and I'm thankful for the features that come along with it. There are better and worse ways to manage this, and you can see the strategy used for keeping a Curated Forest updated on the updates best practices page.

### Easy to add to
If a platform isn't easy to modify or add to it will never take off. The Curated Forest has been built with this kind of flexibility in mind. You do need some experience running, but the target is audience of DIYers. The hope is with an ecosystem that's easy to contribute to, many contributions will come and we'll all get to benefit from the effort. Seeds of contribution planted now sow future features I didn't have to write.
