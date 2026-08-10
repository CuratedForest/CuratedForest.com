---
title: Architecture
weight: 2
type: docs
draft: false
author_reviewed: false
editor_reviewed: false
---
This page contains the set of patterns and approaches I use when adding services and capabilities to the Curated Forest.

# Server First
At a high level, the approach the Curated Forest uses, is to employ servers to store and provide my data, as well as run services. This isn't significantly different from how Google or Apple do it, it's just the servers are in my home.

The way I see it is if I have to install a piece of software on my local computer, it's limited to that scope. And sometimes I turn my laptop off! But if I can run it from a server I can integrate it into the rest of my software as well.

One of the biggest reasons to take this approach is how well it supports multiple devices and users. Rather than having to install the same thing across a bunch of different devices, I just point everything to the same URL. Once it's running, adding devices is trivial.

In my lab, the majority of my servers are on Kubernetes to run the underlying software. I have more about how and what I run on the [Kubernetes](/tech/kubernetes/) page. If you're new to self hosting, check out the [beginning with the end in mind](/tech/running-software/beginning-with-the-end-in-mind/) page to understand if Kubernetes is for you. If not, the [Home Assistant OS](/tech/home-assistant/) is a totally reasonable way to run your server as well. 

Both the [Home Assistant OS](/tech/home-assistant/) and [Kubernetes](/tech/kubernetes/) pages have what software I recommend running on them.

# Users Second
If the first thing I'm thinking about is what does this server look like, the second thing is how does authentication work. In the self hosted world there are a handful of ways applications do auth that very from no auth to full OIDC support. Regardless of how an app wants to authenticate, it has to use the same credentials across the rest of the stack.

The way I manage this is with Keycloak. You can absolutely go with another ID provider, there are plenty. I've tried a fair number of them but keep coming back to Keycloak for 2 main reasons
- It does all the protocols. This is important in self hosting where you don't always get control of how the app authenticates.
- It's backed by Redhat. This kind of enterprise support brings a lot in terms of security audits and speed in addressing critical vulnerabilities. 

## Same login for EVERYTHING
This has a couple major benefits. 

The first is that sharing what you've created is easy. Users hate passwords, so don't give them more then 1. Or if you're friend betrays you, there is only 1 place you have to go to revoke access.

On a personal level this helps the admin too. When you're hosting a handful of services it's not to bad managing credentials, but when you go beyond 10 or so having a single login is SO nice.

# Infrastructure as Code
The third major consideration to my infrastructure is how to record it as code so it can be shared. With virtualization these days, you can _really_ record your entire stack.  It's not always practical or efficient to do it that way though. Like if I have to deploy 100 of anything, I'm going to turn it into code, but for the handful of VMs I create a year, my time is better served on strong documentation. 

## Kubernetes is the sweet spot
This is really where Kubenetes really shines. Once it's running, you have a standard interface (via it's API and YAML structure) to manage any hardware or software component in the stack. Everything from video cards to network routes I handle with Kubernetes objects. It is usually a little tricky to get something working initially, but once it's working, because what's needed is completely in code, it can be reliably shared with others.

## Use ArgoCD to sync changes
The hardest part of any infrastructure as code setup is going to be what drives the changes and how. I've found ArgoCD to do that reasonably well. It takes git repos and helm charts and compiles them into Kubernetes object to deploy and manage. Kubernetes can get overwhelming with all it's objects and YAML and I find ArgoCD does a great job at not just managing the objects in the cluster, but visually representing what's going on so that an admin can diagnose problems easily.

## Where is the automation line?
My approach is usually to manually setup and configure a server all the way to it being able to run Kubernetes. Rather than automate this, I lean into manual steps and documentation for a couple of reasons:
- Even if you stick to linux, there are a ton of variation in distributions and how things work.
- Not all cloud providers will provide the distribution your automation supports. 
  I really like Tumbleweed, so that's what my servers run. But Hetzner, my cloud provider, doesn't offer a Tumbleweed image, so I use Debian.
- People will want to use different cloud providers too! And no tool seamlessly translates infrastructure code to multiple clouds.
- Often initial setup needs manual changes anyway.
- It takes significantly less time to set up a VM by hand and document than it does to automate it to perfection.

So if you can get a VM or Linux machine running, it can run Kubernetes. Get it that far and Curated Forest will take it from there.

# Secrets (External Secrets)
Another critical consideration for software infrastructure is secret management. It's hands down the hardest part to get right. For most self hosted users secrets aren't a huge deal, but I've learned as you scale into production they matter more and more. The hardest part of making that transition is having secrets stored correctly. The biggest thing here is that should mean encrypted and not in clear text on the disk _anywhere_. 

The best way I've found to manage this is with the External Secrets Operator and Bitwarden. With that combo, I can define my secrets and where to get the values from, but nothing about the secret itself is in git.

### EtcD and Secrets
Unfortunately, by default EtcD stores secrets base64, but that's still basically clear text on the disk. I've accepted this for now with the expectation that should it become an issue, because everything is already a secret, it's not that hard to implement a vault to support a more secure solution.

# Monitoring
The hardest part of self hosting isn't getting software running, but understanding why it's broke when it's not. Certainly I spend a fair amount of time digging through live containers and logs, but a huge portion of my time is spent looking at the metrics and logs collected when a problem actually happened. This kind of visibility can be the difference between being able to track down a bug and having to give up. 

## Grafana, Loki, and Prometheus
To support my monitoring needs, I lean heavily on the industry choices of Grafana for my visualizations, Loki for log collection, and Prometheus for metric collection and storage. Because these are so standard in the tech industry, they're easy to incoporate into Kubernetes as well as most other devices you might want to monitor.

# Physical Structure
Saying Curated Forest takes over once you get a VM is one thing, but how do I actually recommend structuring your lab and clusters is another! 

Hardware really doesn't matter! Physically, my lab consists of the laptops I've decommissioned in the last decade. Admittedly I have fill their RAM to capacity and had a couple beefy laptops, but even one is enough to get started. See the [Hardware](/tech/hardware-picks/) page for more.

## Proxmox
Regardless of what hardware you go with, I like to run my VMs through Proxmox. There are other options out there, but usually they get costly and require licenses. Proxmox does require a license as well, but I find their community pricing to be reasonable (considering the alternatives). Plus, you can evaluate the product indefinitely! 







 
