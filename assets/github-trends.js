"use strict";

const DATA_URL = "github-trends/data/latest.json";
const SAMPLE_URL = "github-trends/data/sample.json";
const LAST_SUCCESS_KEY = "dola.githubTrends.lastSuccess";
const TOPIC_LABELS = {
  ai: "AI",
  "ai-agents": "AI Agents",
  "ai-agent": "AI Agent",
  agent: "Agent",
  agents: "Agents",
  automation: "Automation",
  "claude-code": "Claude Code",
  cli: "CLI",
  codex: "Codex",
  database: "Database",
  "deep-learning": "Deep Learning",
  "developer-tools": "Developer Tools",
  go: "Go",
  golang: "Go",
  html: "HTML",
  javascript: "JavaScript",
  llm: "LLM",
  "machine-learning": "Machine Learning",
  mcp: "MCP",
  openai: "OpenAI",
  "open-source": "Open Source",
  python: "Python",
  react: "React",
  rust: "Rust",
  shell: "Shell",
  typescript: "TypeScript",
};

const state = {
  range: "24h",
  language: "all",
  topic: "all",
  data: null,
  loading: false,
};

const elements = {
  dateline: document.querySelector("#data-dateline"),
  feedback: document.querySelector("#trend-feedback"),
  content: document.querySelector("#trend-content"),
  sampleNote: document.querySelector("#sample-note"),
  language: document.querySelector("#language-filter"),
  topic: document.querySelector("#topic-filter"),
  clear: document.querySelector("#clear-filters"),
  metrics: document.querySelector("#overview-metrics"),
  summary: document.querySelector("#overview-summary"),
  topicList: document.querySelector("#topic-list"),
  repoList: document.querySelector("#repo-list"),
  rankingNote: document.querySelector("#ranking-note"),
};

function currentWindow() {
  return state.data?.windows?.[state.range] ?? {
    repositories: [],
    topics: [],
  };
}

function normalizeText(value) {
  return String(value || "").trim();
}

function formatTopicName(value) {
  const name = normalizeText(value);
  return TOPIC_LABELS[name] || name;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "待建立";
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatDate(value) {
  if (!value) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function isStale(value) {
  const timestamp = new Date(value || "");
  if (Number.isNaN(timestamp.getTime())) return true;
  return Date.now() - timestamp.getTime() > 30 * 60 * 60 * 1000;
}

function clearNode(node) {
  node.replaceChildren();
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function repositories() {
  const repos = currentWindow().repositories || [];
  return repos.filter((repo) => {
    const languageMatch = state.language === "all" || repo.language === state.language;
    const topics = Array.isArray(repo.topics) ? repo.topics : [];
    const topicMatch = state.topic === "all" || topics.includes(state.topic);
    return languageMatch && topicMatch;
  });
}

function topics(filteredRepos) {
  const buckets = new Map();
  for (const repo of filteredRepos) {
    for (const name of repo.topics || ["uncategorized"]) {
      if (state.topic !== "all" && name !== state.topic) continue;
      const bucket = buckets.get(name) || {
        name,
        repo_count: 0,
        star_gain: null,
        complete: 0,
        repos: [],
      };
      bucket.repo_count += 1;
      bucket.repos.push(repo);
      if (Number.isFinite(repo.star_gain)) {
        bucket.complete += 1;
        bucket.star_gain = (bucket.star_gain || 0) + repo.star_gain;
      }
      buckets.set(name, bucket);
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      name: bucket.name,
      repo_count: bucket.repo_count,
      star_gain: bucket.complete ? bucket.star_gain : null,
      representative_repos: bucket.repos
        .slice()
        .sort((a, b) => {
          const aGain = Number.isFinite(a.star_gain) ? a.star_gain : -1;
          const bGain = Number.isFinite(b.star_gain) ? b.star_gain : -1;
          return bGain - aGain || (b.stars || 0) - (a.stars || 0);
        })
        .slice(0, 3)
        .map((repo) => repo.full_name),
    }))
    .sort((a, b) => {
      const aGain = Number.isFinite(a.star_gain) ? a.star_gain : -1;
      const bGain = Number.isFinite(b.star_gain) ? b.star_gain : -1;
      return bGain - aGain || b.repo_count - a.repo_count;
    });
}

function updateFilterOptions() {
  const repos = currentWindow().repositories || [];
  const languages = [...new Set(repos.map((repo) => repo.language).filter(Boolean))].sort();
  const activeTopic = state.topic;
  state.topic = "all";
  const topicNames = topics(repos).slice(0, 12).map((topic) => topic.name);
  state.topic = activeTopic;

  elements.language.replaceChildren(new Option("全部语言", "all"));
  for (const language of languages) {
    elements.language.add(new Option(language, language));
  }
  if (!languages.includes(state.language)) state.language = "all";
  elements.language.value = state.language;

  elements.topic.replaceChildren(new Option("全部主题", "all"));
  for (const topic of topicNames) {
    elements.topic.add(new Option(formatTopicName(topic), topic));
  }
  if (!topicNames.includes(state.topic)) state.topic = "all";
  elements.topic.value = state.topic;
}

function renderMetrics(filteredRepos) {
  clearNode(elements.metrics);
  const gain = filteredRepos.reduce((sum, repo) => {
    return sum + (Number.isFinite(repo.star_gain) ? repo.star_gain : 0);
  }, 0);
  const complete = filteredRepos.filter((repo) => Number.isFinite(repo.star_gain)).length;
  const values = [
    ["样本仓库", formatNumber(filteredRepos.length)],
    ["有完整对比", formatNumber(complete)],
    ["Star 净增量", complete ? `+${formatNumber(gain)}` : "待建立"],
  ];

  for (const [label, value] of values) {
    const card = make("div", "metric");
    card.append(make("span", "metric-label", label), make("strong", "metric-value", value));
    elements.metrics.append(card);
  }

  if (!complete && !currentWindow().baseline_ready) {
    elements.summary.textContent =
      "当前已保存第一份基线快照。要计算真实增长速度，需要等待下一次快照；页面不会把 Star 总量冒充近期增长。";
  } else if (!complete) {
    elements.summary.textContent =
      "当前筛选没有包含完整对比的仓库。清除筛选或切换时间范围后再看增长速度。";
  } else {
    const rangeLabel = state.range === "24h" ? "过去 24 小时" : "过去 7 天";
    elements.summary.textContent =
      `${rangeLabel}，当前筛选样本共记录到 ${formatNumber(gain)} 个新增 Star。` +
      "这些数字反映关注变化，不代表使用规模或项目质量。";
  }
}

function renderTopics(filteredTopics) {
  clearNode(elements.topicList);
  if (!filteredTopics.length) {
    elements.topicList.append(make("div", "repo-observation", "当前筛选下没有足够的主题样本。"));
    return;
  }

  for (const topic of filteredTopics.slice(0, 8)) {
    const card = make("article", "topic-card");
    const head = make("div", "topic-head");
    head.append(
      make("h3", "", formatTopicName(topic.name)),
      make("span", "topic-gain", Number.isFinite(topic.star_gain) ? `+${formatNumber(topic.star_gain)} Star` : "建立基线"),
    );
    card.append(head);

    const detail = Number.isFinite(topic.star_gain)
      ? `${formatNumber(topic.repo_count || 0)} 个样本仓库，本窗口合计新增 ${formatNumber(topic.star_gain)} Star。`
      : `${formatNumber(topic.repo_count || 0)} 个样本仓库；等待后续快照形成增速。`;
    card.append(make("p", "", detail));

    if (Array.isArray(topic.representative_repos) && topic.representative_repos.length) {
      card.append(make("p", "repo-meta", `代表项目：${topic.representative_repos.join("、")}`));
    }
    elements.topicList.append(card);
  }
}

function renderRepos(filteredRepos) {
  clearNode(elements.repoList);
  const ranked = [...filteredRepos];
  const complete = ranked.some((repo) => Number.isFinite(repo.star_gain));

  if (complete) {
    ranked.sort((a, b) => {
      const aGain = Number.isFinite(a.star_gain) ? a.star_gain : -1;
      const bGain = Number.isFinite(b.star_gain) ? b.star_gain : -1;
      return bGain - aGain;
    });
    elements.rankingNote.textContent = "按同窗口 Star 净增量排序；总量只作为背景信息显示。";
  } else if (!currentWindow().baseline_ready) {
    ranked.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    elements.rankingNote.textContent =
      "当前只有基线快照，先显示样本仓库的 Star 总量；下一份快照到达后才生成真正的增速榜。";
  } else {
    ranked.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    elements.rankingNote.textContent =
      "当前筛选没有包含完整对比的仓库；清除筛选或切换时间范围后再看增速。";
  }

  if (!ranked.length) {
    const empty = make("div", "repo-observation", "当前时间范围和筛选条件下没有仓库。");
    elements.repoList.append(empty);
    return;
  }

  ranked.slice(0, 20).forEach((repo, index) => {
    const card = make("article", "repo-card");
    card.append(make("span", "repo-rank", complete ? `#${index + 1}` : "观测"));

    const body = make("div");
    const head = make("div", "repo-head");
    const title = make("h3");
    const link = make("a", "", repo.full_name);
    link.href = repo.url;
    link.rel = "noopener noreferrer";
    title.append(link);
    head.append(title);
    body.append(head);

    if (repo.why || repo.description) {
      body.append(make("p", "", repo.why || repo.description));
    }

    const meta = make("div", "repo-meta");
    meta.append(make("span", "", `Star 总量 ${formatNumber(repo.stars)}`));
    if (Number.isFinite(repo.star_gain)) {
      meta.append(make("span", "", `本窗口 +${formatNumber(repo.star_gain)}`));
    } else {
      meta.append(make("span", "", "增长待建立"));
    }
    if (repo.language) meta.append(make("span", "", repo.language));
    if (repo.updated_at) meta.append(make("span", "", `更新于 ${formatDate(repo.updated_at)}`));
    body.append(meta);

    const foot = make("div", "repo-foot");
    const repoLink = make("a", "", "打开 GitHub 仓库");
    repoLink.href = repo.url;
    repoLink.rel = "noopener noreferrer";
    foot.append(repoLink);
    body.append(foot);
    card.append(body);
    elements.repoList.append(card);
  });
}

function renderData() {
  const filteredRepos = repositories();
  const filteredTopics = topics(filteredRepos);
  const hasFilters = state.language !== "all" || state.topic !== "all";
  elements.clear.hidden = !hasFilters;

  elements.sampleNote.hidden = !state.data?.is_sample;
  elements.content.hidden = false;
  renderMetrics(filteredRepos);
  renderTopics(filteredTopics);
  renderRepos(filteredRepos);

  if (!filteredRepos.length && hasFilters) {
    elements.feedback.className = "trend-feedback";
    elements.feedback.replaceChildren();
    const stateBox = make("div", "empty-state");
    stateBox.append(
      make("strong", "", "没有符合当前筛选的仓库。"),
      document.createElement("br"),
      make("span", "", "可以清除语言或主题筛选，再看当前时间窗的数据。"),
    );
    elements.feedback.append(stateBox);
  } else {
    elements.feedback.replaceChildren();
  }
}

function showLoading() {
  state.loading = true;
  elements.content.hidden = true;
  elements.feedback.className = "trend-feedback";
  elements.feedback.textContent = "正在读取最近一次快照……";
}

function showError(message) {
  state.loading = false;
  elements.content.hidden = true;
  elements.feedback.className = "trend-feedback";
  const box = make("div", "error-state");
  box.append(make("strong", "", "数据暂时不可用。"), document.createElement("br"));
  box.append(make("span", "", message));
  const retry = make("button", "text-button", "重新读取");
  retry.type = "button";
  retry.addEventListener("click", () => loadData());
  box.append(document.createElement("br"), retry);
  elements.feedback.replaceChildren(box);
}

function showEmpty() {
  state.loading = false;
  elements.content.hidden = true;
  elements.feedback.className = "trend-feedback";
  const box = make("div", "empty-state");
  box.append(
    make("strong", "", "还没有可发布的趋势快照。"),
    document.createElement("br"),
    make("span", "", "Mac 完成首次采集后会显示基线数据，第二份快照到达后才生成增长速度。"),
  );
  elements.feedback.replaceChildren(box);
  elements.dateline.textContent = "尚未收到有效数据 · 采集与排序不调用模型";
}

async function loadData() {
  showLoading();
  const preview = new URLSearchParams(location.search).get("preview") === "sample";
  const url = preview ? SAMPLE_URL : DATA_URL;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 404) {
      showEmpty();
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    state.data = data;
    state.loading = false;
    state.range = data.windows?.["24h"] ? "24h" : "7d";

    for (const button of document.querySelectorAll("[data-range]")) {
      button.setAttribute("aria-pressed", String(button.dataset.range === state.range));
    }
    updateFilterOptions();

    const stale = isStale(data.data_through);
    elements.dateline.classList.toggle("is-stale", stale);
    elements.dateline.textContent =
      `数据截至 ${formatDate(data.data_through)}（Asia/Shanghai）` +
      (stale ? " · 数据可能滞后" : "") +
      " · 自动采集，编辑复核";

    if (!preview) localStorage.setItem(LAST_SUCCESS_KEY, data.data_through || data.generated_at || "");
    renderData();
  } catch (error) {
    const lastSuccess = localStorage.getItem(LAST_SUCCESS_KEY);
    const detail = lastSuccess
      ? `最近一次成功数据时间：${formatDate(lastSuccess)}。本次没有覆盖旧数据。`
      : "未读取到数据文件，请检查采集任务和路径。";
    showError(`${detail}（${normalizeText(error.message)}）`);
  }
}

for (const button of document.querySelectorAll("[data-range]")) {
  button.addEventListener("click", () => {
    state.range = button.dataset.range;
    for (const peer of document.querySelectorAll("[data-range]")) {
      peer.setAttribute("aria-pressed", String(peer === button));
    }
    if (state.data) {
      updateFilterOptions();
      renderData();
    }
  });
}

elements.language.addEventListener("change", () => {
  state.language = elements.language.value;
  renderData();
});

elements.topic.addEventListener("change", () => {
  state.topic = elements.topic.value;
  renderData();
});

elements.clear.addEventListener("click", () => {
  state.language = "all";
  state.topic = "all";
  elements.language.value = "all";
  elements.topic.value = "all";
  renderData();
});

loadData();
