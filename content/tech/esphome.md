---
title: ESPHome
weight: 3
type: docs
---

ESPHome is the firmware layer that turns inexpensive ESP32
microcontrollers into reliable sensor nodes and actuator controllers.
Each node is defined in a simple YAML configuration file, compiled
over-the-air, and automatically discovered by Home Assistant.

In the Curated Forest stack, ESPHome nodes handle temperature,
humidity, EC, pH, dissolved oxygen, and light level readings, plus
relay control for pumps, solenoids, and grow lights. The YAML-driven
approach means every sensor configuration lives in version control
alongside the rest of the infrastructure, making it trivial to roll
back a bad change or stand up an identical setup elsewhere.
