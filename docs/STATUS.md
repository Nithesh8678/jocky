# JOCKY verification status

Work in progress. The final acceptance test requires two real Windows PCs.

## Boundaries

- Read-only, bounded forensic collectors. No remote shell, evasion, injection, or security-product changes.
- Synthetic fixtures are labelled demo, never counted as real endpoint verification.
- Host observations, evidence, credentials, databases and build artifacts are excluded from Git.
- AI stays disabled unless a provider is explicitly configured.

## Verification log

- Initial environment: empty Git repository; Rust absent; Docker installed; GitHub CLI authentication needs verification outside sandbox.
