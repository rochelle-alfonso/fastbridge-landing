#!/usr/bin/env python3
"""Static file server WITH HTTP Range (206) support.

Python's stock `http.server` ignores the `Range:` header and always returns the
full file with a 200. Safari refuses to play a <video> unless the server answers
range requests with `206 Partial Content`, so the stock server makes the HIW
videos silently fail to load in Safari. This handler adds range support.

Usage: python3 tools/serve.py [port]   (default 9294)
"""
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        rng = self.headers.get("Range")
        if rng is None:
            return super().send_head()

        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()

        m = re.match(r"bytes=(\d*)-(\d*)", rng.strip())
        if not m:
            return super().send_head()

        size = os.path.getsize(path)
        start_s, end_s = m.group(1), m.group(2)
        if start_s == "":  # suffix range: last N bytes
            length = int(end_s)
            start = max(0, size - length)
            end = size - 1
        else:
            start = int(start_s)
            end = int(end_s) if end_s else size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", "bytes */%d" % size)
            self.end_headers()
            return None

        length = end - start + 1
        f = open(path, "rb")
        f.seek(start)
        self.send_response(206)
        ctype = self.guess_type(path)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(length))
        self.end_headers()
        # Hand back a capped reader so copyfile sends exactly `length` bytes.
        return _Capped(f, length)


class _Capped:
    """File wrapper that reports EOF after `remaining` bytes (for copyfile)."""

    def __init__(self, f, remaining):
        self.f = f
        self.remaining = remaining

    def read(self, n=-1):
        if self.remaining <= 0:
            return b""
        if n < 0 or n > self.remaining:
            n = self.remaining
        data = self.f.read(n)
        self.remaining -= len(data)
        return data

    def close(self):
        self.f.close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9294
    os.chdir(os.path.join(os.path.dirname(__file__), ".."))
    httpd = ThreadingHTTPServer(("", port), RangeHandler)
    print("Range-capable server on http://localhost:%d  (Ctrl-C to stop)" % port)
    httpd.serve_forever()
