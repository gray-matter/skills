#!/usr/bin/env python3
"""Serve the reusable codebase walkthrough viewer for a target repository."""

from __future__ import annotations

import argparse
import html
import json
import mimetypes
import posixpath
import subprocess
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote, unquote, urlparse


SKILL_DIR = Path(__file__).resolve().parents[1]
VIEWER_DIR = SKILL_DIR / "viewer"
SOURCE_LANGUAGE_BY_SUFFIX = {
    ".bash": "bash",
    ".c": "c",
    ".cc": "cpp",
    ".cjs": "javascript",
    ".cpp": "cpp",
    ".cs": "csharp",
    ".css": "css",
    ".go": "go",
    ".h": "c",
    ".hpp": "cpp",
    ".htm": "markup",
    ".html": "markup",
    ".java": "java",
    ".js": "javascript",
    ".json": "json",
    ".jsx": "jsx",
    ".mjs": "javascript",
    ".md": "markdown",
    ".mdx": "markdown",
    ".mk": "makefile",
    ".php": "php",
    ".py": "python",
    ".rb": "ruby",
    ".rs": "rust",
    ".sh": "bash",
    ".sql": "sql",
    ".svg": "markup",
    ".toml": "toml",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".xml": "markup",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".zsh": "bash",
}
SOURCE_LANGUAGE_BY_NAME = {
    ".dockerignore": "docker",
    "containerfile": "docker",
    "dockerfile": "docker",
    "makefile": "makefile",
}


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
                self.serve_repo_browse(parsed.path, "" if path == "/browse" else path.removeprefix("/browse/"), parsed.query)
                return
            if path.startswith("/walkthrough/"):
                self.serve_scoped_file(walkthrough_dir, path.removeprefix("/walkthrough/"))
                return
            self.serve_scoped_file(VIEWER_DIR, path.removeprefix("/"))

        def serve_repo_browse(self, request_path: str, raw_rel_path: str, query: str = "") -> None:
            rel_path = safe_browse_path(raw_rel_path)
            if rel_path is None:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            target = (repo_root / rel_path).resolve()
            if not is_inside(target, repo_root):
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            if target.is_file():
                self.serve_source_file(rel_path, target, line_from_query(query))
                return
            if not target.is_dir():
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            if not request_path.endswith("/"):
                self.send_response(HTTPStatus.MOVED_PERMANENTLY)
                self.send_header("Location", request_path + "/")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self.serve_directory(target)

        def serve_source_file(self, rel_path: Path, target: Path, line: int | None) -> None:
            try:
                content = target.read_bytes()
            except OSError:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            if is_binary_content(content):
                self.serve_text(source_message_html(rel_path, "This file is binary and cannot be displayed as source."), "text/html; charset=utf-8", HTTPStatus.UNSUPPORTED_MEDIA_TYPE)
                return
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                text = content.decode("utf-8", errors="replace")
            self.serve_text(source_file_html(rel_path, text, line), "text/html; charset=utf-8")

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

        def serve_directory(self, path: Path) -> None:
            listing = self.list_directory(str(path))
            if listing is None:
                return
            try:
                self.copyfile(listing, self.wfile)
            finally:
                listing.close()

        def serve_text(self, text: str, content_type: str, status: HTTPStatus = HTTPStatus.OK) -> None:
            content = text.encode("utf-8")
            self.send_response(status)
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


def source_file_html(rel_path: Path, text: str, line: int | None) -> str:
    rel_label = rel_path.as_posix()
    language = source_language(rel_path)
    language_class = f"language-{language}" if language else "language-none"
    escaped_label = html.escape(rel_label)
    escaped_code = html.escape(text)
    data_line = f' data-line="{line}"' if line else ""
    line_hash = f"#L{line}" if line else ""
    return "\n".join(
        [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1">',
            f"<title>{escaped_label} - source</title>",
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/themes/prism.min.css">',
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/plugins/line-numbers/prism-line-numbers.min.css">',
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/plugins/line-highlight/prism-line-highlight.min.css">',
            '<style>body{box-sizing:border-box;min-width:320px;margin:0;background:#f7f8f6;color:#1d2420;font:14px/1.45 system-ui,sans-serif}.source-header{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;border-bottom:1px solid #d8ddd7;background:#fff;padding:12px 16px}.source-header a{color:#1f6f78;text-decoration:none}.source-header a:hover{text-decoration:underline}.source-path{overflow-wrap:anywhere;font-weight:700}main{padding:16px}pre[class*=language-]{margin:0;overflow:auto;border:1px solid #d8ddd7;border-radius:6px;background:#fff;font-size:13px;line-height:1.5}pre.line-numbers{padding-left:3.8em}.line-highlight{background:rgba(255,218,95,.35)}</style>',
            "</head>",
            "<body>",
            '<header class="source-header">',
            f'<a href="{html.escape(browse_href(rel_path.parent, True), quote=True)}">Parent</a>',
            f'<span class="source-path">{escaped_label}</span>',
            "</header>",
            "<main>",
            f'<pre class="line-numbers {language_class}"{data_line}><code class="{language_class}">{escaped_code}</code></pre>',
            "</main>",
            '<script>window.Prism=window.Prism||{};Prism.manual=false;</script>',
            '<script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/prism.min.js"></script>',
            '<script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/plugins/autoloader/prism-autoloader.min.js"></script>',
            '<script>Prism.plugins.autoloader.languages_path="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/components/";</script>',
            '<script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/plugins/line-numbers/prism-line-numbers.min.js"></script>',
            '<script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/plugins/line-highlight/prism-line-highlight.min.js"></script>',
            f'<script>window.addEventListener("load",function(){{if("{line_hash}"){{var el=document.querySelector(".line-highlight");if(el){{el.scrollIntoView({{block:"center"}});}}}}}});</script>',
            "</body>",
            "</html>",
            "",
        ]
    )


def source_message_html(rel_path: Path, message: str) -> str:
    rel_label = rel_path.as_posix()
    return "\n".join(
        [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1">',
            f"<title>{html.escape(rel_label)} - source</title>",
            '<style>body{box-sizing:border-box;max-width:980px;margin:0 auto;padding:24px;font:15px/1.45 system-ui,sans-serif;color:#1d2420}a{color:#1f6f78;text-decoration:none}a:hover{text-decoration:underline}code{overflow-wrap:anywhere}</style>',
            "</head>",
            "<body>",
            f"<h1>{html.escape(rel_label)}</h1>",
            f"<p>{html.escape(message)}</p>",
            f'<p><a href="{html.escape(browse_href(rel_path.parent, True), quote=True)}">Back to parent directory</a></p>',
            "</body>",
            "</html>",
            "",
        ]
    )


def source_language(rel_path: Path) -> str:
    name = rel_path.name.lower()
    if name in SOURCE_LANGUAGE_BY_NAME:
        return SOURCE_LANGUAGE_BY_NAME[name]
    return SOURCE_LANGUAGE_BY_SUFFIX.get(rel_path.suffix.lower(), "")


def line_from_query(query: str) -> int | None:
    value = parse_qs(query).get("line", [""])[0]
    if not value.isdigit():
        return None
    line = int(value)
    return line if line > 0 else None


def is_binary_content(content: bytes) -> bool:
    sample = content[:4096]
    return b"\0" in sample


def browse_href(rel_path: Path, is_dir: bool) -> str:
    rel = "" if rel_path == Path(".") else rel_path.as_posix()
    suffix = "/" if is_dir and rel else ""
    return "/browse/" + quote(rel, safe="/") + suffix


def build_context(repo_root: Path, walkthrough_dir: Path, walkthrough_dir_arg: str) -> dict[str, Any]:
    walkthrough = read_walkthrough_json(walkthrough_dir)
    git_head = git_output(repo_root, "rev-parse", "HEAD")
    return {
        "repo_root": repo_root.as_posix(),
        "walkthrough_dir": walkthrough_dir_arg,
        "source_revision": walkthrough.get("source_revision") or git_head or "unknown",
        "git_head": git_head or "unknown",
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
