---
title: Proxmox
weight: 1
type: docs
draft: true
---

Proxmox is a Virtual Machine Hypervisor built around Debian and typical Linux tooling. It's open source, though does require a license. Without one it presents a nag on login. Pretty minor and with no time limit it's a reasonable way to evaluate the product. My experience was that I trailed Proxmox for ~6 months, at which point I could see it was a good experience and it was worth supporting the company and bought some [community licenses](https://shop.proxmox.com/index.php?rp=/store/proxmox-ve-community).

  
  

### Installation

  

[Download Proxmox](https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso)

  

Then use something like Balena's [Etcher](https://etcher.balena.io/) to flash the most recent ISO onto a flash drive.

  

Boot plug the drive in and do whatever keyboard shortcut your computer requires to get into the boot menu. Boot to the flash drive.

  

The terminal based install is quite minimal, but made good choices.-

  
  

### Post Installation

Once Proxmox is installed, you may consider logging into the shell and running [Community Script's Post Install](https://community-scripts.github.io/ProxmoxVE/scripts?id=post-pve-install) script and/or other helpers.

  

%% The scripts are primarily LXC based, which is a way to run containers. It's a typical enough pattern in the self-hosted community to consider, but I do prefer Kubernetes or HOAS. %%

  
  

## Proxmox Backup Server