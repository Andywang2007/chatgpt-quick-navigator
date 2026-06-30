(function () {
  "use strict";

  if (window.__chatQuickNavigatorLoaded) return;
  window.__chatQuickNavigatorLoaded = true;

  const helpers = globalThis.ChatQuickNavHelpers;
  const ROOT_ID = "cqn-root";
  const USER_MESSAGE_SELECTOR = '[data-message-author-role="user"]';
  const STORAGE_KEY = "chatQuickNavigatorCollapsed";

  let entries = [];
  let activeIndex = -1;
  let signature = "";
  let refreshTimer = null;
  let scrollFrame = null;

  const root = document.createElement("aside");
  root.id = ROOT_ID;
  root.setAttribute("aria-label", "ChatGPT 快速导航");
  root.innerHTML = `
    <button class="cqn-toggle" type="button" title="展开对话目录" aria-label="展开对话目录">☰</button>
    <section class="cqn-panel">
      <header class="cqn-header">
        <div>
          <strong>对话目录</strong>
          <span class="cqn-count">0 个问题</span>
        </div>
        <button class="cqn-collapse" type="button" title="收起目录" aria-label="收起目录">×</button>
      </header>
      <div class="cqn-search-wrap">
        <input class="cqn-search" type="search" placeholder="搜索本次对话" aria-label="搜索本次对话">
      </div>
      <nav class="cqn-list" aria-label="问题列表"></nav>
      <p class="cqn-empty">当前页面还没有可导航的问题</p>
      <footer class="cqn-footer">
        <button class="cqn-previous" type="button" title="快捷键：Alt + ↑">↑ 上一问</button>
        <button class="cqn-next" type="button" title="快捷键：Alt + ↓">下一问 ↓</button>
      </footer>
    </section>
  `;
  document.documentElement.appendChild(root);

  const elements = {
    toggle: root.querySelector(".cqn-toggle"),
    collapse: root.querySelector(".cqn-collapse"),
    count: root.querySelector(".cqn-count"),
    search: root.querySelector(".cqn-search"),
    list: root.querySelector(".cqn-list"),
    empty: root.querySelector(".cqn-empty"),
    previous: root.querySelector(".cqn-previous"),
    next: root.querySelector(".cqn-next")
  };

  function setCollapsed(collapsed, persist) {
    root.classList.toggle("cqn-collapsed", collapsed);
    elements.toggle.setAttribute("aria-label", collapsed ? "展开对话目录" : "收起对话目录");
    elements.toggle.title = collapsed ? "展开对话目录" : "收起对话目录";

    if (persist && chrome?.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: collapsed });
    }
  }

  function getScrollTarget(roleNode) {
    return (
      roleNode.closest('[data-testid^="conversation-turn-"]') ||
      roleNode.closest("article") ||
      roleNode
    );
  }

  function collectEntries() {
    const seen = new Set();
    const nextEntries = [];

    document.querySelectorAll(USER_MESSAGE_SELECTOR).forEach((roleNode) => {
      const target = getScrollTarget(roleNode);
      if (seen.has(target)) return;
      seen.add(target);

      const fullText = helpers.normalizeText(roleNode.textContent);
      nextEntries.push({
        target,
        fullText,
        title: helpers.shortenTitle(fullText, 96)
      });
    });

    return nextEntries;
  }

  function makeSignature(nextEntries) {
    return nextEntries.map((entry, index) => `${index}:${entry.fullText}`).join("\u0001");
  }

  function renderList() {
    const query = helpers.normalizeText(elements.search.value).toLocaleLowerCase();
    const fragment = document.createDocumentFragment();
    let visibleCount = 0;

    entries.forEach((entry, index) => {
      if (query && !entry.fullText.toLocaleLowerCase().includes(query)) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "cqn-item";
      button.dataset.index = String(index);
      button.title = entry.fullText || entry.title;
      button.innerHTML = `<span class="cqn-number">${index + 1}</span><span class="cqn-title"></span>`;
      button.querySelector(".cqn-title").textContent = entry.title;
      button.addEventListener("click", () => jumpTo(index));
      fragment.appendChild(button);
      visibleCount += 1;
    });

    elements.list.replaceChildren(fragment);
    elements.count.textContent = `${entries.length} 个问题`;
    elements.empty.hidden = visibleCount > 0;
    elements.empty.textContent = entries.length
      ? "没有匹配的问题"
      : "当前页面还没有可导航的问题";
    updateActiveItem();
  }

  function refreshEntries() {
    const nextEntries = collectEntries();
    const nextSignature = makeSignature(nextEntries);
    if (nextSignature === signature) return;

    entries = nextEntries;
    signature = nextSignature;
    activeIndex = Math.min(activeIndex, entries.length - 1);
    renderList();
    updateFromScroll();
  }

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refreshEntries, 250);
  }

  function jumpTo(index) {
    const entry = entries[index];
    if (!entry) return;

    activeIndex = index;
    entry.target.scrollIntoView({ behavior: "smooth", block: "start" });
    updateActiveItem();
  }

  function jumpRelative(offset) {
    if (!entries.length) return;
    const base = activeIndex < 0 ? 0 : activeIndex;
    jumpTo(Math.max(0, Math.min(entries.length - 1, base + offset)));
  }

  function updateActiveItem() {
    root.querySelectorAll(".cqn-item").forEach((item) => {
      const isActive = Number(item.dataset.index) === activeIndex;
      item.classList.toggle("cqn-active", isActive);
      if (isActive) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });

    elements.previous.disabled = activeIndex <= 0;
    elements.next.disabled = activeIndex < 0 || activeIndex >= entries.length - 1;
  }

  function updateFromScroll() {
    if (!entries.length) {
      activeIndex = -1;
      updateActiveItem();
      return;
    }

    const tops = entries.map((entry) => entry.target.getBoundingClientRect().top);
    const nextActive = helpers.findActiveIndex(tops, window.innerHeight * 0.3);
    if (nextActive === activeIndex) return;

    activeIndex = nextActive;
    updateActiveItem();

    const activeItem = root.querySelector(`.cqn-item[data-index="${activeIndex}"]`);
    activeItem?.scrollIntoView({ block: "nearest" });
  }

  function onScroll() {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = null;
      updateFromScroll();
    });
  }

  elements.toggle.addEventListener("click", () => setCollapsed(false, true));
  elements.collapse.addEventListener("click", () => setCollapsed(true, true));
  elements.search.addEventListener("input", renderList);
  elements.previous.addEventListener("click", () => jumpRelative(-1));
  elements.next.addEventListener("click", () => jumpRelative(1));

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable;
    if (isTyping || !event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      jumpRelative(event.key === "ArrowUp" ? -1 : 1);
    } else if (event.shiftKey && event.key.toLocaleLowerCase() === "o") {
      event.preventDefault();
      setCollapsed(!root.classList.contains("cqn-collapsed"), true);
    }
  });

  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll);

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.body, { childList: true, subtree: true });

  if (chrome?.storage?.local) {
    chrome.storage.local.get({ [STORAGE_KEY]: false }, (result) => {
      setCollapsed(Boolean(result[STORAGE_KEY]), false);
    });
  }

  refreshEntries();
})();
