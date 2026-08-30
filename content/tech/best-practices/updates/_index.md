---
title: Updates
weight: 2
type: docs
draft: false
author_reviewed: false
editor_reviewed: false
---
# Zen and the Art of Software Maintenance
The operational habits that keep a self-hosted stack healthy over a long term revolve around updates. It's usually great when you get to bring in new features and security patches, less so when you realize updates are **the** mostly likely time for things to break or go wrong. Timing and backups are your safety net!

## Renovate
The main technology the Curated Forest uses for detecting updates and schedule deployments is Renovate, from Mend.io. It scans through code bases picking out dependencies and then tracks the packages and raises git PRs when their versions change. It's able to catch the majority of dependencies automatically, and has the flexibility to be custom configured for the cases it misses initially. The goal is to have everything in the Curated Forest managed by Renovate, with OS packages being the exception. 

## Read the change logs!
One of the key things that Renovate does is attach a change log to the updates it's suggesting. Good admins read these! When a project has to make a breaking change, they'll almost always put it here. Knowing about these before hand allows you to do any needed prep, or pause the update until all the dependencies can be resolved.

# Timing
When coming up with a plan for updates, most of the decisions will revolve around timing; what to update when. There will never be a one size fits all solution, so here are the decision points and thoughts on when to pick each option.

## Availability 
The first thing to realize about updates is they don't always go smooth. They _often_ do, but if they go south, it's advisable to have the time and energy to fix any issues that pop up lest your services be left in limbo.

## Staying Current
With updates, the idea is usually to get to the current stable version. It's as secure as they know how to make it, has all the best features, and the most bugs fixed. Usually updating from one release to the next isn't a big deal, but if you do big jumps things are far more likely to break. This means it's important to consistently update. There will still be issues, but there will be fewer, and those that do pop up will be easier to track down.

# Schedule
In order to stay current, you need a plan or schedule outlining what to update and when. When making this, there is a balance between update frequency and the impact of a service not working. 

### Automatic
If you can live without a service for a day, up to a week, then it's a good candidate to put on a daily or weekly automatic update schedule. Because of the possibility of breaking changes, it's still important to review the change logs of these, even if they are being applied automatically.

In addition to the Renovate updates, OS updates are usually safe enough to schedule and run automatically. For the VMs running my services, I target a weekly update & reboot early Thursday mornings.

### Manual
For the core infrastructure that would take down other services, things like Keycloak, ArgoCD, and SeaweedFS, you should pick a frequency for manual review and updates. I've loosely landed on quarterly to be reasonable, but you might find monthly or yearly more fitting for your needs.

For my personal and work laptops and phonse, I update as needed, as well as when I do these manual infrastructure updates.

# Additional things to update
Outside of the Curated Forest and VMs, I keep a list of all the devices that need updates. This includes additions like:
- Laptops
- Phone OS
- Phone Apps
- Watch
- Email Servers
- Proxmox OS
- Networking  Equipment
- Game Consoles

# Rollback Plan in The Curated Forest
The majority of updates really do go great, but for the handful that don't, having a good backup can save time, pain, and heartbreak. Review the [Backups](backups/_index.md) best practices and make sure to align your backup times to be before your update times. 

When it comes to restoring, you should have 2 main approaches:
- Rolling back git 
  If there is an issue with just the code, you can use ArgoCD to roll back the deployment. Sometime ArgoCD doesn't work, in which case you can also revert the commit in git and redeploy the old versions. This is a good first step and sometimes, but not always, restores functionality. 
  
- Restore VM snapshot
  This is needed if the kubernetes cluster gets into a bad state or an app's update migrates data into a broken way. In these cases, you can restore the VMs snapshot or the files for that specific app. Be sure to snapshot/backup before doing this restore! More than once I've restored a snapshot and after troubleshooting with a restore, had to do extra recovery because I abandoned the latest changes and shouldn't have.

