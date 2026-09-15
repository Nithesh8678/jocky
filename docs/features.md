# Feature and limitation matrix

This matrix describes implemented behavior, not a claim that every feature in PROJECT_BRIEF.md is complete.

| Area | Implemented | Remaining / limitation |
|---|---|---|
| Backend | REST, PostgreSQL schema, Redis events/rate limit, S3 evidence | Enterprise HA, retention, advanced monitoring |
| Auth | Argon2, JWT, rotating refresh, roles, org scoping | MFA, fine-grained grants, access-token immediate revocation |
| Agent | Rust, enrollment, heartbeat, HMAC jobs, reconnect, leases | Production signing, full credential rotation, durable offline result spool |
| OS support | macOS live tested; Windows/Linux code and CI builds | Owner's two Windows-PC service and fleet acceptance |
| System/process | Real metadata, PID, parent, user, start time where available | Binary hashing/signatures on process collection, hardware trust |
| Network | Windows TCP, macOS TCP, Linux TCP/UDP inventory, PID where available | UDP on Windows/macOS, historical packet/event monitoring |
| Files | Explicit bounded paths, immediate files, metadata/SHA-256/search/recent filter | Whole-file evidence acquisition UI, nominal File/Hash types, recursive opt-in |
| Windows | Services, scheduled tasks, accessible Run keys, drivers, bounded System logs | Software inventory, full startup folder coverage, signature/version validation |
| Linux | systemd unit files, cron directory inventory, /proc/modules, journald | Per-user cron and shell startup content, auth log parsing |
| Detection | Native exact predicates, IOC matching, deduplication, explained score | Broad rule syntax, temporal correlation, calibrated risk model |
| Driver audit | Name-based low-confidence review watchlist | Maintained hash/version database; no confirmed-vulnerability claim from name |
| Language | Lexer/parser/AST, variables, lists/functions/loops/logic, safe interpreter | Nominal static forensic types, find syntax, complete formatter layout |
| Playground | Local Monaco, highlighting, completions, validation/AST/tokens, remote Run | Inline diagnostics, richer editor UX |
| Compiler Lab | Pretty/compact AST serialization hashes + structural equality | Native compilation, semantic-preserving code transformations, LLVM |
| Timeline/graph | Collection timeline, process-parent/network graph from one job | Zoom/time windows, user/file/persistence correlation; graph renders max 180 nodes |
| Cases/evidence | Attachments, notes/status, reports, original JSON results, custody/verify | True WORM custody, signed exports, sophisticated assignment workflows |
| Sigma | Store/validate metadata, exact selection subset | Modifiers/complex conditions are stored disabled |
| YARA | Optional API scan of selected evidence with timeout | Not installed by default; runtime path needs YARA-installed validation |
| AI | Ollama/OpenAI-compatible provider interface, reference validation, manual script review | Provider-live QA until configured; semantic truth cannot be guaranteed |
| UI | All 15 destinations connected to real API data/actions | Some lists capped at 500, role controls mostly rejected at API rather than hidden |
| Reporting | Escaped case HTML, browser Print to PDF | Dedicated generated PDF renderer and formal report layout QA |
| Deployment | Docker Compose, non-root apps, Caddy HTTPS, service installers | Public deployment awaits cloud account, instance, domain and owner approval at access changes |

Default seed only creates the admin, organization, roles, version and one rule. Demo incidents are created explicitly. The demo script detects JOCKY itself and must not be mistaken for real compromise.
