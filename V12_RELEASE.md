# Spectacle SOC v12 — Linux Essentials startup terminal

## What changed

The Network Diagnostics page now preloads a searchable, categorized **25-command Linux Essentials library** on page startup, based on the user-supplied screenshot. It adds a boot transcript, six defensive symptom-to-command workflows, clickable staging, synthetic read-only command previews, an exportable JSON catalog, and a contextual investigation guide. No operating-system commands are executed merely by opening the app.

The 25 entries are `systemctl`, `journalctl`, `dmesg`, `ss`, `ip`, `ping`, `tcpdump`, `df`, `du`, `lsblk`, `mount`, `fdisk`, `free`, `vmstat`, `lsof`, `uptime`, `useradd`, `usermod`, `passwd`, `chage`, `crontab`, `rsync`, `ssh`, `scp`, and `ufw`.

## Execution model and safety

- **Boot:** Command descriptions and guided workflows are loaded into the frontend. Loading does not trigger any process, raw packet, system scan, or model call.
- **Synthetic demonstrations:** Exact read-only templates produce visibly labeled, local sample output. They do not inspect the user's device or server. Linux commands are never dispatched to an unrestricted shell.
- **Live network diagnostics:** Unchanged, authenticated API supports `ping`, `dns`, `tcp`, and `udp` subject to server allowlists. Probes originate on the backend, not on the device running the browser. Live diagnostics are disabled by default.
- **Reference only:** Packet capture, disk management, credential/account management, remote shells/transfers and policy changes are blocked. Privileged live action requires a separately designed, explicitly approved operational tool.
- **Evidence:** Demo output is ineligible as original forensic evidence. The conclusion checker stays conservative, especially for silent UDP and compromise claims.
- **AI:** The supplied LoRA evaluation still reports NO-GO; the workflow guide is deterministic and is labeled as such. No Gemma inference or real-time vulnerability exploitation is claimed.

## Acceptance checks

- 20/20 existing frontend smoke checks pass (Chromium)
- 27/27 new Linux Essentials desktop/mobile browser checks pass
- 40/40 backend network diagnostics tests pass (loopback tests)
- 91/91 TCP release tests pass (90 scenarios and one count assertion)

Tests can overlap across the suites. No GPU inference, SIEM integration, privileged command execution, or external network penetration testing was conducted.

## Run

```sh
cd spectacle-soc
./run.sh
```

Open the app and select **Network terminal** in the sidebar. You can search all 25 commands, choose an investigation scenario, stage a command, preview a **synthetic** result, or export the command library. Live network probes require explicitly enabled backend diagnostics and allowlisted addresses/ports.

## Known limitations

The browser does not provide direct access to kernel logs, raw sockets, local disk partitions, remote user accounts, or the shell on a user's computer. A future host-agent connector could add authorized, audited read-only collection, but would require authentication, per-user consent, strict privilege boundaries, retention controls and case-specific authorization. Unrestricted terminal and exploit automation are intentionally outside this release.
