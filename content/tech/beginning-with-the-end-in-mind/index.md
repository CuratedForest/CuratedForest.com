---
title: Beginning With the End in Mind
weight: 1
type: docs
draft: false
aliases:
  - /tech/running-software/beginning-with-the-end-in-mind/
author_reviewed: false
editor_reviewed: false
---
This document is for those who have started, or are considering starting their self hosting journey. My hope is it outlines a reasonably efficient path to getting running, along with some of the pitfalls I've learned the hard way. 

## Is Curated Forest for you? 
The reality is running your own software _is_ technically challenging no matter how you do it. It may not be too bad to get something up an running, especially when you're reusing someone else's code, but when it breaks you have to be able to think through your system well enough to at least take and restore backups. If you can do that though, you can run your own Curated Forest!

## Containers: Kubernetes vs Swarm
10 years ago when I was firsts learning about Docker, the advice I heard was to start with Docker Swarm to learn containers, and then if your use case needed the complexity jump over to Kubernetes. 

What I've since learned is that Docker Swarm isn't designed or maintained well enough to be seriously considered for production use. It's doable, but the complexity needed accumulates quickly and before you know it you're managing all sorts of commands and calls in scripts surrounding your docker calls. 

Is Kubernetes complex? Admittedly, yes. But not any more so than it needs to be. It comes from the brains of people at Google (you know, when Google was competitive) and is designed to handle anything they might need to host. So it supports an absolutely overwhelming number of features and options, especially to run computations across many computers. Fortunately the great people working on k3s came along and built their own Kubernetes version, and that version supports running on a single node. This was a game changer.

This was so huge because 90% of the complexity of running Kubernetes comes from it running across multiple servers to support high availability and a distributed workload. Once that complexity is removed, so went the majority of my issues. In fact, I found that not only was it stable, but it had standardized ways to handle the pain points I often ran into with Swarm.

## First Recommendation: Kubernetes
Because of the flexibility and stability, for anyone looking to _play_ with containers or has enough experience to reasonable run software, I'd recommend jumping right to Kubernetes. If you follow the patterns outlined on this site, you should be able to get to something functional right away. From there it's so much easier to break & fix the components, and learn from that process rather than go through all the bumps and bruises it takes to get working from scratch.

## Second Recommendation: Home Assistant Operating System
With that said, Home Assistant OS is a _strong_ alternative. It's Docker Swarm based and does have limitations because of that, but it's tight integration with Home Assistant makes it exceptionally usable, tested, and documented. It's perfect if all you want to do is automate your home and deploy a couple containers. Beyond a dozen you'll likely want to look at Kubernetes, but that leaves a lot of room for Home Assistant OS to shine. In fact, while I've moved all of my services off of my Home Assistant OS instance and into Kubernetes, I still run my Home Assistant instance with HAOS because it make addons, backups, and updates so much easier. 
