(function () {
  "use strict";

  var mapUrl = "/walkthrough/walkthrough.json";
  var contextUrl = "/api/context";
  var storageKey = "codebase-walkthrough.sourceLinkConfig";
  var sourceModes = [
    { value: "github", label: "GitHub", optionLabel: "GitHub permalink", detectedField: "github" },
    { value: "gitlab", label: "GitLab", optionLabel: "GitLab permalink", detectedField: "gitlab" },
    { value: "sourcegraph", label: "Sourcegraph", optionLabel: "Sourcegraph", detectedField: "sourcegraph_repo" },
    { value: "cursor", label: "Cursor", optionLabel: "Cursor", localEditor: true },
    { value: "vscode", label: "VSCode", optionLabel: "VSCode", localEditor: true },
    { value: "plain", label: "plain text", optionLabel: "Plain text" }
  ];
  var sourceLinkFields = [
    { name: "baseUrl", label: "Repository base URL", modes: ["github", "gitlab"], placeholder: "https://github.com/org/repo" },
    { name: "revision", label: "Revision", modes: ["github", "gitlab", "sourcegraph"], placeholder: "commit, tag, or branch" },
    { name: "sourcegraphBaseUrl", label: "Sourcegraph URL", modes: ["sourcegraph"], defaultValue: "https://sourcegraph.com" },
    { name: "sourcegraphRepo", label: "Sourcegraph repo", modes: ["sourcegraph"], placeholder: "github.com/org/repo" },
    { name: "localRoot", label: "Local repo root", modes: ["vscode", "cursor"] }
  ];
  var state = {
    map: null,
    context: null,
    config: loadStoredConfig()
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
      if (state.config && state.config.repoRoot && state.config.repoRoot !== state.context.repo_root) {
        state.config = null;
      }
      state.config = normalizeConfig(state.config || inferConfig(state.context));
      persistConfig(state.config);
      document.title = (state.map.project && state.map.project.name || "Codebase") + " Walkthrough";
      window.$docsify.name = state.map.project && state.map.project.name || window.$docsify.name;
      panel.innerHTML = renderPanel(state.map, state.context, state.config);
      bindPanel();
      processSourceRefs(document);
    } catch (error) {
      panel.innerHTML = [
        "<h1>Codebase Walkthrough</h1>",
        '<p class="prompt-note">Unable to load walkthrough files. Run the skill viewer server from the target repository.</p>'
      ].join("");
      console.error(error);
    }
  }

  function renderPanel(map, context, config) {
    var project = map.project || {};
    return [
      "<h1>" + escapeHtml(project.name || "Codebase Walkthrough") + "</h1>",
      project.summary ? '<p class="summary">' + escapeHtml(project.summary) + "</p>" : "",
      renderSourceLinkForm(config, context),
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
      context.primary_remote ? "<dt>Remote</dt><dd>" + escapeHtml(context.primary_remote.url) + "</dd>" : "",
      "</dl>"
    ].join("");
  }

  function renderSourceLinkForm(config, context) {
    var detected = context.detected || {};
    return [
      '<h2 class="source-link-heading">Source Links</h2>',
      '<form class="source-link-form" id="source-link-form">',
      '<label>Source',
      '<select name="mode">',
      sourceModes.map(function (mode) {
        return renderModeOption(mode, config.mode, detected);
      }).join(""),
      "</select>",
      "</label>",
      sourceLinkFields.map(function (field) {
        return renderSourceLinkField(config, field);
      }).join(""),
      '<button type="submit">Apply</button>',
      '<p class="source-link-status" id="source-link-status">' + escapeHtml(sourceLinkSummary(config)) + "</p>",
      "</form>"
    ].join("");
  }

  function renderModeOption(mode, selected, detected) {
    var label = mode.optionLabel || mode.label;
    if (mode.detectedField && detected[mode.detectedField]) {
      label += " (detected)";
    }
    return option(mode.value, label, selected);
  }

  function renderSourceLinkField(config, field) {
    return [
      '<label data-source-field="' + escapeAttribute(field.name) + '" data-source-modes="' + escapeAttribute(field.modes.join(" ")) + '"' + hiddenUnless(config.mode, field.modes) + ">",
      escapeHtml(field.label),
      '<input name="' + escapeAttribute(field.name) + '" value="' + escapeAttribute(configValue(config, field)) + '"' + renderOptionalAttribute("placeholder", field.placeholder) + ">",
      "</label>"
    ].join("");
  }

  function configValue(config, field) {
    return config[field.name] || field.defaultValue || "";
  }

  function renderOptionalAttribute(name, value) {
    return value ? ' ' + name + '="' + escapeAttribute(value) + '"' : "";
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

  function bindPanel() {
    var form = document.getElementById("source-link-form");
    if (form) {
      var select = form.elements.mode;
      if (select) {
        select.addEventListener("change", function () {
          updateSourceLinkFields(form, select.value);
        });
        updateSourceLinkFields(form, select.value);
      }
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        state.config = normalizeConfig(formConfig(form));
        persistConfig(state.config);
        window.location.reload();
      });
    }
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
    if (!state.config) {
      return;
    }

    Array.prototype.forEach.call(root.querySelectorAll('a[href]:not([data-source-link-processed])'), function (link) {
      var ref = parseLegacySourceLink(link);
      if (!ref) {
        return;
      }
      link.setAttribute("data-source-link-processed", "true");
      applySourceLink(link, ref, state.config);
    });

    if (state.config.mode === "plain") {
      return;
    }

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
      applySourceLink(link, ref, state.config);
    });
  }

  function applySourceLink(link, ref, config) {
    var href = sourceHref(ref, config);
    link.classList.add("source-ref");
    link.setAttribute("data-source-path", ref.path);
    link.setAttribute("data-source-kind", ref.kind || "file");
    if (ref.line) {
      link.setAttribute("data-source-line", String(ref.line));
    }

    if (!href || config.mode === "plain") {
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      return;
    }

    link.href = href;
    if (isLocalEditorMode(config.mode) && !isDirectoryRef(ref)) {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    } else {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
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

  function sourceHref(ref, config) {
    var normalizedPath = normalizeRefPath(ref.path);
    var encodedPath = encodePath(normalizedPath);
    var line = ref.line ? String(ref.line) : "";
    var revision = config.revision || "HEAD";
    var isDirectory = isDirectoryRef(ref);

    if (config.mode === "github" && config.baseUrl) {
      return trimSlash(config.baseUrl) + "/" + (isDirectory ? "tree" : "blob") + "/" + encodeURIComponent(revision) + "/" + encodedPath + (!isDirectory && line ? "#L" + line : "");
    }
    if (config.mode === "gitlab" && config.baseUrl) {
      return trimSlash(config.baseUrl) + "/-/" + (isDirectory ? "tree" : "blob") + "/" + encodeURIComponent(revision) + "/" + encodedPath + (!isDirectory && line ? "#L" + line : "");
    }
    if (config.mode === "sourcegraph" && config.sourcegraphRepo) {
      return trimSlash(config.sourcegraphBaseUrl || "https://sourcegraph.com") + "/" + encodeSourcegraphRepo(config.sourcegraphRepo, revision) + "/-/" + (isDirectory ? "tree" : "blob") + "/" + encodedPath + (!isDirectory && line ? "?L" + line : "");
    }
    if (isDirectory && isLocalEditorMode(config.mode) && config.localRoot) {
      return "/browse/" + encodedPath + "/";
    }
    if (isLocalEditorMode(config.mode) && config.localRoot) {
      return config.mode + "://file/" + encodeURI(joinPath(config.localRoot, normalizedPath).replace(/^\/+/, "")) + (!isDirectory && line ? ":" + line : "");
    }
    return "";
  }

  function inferConfig(context) {
    var detected = context.detected || {};
    var revision = context.source_revision || context.git_head || "HEAD";
    var config = {
      mode: "vscode",
      baseUrl: "",
      revision: revision,
      sourcegraphBaseUrl: "https://sourcegraph.com",
      sourcegraphRepo: detected.sourcegraph_repo || "",
      localRoot: context.repo_root || "",
      repoRoot: context.repo_root || ""
    };
    if (detected.github) {
      config.mode = "github";
      config.baseUrl = detected.github.base_url || "";
      return config;
    }
    if (detected.gitlab) {
      config.mode = "gitlab";
      config.baseUrl = detected.gitlab.base_url || "";
      return config;
    }
    return config;
  }

  function normalizeConfig(config) {
    var inferred = inferConfig(state.context || {});
    var mode = normalizeMode(config.mode, inferred.mode || "plain");
    return {
      mode: mode,
      baseUrl: config.baseUrl || inferred.baseUrl || "",
      revision: config.revision || inferred.revision || "HEAD",
      sourcegraphBaseUrl: config.sourcegraphBaseUrl || inferred.sourcegraphBaseUrl || "https://sourcegraph.com",
      sourcegraphRepo: config.sourcegraphRepo || inferred.sourcegraphRepo || "",
      localRoot: config.localRoot || inferred.localRoot || "",
      repoRoot: inferred.repoRoot || ""
    };
  }

  function formConfig(form) {
    var data = new FormData(form);
    return {
      mode: String(data.get("mode") || "plain"),
      baseUrl: String(data.get("baseUrl") || ""),
      revision: String(data.get("revision") || ""),
      sourcegraphBaseUrl: String(data.get("sourcegraphBaseUrl") || ""),
      sourcegraphRepo: String(data.get("sourcegraphRepo") || ""),
      localRoot: String(data.get("localRoot") || "")
    };
  }

  function updateSourceLinkFields(form, mode) {
    Array.prototype.forEach.call(form.querySelectorAll("[data-source-modes]"), function (field) {
      var modes = String(field.getAttribute("data-source-modes") || "").split(/\s+/);
      field.hidden = modes.indexOf(mode) === -1;
    });
    var status = form.querySelector("#source-link-status");
    if (status) {
      status.textContent = sourceLinkSummary(normalizeConfig(formConfig(form)));
    }
  }

  function loadStoredConfig() {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "null");
    } catch (_error) {
      return null;
    }
  }

  function persistConfig(config) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(config));
    } catch (_error) {
      return;
    }
  }

  async function fetchJson(url) {
    var response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " for " + url);
    }
    return response.json();
  }

  function sourceLinkSummary(config) {
    if (config.mode === "plain") {
      return "Source references are shown as plain path:line text.";
    }
    if (isLocalEditorMode(config.mode)) {
      return "Files open in " + sourceModeLabel(config.mode) + "; directories open in the browser from the configured local root.";
    }
    if (config.mode === "sourcegraph") {
      return "Source references open in Sourcegraph for the configured repo.";
    }
    return "Source references open as " + sourceModeLabel(config.mode) + " permalinks pinned to the configured revision.";
  }

  function normalizeMode(mode, fallback) {
    var value = String(mode || "");
    if (isKnownMode(value)) {
      return value;
    }
    return isKnownMode(fallback) ? fallback : "plain";
  }

  function isKnownMode(mode) {
    return Boolean(sourceModeByValue(mode));
  }

  function sourceModeLabel(mode) {
    var sourceMode = sourceModeByValue(mode);
    if (sourceMode) {
      return sourceMode.label;
    }
    return mode || "plain text";
  }

  function sourceModeByValue(value) {
    return sourceModes.find(function (mode) {
      return mode.value === value;
    }) || null;
  }

  function option(value, label, selected) {
    return '<option value="' + escapeAttribute(value) + '"' + (value === selected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
  }

  function hiddenUnless(mode, modes) {
    return modes.indexOf(mode) === -1 ? " hidden" : "";
  }

  function renderStatusBadge(value) {
    var slug = String(value || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
    return '<span class="badge status-badge is-' + escapeAttribute(slug) + '">' + escapeHtml(value) + "</span>";
  }

  function isLocalEditorMode(mode) {
    var sourceMode = sourceModeByValue(mode);
    return Boolean(sourceMode && sourceMode.localEditor);
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

  function encodeSourcegraphRepo(repo, revision) {
    return String(repo).split("/").map(encodeURIComponent).join("/") + "@" + encodeURIComponent(revision || "HEAD");
  }

  function joinPath(root, path) {
    return trimSlash(root) + "/" + String(path).replace(/^\/+/, "");
  }

  function trimSlash(value) {
    return String(value || "").replace(/\/+$/, "");
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
