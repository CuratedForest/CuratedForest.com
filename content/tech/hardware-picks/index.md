---
title: Picking Hardware
weight: 7
type: docs
draft: false
aliases:
  - /tech/running-software/hardware-picks/
author_reviewed: false
editor_reviewed: false
---

The great thing about open source is it'll run on pretty much anything. The downside is it doesn't always run _well_. I've looking all over the place for products that put open source first and collected the winners and losers here.

# Allowing the least bad option
Sometimes I find there just isn't a solution that checks all my boxes. Rather than get hung up on that, I've found it to be helpful to change my mindset and pick the least bad option. When sorting out hardware

# Server
I've used all kinds of things as servers. Really, if it'll run Linux you can use it.

## Recycled Devices
My home lab consists exclusively of laptops I've decommissioned over the last 10 years. I fill them with as much RAM as I can, install Proxmox, and then connect everything else via USB (Keyboards, NICs, HDD bays, etc)

### Benefits
- Cheap
- Flexible

### Downsides
- Could be more power efficient
- I only have 1 machine that can run AI, and even that it does poorly.


## Intel NUC
If I had to pick a single device to start a home lab with, I'd go for a small Intel NUC with an SSD and as much RAM as will fit in it.

### Benefits
- Cost effective
- Low Power
- Small & quiet

### Downsides
- No GPU, so video transcoding and AI won't work.
- Limited expansion

# Laptop
There are a couple laptop manufactures that make devices specifically targeted for Linux. With the exception of Framework, I find these work reasonably well, but aren't perfect, especially when an nVidia card is involved.

## Framework
Hands down the best Linux hardware I've experienced. It exceeds Apple in terms of hardware and ability to support a first class user experience.

### Benefits
The removable discrete video card is cool, and I find myself rearranging my USB ports at least every other week.

# Networks
None of the major network hardware provides offer anything close to open source, so I've narrowed it down to the least bad option.

## OpnSense
While not a major provider, OpnSense does have some (hardware offerings)[https://shop.opnsense.com/product-categorie/hardware-appliances/], though they are more enterprise focused, and thus bit pricy.

## MikroTik
The main players in this field are Cisco, TP-Link, ASUS, and. 
MikroTik doesn't come up super often, but I've found them to be 

### Benefits
- Cost effective
- Full support for any network feature desired.
- Manufactured in a privacy respecting country (Latvia/Europe)

### Downsides
- Not open source
- Somewhat steep learning curve... Though it's standard networking, that turns out to be complex in a way home networking equipment hides.

# Phone
Android is fundamentally open source, so there are a lot of options, but typically companies include firmware and other custom components to their phones that make them ultimately closed.
The main solution is to buy a phone and put a different OS, called a ROM, on it. The ROM I prefer is GraphenOS, and is covered in the software picks section. 

## Motorola (Phone TBD)
Originally the Pixel phones was the main target for GraphenOS, but because of some recent changes by Google, they've partnered with Motorola to produce a phone that GraphenOS will support. Unfortunately that's all we know currently, but once I know what phone it is, that's what I'll get.

# Internet of Things
For my IoT devices, I've gone primarily with devices that support ESPHome. 

## ESPHome

### Benefits
- Framework has a huge number of backing libraries
- Allows me to change and customize behavior of devices

### Downsides
- Needs a consistent power supply.


## Zigbee & Z-Wave
For battery operated devices, I've landed on Zigbee and Z-Wave as acceptable protocols.
For my batteries, I try and stick to the rechargeable Ikea ones and avoid devices that require coin cells.

### Benefits
- Many of the devices are open in some way
- Traffic can't leave the local network.
- Battery efficient.

### Downsides
- Not everything is truely open source
- It's another network and sometimes it experiences instability

# Watch
There are a couple of open source watches. The main issue they suffer from is that their clunky, slow, and don't have any kind of software ecosystem behind them.

## Garmin
The least bad option here is the Garmin. 
### Benefits
- Privacy respecting company
- Good battery life
- Nice user interface
- Health metrics
- Built well & good warranty process

### Downsides
- Not open source
- Secure enough to not allow open connections my house can track, unlike an Apple watch.


# TVs
TVs are another particularly hard device to find open source. They're also notorious for collecting screenshots of what's playing and selling it to advertisers.

## Mitigation.
My least bad option for TVs is actually buying whatever and mitigating. I have network rules that block the TV's traffic from leaving my network. Then I have another machine connected to the TV for my viewing.

### Benefits
- Allows me to control it from Home Assistant.
- Doesn't allow it to communicate with anything else.
- A full desktop experience is faster and friendly than most TV apps.

### Downsides
- The included apps don't work.
- Takes special networking to setup.

# Gaming
The Steam Deck is the easy winner here. The rest of my devices (Switch, PS4) I've just accepted as closed source (booooo).

## Steam Deck
Steam has single handedly brought gaming to Linux, to the point that some games run _better_ on Linux than windows. The Steam Deck is their flagship product and while I don't have one, I've seen how much of an impact they've had on gaming in Linux.
