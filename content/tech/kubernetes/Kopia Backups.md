Flatpak doesn't work for getting files owned by root. Go for native packaging. 

Have to run after updates
``` 
sudo setcap cap_dac_read_search=+ep /opt/KopiaUI/resources/server/kopia
```
This allows kopia to read root files (without allowing write)

As a systemd unit:
```
sudo tee /etc/systemd/system/kopia-setcap.service << 'EOF'
[Unit]
Description=Set cap_dac_read_search on KopiaUI embedded kopia binary
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/setcap cap_dac_read_search=+ep /opt/KopiaUI/resources/server/kopia
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now kopia-setcap.service
```


Finally, add the autostart shortcut
```
tee ~/.config/autostart/kopia-ui.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=KopiaUI
Exec=/opt/KopiaUI/kopia-ui --gtk-version=3 --disable-gpu
Comment=Kopia Backup UI
Icon=kopia
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
```

The repo's prefix should be name/ - Note the slash. That keeps the s3 files bundled together.

Backup locations
- /home/spencer
- /etc
- /usr/local
- /var
- /opt


Have to use --gtk-version=3?