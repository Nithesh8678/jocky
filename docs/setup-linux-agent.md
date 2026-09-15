# Linux agent setup

Use an HTTPS server and a Linux binary from a successful GitHub Actions artifact `jocky-ubuntu-latest`, or compile locally: `cargo build --release -p jocky-agent`. GitHub's Ubuntu build is x86_64; for an ARM Linux agent compile on that architecture.

For a foreground test set `JOCKY_SERVER_URL`, `ENROLLMENT_TOKEN`, `JOCKY_AGENT_STATE`, and `JOCKY_SAFE_PATHS`, then run `./jocky-agent`. Credentials must have Unix mode 0600. The safe directory must exist.

For systemd:

1. Copy `infrastructure/installers/config.example.json` to a private `config.json` (never commit it).
2. Set your HTTPS URL and one-time enrollment token.
3. Run `sudo infrastructure/installers/install-linux.sh ./jocky-agent ./config.json`.
4. Inspect `systemctl status jocky-agent` and `journalctl -u jocky-agent -n 50 --no-pager`.
5. Remove the one-time enrollment token from `/etc/jocky/config.json` after successful enrollment.

The service uses an unprivileged `jocky` user and can write only its state directory. `ss` comes from iproute2; systemd and journald must be present for their collectors. Private logs and users' data can be inaccessible; errors are visible.

Commands: `sudo systemctl start jocky-agent`, `stop`, `restart`, `status`. Uninstall: `sudo infrastructure/installers/uninstall-linux.sh`. Data is retained. Disable the endpoint before discarding its identity.
