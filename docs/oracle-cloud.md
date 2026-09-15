# Oracle Cloud Free Tier assessment

Checked 15 September 2026. **Suitable in principle for the two-Windows-PC prototype; deployment and tenancy capacity are not yet verified.**

## Current facts

Oracle's current Always Free documentation lists A1 at **2 OCPUs / 12 GB RAM**, 200 GB combined boot/block storage, and possible idle-instance reclamation. Always Free compute is tied to the tenancy home region. Older 4-OCPU/24-GB guides conflict with the current documentation. Check the Console's Always Free eligibility and limits before provisioning.

Source: [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

Provisioning can fail with an out-of-host-capacity error; available capacity must be checked in the account. Source: [Oracle Free Tier FAQ](https://www.oracle.com/cloud/free/faq/).

## Proposed JOCKY configuration (engineering recommendation)

| Choice | Proposed value |
|---|---|
| Compute | One VM.Standard.A1.Flex, 2 OCPUs, 12 GB RAM |
| OS | Always Free-eligible Ubuntu ARM image |
| Initial disk | 100 GB boot volume, leaving allowance for other storage |
| Application | Docker Compose: dashboard, API, PostgreSQL, Redis, MinIO, Caddy |
| Public ports | 443 HTTPS, 80 for certificate provisioning; SSH restricted to your administrator IP |
| Agent connectivity | Windows agents call HTTPS outbound; no PC inbound forwarding |
| AI | Disabled initially; CPU-only model hosting needs a separate performance check |
| Backups | Encrypted database + evidence copies outside the live VM |

The capacity judgment is an estimate for occasional bounded scans on two PCs, not a fleet load-test result. An ARM backend does not require ARM Windows PCs: each agent is compiled for its own architecture and communicates over JSON/HTTPS.

### Local measurement

The ARM Docker stack on the Mac was healthy on 15 September 2026. A single idle `docker stats --no-stream` sample reported API 94.98 MiB, dashboard 46.52 MiB, PostgreSQL 41.28 MiB, Redis 10.35 MiB, and MinIO 235.8 MiB: **428.93 MiB total**. This excludes Docker/OS overhead, Caddy, source-build peaks and sustained scan load. It supports trying the 12 GB VM; it does not establish an Oracle performance guarantee.

JOCKY uses PostgreSQL inside the VM. Oracle's Autonomous Database is a different database product and is not a drop-in substitute for this schema.

## What you need to do in Oracle

1. Create/sign in to your Oracle Cloud account yourself. Complete identity/payment verification and contractual acceptance privately.
2. Before choosing a home region, inspect the signup options and choose a suitable nearby region. Do not assume a specific India region currently has free A1 capacity.
3. In Console, inspect **Limits, Quotas and Usage**, then try the Always Free A1 configuration above. Confirm free eligibility and the cost estimate on the final review screen.
4. If capacity is unavailable, do not switch to paid resources accidentally. Record the exact error and wait or choose an explicitly budgeted alternative.
5. Retain your SSH private key on your Mac. Share only the instance public IP and your intended domain with the assistant; never paste private keys or passwords.
6. Follow deployment.md to deploy with fresh cloud secrets, then follow the two-PC acceptance test.

## No cloud changes made

This assessment did not create an Oracle account, enter payment details, provision a VM, open security rules, upload endpoint evidence, or publish the dashboard. Those actions depend on your account and an available instance.
