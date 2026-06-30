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
  let statusTimer = null;
  let loadingKey = null;
  let conversationKey = getConversationKey();
  const conversationCaches = new Map();

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
      <p class="cqn-status" hidden></p>
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
    status: root.querySelector(".cqn-status"),
    previous: root.querySelector(".cqn-previous"),
    next: root.querySelector(".cqn-next")
  };

  function getConversationKey() {
    return `${location.origin}${location.pathname}`;
  }

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

  function getEntryIdentity(target, roleNode, fullText, occurrence) {
    const turnId = target.getAttribute("data-testid") || "";
    const messageId =
      roleNode.getAttribute("data-message-id") ||
      target.querySelector("[data-message-id]")?.getAttribute("data-message-id") ||
      "";
    const turnMatch = turnId.match(/^conversation-turn-(\d+)$/);

    return {
      key: messageId
        ? `message:${messageId}`
        : turnId
          ? `turn:${turnId}`
          : `text:${fullText}\u0000${occurrence}`,
      order: turnMatch ? Number(turnMatch[1]) : null
    };
  }

  function collectEntries() {
    const seen = new Set();
    const textOccurrences = new Map();
    const nextEntries = [];

    document.querySelectorAll(USER_MESSAGE_SELECTOR).forEach((roleNode) => {
      const target = getScrollTarget(roleNode);
      if (seen.has(target)) return;
      seen.add(target);

      const fullText = helpers.normalizeText(roleNode.textContent);
      const occurrence = textOccurrences.get(fullText) || 0;
      textOccurrences.set(fullText, occurrence + 1);
      const identity = getEntryIdentity(target, roleNode, fullText, occurrence);
      nextEntries.push({
        ...identity,
        target,
        fullText,
        title: helpers.shortenTitle(fullText, 96)
      });
    });

    return nextEntries;
  }

  function makeSignature(nextEntries) {
    return nextEntries
      .map((entry) => `${entry.key}:${entry.fullText}:${entry.target?.isConnected ? 1 : 0}`)
      .join("\u0001");
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
      button.classList.toggle("cqn-unloaded", !entry.target?.isConnected);
      button.dataset.index = String(index);
      button.title = entry.target?.isConnected
        ? entry.fullText || entry.title
        : `${entry.fullText || entry.title}（点击自动加载）`;
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
    const nextConversationKey = getConversationKey();
    if (nextConversationKey !== conversationKey) {
      conversationKey = nextConversationKey;
      activeIndex = -1;
      signature = "";
      elements.search.value = "";
    }

    const observedEntries = collectEntries();
    const nextEntries = helpers.mergeEntryRecords(
      conversationCaches.get(conversationKey) || [],
      observedEntries
    );
    conversationCaches.set(conversationKey, nextEntries);
    const nextSignature = makeSignature(nextEntries);
    entries = nextEntries;
    if (nextSignature === signature) return;

    signature = nextSignature;
    activeIndex = Math.min(activeIndex, entries.length - 1);
    renderList();
    updateFromScroll();
  }

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refreshEntries, 250);
  }

  function showStatus(message, duration) {
    window.clearTimeout(statusTimer);
    elements.status.textContent = message;
    elements.status.hidden = false;
    if (duration) {
      statusTimer = window.setTimeout(() => {
        elements.status.hidden = true;
      }, duration);
    }
  }

  function findScrollContainer(node) {
    let candidate = node?.parentElement;
    while (candidate && candidate !== document.body) {
      const style = window.getComputedStyle(candidate);
      if (
        /(auto|scroll)/.test(style.overflowY) &&
        candidate.scrollHeight > candidate.clientHeight + 1
      ) {
        return candidate;
      }
      candidate = candidate.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  function scrollContainerBy(container, amount) {
    if (
      container === document.documentElement ||
      container === document.body ||
      container === document.scrollingElement
    ) {
      window.scrollBy({ top: amount, behavior: "auto" });
    } else {
      container.scrollBy({ top: amount, behavior: "auto" });
    }
  }

  function getScrollTop(container) {
    if (
      container === document.documentElement ||
      container === document.body ||
      container === document.scrollingElement
    ) {
      return window.scrollY;
    }
    return container.scrollTop;
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function revealEntry(entryKey) {
    let stalledAttempts = 0;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      refreshEntries();
      const desiredIndex = entries.findIndex((entry) => entry.key === entryKey);
      const desiredEntry = entries[desiredIndex];
      if (desiredEntry?.target?.isConnected) return desiredEntry.target;

      const connected = entries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.target?.isConnected);
      if (!connected.length || desiredIndex < 0) break;

      const direction = desiredIndex < connected[0].index ? -1 : 1;
      const anchor = direction < 0 ? connected[0].entry.target : connected.at(-1).entry.target;
      const container = findScrollContainer(anchor);
      const before = getScrollTop(container);
      const distance = Math.max(container.clientHeight * 0.8, 480);
      scrollContainerBy(container, direction * distance);
      await wait(180);

      const after = getScrollTop(container);
      stalledAttempts = Math.abs(after - before) < 1 ? stalledAttempts + 1 : 0;
      if (stalledAttempts >= 3) break;
    }

    refreshEntries();
    return entries.find((entry) => entry.key === entryKey)?.target || null;
  }

  async function jumpTo(index) {
    const entry = entries[index];
    if (!entry || loadingKey) return;

    activeIndex = index;
    updateActiveItem();

    let target = entry.target?.isConnected ? entry.target : null;
    if (!target) {
      loadingKey = entry.key;
      showStatus("正在加载这条旧消息…");
      target = await revealEntry(entry.key);
      loadingKey = null;
    }

    if (target?.isConnected) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      showStatus("已定位", 1200);
    } else {
      showStatus("暂时无法自动加载，请先向上滚动对话", 3000);
    }
  }

  function jumpRelative(offset) {
    if (!entries.length) return;
    const base = activeIndex < 0 ? 0 : activeIndex;
    void jumpTo(Math.max(0, Math.min(entries.length - 1, base + offset)));
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

    const connected = entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.target?.isConnected);
    if (!connected.length) return;

    const tops = connected.map(({ entry }) => entry.target.getBoundingClientRect().top);
    const connectedIndex = helpers.findActiveIndex(tops, window.innerHeight * 0.3);
    const nextActive = connected[connectedIndex].index;
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
