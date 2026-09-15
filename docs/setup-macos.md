# macOS development

Use the README commands. Docker data lives in named volumes; source and logs stay in this project. Services bind to 127.0.0.1. This does not expose the Mac to the LAN or internet.

The local agent runs as a normal foreground user process. Its identity is `.local/agent-state.json`, mode 0600. Stop that terminal with Control-C to stop the agent. There is no launchd installation or automatic persistence on this Mac.

Default local-agent safe directory: `.local/demo`. Host process names and executable metadata are read-only; command lines are disabled. Permission-restricted fields are unavailable. macOS kernel driver and event-log collectors return explicit unsupported errors.

Logs: `.local/api.log`, `.local/dashboard.log`, `.local/agent.log`. They are excluded from Git. Credentials: `python3 scripts/login-info.py`. Never paste `.env` into issues or commits.

A stopped API causes reconnect backoff; after the API returns, the agent resumes polling. A result that cannot be delivered is recollected under a new lease, up to three attempts.
