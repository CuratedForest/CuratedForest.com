---
title: SeaweedFS
weight: 2
type: docs
draft: true
aliases:
  - /tech/seaweed-fs/
author_reviewed: false
editor_reviewed: false
---

Can copy and paste this into host to fix corrupted idx files.
```
#!/bin/bash
#export STORAGE_PATH=/var/lib/rancher/k3s/storage/pvc-0ccb84d1-61cb-4d84-85aa-d9b5ed44d4d5_default_idx-seaweedfs-volume-0
export STORAGE_PATH=/var/lib/rancher/k3s/storage/pvc-b6297b53-6c13-4f54-9786-4438f80d8f6f_default_idx-seaweedfs-volume-1
#export STORAGE_PATH=/var/lib/rancher/k3s/storage/pvc-83698893-00cc-46d5-bf93-be482b8a0728_default_idx-seaweedfs-volume-2
#export STORAGE_PATH=/var/lib/rancher/k3s/storage/pvc-2000b368-eeb9-4d42-bfa9-cd03d1a52ed7_default_idx-seaweedfs-volume-3
#export STORAGE_PATH=/var/lib/rancher/k3s/storage/pvc-a4463eb5-f3a6-4316-98dd-39d70cb27b61_default_idx-seaweedfs-volume-4
# Simple script to run weed fix on all .dat files that don't have .idx files
for dat_file in *.dat; do
    if [ -f "$dat_file" ]; then
        # Extract base name and check for idx file
        base_name="${dat_file%.dat}"
        if [ ! -f "${STORAGE_PATH}/${base_name}.idx" ]; then
            echo "Fixing $dat_file..."
            weed fix "$dat_file"
        fi
    fi
done

```



Then can run
``` bash
#!/bin/bash
#STORAGE_PATH=/var/lib/rancher/k3s/storage/pvc-0ccb84d1-61cb-4d84-85aa-d9b5ed44d4d5_default_idx-seaweedfs-volume-0/
# Script to copy .idx files from current directory to /idx directory
# Only copies files that don't already exist in /idx
for idx_file in *.idx; do
    if [ -f "$idx_file" ]; then
        if [ ! -f "$STORAGE_PATH/$idx_file" ]; then
            echo "Copying $idx_file to /idx/"
            mv "$idx_file" "$STORAGE_PATH"
        fi
    fi
done
chown -R 2000:2000 $STORAGE_PATH
# Your user/group might be different. It should match the rest of the dir
# when you run ls -al. 
```
Then reboot the pods or VM!
Otherwise when you run `volume.fix.replaction` the volume servers won't have the idx files loaded and see the volume as offline. That'll cause needless copies of volumes and added risk as interruptions during these copies causes corruption. 



To detect volumes that aren't mounted (but probably should be)
```
echo -e 'lock\nvolume.fsck\nunlock' | weed shell 2>&1 | grep -v -E "(404|500)" | grep "failed to locate" | sed 's/.*failed to locate \([^,]*\),.*/failed to locate \1/' > /tmp/results.txt
```


``` 
  0 weed shell
   1 echo 'volume.list' | weed shell | grep "volume id:" | awk '{print $3}' | awk -F':' '{print $2}' | sort -n | uniq > /tmp/master_volumes.txt
   2 cat /tmp/master_volumes.txt 
   3 echo 'volume.list' | weed shell | grep "volume id:" | awk '{print $2}' | cut -d: -f2 | sort -n | uniq > /tmp/master_volumes.txt
   4 cat /tmp/master_volumes.txt 
   5 weed shell
   6 echo 'volume.fsck -volumeId=493' | weed shell | grep "failed to locate" | grep -v "404 Not Found" | grep -v "500"
   7 echo 'lock\nvolume.fsck -volumeId=493\nunlock' | weed shell | grep "failed to locate" | grep -v "404 Not Found" | grep -v "500"
   8 echo 'lock\n volume.fsck -volumeId=493 \nunlock' | weed shell | grep "failed to locate" | grep -v "404 Not Found" | grep -v "500"
   9 echo "lock\nvolume.fsck -volumeId=493\nunlock" | weed shell | grep "failed to locate" | grep -v "404 Not Found" | grep -v "500"
  10 echo "lock\n volume.fsck -volumeId=493 \nunlock" | weed shell | grep "failed to locate" | grep -v "404 Not Found" | grep -v "500"
  11 echo -e 'lock\nvolume.fsck -volumeId=493\nunlock' | weed shell | grep "failed to locate" | grep -v "404 Not Found" | grep -v "500"
  12 echo -e 'lock\nvolume.fsck -volumeId=493\nunlock' | weed shell 2>&1 | grep -v -E "(404|500)" | grep "failed to locate"
  13 echo -e 'lock\nvolume.fsck -volumeId=493\nunlock' | weed shell 2>&1 | grep -v -E "(404|500)" | grep "failed to locate" | sed 's/.*failed to locate \([^,]*\),.*/failed to locate \1/'
  14 echo -e 'lock\nvolume.fsck\nunlock' | weed shell 
  15 sort /tmp/results.txt | uniq
  16 weed shell
  17 echo -e 'lock\nvolume.list\nunlock' | weed shell | grep -E "(818|872|877|878)"
  18 echo -e 'lock\nvolume.list\nunlock' | weed shell | grep -E "id:(818|872|877|878)"
  19 echo -e 'lock\nvolume.list\nunlock' | weed shell | grep -E "id\:(818|872|877|878)"
  20 echo -e 'lock\nvolume.list\nunlock' | weed shell | grep -E "(818|872|877|878)"
  21 echo -e 'lock\nvolume.fsck\nunlock' | weed shell 2>&1
  22 weed shell
  23 echo -e 'lock\nvolume.fsck -findMissingChunksInFiler\nunlock' | weed shell 2>&1
  24 echo -e 'lock\nvolume.fsck -findMissingChunksInFiler\nunlock' | weed shell | grep -i err
  25 echo -e 'lock\nvolume.fsck -findMissingChunksInFiler\nunlock' | weed shell | grep -i err > err_files.txt
  26 ls
  27 cat fsck_report.txt 
  28 ls -al
  29 ls -alh
  30 cat err_files.txt 
  31 echo -e 'lock\nvolume.fsck -findMissingChunksInFiler\nunlock' | weed shell | grep -e -i "(error|not fount)" > err_files.txt
  32 echo -e 'lock\nvolume.fsck -findMissingChunksInFiler\nunlock' | weed shell | grep -e -i '(error|not fount)' > err_files.txt
  33 echo -e 'lock\nvolume.fsck -findMissingChunksInFiler\nunlock' | weed shell | grep -E -i '(error|not fount)' > err_files.txt
  34 ls -al
  35 ls -alh
  36 cat err_files.txt 
  37 echo -e 'lock\nvolume.fsck -findMissingChunksInFiler\nunlock' | weed shell | grep -E -i '(err:|error|not fount)' > err_files.txt
  38 echo -e 'lock\nvolume.fsck -findMissingChunksInFiler\nunlock' | weed shell  2>&1 | grep -E -i '(err:|error|not fount)' > err_files.txt
  39 echo -e 'lock\nvolume.fsck -findMissingChunksInFiler\nunlock' | weed shell > >(grep -E -i '(error|not found)' > err_files2.txt) 2>&1
  40 ls -al
  41 ls -alh
  42 cat err_files2.txt 
  43 clear
  44 cat err_files2.txt 
  45 awk '{print $2 " " $3 " " $4}' err_files.txt | sort -u > unique_files.txt
  46 lsblk
  47 ls -alh
  48 cat unique_files.txt 
  49 cut -d' ' -f2- err_files.txt | sort -u > unique_files.txt
  50 ls -alh
  51 cat unique_files.txt 
  52 sed 's/^[^,]*,//' err_files.txt | awk '{$1=""; print $0}' | sed 's/^ //' | sort -u > unique_files.txt
  53 cat unique_files.txt 
  54 grep "volume not found" err_files.txt | sed 's/^[^[:space:]]* //' | sort -u > unique_files.txt
  55 cat unique_files.txt 
  56 ls -al
  57 grep "volume not found" err_files.txt | sed 's/^[0-9]*,[a-f0-9]* //' | sort -u > unique_files.txt
  58 ls -al
  59 grep "volume not found" err_files2.txt | sed 's/^[0-9]*,[a-f0-9]* //' | sort -u > unique_files.txt
  60 cat unique_files.txt 
  61 grep -V "volume not found" err_files.txt 
  62 grep -v "volume not found" err_files.txt 
  63 weed shell
  64 ls -al
  65 history

```

## Troubleshooting commands
``` 
weed shell
lock
volume.fix.replication
volume.list -volumeId=14
volume.delete -node=seaweedfs-volume-2.seaweedfs-volume.default:8080 -volumeId=14
volume.check.disk -volumeId=21
volume.fix.replication -force
unlock
```



To get all failed files:
(Next time add date to output name.)
```
printf 'fs.verify\n' | weed shell 2>&1 | tee output.txt
```

``` 
printf 'fs.verify \n' | weed shell 2>&1 | tee "output_$(date +%Y-%m-%d).txt"
```

In order to get bad volumes by server
```
sed -n 's/.*fileId \([0-9]*\),.*at volume server \([^ ]*\).*/\1 \2/p' "output.txt" | sort | uniq -c
```
To get just the bad files:
``` 
sed -n 's|^file:/buckets/\(.*\) failed.*|\1|p' output_2026-01-15.txt  | uniq

```

### How to identify files that are corrupted (missing from volume) and need to be deleted

``` 
echo -e 'lock\nvolume.fsck -findMissingChunksInFiler -verifyNeedles\nunlock' | weed shell 2>&1 | tee fsck_results_$(date +%Y-%m-%d).txt
```
The above actually was pretty quick at identifying actually broken files.
Though sometimes it'd miss issues and I'd have to use fs.verify or -v and the look for where in the fs scan errors are generated.

Then to extract just the files

``` 
cat fsck_results_2026-01-26.txt | awk '/^[[:space:]]*[0-9]+,[a-f0-9]+ \/buckets\// {sub(/^[[:space:]]*[0-9]+,[a-f0-9]+ /, ""); sub(/ volume not found$/, ""); print}' | sort | uniq -c
```
```
cat fsck_results_2026-01-26.txt | awk '/^[[:space:]]*[0-9]+,[a-f0-9]+ \/buckets\// {sub(/^[[:space:]]*[0-9]+,[a-f0-9]+ /, ""); print}' | sort | uniq -c
```


```
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1421350
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1423214
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1662697
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1734089
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1981174
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1981175
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1981297
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1981298
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1981305
volume.fsck -verifyNeedles -findMissingChunksInFiler -volumeId 1981312

```
`
## How to identify files who's volume has been deleted (don't do that)
``` 
find . -type f -print0 | xargs -0 -P 8 -n 100 sh -c 'for file; do head -c 1 "$file" > /dev/null 2>&1; echo "$file"; done' sh
```
While also running the mount with this filter:
``` 
2>&1 | grep "resolve manifest chunks in name" | sed -u 's/.*name:"\([^"]*\)".*/\1/'

```


```
/mnt/buckets/media/Downloads/tv-sonarr

The.Boys.S01E01.The.Name.Of.The.Game.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv
The.Boys.S01E02.Cherry.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv
The.Boys.S01E03.Get.Some.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv
The.Boys.S01E04.The.Female.Of.The.Species.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv
The.Boys.S01E05.Good.For.The.Soul.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv



The.Boys.S01E06.The.Innocents.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv
Through.the.Wormhole.with.Morgan.Freeman.S02E01.1080p.AMZN.WEBRip.DD2.0.x264-TrollHD.mkv
Through.the.Wormhole.with.Morgan.Freeman.S02E02.1080p.AMZN.WEBRip.DD2.0.x264-TrollHD.mkv
Through.the.Wormhole.with.Morgan.Freeman.S02E03.1080p.AMZN.WEBRip.DD2.0.x264-TrollHD.mkv
Through.the.Wormhole.with.Morgan.Freeman.S02E07.1080p.AMZN.WEBRip.DD2.0.x264-TrollHD.mkv
Through.the.Wormhole.with.Morgan.Freeman.S02E08.1080p.AMZN.WEBRip.DD2.0.x264-TrollHD.mkv
Through.the.Wormhole.with.Morgan.Freeman.S02E09.1080p.AMZN.WEBRip.DD2.0.x264-TrollHD.mkv
```

Check what .dat files need to be rebuilt
``` 
for f in *.dat; do [ -f "$f" ] && base="${f%.dat}" && [ ! -f "$STORAGE_PATH/$base.idx" ] && echo "$f"; done

```
Rebuilds them
```
for f in *.dat; do [ -f "$f" ] && base="${f%.dat}" && [ ! -f "$STORAGE_PATH/$base.idx" ] && echo "Rebuilding $f..." && weed fix $f; done
```


# Rollback Plan
While most software running in the Curated Forest can be rolled back by just restoring a VM, with SeaweedFS, this will leave the data drives ahead of the index files. 

This will prevent the volume servers from starting until the indexes are rebuilt with
```
weed fix collection_####.dat
```