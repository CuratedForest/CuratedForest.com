---
title: Home Assistant
type: docs
weight: 7
author_reviewed: false
editor_reviewed: false
---

# Home Assistant Operating System (HAOS)
#### What is it?
HAOS is a virtual machine that runs the officially supported Docker stack for Home Assistant. It provides plugins, updates, and backups in ways that are user friendly and reasonably reliable.

#### Installation
HAOS can be installed on hardware directly or via a virtual machine. To see all the installation options, checkout the official [Installation](https://www.home-assistant.io/installation/) documentation. I find that using Proxmox makes managing running servers much easier, you can download the qcow2 file from the [Alternative Installation](https://www.home-assistant.io/installation/alternative) instructions. 

Honestly, the install process by hand isn't well documented and more convoluted than it needed to be (qcow2 doesn't fit the usual VM creation flow). Far easier to utilize the Proxmox [Home Assistant OS Helper-Script](https://community-scripts.github.io/ProxmoxVE/scripts?id=haos-vm&category=IoT+%26+Smart+Home)

Once the VM is created, go to the `Console` for the VM and get the ip address of your new instance. Then, in the browser go to `http://<the_ip>:8123/` and follow the home assistant setup wizard.

### Post Installation
A fresh Home Assistant instance can be functional, but to be used well really benefits from some additional features.

#### Home Assistant Community Store (HACS)
The base Home Assistant is great, but the community is really what makes it shine. HACS is where I go to for most my functionality outside of the core Home Assistant offerings. 

To install HACS, you can go to the [Downloading HACS](https://www.hacs.xyz/docs/use/download/download/) page and following [my link](https://my.home-assistant.io/redirect/supervisor_addon/?addon=cb646a50_get&repository_url=https%3A%2F%2Fgithub.com%2Fhacs%2Faddons). You'll have to update Your instance URL: to be the same `http://<the_ip>:8123/` as before, or whatever you configure Nginx Proxy Manager with... With that said, it didn't work for me so I opened the terminal to Home Assistant and ran 
```wget -O - https://get.hacs.xyz | bash -```
Then rebooted home assistant, go to settings -> Ingratiation -> Add integration and search for HACS.

These are the HACS I'd recommend installing with any Home Assistant instance

- [Adaptive Lighting](https://github.com/basnijholt/adaptive-lighting)
  Matches light color to daytime
  
- [auto-entities](https://github.com/thomasloven/lovelace-auto-entities)
  Huge help in making dashboards.

- [Bermuda BLE Trilateration](https://github.com/agittins/bermuda)
  Allows tracking bluetooth devices to the current room
  
- [Pirate Weather](https://github.com/Pirate-Weather/pirate-weather-ha)
  Bring the weather into Home Assistant
  
- [Magic Areas](https://github.com/jseidl/magic-areas)
  Takes sensors and lights in an area and enables easy occupancy based automation.
  
- [Healthchecks.io](https://github.com/custom-components/healthchecksio)
  Get alerts when Home Assistant stops responding
  
- [Alert2](https://github.com/redstone99/hass-alert2)
  Hands down the most flexible way to handle alerting in Home Assistant
  
- [Alert2 UI](https://github.com/redstone99/hass-alert2-ui)
  The UI component for Alert2
  
There are a couple additional HACS I like a lot

- [Garmin Connect](https://github.com/cyberjunky/home-assistant-garmin_connect)
  Bring your health information into your home!

- [LTSS](https://github.com/freol35241/ltss)
  Records and sends entity states to a Timescale DB instance.
  
- [NHL API](https://github.com/jseidl/magic-areas)
  Perform actions when your favorite NHL team scores!
  
- [LedFx](https://github.com/Anto79-ops/hass-ledfx)
  Can control lights based on audio input.

### Blueprints
https://github.com/koter84/HomeAssistant_Blueprints_Update

#### Apps / (Was called Add ons)
These are docker containers that are providing additional features. They can be found under Settings -> Apps -> Install app. There are lots of things that can be easily installed and managed, and in the past I utilized a lot of them. These days I host most of my services in kubernetes instead, but these still provide a lot of value in managing Home Assistant and would feel incomplete without.

- [Advanced SSH & Web Terminal](https://github.com/hassio-addons/app-ssh)
  Allows SSH access into Home Assistant 
  Set password/ssh key in the app configuration
  Enable allow_tcp_forwarding to allow remote VS Code server
  
- [ESPHome Device Builder](https://esphome.io/)
  Manages ESPHome devices
  
- [Mosquitto broker](https://github.com/home-assistant/addons/tree/master/mosquitto)
  Provides MQTT
  Add MQTT usernames/password to the app configuration as you need them
  
- [Nginx Proxy Manager](https://github.com/home-assistant/addons/blob/master/nginx_proxy/DOCS.md)
  Proxies URLs and manages TLS certs
  
- [Studio Code Server](https://github.com/hassio-addons/addon-vscode)
  Allows editing of configuration files from browser or remote VS Code.

In some cases you may want the following apps as well

- [Zigbee2mqtt](https://github.com/zigbee2mqtt/hassio-zigbee2mqtt/blob/master/zigbee2mqtt/DOCS.md)
  Better management of Zigbee devices.
  Have to add `https://github.com/zigbee2mqtt/hassio-zigbee2mqtt` to Apps repo first.
  Create user in Mosquitto app and then configure Zigbee2mqtt uses it.
  Then you can go into the Zigbee2MQTT UI and connect to the zigbee coordinator.
  
- [Snapcast Server](https://github.com/DjFabFab/hassio-snapcast/blob/main/snapcast-server/DOCS.md)
  Allows for audio syncing across multiple devices. 
  Have to add `[https://github.com/Art-Ev/addon-snapserver](https://github.com/DjFabFab/hassio-snapcast)` to Apps repo first.
  
> [!NOTE] SystemD Note
> When using the snap**client** with systemd, you may need to update the 
> `[Services]` entry with `systemctl edit snapclient` and add `RestartSec=5s`


Once they're downloaded, add them to your side bar if you can, then add username & passwords as noted, and then start the containers (from the Info tab)

### Proxy: Nginx Proxy Manager
This app needs a little more set up and explanation to be helpful. 
- DNS Resolution to containers
- TLS Cert generation

#### Create other user
User vs person
#### Create Areas for home
I create one area per room, as well as a backyard, front yard, attic and basement. After all the sensors and automatons have been added you can remove areas that aren't utilized. 
#### Add Devices
When adding devices, add them to the area they actually live in.
Any additional labels

#### Update IPs
If configuring in a different network than deployment, will need to update IPs for 
- Proxmox
- Home Assistant
- Zigbee Cord
#### Configure Area Automatons
## Automation Methodology
### Areas
I have a couple meta areas too. 
### Labels
