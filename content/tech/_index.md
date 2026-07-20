---
title: Technology
weight: 10
---

# The new playbook for running software
When I was growing up, the LAMP (Linux, Apache, MySQL, and PHP) stack was hands down the easiest way to get a project up and running. All the technologies had been picked and refined to work _well_ together. Today there is so much fragmentation and an abundance of ways to do anything that what is the easiest or most efficient gets entirely drowned out in the sea of how to configure everything. My hope for the Curated Forest is to offer a path similar to the LAMP stack, but for the modern set of technology.

For more on what that looks like for software, see the Architecture page. If your curious about the physical requirements, see the Hardware page.

## Complexity 
Today's software can be as simple as a single go binary and scale all the way up to Kuberenetes clusters with hundreds of nodes. My goal is to have the minimal amount of complexity, while still supporting _everything_ a business could need. The biggest issue I had was that Kubernetes had a reputation for needing a _team_ to run it, and it's just me running my home lab. I had also ran it professionally for a couple of years and thought that was accurate. So I spent YEARS I looking for alternatives to Kubernetes, and every time I dug into a possible alternative I ran into major downsides.
- Swarm (Docker) 
  - Configuration does not easily support scaling beyond a dozen services. 
  - Additionally, watched major issues go un-addressed for years.
- Nomad (Hashicorp) 
  - No community for making patterns to run software comparable to docker-compose.yaml files or helm charts.
- Podman (Redhat?) 
  - Not a 1-1 drop in for Swarm. 
  - Suffers from many of the same limitations as Swarm.

### Benefits of K3s
When I finally came back to Kubernetes, I found, with research, I could land on solutions that were simple enough for me to use, and still achieve my desires for scalability and flexibility. The crux was running a single node instance of k3s. 
This provided me:
- The ease of configuring docker containers with Swarm (and in a way that's more consistent and flexible)
- The simplicity and related uptime of running all services on a single node.
- A large community behind building prebuilt Helm packages
- Another large group building home labs with Flux (similar to ArgoCD) searchable via (kubesearch.dev)[https://kubesearch.dev/].


# Open Source

I've been playing with, and breaking, software my whole life. Seriously, one of those kids on MySpace with a flashing page that played music. Every few years I find another reason to take steps in the open source direction.
- Initially I found was that open source gave me a way change the way my computer ran.
- Then I found by running open source software, I could track down and solve my own bugs.
- Next I used open source as a constraint to drive my creative practice. This meant I stopped considering closed source options, even if their free.
- Once I mostly transitioned to self hosted or open source solutions, I found the quality to usually be comparable, sometimes better, and the interoperability between services to be very strong.
- Finally, I've been seeing a lot of companies get bought or go public and make major modifications to their product that impact users. Seriously, they go from minor inconveniences all the way to straight up disabling products people have paid for and are using.

Because of all of the above (and more), I've made it my personal mission to move all of my software, and hardware, onto services and products that are open source first. With only a couple notable exceptions (Garmin Watch, Switch, Windows for work), I've pretty much completed that transition. Thus this website!


Documentation of the open-source technology stack that runs Curated
Forest — see [the homepage](../) for the broader "what is this stack"
pitch. The individual software tools live in the
[Software](../software/) section.

{{< button "./running-software/" "Running Software" "mb-1" >}}
{{< button "./home-assistant/" "Home Assistant" "mb-1" >}}
{{< button "./hardware-picks/" "Hardware Picks" "mb-1" >}}
