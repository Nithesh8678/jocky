# AWS demo deployment

## Verified account status on 15 September 2026

The AWS console showed an active **Free plan**, **$100 credit remaining**, and **29 days remaining on the plan**. The credit row lists an expiry of 13 April 2027, but that does not extend the Free plan. AWS says access ends when the Free plan period ends or credits are exhausted, whichever comes first. Do not upgrade to the Paid plan as part of this deployment.

## Prepared configuration — not launched

| Setting | Draft value |
| --- | --- |
| Name | `jocky-lab` |
| Region | Mumbai (`ap-south-1`) |
| OS | Canonical Ubuntu Server 24.04 LTS, x86-64 |
| VM | `m7i-flex.large`, 2 vCPUs, 8 GiB RAM |
| Disk | 30 GiB gp3, 3,000 IOPS, 125 MiB/s; encrypted with AWS-managed EBS key |
| Website | `jocky-lab.duckdns.org` |
| Public ports | TCP 80 and 443 |
| Administration | TCP 22 restricted to the administrator's current IP; dedicated SSH key required |
| Metadata | IMDSv2 required, response hop limit 1; no IAM instance profile |
| AI | Disabled |

The console allows this VM on the Free plan. Its displayed Linux price is **$0.10075/hour**, approximately **$70.12 for 29 days of continuous operation**. Public IPv4 is normally $0.005/hour (approximately $3.48 over 29 days); disk and any chargeable transfer are additional. Free allowances can reduce usage. These are credit-consumption estimates, not a guaranteed total or an approval to upgrade billing. See [AWS IPv4 pricing](https://aws.amazon.com/vpc/pricing/) and [EBS pricing](https://aws.amazon.com/ebs/pricing/).

8 GiB is an initial engineering choice for the combined stack and source builds; cloud resource usage has not yet been measured. The lower-cost `t3.medium` was disabled in this account's Free plan selector.

## Launch and installation

1. Review the draft and approve creation of the dedicated SSH key and public web access before launch. Keep the private key on the administrator's machine, outside Git.
2. Recheck the SSH source IP. Browser proxy/VPN addresses can differ from the IP used by a terminal. Use a verified administrator IP, never `0.0.0.0/0` for SSH.
3. Use `infrastructure/deployment/aws-bootstrap.sh` as EC2 user data. It installs Docker from its official apt repository and prepares `/opt/jocky`. It contains no credentials and does not deploy the application. Follow [Docker's Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/) when updating this script.
4. After launch, wait for EC2 status checks. Connect as `ubuntu`, run `sudo cloud-init status --wait`, and check `sudo docker compose version`. Inspect `/var/log/cloud-init-output.log` if preparation failed.
5. Transfer only reviewed tracked source to `/opt/jocky` over SSH, or use a separately authorized private repository login. Never transfer the Mac's `.env`, local evidence, agent identity, or database as a deployment side effect.
6. Generate fresh secrets with `python3 scripts/configure.py`; set `JOCKY_PUBLIC_URL=https://jocky-lab.duckdns.org` and `JOCKY_DOMAIN=jocky-lab.duckdns.org` in the server's private `.env`.
7. Change the DuckDNS record to the instance's actual public IP. The earlier automatically populated address is not the cloud server. An automatically assigned EC2 public IP can change after stop/start, requiring a DNS update.
8. From `/opt/jocky`, run `sudo docker compose -f compose.yaml -f infrastructure/deployment/compose.cloud.yaml up --build -d`. Build sequentially if memory becomes constrained.
9. Verify `sudo docker compose ps`, `curl -f http://127.0.0.1:58000/health`, and trusted HTTPS from an external browser. Sign in and then follow [the two-PC acceptance workflow](demo.md).

## How to know what is working

- EC2 says Running and passes status checks: the virtual computer is available.
- Docker containers are running and the API health endpoint succeeds: the backend has started.
- The hostname opens with trusted HTTPS: DNS, firewall and certificates work.
- Each Windows PC appears online, completes its own scan, and returns evidence: the cross-machine workflow works.

These are separate checks; none is a substitute for the next. At this checkpoint, the VM, trusted public HTTPS and two-PC test remain pending. Bootstrap validation is shell syntax only, not a completed Ubuntu run.

Before the Free plan ends, export evidence and database backups to a location you control. Stopping a VM stops compute usage but retained disks still use storage; terminating this draft's VM deletes its root disk. Do not use termination as a substitute for a backup. Check the live plan and credit status before any later session.
