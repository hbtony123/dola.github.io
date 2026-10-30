"use strict";

const INDEX_URL = "github-trends/daily/index.json";

const els = {
  kicker: document.querySelector("#hero-kicker"),
  dateline: document.querySelector("#data-dateline"),
  dispatch: document.querySelector("#dispatch"),
  back: document.querySelector("#dispatch-back"),
  backButton: document.querySelector("#back-latest"),
  archive: document.querySelector("#archive-list"),
};

const state = {
  entries: [],
  current: null,
};

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatDate(value) {
  const [year, month, day] = String(value || "").split("-");
  if (!year || !month || !day) return value || "";
  return `${Number(year)} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

function sortEntries(entries) {
  return entries
    .filter((entry) => entry && entry.date && entry.title)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function requestedDate() {
  return new URLSearchParams(location.search).get("d") || "";
}

function renderEntry(entry, options = {}) {
  const fragment = document.createDocumentFragment();

  const meta = make("p", "dispatch-meta");
  meta.append(make("time", "", formatDate(entry.date)));
  if (entry.date) meta.lastChild.setAttribute("datetime", entry.date);
  if (Number.isFinite(entry.issue)) {
    meta.append(make("span", "issue", `第 ${entry.issue} 期`));
  }
  if (Number.isFinite(entry.reading_time)) {
    meta.append(make("span", "", `约 ${entry.reading_time} 分钟`));
  }
  fragment.append(meta);

  fragment.append(make("h2", "dispatch-title", entry.title));

  if (entry.lede) fragment.append(make("p", "dispatch-lede", entry.lede));

  if (Array.isArray(entry.sections) && entry.sections.length) {
    const body = make("div", "dispatch-body");
    for (const section of entry.sections) {
      const block = make("section", "dispatch-section");
      if (section.heading) block.append(make("h3", "", section.heading));
      for (const paragraph of section.paragraphs || []) {
        if (paragraph) block.append(make("p", "", paragraph));
      }
      body.append(block);
    }
    fragment.append(body);
  }

  const evidence = entry.evidence;
  if (evidence && Array.isArray(evidence.rows) && evidence.rows.length) {
    const box = make("aside", "dispatch-evidence");
    const head = make("div", "evidence-head");
    head.append(make("h3", "", evidence.label || "当天的数字"));
    if (evidence.window) head.append(make("p", "", evidence.window));
    box.append(head);

    const list = make("ol", "evidence-list");
    evidence.rows.forEach((row, index) => {
      const item = make("li", "evidence-row");
      item.append(make("span", "evidence-rank", String(index + 1).padStart(2, "0")));

      const main = make("span", "evidence-main");
      const link = make("a", "evidence-repo", row.repo);
      link.href = row.url || `https://github.com/${row.repo}`;
      link.rel = "noopener noreferrer";
      link.target = "_blank";
      main.append(link);
      if (row.note) main.append(make("span", "evidence-note", row.note));
      item.append(main);

      const gain = Number.isFinite(row.gain) ? `+${formatNumber(row.gain)}` : "";
      item.append(make("span", "evidence-gain", gain));
      list.append(item);
    });
    box.append(list);

    if (evidence.total_note) {
      box.append(make("p", "evidence-total", evidence.total_note));
    }
    fragment.append(box);
  }

  if (entry.watch) {
    const watch = make("aside", "dispatch-watch");
    watch.append(make("h3", "", "明天看什么"), make("p", "", entry.watch));
    fragment.append(watch);
  }

  const foot = make("footer", "dispatch-foot");
  if (Array.isArray(entry.sources) && entry.sources.length) {
    const line = make("p", "");
    line.append(document.createTextNode("参考："));
    entry.sources.forEach((source, index) => {
      if (index > 0) line.append(document.createTextNode(" · "));
      const link = make("a", "", source.label || source.url);
      link.href = source.url;
      link.rel = "noopener noreferrer";
      link.target = "_blank";
      line.append(link);
    });
    foot.append(line);
  }
  foot.append(
    make(
      "p",
      "",
      entry.footnote ||
        "口径：Star 增量来自 GitHub 公开 API 相邻快照的差值，只反映关注变化，不代表项目质量或使用人数。"
    )
  );
  fragment.append(foot);

  els.dispatch.replaceChildren(fragment);
  els.dispatch.classList.remove("is-error");
  els.dispatch.hidden = false;
  document.title = `${entry.title} — Dola · GitHub 热点观察`;

  if (entry.evidence && entry.evidence.window) {
    els.dateline.replaceChildren();
    els.dateline.append(
      document.createTextNode("本期数据："),
      make("strong", "", entry.evidence.window),
      document.createTextNode("（Asia/Shanghai） · 每天 08:45 更新")
    );
  }

  if (options.scroll) {
    els.dispatch.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderArchive() {
  els.archive.replaceChildren();
  if (!state.entries.length) {
    els.archive.append(make("li", "archive-empty", "还没有往期。"));
    return;
  }

  for (const entry of state.entries) {
    const item = make("li");
    const button = make("button", "archive-item");
    button.type = "button";
    button.setAttribute("aria-current", String(entry.date === state.current.date));

    const dateLabel = String(entry.date).slice(5).replace("-", " / ");
    button.append(make("span", "archive-date", dateLabel));

    const text = make("span", "archive-text");
    text.append(make("span", "archive-title", entry.title));
    if (entry.lede) text.append(make("span", "archive-snippet", entry.lede));
    button.append(text);

    button.addEventListener("click", () => selectEntry(entry.date, true));
    item.append(button);
    els.archive.append(item);
  }
}

function selectEntry(date, scroll) {
  const entry =
    state.entries.find((candidate) => candidate.date === date) || state.entries[0];
  if (!entry) return;
  state.current = entry;

  if (scroll) {
    const url = new URL(location.href);
    url.searchParams.set("d", entry.date);
    history.replaceState(null, "", url);
  }
  renderEntry(entry, { scroll });
  renderArchive();
  const isLatest = entry === state.entries[0];
  els.back.hidden = isLatest;
}

function showError(message) {
  const box = make("div", "");
  box.append(make("p", "dispatch-status", "今天的观察暂时读不到。"));
  box.append(make("p", "dispatch-status", message));
  els.dispatch.replaceChildren(box);
  els.dispatch.classList.add("is-error");
  els.dispatch.hidden = false;
  els.dateline.textContent = "读取失败 · 页面稍后会自动重试一次";
}

async function loadIndex(attempt = 1) {
  try {
    const response = await fetch(INDEX_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const entries = sortEntries(Array.isArray(payload) ? payload : payload.entries || []);
    if (!entries.length) throw new Error("empty index");

    state.entries = entries;
    els.kicker.textContent = `GITHUB · 每日观察 · 第 ${entries[0].issue || entries.length} 期`;
    selectEntry(requestedDate() || entries[0].date, false);
    els.back.hidden = state.current === entries[0];
  } catch (error) {
    if (attempt === 1) {
      setTimeout(() => loadIndex(2), 1500);
      return;
    }
    showError(`${error.message || "未知错误"}。旧的一期不受影响，刷新页面可以重试。`);
  }
}

els.backButton.addEventListener("click", () => {
  if (!state.entries.length) return;
  const url = new URL(location.href);
  url.searchParams.delete("d");
  history.replaceState(null, "", url);
  selectEntry(state.entries[0].date, true);
});

loadIndex();
