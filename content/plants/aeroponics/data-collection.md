---
title: Data Collection
weight: 5
type: docs
todo: "- Create and link page for plant tracking sensors in Home Assistant."
---
I'm lucky to have spent many years of my life working with data, both academically and in professional capacities. We're talking GBs a day and datasets in the TB size. So nothing CERN level, but still large enough to demand specific approaches to addressing scaling issues. These experiences have strongly influenced my views, and thus the approach outlined below.

# Data Collection
There are so many considerations when collecting and storing data; good chance there is a follow up on page this topic specifically! At a high level what we want is a centralized location/hub for data to come into, be processed, and recorded.

## Hub: Home Assistant
In the Curated Forest, that hub is Home Assistant. It is an _amazing_ product with thousands of developers from around the world; it consistently ranks in the top 5 most active projects on GitHub. **If** a web service or IoT device can communicate with an open source solution, then there is a strong chance Home Assistant can work with it. This is critical for compatibility with many sensors and devices and makes it easy to collection and and store readings.

Home Assistant targets itself at the DIYer market (as do I), but it punches **way** above it's weight in device compatibility and production readiness.
## Data Collection & Devices
I've found the most reliable way to drive devices and collect data is via DIY and industrial sensors ran by ESP32 devices connected via WiFi. These chips are basically WiFi chips with sensor connections and a minimal amount of processing power. The key part of this approach is affordability as ESP32s are ~$5 and are compatible with ESPHome.

### ESPHome
ESPHome is a project adopted by the Open Home Foundation (Home Assistant) that takes YAML definitions, compiles them into C++, and then flashes the ESPHome device with the custom firmware. Like Home Assistant it supports thousands of devices and possibilities. It's grown big enough that there are start up manufacturers that you can buy from.

- #### Sensor Quality
  Sensor quality varies greatly! Outside the occasional peek, I haven't dove deep into the variation, but have implemented a variety of kinds sensors so that I can see what a difference it makes.
  
  Usually the cheapest sensors are unusable, but one price step up works reasonably well. It takes some research and testing to figure out what the right balance is, but once that's dialed in the sensors are often reasonably priced.

- #### Commercial Availability
  The project has grow big enough that there are multiple manufacturers that make devices with ESPHome already installed and associated default configuration files. My favorite is [Athom.tech](https://www.athom.tech/).

- #### Customization
  Because these devices use ESPHome, they are infinitely programmable and customizable. While not all my ESPs are off the shelf devices, I do _always_ look for an off the shelf device first, and usually find one.
  
- #### Calibration
  Part of this flexibility has allowed me to use DIY sensors, and calibrate them with known good sensors and values.

## Storage: TimescaleDB
Having readings is one thing, storing them in a way that reports can display quickly is another. Databases have many ways to optimize queries, and for time series data (Home Assistant sensors), my favorite is TimescaleDB - a PostgreSQL extension that allows for efficient storage and querying of the time series data. This layer is **the** critical component that turns sensor data into sets we can report and train against.

## Graphs: Grafana
Once we have data in a database, Grafana is my go to tool for visualizations and graphs. It has built in support for TimescaleDB and the most complete graph creation tool I've used. It's what I use to enable data to tell a story that'll enable action or encourage change.

### All Data Through Home Assistant
While Grafana does offer great connectivity and can graph multiple sources on top of each other with ease, it's not very easy to merge and transform data from different sources. To address this, anything that needs to prompt interactions or be reported against should go through Home Assistant.

# Data Use
One of the critical things understand when working with a dataset is: what will it be used for? For example, here I am talking about data collection relevant to the care and study of plants. And while plant centric data is great, it does not run a business. There is another whole suit of data and considerations specifically for business. These are systems for ERP, FSQA, safety forms, etc. I don't plan on addressing these data needs here, but do want to note their importance and mention they'll come when I document the Business Stack later this year.

## Alerting
One of the important parts of aeroponics is monitoring and alerting when conditions are out of spec or in error. While Grafana offers top notch alerting, I've leaned it to Home Assistant based solutions. There main motivation behind this choice is that it allows for automatic or approved scripts to run in response to errors. See the [alerting](../../tech/home-assistant/alerting.md) page for more on how that's accomplished.

## Reporting
While Home Assistant supports simple reports against past sensor values, beyond simple spot checks, I find Grafana to be a **far** more complete and flexible solution for putting together beautiful dashboards that tell compelling stories.

### Environmental Tracking
After alerting, a farm's environmental data is critical for driving decisions around a farm's processes and procedures. Reports tracking these sensors over time _can_ get you reasonably actionable data.

### Plant Tracking
One thing that I couldn't find an acceptable existing solution for was tracking tracking attributes relevant to plants. The big thing here is identifying the plant, there planted_at timestamp, and tracking which area they are in. This enables pivoting the environmental data into a more plant centric perspective. See the Plant Sensor page for the details.

### A Plant's Perspective
The thing about typical environmental data is that it doesn't account for the variation in needs a plant has across it's life cycle. To enable this, there are TimescaleDB tables that transform the environmental time series data into a per plant dataset with 0 = planted_at. This enables graphs that can compare individual plant grows to each other.

### AI Training
Eventually, I'd like to take the plant's environmental data and train it with harvest amounts to build models that predict growth and can fine tune growth recipes.

## Root Cause analysis
When issues pop up the first priority is getting operational again, and often step 1 is rebooting, which clears the memory and resets conditions in ways that prevent investigation because you can't recreate the issue. Other times you know you have an issue but don't understand the source. In either case having a complete set of data changes from the relevant devices is the difference between finding the root cause of an issue and rebooting every day.
