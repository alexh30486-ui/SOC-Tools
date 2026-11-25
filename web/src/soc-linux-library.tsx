/* Spectacle SOC Linux Essentials — defensively scoped command reference.
 * The 25 entries mirror the uploaded Linux command reference image.
 * Catalog entries are loaded at UI boot. NOTHING runs on startup.
 * Read-only examples use labeled synthetic output in the browser; state-changing,
 * privileged, packet capture and remote-access utilities are reference-only.
 * This is NOT a sandboxed shell or an autonomous exploit agent.
 */
type SOCLinuxCommand = {name:string;group:string;description:string;example:string;policy:'sample'|'restricted';why:string;output:string};
const SOC_LINUX_ESSENTIALS:SOCLinuxCommand[] = [
 {name:'systemctl',group:'Services',description:'Inspect services and systemd units',example:'systemctl status ssh --no-pager',policy:'sample',why:'Check whether an expected service is running before correlating other evidence.',output:'● ssh.service — OpenSSH server (SYNTHETIC)\n   Loaded: loaded\n   Active: active (running) [sample only]'},
 {name:'journalctl',group:'Logs',description:'Read systemd service and system logs',example:'journalctl -n 25 --no-pager',policy:'sample',why:'Review bounded service history for failures, reboots and authentication anomalies.',output:'Nov 23 07:42:12 demo-host systemd[1]: Started demo network service.\nNov 23 07:43:05 demo-host sshd[123]: [DEMO] Invalid user attempt (not a live event)'},
 {name:'dmesg',group:'Logs',description:'Inspect kernel diagnostics',example:'dmesg --level=err,warn',policy:'sample',why:'Look for kernel, network-driver and device warnings.',output:'[DEMO] kernel: eth0: transient link reset\n[DEMO] kernel: sample disk I/O warning'},
 {name:'ss',group:'Network',description:'Inspect listening ports and active sockets',example:'ss -tuna',policy:'sample',why:'Compare an observed connection against expected listeners; not proof of exploitation.',output:'Netid State  Local Address:Port Peer Address:Port\ntcp   LISTEN 127.0.0.1:8080     0.0.0.0:* [SYNTHETIC]'},
 {name:'ip',group:'Network',description:'Inspect network interfaces, addresses and routes',example:'ip -brief address',policy:'sample',why:'Verify local address assignment before network connectivity tests.',output:'lo        UNKNOWN  127.0.0.1/8\neth0      UP       192.0.2.10/24 [SYNTHETIC TEST-NET]'},
 {name:'ping',group:'Network',description:'Test ICMP echo reachability',example:'ping 127.0.0.1',policy:'sample',why:'A reply confirms ICMP reachability from the probe origin only. ICMP is not UDP.',output:'ICMP sample available from the Network Diagnostics engine.'},
 {name:'tcpdump',group:'Network',description:'Inspect captured network packet headers',example:'tcpdump -n -c 10',policy:'restricted',why:'Packet capture may expose private traffic and requires approved permissions; never launched automatically.',output:'Not executed: elevated packet capture needs a separately authorized host tool.'},
 {name:'df',group:'Storage',description:'Read filesystem disk usage',example:'df -h',policy:'sample',why:'Check whether storage exhaustion explains a service or ingest failure.',output:'Filesystem  Size Used Avail Use% Mounted on\n/dev/demo0  100G  42G  58G  42% / [SYNTHETIC]'},
 {name:'du',group:'Storage',description:'Measure directory space consumption',example:'du -sh /var/log',policy:'sample',why:'Investigate unexpectedly large log directories without deleting evidence.',output:'124M    /var/log [SYNTHETIC]'},
 {name:'lsblk',group:'Storage',description:'List disks, partitions and mountpoints',example:'lsblk -o NAME,SIZE,TYPE,MOUNTPOINT',policy:'sample',why:'Inspect block device layout; do not change partitions during triage.',output:'NAME   SIZE TYPE MOUNTPOINT\nvda    100G disk\n└─vda1 100G part / [SYNTHETIC]'},
 {name:'mount',group:'Storage',description:'Inspect or change filesystem mounts',example:'mount',policy:'sample',why:'This zero-argument reference only lists mounts; mounting a device is not permitted.',output:'/dev/demo0 on / type ext4 (rw,relatime) [SYNTHETIC]'},
 {name:'fdisk',group:'Storage',description:'Inspect or modify disk partition tables',example:'fdisk -l',policy:'restricted',why:'Partition-management tools can destroy evidence. Review only under an approved change.',output:'Not executed: privileged disk management is unavailable in the browser terminal.'},
 {name:'free',group:'Performance',description:'Inspect memory and swap usage',example:'free -h',policy:'sample',why:'Check memory pressure while investigating process crashes.',output:'              total    used    free\nMem:          16Gi     5Gi     11Gi [SYNTHETIC]'},
 {name:'vmstat',group:'Performance',description:'Inspect system activity and memory statistics',example:'vmstat 1 2',policy:'sample',why:'Correlate CPU wait, swapping and I/O pressure with observed service errors.',output:'procs --------memory------- ---cpu---\nr b swpd free buff cache us sy id wa\n1 0    0 10000 100  200   4  2 93  1 [SYNTHETIC]'},
 {name:'lsof',group:'Processes',description:'Inspect open files and network sockets',example:'lsof -nP -i',policy:'sample',why:'Relate process names to open sockets using authorized host evidence.',output:'COMMAND PID USER FD TYPE NAME\ndemo     42 demo 3u IPv4 TCP 127.0.0.1:8080 (LISTEN) [SYNTHETIC]'},
 {name:'uptime',group:'Performance',description:'Inspect boot time and load averages',example:'uptime',policy:'sample',why:'Distinguish a fresh restart from continuous process instability.',output:'07:54:00 up 4 days, 2 users, load average: 0.20, 0.14, 0.09 [SYNTHETIC]'},
 {name:'useradd',group:'Identity',description:'Create a new local user',example:'useradd --help',policy:'restricted',why:'Modifies identities; requires a separately approved change, never run by this console.',output:'Reference only. Account creation is disabled.'},
 {name:'usermod',group:'Identity',description:'Modify a user account or group membership',example:'usermod --help',policy:'restricted',why:'Can change privileges. Use approved identity-management workflows.',output:'Reference only. Account modification is disabled.'},
 {name:'passwd',group:'Identity',description:'Change local account passwords',example:'passwd --help',policy:'restricted',why:'Credential changes require authorization and must not be automated from findings.',output:'Reference only. Credential changes are disabled.'},
 {name:'chage',group:'Identity',description:'Inspect or modify password aging settings',example:'chage -l USER',policy:'restricted',why:'Password aging and identity metadata may be sensitive; manual approval required.',output:'Reference only. Password-aging changes are disabled.'},
 {name:'crontab',group:'Services',description:'Inspect or schedule recurring jobs',example:'crontab -l',policy:'sample',why:'Review scheduled tasks as possible persistence evidence without editing them.',output:'# No crontab for demo-user [SYNTHETIC]'},
 {name:'rsync',group:'Remote',description:'Synchronize files or directories',example:'rsync --dry-run -av SRC DEST',policy:'restricted',why:'File transfer can expose or overwrite evidence; not permitted in the browser terminal.',output:'Reference only. Data transfer is disabled.'},
 {name:'ssh',group:'Remote',description:'Open a secure remote terminal',example:'ssh -V',policy:'restricted',why:'No interactive remote shells or credential forwarding from this UI.',output:'Reference only. Remote shells are disabled.'},
 {name:'scp',group:'Remote',description:'Copy files securely via SSH',example:'scp SOURCE DEST',policy:'restricted',why:'Remote transfer requires a separately authorized workflow.',output:'Reference only. Remote copy is disabled.'},
 {name:'ufw',group:'Security',description:'Inspect or modify firewall rules',example:'ufw status',policy:'sample',why:'Read-only status example; changing firewall policy requires human approval.',output:'Status: active\n22/tcp ALLOW IN 192.0.2.0/24 [SYNTHETIC]'}
];
const SOC_LINUX_SCENARIOS:{id:string;label:string;hint:string;commands:string[]}[] = [
 {id:'network',label:'Network unreachable',hint:'Start with addresses, ICMP and listeners, then correlate firewall evidence.',commands:['ip','ping','ss','journalctl']},
 {id:'service',label:'Service keeps failing',hint:'Read service state and logs; correlate kernel and resource pressure.',commands:['systemctl','journalctl','dmesg','uptime']},
 {id:'identity',label:'Suspicious sign-ins',hint:'Review authentication logs and unexpected remote connections. Keep original event IDs.',commands:['journalctl','ss','lsof','crontab']},
 {id:'traffic',label:'Unexpected outbound traffic',hint:'Inspect network sockets and process ownership before escalation.',commands:['ss','lsof','ip','tcpdump']},
 {id:'storage',label:'Disk or ingest errors',hint:'Review filesystem pressure and block devices; do not modify partitions.',commands:['df','du','lsblk','dmesg']},
 {id:'vulnerability',label:'Potential vulnerable service',hint:'Inventory exposed services and preserve evidence. Do not infer exploitation from reachability.',commands:['ss','systemctl','journalctl','lsof']}
];
function socLinuxGet(name:string){return SOC_LINUX_ESSENTIALS.find(x=>x.name===name)}
function socLinuxSafeInput(cmd:string){return cmd.length<=150 && !/[;&|`$\\<>\n\r]/.test(cmd)}
function socLinuxDemo(cmd:string){
 const trimmed=cmd.trim();if(!socLinuxSafeInput(trimmed))return null;
 const item=SOC_LINUX_ESSENTIALS.find(x=>x.example===trimmed || x.name===trimmed);
 if(!item)return null;
 return item;
}
