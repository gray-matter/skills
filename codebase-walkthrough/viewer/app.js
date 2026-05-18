(function () {
  "use strict";

  var mapUrl = "/walkthrough/walkthrough.json";
  var contextUrl = "/api/context";
  var state = {
    map: null,
    context: null
  };

  window.$docsify = {
    name: "Codebase Walkthrough",
    basePath: "/walkthrough/",
    homepage: "index.md",
    auto2top: true,
    maxLevel: 3,
    subMaxLevel: 2,
    externalLinkTarget: "_blank",
    externalLinkRel: "noreferrer",
    loadSidebar: false,
    plugins: [
      function (hook) {
        hook.beforeEach(function (content, next) {
          next(renderMissingFeaturePage(content));
        });
        hook.doneEach(function () {
          processSourceRefs(document);
        });
      }
    ]
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-feature-id]");
      if (!button) {
        return;
      }

      var feature = featureById(button.getAttribute("data-feature-id"));
      if (feature) {
        void copyPrompt(feature);
      }
    });
    void loadWalkthrough();
  });

  async function loadWalkthrough() {
    var panel = document.getElementById("walkthrough-panel");

    try {
      var results = await Promise.all([fetchJson(mapUrl), fetchJson(contextUrl)]);
      state.map = results[0];
      state.context = results[1];
      document.title = (state.map.project && state.map.project.name || "Codebase") + " Walkthrough";
      window.$docsify.name = state.map.project && state.map.project.name || window.$docsify.name;
      panel.innerHTML = renderPanel(state.map, state.context);
      processSourceRefs(document);
    } catch (error) {
      panel.innerHTML = [
        "<h1>Codebase Walkthrough</h1>",
        '<p class="prompt-note">Unable to load walkthrough files. Run the skill viewer server from the target repository.</p>'
      ].join("");
      console.error(error);
    }
  }

  function renderPanel(map, context) {
    var project = map.project || {};
    return [
      "<h1>" + escapeHtml(project.name || "Codebase Walkthrough") + "</h1>",
      project.summary ? '<p class="summary">' + escapeHtml(project.summary) + "</p>" : "",
      '<h2>Docs</h2>',
      '<a href="#/">Overview</a>',
      '<a href="#/architecture">Architecture</a>',
      '<a href="#/running">Running</a>',
      renderFeatures(map.features || []),
      renderApps(map.apps || []),
      renderMeta(map, context)
    ].join("");
  }

  function renderMeta(map, context) {
    var revision = map.source_revision || context.source_revision || context.git_head || "unknown";
    return [
      '<dl class="meta">',
      "<dt>Revision</dt><dd>" + escapeHtml(shortRevision(revision)) + "</dd>",
      "<dt>Generated</dt><dd>" + escapeHtml(formatDate(map.generated_at)) + "</dd>",
      "</dl>"
    ].join("");
  }

  function renderFeatures(features) {
    if (!features.length) {
      return '<h2>Features</h2><p class="empty">No feature candidates are listed.</p>';
    }

    return '<h2>Features</h2>' + features.map(function (feature) {
      return [
        '<section class="feature">',
        '<a class="feature-title" href="#/features/' + encodeURIComponent(feature.id || "") + '">' + escapeHtml(feature.label || feature.id || "Feature") + "</a>",
        feature.description ? '<p class="feature-description">' + escapeHtml(feature.description) + "</p>" : "",
        '<div class="badges">' + renderStatusBadge(feature.status || "candidate") + "</div>",
        "</section>"
      ].join("");
    }).join("");
  }

  function renderApps(apps) {
    if (!apps.length) {
      return "";
    }

    return '<h2>Apps</h2>' + apps.map(function (app) {
      var entrypoints = Array.isArray(app.entrypoints) ? app.entrypoints.filter(Boolean).join(", ") : "";
      return [
        '<p><strong>' + escapeHtml(app.name || app.id || "Unnamed app") + "</strong></p>",
        '<p class="meta-line">' + escapeHtml([app.kind, entrypoints].filter(Boolean).join(" - ")) + "</p>"
      ].join("");
    }).join("");
  }

  async function copyPrompt(feature) {
    var status = document.querySelector('[data-feature-status="' + cssEscape(feature.id || "") + '"]');
    var prompt = [
      "Use the codebase-walkthrough skill to generate or refresh the feature walkthrough for " + quote(feature.label || feature.id || "this feature") + ".",
      "Target file: " + (feature.doc || "docs/walkthrough/features/" + feature.id + ".md") + ".",
      "Use the existing docs/walkthrough/walkthrough.json entry as the starting point.",
      "Inspect only the source evidence needed for this feature and update walkthrough.json if evidence/status changes.",
      "Keep source references as repo-relative path:line text; the viewer resolves clickable links.",
      "After generation, tell me to refresh the skill-hosted viewer."
    ].join("\n");

    try {
      await navigator.clipboard.writeText(prompt);
      if (status) {
        status.textContent = "Prompt copied. Paste it into your assistant to generate this doc.";
      }
    } catch (_error) {
      if (status) {
        status.textContent = "Clipboard unavailable. Prompt was logged to the console.";
      }
      console.info(prompt);
    }
  }

  function renderMissingFeaturePage(content) {
    if (String(content || "").trim() !== "404") {
      return content;
    }

    var feature = currentFeature();
    if (!feature) {
      return content;
    }

    return [
      "# " + (feature.label || feature.id || "Feature"),
      "",
      feature.description || "This feature has not been generated yet.",
      "",
      "A focused walkthrough for this feature has not been generated yet. Use the button below to copy a narrow generation prompt.",
      "",
      '<button class="prompt-button" type="button" data-feature-id="' + escapeAttribute(feature.id || "") + '">Copy refresh prompt</button>',
      '<p class="prompt-status" data-feature-status="' + escapeAttribute(feature.id || "") + '" role="status" aria-live="polite"></p>',
      ""
    ].join("\n");
  }

  function currentFeature() {
    var match = String(window.location.hash || "").match(/^#\/features\/([^/?#]+)/);
    if (!match || !state.map || !Array.isArray(state.map.features)) {
      return null;
    }
    var id = safeDecode(match[1]);
    return featureById(id);
  }

  function featureById(id) {
    if (!state.map || !Array.isArray(state.map.features)) {
      return null;
    }
    return state.map.features.find(function (feature) {
      return feature.id === id;
    }) || null;
  }

  function processSourceRefs(root) {
    Array.prototype.forEach.call(root.querySelectorAll('a[href]:not([data-source-link-processed])'), function (link) {
      var ref = parseLegacySourceLink(link);
      if (!ref) {
        return;
      }
      link.setAttribute("data-source-link-processed", "true");
      applySourceLink(link, ref);
    });

    Array.prototype.forEach.call(root.querySelectorAll("code:not([data-source-ref-processed])"), function (code) {
      code.setAttribute("data-source-ref-processed", "true");
      if (code.closest("pre") || code.closest("a")) {
        return;
      }

      var ref = parseSourceRef(code.textContent);
      if (!ref) {
        return;
      }

      var link = document.createElement("a");
      code.parentNode.insertBefore(link, code);
      link.appendChild(code);
      applySourceLink(link, ref);
    });
  }

  function applySourceLink(link, ref) {
    var href = sourceHref(ref);
    link.classList.add("source-ref");
    link.setAttribute("data-source-path", ref.path);
    link.setAttribute("data-source-kind", ref.kind || "file");
    if (ref.line) {
      link.setAttribute("data-source-line", String(ref.line));
    }

    if (!href) {
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      return;
    }

    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
  }

  function parseSourceRef(value) {
    var text = String(value || "").trim();
    if (!text || text.indexOf(" ") !== -1 || text.indexOf("\\") !== -1 || text.indexOf("://") !== -1) {
      return null;
    }
    if (text.charAt(0) === "/" || text.charAt(0) === "#" || text.indexOf("..") !== -1) {
      return null;
    }

    var match = text.match(/^(.+?)(?::([1-9][0-9]*))?$/);
    if (!match) {
      return null;
    }

    var path = match[1].replace(/^\.\//, "");
    var line = match[2] ? Number(match[2]) : null;
    var kind = path.charAt(path.length - 1) === "/" ? "directory" : "file";
    if (!path || path.indexOf("/") === -1 && path.indexOf(".") === -1) {
      return null;
    }
    if (kind === "directory" && line) {
      return null;
    }
    if (!line && kind === "file" && path.indexOf("/") === -1) {
      return null;
    }

    return { path: path, line: line, kind: kind };
  }

  function parseLegacySourceLink(link) {
    var values = [link.getAttribute("href") || "", link.href || ""];
    for (var index = 0; index < values.length; index += 1) {
      var ref = parseLegacySourceHref(values[index]);
      if (ref) {
        return ref;
      }
    }
    return null;
  }

  function parseLegacySourceHref(value) {
    var text = safeDecode(value);
    var match = text.match(/(?:^|[#/])source\/(.+)\.html(?:\?id=l-(\d+)|#L-(\d+)|$)/i);
    if (!match) {
      return null;
    }
    var path = match[1];
    if (!path || path.indexOf("..") !== -1 || path.charAt(0) === "/") {
      return null;
    }
    return { path: path, line: match[2] || match[3] ? Number(match[2] || match[3]) : null, kind: "file" };
  }

  function sourceHref(ref) {
    var normalizedPath = normalizeRefPath(ref.path);
    var encodedPath = encodePath(normalizedPath);

    if (isDirectoryRef(ref)) {
      return "/browse/" + encodedPath + "/";
    }
    return "/browse/" + encodedPath + (ref.line ? "?line=" + encodeURIComponent(String(ref.line)) : "");
  }

  async function fetchJson(url) {
    var response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " for " + url);
    }
    return response.json();
  }

  function renderStatusBadge(value) {
    var slug = String(value || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
    return '<span class="badge status-badge is-' + escapeAttribute(slug) + '">' + escapeHtml(value) + "</span>";
  }

  function isDirectoryRef(ref) {
    return ref.kind === "directory" || String(ref.path || "").charAt(String(ref.path || "").length - 1) === "/";
  }

  function encodePath(path) {
    return String(path).split("/").map(encodeURIComponent).join("/");
  }

  function normalizeRefPath(path) {
    return String(path || "").replace(/\/+$/, "");
  }

  function safeDecode(value) {
    try {
      return decodeURIComponent(String(value || ""));
    } catch (_error) {
      return String(value || "");
    }
  }

  function formatDate(value) {
    if (!value) {
      return "unknown";
    }
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString().replace(".000Z", "Z");
  }

  function shortRevision(value) {
    var text = String(value || "");
    return /^[0-9a-f]{40}$/i.test(text) ? text.slice(0, 12) : text;
  }

  function quote(value) {
    return '"' + String(value).replace(/"/g, '\\"') + '"';
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/"/g, '\\"');
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
}());
