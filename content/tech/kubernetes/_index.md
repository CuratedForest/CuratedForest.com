---
title: Kubernetes
type: docs
weight: 6
autoshrink: true
aliases:
  - /tech/kubernetes/
author_reviewed: false
editor_reviewed: false
---
# Kubernetes (K8s)
## What is it?
Fundamentally Kubernetes is a standardized way of running software. Historically it's been optimized for running across servers and devices, but these days it's been simplified enough to be stable experience on a single node or machine.
### Installation
There are a bunch of guides on how to install Kubernetes. To see my recommendation, see the installing [k3s on tumbleweed](k3s-tumbleweed.md) page.
# K3s vs the world
At the end of the day, one Kubernetes distribution should run basically the same as another. So I'd expect the bulk of Curated Forest to work regardless of which distribution is used. With that said, I like k3s because of it's strong single node support and local path storage. 
# Community Resources
An important consideration for any approach to running software is the community that surrounds it. There are a couple major resources in this regard.
## Helm Charts
Helm charts are the standard way way to package and deploy software in Kubernetes. There isn't an official chart repository, but I find many of the biggest ones are listed on [Artifact Hub](https://artifacthub.io/). 
## Flux Templates
Flux is a tool similar to ArgoCD in that it takes git repos and turns them into Kubernetes. I prefer ArgoCD to it because of some flexibility issues and that it's lacking a GUI (natively at least). Regardless, if there isn't already a chart, I often check and copy the way others implement a service in flux. [Kubesearch.dev](https://kubesearch.dev/) is a great resource for finding these examples.
## App Templates
Finally, if an service doesn't have an existing chart or flux template, I utilize bjw-s Lab's [App Template](https://bjw-s-labs.github.io/helm-charts/docs/app-template/).  It's what most of the Flux stuff is based of anyway.

# Single Node vs Cluster
One of the things that I think makes Kubernetes manageable, especially initially, is to just run a single node. Without the complexities of distributed compute and networking, it becomes a platform you can learn on rather than a tangled mess of complexity. 

With that said, once you move into production that complexity drives high availability, and is well worth considering. For myself, I keep my lab as single node clusters, but have implemented clusters professionally when the environment had more production requirements. 
