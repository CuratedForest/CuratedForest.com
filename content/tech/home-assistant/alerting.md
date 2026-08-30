---
title: Alerting
weight: 1
type: docs
draft: false
author_reviewed: false
editor_reviewed: false
todo: "- Document the no DB error case."
---
Alerting is critical to any well running system. Alerting in Home Assistant isn't the best solution for everything, but it covers most of it! As with most software, the important thing here is to not reinvent when great solutions already exist.

# Why Not Grafana?
Grafana is a great tool, but is lacking a couple of key capabilities that make Home Assistant a better solution.
- No real time response. 
  You can get close with a query every minute, but even that kind of delay has limits. 
- No ability to effect change from alert. 
  Often you want to take a predictable action from a given alert. Grafana doesn't easily allow that path.
With that said, there are some cases, like VM metrics and logs, that don't make sense to send through Home Assistant. For those, a traditional DevOps monitoring stack like Prometheus, Loki, and Grafana does make sense.

# Alert2
While Home Assistant's built in alerting is a little clunky, there is a HACS,[Alert2](https://github.com/redstone99/hass-alert2), that does a much more complete job. It allows configuring pretty much every feature with templates, and thus enables the path for using labels as well. 

## Label Based Alerting
PoC work with labels and alerting has had good results. Th next step will be to better incorporate with the Label Based Features framework and document here.

## Alerting Priority
Alert2 comes with low, medium, and high priority for it's alerts. Conventionally, I've utilize that to mean:
- Low: alert because the metric is out of spec. No user notification, but scripts can run to take default steps to address.
- Medium: alert because the user needs notification. No default action, but can prompt user with 1 click actions depending on issue and sensor.
- High: alert because critical failure or safety risk. Shutdown systems and send high priority notifications.

## What to alert on
Just as important as how to alert is what we're alerting on. 

### Error Cases
Home Assistant has a couple of states (Unknown & Unavailable) that are good trigger against.

### Home Cases
There are many useful alerts around the house. These are just a couple examples:
- Leak detection
- Bedroom temperature to high at night
- Disconnected from DB
- Device goes offline

### Farm Cases
Keeping an ideal environment in spec is critical for optimal plant growth. To do this, these metrics have acceptable ranges and alerts:
- VPD
- Temp
- Humidity
- pH
- EC
- Water Temp
- L
- PSI

### Alerting on No Change
Sometimes systems fail in ways that prevent them from changing when they should. To identify this, we set up alerts for values that don't "change" in the desired time range. "change" is in quotes here because experience reveals that some sensors change values slightly but often, so it's simpler and more dependable to build alerts that checks if the metric has changed by X in Y amount of time.

The heart beat of an aeroponic farm is it's PSI, the pressure it supplies to the nozzles. And if it stops beating, so do the plants. Given all the ways the system can fail, this turns out to be an unusually good indicator of issues.

# What If Home Assistant Goes Down?
There are cases when Home Assistant itself goes offline, and with it all the alerting Home Assistant supports. To address this gap, I've utilized [Healthcheck.io](https://healthcheck.io). 

To configure this, I set up the endpoint in Healthcheck.io that fails if it doesn't get pinged every 15 minutes, then in Home Assistant added a `rest_command` to my configuration.yaml file.
```
rest_command:
  healthchecksio:
    url: https://hc-ping.com/YOUR_ID_HERE
    method: GET
```

and have an automation that calls it running every 5 minutes
``` 
alias: "Infra: Healthcheckio ping"
description: ""
mode: single
triggers:
  - minutes: /5
    trigger: time_pattern
conditions: []
actions:
  - data: {}
    action: rest_command.healthchecksio

```

