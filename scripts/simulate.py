"""Harmless demo: temporary marker, benign child, loopback connection; auto cleanup."""

import argparse, contextlib, http.server, threading, subprocess, socket, tempfile, sys, time
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("--seconds", type=int, default=60)
args = p.parse_args()
if not 1 <= args.seconds <= 300:
    p.error("--seconds must be between 1 and 300")
root = Path(__file__).resolve().parents[1] / ".local/demo"
root.mkdir(parents=True, exist_ok=True)


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"JOCKY DEMO harmless local response")

    def log_message(self, *args):
        pass


with tempfile.TemporaryDirectory(prefix="JOCKY-DEMO-", dir=root) as tmp:
    marker = Path(tmp) / "jocky-demo.txt"
    marker.write_text("JOCKY DEMO\nHarmless forensic verification marker.\n")
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    child = subprocess.Popen(
        [sys.executable, "-c", f"import time; time.sleep({args.seconds})"]
    )
    connection = socket.create_connection(server.server_address)
    try:
        print(
            f"JOCKY DEMO: marker at {marker}\nBenign child PID: {child.pid}\nLoopback port: {server.server_address[1]}\nAutomatic cleanup in {args.seconds}s.",
            flush=True,
        )
        time.sleep(args.seconds)
    except KeyboardInterrupt:
        pass
    finally:
        connection.close()
        server.shutdown()
        server.server_close()
        if child.poll() is None:
            child.terminate()
        child.wait(timeout=5)
print("JOCKY DEMO cleanup complete. No persistence was created.")
