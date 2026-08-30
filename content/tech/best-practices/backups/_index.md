---
title: Backups
weight: 1
type: docs
draft: false
aliases:
  - /tech/running-software/best-practices/backups/
author_reviewed: false
editor_reviewed: false
---
Backups are critical to keeping any system running long term. At a high level, backups should follow the 3-2-1 principle. That is, you should have 3 copies of your data, on at least 2 different drives, and have 1 copy offsite. This is a typical starting point and will address the majority of disasters, though more consideration is often beneficial. Here I go into those considerations and the tool choices I made because of them. Call it the 3-2-1-0 backup principle.

# What is a Disaster?
When laying out a backup plan beyond 3-2-1, it's important to consider what sort of disasters you're looking to protect against, and what restore process looks like. These can range from oops I clicked delete all the way to the building burns down. There is more to consider for a proper disaster recovery, but these are the areas I'm usually thinking about when it comes to backups specifically.

## Accidental Changes, Troubleshooting, and Updates
These are the most frequent uses for backups, and can usually be handled with Snapshots.
## Bad Disk
Disks fail. Run enough of them long enough and this will bite you. The goal here is when a drive does fail, all you have to do is swap it with a good one and kick off a repair.
## Natural Disasters
Natural disasters happen and are impossible to plan for, but having an offsite backup is easy.
## Ransomware & Hackers
The hardest disaster to plan for is that of being hacked. Backups are a great target for hackers for two reasons:
- They are often unencrypted, which makes important data visible
- They can be deleted and held for ransom 

In this disaster, you have to assume all the infrastructure is infected or accessible. There are two ways to handle this. The best way is to have backups that aren't online. If a hacker can't get to it, they can't infect it, thus you can restore from it. 

In many cases offline can be relaxed to a storage/S3 provider that supports append only usage. With that said, assume any password manager is compromised and write the admin's account password on a piece of paper instead.

## What Needs Backed Up
Your list may look different than this, but knowing what to backup is the first step to having good backups.
- Laptops
- VMs
- SeaweedFS / Network file system
- Phones
- Networking Equipment
- Cloud VMs 

# Tools
There are an overwhelming number of tools out there that revolve around backups. When I evaluated them I was always looking at two main things:
1) How does it handle de-duplicating data
   Backups revolve around duplicating data, but storage isn't cheap, so anything that can be done to avoid needless duplication directly results in a lower bill.
   
2) How quick and easy is the restore process
   Depending on the process, disaster, and tool, the restore process will be different, but my expectation (short of a fire) is that file level near instant recovery should be possible.
   

## BTRFS
What a significant portion of my backup strategy revolves around is the snapshot capability built into BTRFS. It's a Linux file system that efficiently keeps track of changes (copy on write) and allows for instantaneously taking and restoring "snapshots" at any time.

## Snapshots
The key thing about these snapshots is because of the tracking, it is able to take truly instantaneous backups across the entire file system. This allows for consistently usable restores from databases and OS level changes that typical backup solutions can't handle. 

Often backups are made by reading one file after another, and if a program is changing multiple files mid backup, it's possible to get into a state where one file contains the original pre-change information, and other files contain the post change data. This can put the system in an inconsistent state and break the backup. So not only is BTRFS fast, but it's able to do a better job because of it!

### Not a Backup
It's important to note that snapshots aren't a backup and why. In it's efficiency, it only keeps 1 copy of the file. If that disk dies or the file is corrupted, you're toast!

## Virtual Machines
### Snapshots in Proxmox
In the last few years, Proxmox has added support for utilizing BTRFS for VM volumes. Because of this they also support taking snapshots of VMs, and this de-risks making changes to production systems **significantly**. In The Curated Forest, this is the main defense when making changes and updates.

### PBS - Proxmox Backup Server
Snapshots are GREAT for the majority of issues, but only cover 1 copy of the data. That's where PBS is helpful. It takes a snapshot of running VMs, then copies the difference to whatever data sources you configure. 

You should have at least 1 on-prem PBS data source to allow for quick recovery, and 1 cloud based to protect against natural disasters and cyber punks. 


## S3 / Wasabi
The most supported offsite option is usually S3 buckets. Wasabi is one of the less expensive S3 offerings usable for offsite backups. They support append only usage and have reliable service. 

## S3 / Seaweed 
SeaweedFS provides S3, so it's a reasonable option for on-prem Kopia or PBS backups.
## SeaweedFS
SeaweedFS is great for storing large amounts of data and also supports duplication across drives and locations to protect from hardware failure. Though it doesn't support append only, so should be see as acceptable for covering everything but ransomware... It's complexity also presents additional risk, so critical and/or sentimental data should get an additional backup with Kopia or PBS.

## Kopia
This is a great cross platform program that does a good job deduplicating data and saving it to S3 buckets, whether that be SeaweedFS or a cloud S3 provider like Wasabi. 
Works with:
- Laptops
- Kubernetes & VMs

## Android 
Android doesn't make some information visible to the file system, so we have to configure some daily backups. These include:
- SMS
- Calls
- Signal
- Aegis / 2FA

### SyncThing
To get phone data into the rest of the backup pipeline, you can utilize SyncThing to keep files on your phone and desktop in sync. It's not perfect, but does a good job given how often phones are on different networks or disconnected.

# Backup & Retention Schedule
Finally, you need to consider your backup schedule. This will be device, storage needs, and data sensitivity dependent, so hard to pin a "best" practice around, but it's reasonable to split things up like this:
- Laptops 
	- Tumbleweed automatically backs up the OS files on every update
	- Kopia hourly for /home, /opt/, /usr/local/
		- Hourly for 2 days
		- Daily for 3 weeks
		- Monthly for 1 year
- Phones
	- SyncThing as connectivity allows
	- Program specific backups daily
		- Retain 1 week
- VMs 
	- Nightly to PBS
	- Manually when updating
- Misc
	- Copy to laptop or central server in someway and have included in backups from there.

The other thing to consider with backups is that if you have any automated updates, your backups should be scheduled **before** updates are ran.