#!/usr/bin/env python3
"""Serve the reusable codebase walkthrough viewer for a target repository."""

from __future__ import annotations

import argparse
import html
import json
import mimetypes
import posixpath
import re
import subprocess
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlparse


SKILL_DIR = Path(__file__).resolve().parents[1]
VIEWER_DIR = SKILL_DIR / "viewer"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo_root", nargs="?", default=".", help="Target repository root. Defaults to the current directory.")
    parser.add_argument("--walkthrough-dir", default="docs/walkthrough", help="Walkthrough artifact directory inside the repo.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface. Defaults to 127.0.0.1.")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind. Use 0 for a free port.")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    walkthrough_dir = (repo_root / args.walkthrough_dir).resolve()
    if not repo_root.is_dir():
        raise SystemExit(f"Repository root does not exist: {repo_root}")
    if not walkthrough_dir.is_dir():
        raise SystemExit(f"Walkthrough directory does not exist: {walkthrough_dir}")
    if not (walkthrough_dir / "walkthrough.json").is_file():
        raise SystemExit(f"Missing walkthrough.json under: {walkthrough_dir}")
    if not VIEWER_DIR.is_dir():
        raise SystemExit(f"Viewer assets do not exist: {VIEWER_DIR}")

    context = build_context(repo_root, walkthrough_dir, args.walkthrough_dir)
    handler = make_handler(repo_root, walkthrough_dir, context)

    server = ThreadingHTTPServer((args.host, args.port), handler)
    host, port = server.server_address[:2]
    url = f"http://{host}:{port}/"
    print(f"Serving walkthrough viewer at {url}", flush=True)
    print(f"Target repository: {repo_root}", flush=True)
    print("Press Ctrl-C to stop.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()
    finally:
        server.server_close()
    return 0


def make_handler(repo_root: Path, walkthrough_dir: Path, context: dict[str, Any]) -> type[SimpleHTTPRequestHandler]:
    walkthrough = read_walkthrough_json(walkthrough_dir)

    class WalkthroughViewerHandler(SimpleHTTPRequestHandler):
        server_version = "WalkthroughViewer/1.0"

        def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
            parsed = urlparse(self.path)
            path = unquote(parsed.path)
            if path in {"", "/", "/index.html"}:
                self.serve_file(VIEWER_DIR / "index.html")
                return
            if path == "/api/context":
                self.serve_json(context)
                return
            if path == "/browse" or path.startswith("/browse/"):
                self.serve_repo_browse("" if path == "/browse" else path.removeprefix("/browse/"))
                return
            if path.startswith("/walkthrough/"):
                self.serve_scoped_file(walkthrough_dir, path.removeprefix("/walkthrough/"))
                return
            self.serve_scoped_file(VIEWER_DIR, path.removeprefix("/"))

        def serve_repo_browse(self, raw_rel_path: str) -> None:
            rel_path = safe_browse_path(raw_rel_path)
            if rel_path is None:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            target = (repo_root / rel_path).resolve()
            if not is_inside(target, repo_root):
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            if target.is_file():
                self.serve_file(target)
                return
            if not target.is_dir():
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            self.serve_text(directory_listing_html(repo_root, target), "text/html; charset=utf-8")

        def serve_scoped_file(self, root: Path, raw_rel_path: str) -> None:
            rel_path = safe_rel_path(raw_rel_path)
            if rel_path is None:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            target = (root / rel_path).resolve()
            if not is_inside(target, root) or not target.is_file():
                if root == walkthrough_dir:
                    placeholder = missing_feature_markdown(walkthrough, rel_path)
                    if placeholder:
                        self.serve_text(placeholder, "text/markdown; charset=utf-8")
                        return
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            self.serve_file(target)

        def serve_file(self, path: Path) -> None:
            try:
                content = path.read_bytes()
            except OSError:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            content_type = content_type_for(path)
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)

        def serve_text(self, text: str, content_type: str) -> None:
            content = text.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)

        def serve_json(self, payload: dict[str, Any]) -> None:
            content = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)

    return WalkthroughViewerHandler


def missing_feature_markdown(walkthrough: dict[str, Any], rel_path: Path) -> str | None:
    parts = rel_path.parts
    if len(parts) != 2 or parts[0] != "features" or rel_path.suffix != ".md":
        return None

    feature_id = rel_path.stem
    feature = find_feature(walkthrough, feature_id)
    if not feature:
        return None

    label = str(feature.get("label") or feature_id)
    description = str(feature.get("description") or "This feature walkthrough has not been generated yet.")
    escaped_id = html.escape(feature_id, quote=True)
    return "\n".join(
        [
            f"# {label}",
            "",
            description,
            "",
            "A focused walkthrough for this feature has not been generated yet. Copy the refresh prompt, use it with your assistant, then refresh this viewer.",
            "",
            f'<button class="prompt-button" type="button" data-feature-id="{escaped_id}">Copy refresh prompt</button>',
            f'<p class="prompt-status" data-feature-status="{escaped_id}" role="status" aria-live="polite"></p>',
            "",
        ]
    )


def find_feature(walkthrough: dict[str, Any], feature_id: str) -> dict[str, Any] | None:
    features = walkthrough.get("features")
    if not isinstance(features, list):
        return None
    for feature in features:
        if isinstance(feature, dict) and feature.get("id") == feature_id:
            return feature
    return None


def content_type_for(path: Path) -> str:
    if path.suffix == ".md":
        return "text/markdown; charset=utf-8"
    if path.suffix == ".json":
        return "application/json; charset=utf-8"
    if path.suffix in {".js", ".css", ".html"}:
        guessed = mimetypes.guess_type(path.name)[0] or "text/plain"
        return f"{guessed}; charset=utf-8"
    return mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def directory_listing_html(repo_root: Path, directory: Path) -> str:
    rel_path = directory.relative_to(repo_root)
    rel_label = "." if rel_path == Path(".") else rel_path.as_posix()
    entries = []
    if rel_path != Path("."):
        parent = rel_path.parent
        entries.append((browse_href(parent, True), "../"))
    try:
        children = sorted(directory.iterdir(), key=lambda path: (not path.is_dir(), path.name.lower()))
    except OSError:
        children = []
    for child in children:
        child_rel = child.relative_to(repo_root)
        is_dir = child.is_dir()
        name = child.name + ("/" if is_dir else "")
        entries.append((browse_href(child_rel, is_dir), name))

    rows = "\n".join(
        f'<li><a href="{html.escape(href, quote=True)}">{html.escape(name)}</a></li>'
        for href, name in entries
    )
    return "\n".join(
        [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1">',
            f"<title>{html.escape(rel_label)} - directory</title>",
            '<style>body{box-sizing:border-box;max-width:980px;margin:0 auto;padding:24px;font:15px/1.45 system-ui,sans-serif;color:#1d2420}a{color:#1f6f78;text-decoration:none}a:hover{text-decoration:underline}ul{list-style:none;padding:0}li{padding:4px 0;border-bottom:1px solid #edf0ed}code{overflow-wrap:anywhere}</style>',
            "</head>",
            "<body>",
            f"<h1>{html.escape(rel_label)}</h1>",
            f"<p><code>{html.escape(directory.as_posix())}</code></p>",
            f"<ul>{rows}</ul>",
            "</body>",
            "</html>",
            "",
        ]
    )


def browse_href(rel_path: Path, is_dir: bool) -> str:
    rel = "" if rel_path == Path(".") else rel_path.as_posix()
    suffix = "/" if is_dir and rel else ""
    return "/browse/" + quote(rel, safe="/") + suffix


def build_context(repo_root: Path, walkthrough_dir: Path, walkthrough_dir_arg: str) -> dict[str, Any]:
    walkthrough = read_walkthrough_json(walkthrough_dir)
    git_head = git_output(repo_root, "rev-parse", "HEAD")
    remotes = git_remotes(repo_root)
    primary_remote = choose_primary_remote(remotes)
    detected = detect_link_targets(primary_remote)
    return {
        "repo_root": repo_root.as_posix(),
        "walkthrough_dir": walkthrough_dir_arg,
        "source_revision": walkthrough.get("source_revision") or git_head or "unknown",
        "git_head": git_head or "unknown",
        "remotes": remotes,
        "primary_remote": primary_remote,
        "detected": detected,
    }


def read_walkthrough_json(walkthrough_dir: Path) -> dict[str, Any]:
    try:
        value = json.loads((walkthrough_dir / "walkthrough.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def git_output(repo_root: Path, *args: str) -> str:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=repo_root,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return ""
    return completed.stdout.strip()


def git_remotes(repo_root: Path) -> list[dict[str, str]]:
    output = git_output(repo_root, "remote", "-v")
    remotes: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for line in output.splitlines():
        parts = line.split()
        if len(parts) < 2:
            continue
        name, url = parts[0], parts[1]
        kind = parts[2].strip("()") if len(parts) > 2 else ""
        if kind and kind != "fetch":
            continue
        key = (name, url)
        if key in seen:
            continue
        seen.add(key)
        parsed = parse_remote_url(url)
        remotes.append({"name": name, "url": url, **parsed})
    return remotes


def choose_primary_remote(remotes: list[dict[str, str]]) -> dict[str, str] | None:
    if not remotes:
        return None
    for remote in remotes:
        if remote.get("name") == "origin":
            return remote
    return remotes[0]


def detect_link_targets(remote: dict[str, str] | None) -> dict[str, Any]:
    if not remote:
        return {}
    provider = remote.get("provider", "")
    host = remote.get("host", "")
    path = remote.get("path", "")
    base_url = remote.get("web_url", "")
    detected: dict[str, Any] = {}
    if provider == "github" and base_url:
        detected["github"] = {"base_url": base_url}
    if provider == "gitlab" and base_url:
        detected["gitlab"] = {"base_url": base_url}
    if host and path:
        detected["sourcegraph_repo"] = f"{host}/{path}"
    return detected


def parse_remote_url(url: str) -> dict[str, str]:
    cleaned = url.removesuffix(".git")
    host = ""
    path = ""

    parsed = urlparse(cleaned)
    if parsed.scheme in {"http", "https", "ssh"} and parsed.hostname and parsed.path:
        host = parsed.hostname
        path = parsed.path.strip("/")
    else:
        scp_match = re.match(r"^(?:[^@]+@)?([^:]+):(.+)$", cleaned)
        if scp_match and "/" in scp_match.group(2):
            host = scp_match.group(1)
            path = scp_match.group(2).strip("/")

    if not host or not path:
        return {}

    provider = ""
    if host.lower() == "github.com":
        provider = "github"
    elif "gitlab" in host.lower():
        provider = "gitlab"

    return {
        "host": host,
        "path": path,
        "provider": provider,
        "web_url": f"https://{host}/{path}",
    }


def safe_rel_path(raw_rel_path: str) -> Path | None:
    normalized = posixpath.normpath(raw_rel_path).lstrip("/")
    if normalized in {"", "."} or normalized.startswith("../") or "/../" in normalized:
        return None
    return Path(*normalized.split("/"))


def safe_browse_path(raw_rel_path: str) -> Path | None:
    normalized = posixpath.normpath(raw_rel_path).lstrip("/")
    if normalized in {"", "."}:
        return Path(".")
    if normalized.startswith("../") or "/../" in normalized:
        return None
    return Path(*normalized.split("/"))


def is_inside(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


if __name__ == "__main__":
    raise SystemExit(main())
