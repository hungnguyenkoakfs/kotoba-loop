const LANGUAGE_KEY = "kotoba-loop:language:v1";
const DATASETS = {
  ja: {
    url: new URL("../data/vocabulary.json", window.location.href),
    speechLanguage: "ja-JP",
    voicePattern: /^ja([-_]|$)/i,
    name: "Tiếng Nhật",
    summary: "từ vựng N2",
    collection: "Toàn bộ giáo trình N2",
  },
  en: {
    url: new URL("../data/hacker_toeic.json", window.location.href),
    speechLanguage: "en-US",
    voicePattern: /^en([-_]|$)/i,
    name: "Tiếng Anh",
    summary: "từ vựng TOEIC",
    collection: "Toàn bộ Hackers TOEIC",
  },
};

function storageKeysFor(language) {
  return {
    settings: `kotoba-loop:${language}:settings:v2`,
    favorites: `kotoba-loop:${language}:favorites:v2`,
    seen: `kotoba-loop:${language}:seen:v2`,
  };
}

const elements = {
  appShell: document.querySelector("#appShell"),
  languageTabs: document.querySelector("#languageTabs"),
  japaneseTab: document.querySelector("#japaneseTab"),
  englishTab: document.querySelector("#englishTab"),
  brandMarkText: document.querySelector("#brandMarkText"),
  patternText: document.querySelector("#patternText"),
  datasetCount: document.querySelector("#datasetCount"),
  datasetLabel: document.querySelector("#datasetLabel"),
  sessionContext: document.querySelector("#sessionContext"),
  positionText: document.querySelector("#positionText"),
  orderText: document.querySelector("#orderText"),
  cycleProgress: document.querySelector("#cycleProgress"),
  wordCard: document.querySelector("#wordCard"),
  chapterBadge: document.querySelector("#chapterBadge"),
  partOfSpeechBadge: document.querySelector("#partOfSpeechBadge"),
  seenBadge: document.querySelector("#seenBadge"),
  hiragana: document.querySelector("#hiragana"),
  term: document.querySelector("#term"),
  speakButton: document.querySelector("#speakButton"),
  favoriteButton: document.querySelector("#favoriteButton"),
  hanVietRow: document.querySelector("#hanVietRow"),
  detailLabel: document.querySelector("#detailLabel"),
  hanViet: document.querySelector("#hanViet"),
  meaningList: document.querySelector("#meaningList"),
  exampleCount: document.querySelector("#exampleCount"),
  exampleList: document.querySelector("#exampleList"),
  sourceNote: document.querySelector("#sourceNote"),
  previousButton: document.querySelector("#previousButton"),
  playButton: document.querySelector("#playButton"),
  playLabel: document.querySelector("#playLabel"),
  countdownLabel: document.querySelector("#countdownLabel"),
  nextButton: document.querySelector("#nextButton"),
  controlPanel: document.querySelector("#controlPanel"),
  panelToggle: document.querySelector("#panelToggle"),
  panelClose: document.querySelector("#panelClose"),
  panelBackdrop: document.querySelector("#panelBackdrop"),
  resultCount: document.querySelector("#resultCount"),
  searchInput: document.querySelector("#searchInput"),
  chapterSelect: document.querySelector("#chapterSelect"),
  chapterLabel: document.querySelector("#chapterLabel"),
  lessonField: document.querySelector("#lessonField"),
  lessonLabel: document.querySelector("#lessonLabel"),
  lessonSelect: document.querySelector("#lessonSelect"),
  favoritesOnly: document.querySelector("#favoritesOnly"),
  favoriteCountLabel: document.querySelector("#favoriteCountLabel"),
  sequentialMode: document.querySelector("#sequentialMode"),
  randomMode: document.querySelector("#randomMode"),
  intervalRange: document.querySelector("#intervalRange"),
  intervalOutput: document.querySelector("#intervalOutput"),
  voiceSelect: document.querySelector("#voiceSelect"),
  voiceLabel: document.querySelector("#voiceLabel"),
  rateRange: document.querySelector("#rateRange"),
  rateOutput: document.querySelector("#rateOutput"),
  seenTotal: document.querySelector("#seenTotal"),
  seenUnique: document.querySelector("#seenUnique"),
  resetSessionButton: document.querySelector("#resetSessionButton"),
  queueList: document.querySelector("#queueList"),
  helpButton: document.querySelector("#helpButton"),
  helpDialog: document.querySelector("#helpDialog"),
  helpClose: document.querySelector("#helpClose"),
  toast: document.querySelector("#toast"),
  exampleTemplate: document.querySelector("#exampleTemplate"),
};

const initialLanguage = readStorage(LANGUAGE_KEY, "ja") === "en" ? "en" : "ja";
let storageKeys = storageKeysFor(initialLanguage);
const savedSettings = readStorage(storageKeys.settings, {});

const state = {
  language: initialLanguage,
  words: [],
  filteredWords: [],
  playbackWords: [],
  cursor: 0,
  currentTracked: false,
  isPlaying: false,
  intervalSeconds: clamp(Number(savedSettings.intervalSeconds) || 5, 3, 20),
  speechRate: clamp(Number(savedSettings.speechRate) || 0.9, 0.6, 1.2),
  orderMode: savedSettings.orderMode === "random" ? "random" : "sequential",
  selectedChapter: String(savedSettings.selectedChapter || "all"),
  selectedLesson: String(savedSettings.selectedLesson || "all"),
  search: String(savedSettings.search || ""),
  favoritesOnly: Boolean(savedSettings.favoritesOnly),
  selectedVoiceURI: String(savedSettings.selectedVoiceURI || ""),
  currentId: String(savedSettings.currentId || ""),
  favorites: new Set(readStorage(storageKeys.favorites, [])),
  seenCounts: readStorage(storageKeys.seen, {}),
  sessionViews: 0,
  sessionSeen: new Set(),
  voices: [],
  cycleStartedAt: 0,
  animationFrame: 0,
  toastTimer: 0,
  searchTimer: 0,
};

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app remains usable when storage is disabled.
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function normalizeSearch(value) {
  return String(value).normalize("NFKC").trim().toLocaleLowerCase("vi");
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function currentWord() {
  return state.playbackWords[state.cursor] || null;
}

function saveSettings() {
  const word = currentWord();
  writeStorage(storageKeys.settings, {
    intervalSeconds: state.intervalSeconds,
    speechRate: state.speechRate,
    orderMode: state.orderMode,
    selectedChapter: state.selectedChapter,
    selectedLesson: state.selectedLesson,
    search: state.search,
    favoritesOnly: state.favoritesOnly,
    selectedVoiceURI: state.selectedVoiceURI,
    currentId: word?.id || state.currentId,
  });
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2200);
}

function humanizePartOfSpeech(value) {
  const labels = {
    N: "Danh từ",
    V: "Động từ",
    PT: "Phó từ",
    "Aい": "Tính từ い",
    "Aな": "Tính từ な",
    "N/Nする": "Danh từ · する",
    "N/Aな": "Danh từ · Tính từ な",
    "N/Aな/Nする": "Danh từ · な · する",
    "N/PT": "Danh từ · Phó từ",
    "Aな/PT": "Tính từ な · Phó từ",
    "PT/Aな": "Phó từ · Tính từ な",
    Hậutố: "Hậu tố",
    Tiềntố: "Tiền tố",
    "Tiếntố": "Tiền tố",
    "Phótừ": "Phó từ",
    "Trạngtừ": "Trạng từ",
    "Đơnvịđo": "Đơn vị đo",
    n: "Danh từ",
    v: "Động từ",
    adj: "Tính từ",
    adv: "Trạng từ",
    prep: "Giới từ",
    conj: "Liên từ",
    pron: "Đại từ",
    det: "Từ hạn định",
    phr: "Cụm từ",
  };
  return labels[value] || value || "Từ vựng";
}

function populateChapterOptions() {
  elements.chapterSelect.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent =
    state.language === "en" ? "Tất cả ngày" : "Tất cả chương";
  elements.chapterSelect.append(allOption);
  const chapters = [...new Set(state.words.map((word) => word.chapter))].sort(
    (a, b) => a - b,
  );
  for (const chapter of chapters) {
    const option = document.createElement("option");
    option.value = String(chapter);
    option.textContent =
      state.language === "en" ? `Ngày ${chapter}` : `Chương ${chapter}`;
    elements.chapterSelect.append(option);
  }
  const validChapter =
    state.selectedChapter === "all" ||
    chapters.includes(Number(state.selectedChapter));
  if (!validChapter) state.selectedChapter = "all";
  elements.chapterSelect.value = state.selectedChapter;
  populateLessonOptions();
}

function populateLessonOptions() {
  const previousValue = state.selectedLesson;
  elements.lessonSelect.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Tất cả bài";
  elements.lessonSelect.append(allOption);

  const candidateWords =
    state.selectedChapter === "all"
      ? state.words
      : state.words.filter(
          (word) => word.chapter === Number(state.selectedChapter),
        );
  const lessons = [...new Set(candidateWords.map((word) => word.lesson))].sort(
    (a, b) => a - b,
  );
  for (const lesson of lessons) {
    const option = document.createElement("option");
    option.value = String(lesson);
    option.textContent = `Bài ${lesson}`;
    elements.lessonSelect.append(option);
  }

  state.selectedLesson = lessons.includes(Number(previousValue))
    ? previousValue
    : "all";
  elements.lessonSelect.value = state.selectedLesson;
}

function wordMatchesSearch(word, query) {
  if (!query) return true;
  const searchable = [
    word.term,
    word.hiragana,
    word.han_viet,
    word.part_of_speech,
    ...word.meanings,
    ...word.examples.flatMap((example) => [
      example.japanese,
      example.meaning,
    ]),
  ]
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase("vi");
  return searchable.includes(query);
}

function applyFilters({ preserveCurrent = true, announce = false } = {}) {
  const previousId = preserveCurrent ? currentWord()?.id || state.currentId : "";
  const query = normalizeSearch(state.search);

  state.filteredWords = state.words.filter((word) => {
    if (
      state.selectedChapter !== "all" &&
      word.chapter !== Number(state.selectedChapter)
    ) {
      return false;
    }
    if (
      state.language === "ja" &&
      state.selectedLesson !== "all" &&
      word.lesson !== Number(state.selectedLesson)
    ) {
      return false;
    }
    if (state.favoritesOnly && !state.favorites.has(word.id)) {
      return false;
    }
    return wordMatchesSearch(word, query);
  });

  state.playbackWords =
    state.orderMode === "random"
      ? shuffle(state.filteredWords)
      : [...state.filteredWords];

  const previousIndex = state.playbackWords.findIndex(
    (word) => word.id === previousId,
  );
  state.cursor = previousIndex >= 0 ? previousIndex : 0;
  state.currentTracked = false;
  resetCycle();
  render();
  saveSettings();

  if (announce) {
    showToast(
      state.filteredWords.length
        ? `Đã tạo danh sách ${formatNumber(state.filteredWords.length)} từ`
        : "Không có từ nào phù hợp bộ lọc",
    );
  }
}

function buildContextLabel() {
  const parts = [];
  if (state.selectedChapter !== "all") {
    parts.push(
      state.language === "en"
        ? `Ngày ${state.selectedChapter}`
        : `Chương ${state.selectedChapter}`,
    );
  }
  if (state.language === "ja" && state.selectedLesson !== "all") {
    parts.push(`Bài ${state.selectedLesson}`);
  }
  if (state.favoritesOnly) parts.push("Yêu thích");
  if (state.search.trim()) parts.push(`“${state.search.trim()}”`);
  return parts.length ? parts.join(" · ") : DATASETS[state.language].collection;
}

function render() {
  const word = currentWord();
  elements.resultCount.textContent = `${formatNumber(
    state.filteredWords.length,
  )} từ`;
  elements.favoriteCountLabel.textContent = state.favorites.size
    ? `${formatNumber(state.favorites.size)} từ đã lưu`
    : "Chưa có từ nào";
  elements.sessionContext.textContent = buildContextLabel();
  elements.orderText.textContent =
    state.orderMode === "random" ? "Ngẫu nhiên" : "Tuần tự";

  if (!word) {
    renderEmptyState();
    return;
  }

  setNavigationDisabled(false);
  elements.positionText.textContent = `${formatNumber(state.cursor + 1)} / ${formatNumber(
    state.playbackWords.length,
  )}`;
  elements.chapterBadge.textContent =
    state.language === "en"
      ? `Ngày ${word.chapter} · Từ ${word.dayIndex}`
      : `Chương ${word.chapter} · Bài ${word.lesson}`;
  elements.partOfSpeechBadge.textContent = humanizePartOfSpeech(
    word.part_of_speech,
  );
  elements.hiragana.textContent = word.hiragana;
  elements.term.textContent = word.term;
  elements.hanViet.textContent =
    word.han_viet ||
    (state.language === "en" ? "Không có từ đồng nghĩa" : "Không ghi trong PDF");
  elements.hanVietRow.classList.toggle("is-empty", !word.han_viet);
  elements.sourceNote.textContent = `${
    state.language === "en" ? "Hackers TOEIC" : "Nguồn"
  } · trang ${word.source_page}`;

  const seenCount = Number(state.seenCounts[word.id] || 0);
  elements.seenBadge.textContent =
    seenCount > 0 ? `Đã gặp ${formatNumber(seenCount)} lần` : "Lần gặp đầu tiên";

  elements.meaningList.replaceChildren();
  word.meanings.forEach((meaning) => {
    const item = document.createElement("li");
    item.textContent = meaning;
    elements.meaningList.append(item);
  });

  elements.exampleList.replaceChildren();
  word.examples.forEach((example, index) => {
    const fragment = elements.exampleTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".example-item");
    fragment.querySelector(".example-index").textContent = String(index + 1).padStart(
      2,
      "0",
    );
    fragment.querySelector(".example-japanese").textContent = example.japanese;
    fragment.querySelector(".example-meaning").textContent = example.meaning;
    fragment
      .querySelector(".example-audio")
      .addEventListener("click", () => speak(example.japanese));
    item.dataset.exampleIndex = String(index);
    elements.exampleList.append(fragment);
  });
  elements.exampleCount.textContent = `${word.examples.length} ví dụ`;

  const isFavorite = state.favorites.has(word.id);
  elements.favoriteButton.classList.toggle("is-active", isFavorite);
  elements.favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  elements.favoriteButton.setAttribute(
    "aria-label",
    isFavorite
      ? "Bỏ từ hiện tại khỏi yêu thích"
      : "Thêm từ hiện tại vào yêu thích",
  );

  elements.wordCard.setAttribute(
    "aria-label",
    `${word.term}, ${word.hiragana}, ${word.meanings.join("; ")}`,
  );
  animateCard();
  renderQueue();
  renderSessionStats();
  saveSettings();
}

function renderEmptyState() {
  pausePlayback({ silent: true });
  setNavigationDisabled(true);
  elements.positionText.textContent = "0 / 0";
  elements.chapterBadge.textContent = "Danh sách trống";
  elements.partOfSpeechBadge.textContent = "Đổi bộ lọc";
  elements.seenBadge.textContent = "";
  elements.hiragana.textContent =
    state.language === "en" ? "NO RESULTS" : "みつかりません";
  elements.term.textContent = "Không tìm thấy";
  elements.hanViet.textContent = "Hãy thử bỏ bớt điều kiện lọc";
  elements.meaningList.replaceChildren();
  const item = document.createElement("li");
  item.textContent =
    state.favoritesOnly && state.favorites.size === 0
      ? "Bạn chưa lưu từ yêu thích nào."
      : "Không có từ vựng khớp với lựa chọn hiện tại.";
  elements.meaningList.append(item);
  elements.exampleList.replaceChildren();
  elements.exampleCount.textContent = "0 ví dụ";
  elements.sourceNote.textContent = "";
  elements.queueList.replaceChildren();
}

function animateCard() {
  elements.wordCard.classList.remove("is-changing");
  // Triggering layout here intentionally restarts the short content animation.
  void elements.wordCard.offsetWidth;
  elements.wordCard.classList.add("is-changing");
}

function renderQueue() {
  elements.queueList.replaceChildren();
  const length = state.playbackWords.length;
  if (length <= 1) {
    const item = document.createElement("li");
    item.innerHTML = "<strong>Không còn từ khác</strong><span>—</span>";
    elements.queueList.append(item);
    return;
  }

  const count = Math.min(3, length - 1);
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (state.cursor + offset) % length;
    const word = state.playbackWords[index];
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const reading = document.createElement("span");
    title.textContent = word.term;
    reading.textContent = word.hiragana;
    item.append(title, reading);
    elements.queueList.append(item);
  }
}

function renderSessionStats() {
  elements.seenTotal.textContent = formatNumber(state.sessionViews);
  elements.seenUnique.textContent = formatNumber(state.sessionSeen.size);
}

function setNavigationDisabled(disabled) {
  elements.previousButton.disabled = disabled;
  elements.nextButton.disabled = disabled;
  elements.playButton.disabled = disabled;
  elements.speakButton.disabled = disabled;
  elements.favoriteButton.disabled = disabled;
}

function markCurrentSeen() {
  const word = currentWord();
  if (!word || state.currentTracked) return;
  state.currentTracked = true;
  state.seenCounts[word.id] = Number(state.seenCounts[word.id] || 0) + 1;
  state.sessionViews += 1;
  state.sessionSeen.add(word.id);
  writeStorage(storageKeys.seen, state.seenCounts);
  renderSessionStats();
  elements.seenBadge.textContent = `Đã gặp ${formatNumber(
    state.seenCounts[word.id],
  )} lần`;
}

function move(direction, { shouldSpeak = true } = {}) {
  const length = state.playbackWords.length;
  if (!length) return;

  if (
    direction > 0 &&
    state.orderMode === "random" &&
    state.cursor === length - 1 &&
    length > 1
  ) {
    const previousWord = currentWord();
    state.playbackWords = shuffle(state.filteredWords);
    if (state.playbackWords[0]?.id === previousWord?.id) {
      [state.playbackWords[0], state.playbackWords[1]] = [
        state.playbackWords[1],
        state.playbackWords[0],
      ];
    }
    state.cursor = 0;
  } else {
    state.cursor = (state.cursor + direction + length) % length;
  }

  state.currentTracked = false;
  resetCycle();
  render();
  markCurrentSeen();
  if (shouldSpeak) speakCurrent({ quietFailure: true });
}

function resetCycle() {
  state.cycleStartedAt = performance.now();
  elements.cycleProgress.style.transform = "scaleX(0)";
}

function startPlayback() {
  if (!currentWord() || state.isPlaying) return;
  state.isPlaying = true;
  elements.playButton.classList.add("is-playing");
  elements.playButton.setAttribute("aria-pressed", "true");
  elements.playButton.setAttribute("aria-label", "Tạm dừng vòng lặp");
  elements.playLabel.textContent = "Tạm dừng";
  markCurrentSeen();
  speakCurrent({ quietFailure: true });
  resetCycle();
  window.cancelAnimationFrame(state.animationFrame);
  state.animationFrame = window.requestAnimationFrame(updateCycle);
}

function pausePlayback({ silent = false } = {}) {
  if (!state.isPlaying && silent) return;
  state.isPlaying = false;
  window.cancelAnimationFrame(state.animationFrame);
  elements.playButton.classList.remove("is-playing");
  elements.playButton.setAttribute("aria-pressed", "false");
  elements.playButton.setAttribute("aria-label", "Bắt đầu vòng lặp");
  elements.playLabel.textContent = "Bắt đầu";
  elements.countdownLabel.textContent = `Mỗi ${state.intervalSeconds} giây`;
  elements.cycleProgress.style.transform = "scaleX(0)";
  if (!silent) showToast("Đã tạm dừng vòng lặp");
}

function togglePlayback() {
  if (state.isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function updateCycle(now) {
  if (!state.isPlaying) return;
  const duration = state.intervalSeconds * 1000;
  const elapsed = now - state.cycleStartedAt;
  const progress = clamp(elapsed / duration, 0, 1);
  const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
  elements.cycleProgress.style.transform = `scaleX(${progress})`;
  elements.countdownLabel.textContent =
    remaining > 0 ? `Còn ${remaining} giây` : "Đang chuyển…";

  if (elapsed >= duration) {
    move(1, { shouldSpeak: true });
  }
  state.animationFrame = window.requestAnimationFrame(updateCycle);
}

function cleanSpeechText(text) {
  return String(text).replace(/[〜～]/g, "").trim();
}

function getSelectedVoice() {
  const config = DATASETS[state.language];
  return (
    state.voices.find((voice) => voice.voiceURI === state.selectedVoiceURI) ||
    state.voices.find((voice) => config.voicePattern.test(voice.lang)) ||
    null
  );
}

function speak(text, { quietFailure = false } = {}) {
  const cleanText = cleanSpeechText(text);
  if (!cleanText) return;
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    if (!quietFailure) {
      showToast("Trình duyệt này chưa hỗ trợ phát âm tự động");
    }
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = DATASETS[state.language].speechLanguage;
  utterance.rate = state.speechRate;
  utterance.pitch = 1;
  const voice = getSelectedVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function speakCurrent(options) {
  const word = currentWord();
  if (word) speak(word.term, options);
}

function populateVoices() {
  if (!("speechSynthesis" in window)) {
    elements.voiceSelect.disabled = true;
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  state.voices = voices;
  const config = DATASETS[state.language];
  const languageVoices = voices.filter((voice) =>
    config.voicePattern.test(voice.lang),
  );
  const previousValue = state.selectedVoiceURI;
  elements.voiceSelect.replaceChildren();

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = `Mặc định thiết bị (${config.speechLanguage})`;
  elements.voiceSelect.append(defaultOption);

  languageVoices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent = `${voice.name}${voice.localService ? "" : " · online"}`;
    elements.voiceSelect.append(option);
  });

  const selectedExists = languageVoices.some(
    (voice) => voice.voiceURI === previousValue,
  );
  if (!selectedExists) state.selectedVoiceURI = "";
  elements.voiceSelect.value = state.selectedVoiceURI;
}

function toggleFavorite() {
  const word = currentWord();
  if (!word) return;

  const wasFavorite = state.favorites.has(word.id);
  if (wasFavorite) {
    state.favorites.delete(word.id);
  } else {
    state.favorites.add(word.id);
  }
  writeStorage(storageKeys.favorites, [...state.favorites]);

  if (state.favoritesOnly && wasFavorite) {
    applyFilters({ preserveCurrent: false });
  } else {
    render();
  }
  showToast(wasFavorite ? "Đã bỏ khỏi yêu thích" : "Đã thêm vào yêu thích");
}

function setOrderMode(mode) {
  if (mode === state.orderMode) return;
  state.orderMode = mode;
  elements.sequentialMode.classList.toggle("is-active", mode === "sequential");
  elements.randomMode.classList.toggle("is-active", mode === "random");
  elements.sequentialMode.setAttribute(
    "aria-pressed",
    String(mode === "sequential"),
  );
  elements.randomMode.setAttribute("aria-pressed", String(mode === "random"));
  applyFilters({ preserveCurrent: true });
  showToast(mode === "random" ? "Đã trộn ngẫu nhiên danh sách" : "Đã về thứ tự giáo trình");
}

function setPanelOpen(isOpen) {
  document.body.classList.toggle("panel-open", isOpen);
  elements.panelToggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    window.setTimeout(() => elements.searchInput.focus(), 230);
  }
}

function normalizeVocabulary(payload) {
  if (state.language === "ja") {
    if (!Array.isArray(payload)) return [];
    return payload.map((word) => ({ ...word, dayIndex: word.lesson }));
  }

  if (!payload || !Array.isArray(payload.entries)) return [];
  return payload.entries.map((entry) => {
    const english = String(entry.example?.english || "").trim();
    const vietnamese = String(entry.example?.vietnamese || "").trim();
    return {
      id: `en-${entry.id}`,
      chapter: Number(entry.day),
      lesson: Number(entry.day),
      dayIndex: Number(entry.day_index),
      term: String(entry.headword || entry.word || "").trim(),
      hiragana: `DAY ${String(entry.day).padStart(2, "0")} · #${String(
        entry.day_index,
      ).padStart(2, "0")}`,
      han_viet: Array.isArray(entry.synonyms) ? entry.synonyms.join(" · ") : "",
      part_of_speech: String(entry.part_of_speech || "").trim(),
      meanings: [String(entry.meaning || "").trim()].filter(Boolean),
      examples:
        english || vietnamese
          ? [{ japanese: english, meaning: vietnamese }]
          : [],
      source_page: Number(entry.source_pdf_page),
    };
  });
}

function updateLanguageUI() {
  const isEnglish = state.language === "en";
  const config = DATASETS[state.language];
  document.body.classList.toggle("language-en", isEnglish);
  document.documentElement.lang = isEnglish ? "en" : "vi";
  document.title = isEnglish
    ? "Kotoba Loop · Hackers TOEIC"
    : "Kotoba Loop · Học từ vựng N2";
  elements.japaneseTab.classList.toggle("is-active", !isEnglish);
  elements.englishTab.classList.toggle("is-active", isEnglish);
  elements.japaneseTab.setAttribute("aria-selected", String(!isEnglish));
  elements.englishTab.setAttribute("aria-selected", String(isEnglish));
  elements.japaneseTab.tabIndex = isEnglish ? -1 : 0;
  elements.englishTab.tabIndex = isEnglish ? 0 : -1;
  elements.brandMarkText.textContent = isEnglish ? "EN" : "日";
  elements.patternText.textContent = isEnglish ? "A" : "語";
  elements.datasetLabel.textContent = config.summary;
  elements.detailLabel.textContent = isEnglish ? "Đồng nghĩa" : "Hán–Việt";
  elements.chapterLabel.textContent = isEnglish ? "Ngày học" : "Chương";
  elements.lessonLabel.textContent = "Bài";
  elements.lessonField.hidden = isEnglish;
  elements.searchInput.placeholder = isEnglish
    ? "Tìm từ, nghĩa, đồng nghĩa..."
    : "Tìm kanji, nghĩa...";
  elements.voiceLabel.textContent = `Giọng ${config.name.toLocaleLowerCase("vi")}`;
}

function restoreLanguageState() {
  storageKeys = storageKeysFor(state.language);
  const settings = readStorage(storageKeys.settings, {});
  state.intervalSeconds = clamp(Number(settings.intervalSeconds) || 5, 3, 20);
  state.speechRate = clamp(Number(settings.speechRate) || 0.9, 0.6, 1.2);
  state.orderMode = settings.orderMode === "random" ? "random" : "sequential";
  state.selectedChapter = String(settings.selectedChapter || "all");
  state.selectedLesson = String(settings.selectedLesson || "all");
  state.search = String(settings.search || "");
  state.favoritesOnly = Boolean(settings.favoritesOnly);
  state.selectedVoiceURI = String(settings.selectedVoiceURI || "");
  state.currentId = String(settings.currentId || "");
  state.favorites = new Set(readStorage(storageKeys.favorites, []));
  state.seenCounts = readStorage(storageKeys.seen, {});
  state.sessionViews = 0;
  state.sessionSeen = new Set();
  state.words = [];
  state.filteredWords = [];
  state.playbackWords = [];
  state.cursor = 0;
  state.currentTracked = false;
}

async function changeLanguage(language) {
  if (!DATASETS[language] || language === state.language) return;
  pausePlayback({ silent: true });
  saveSettings();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  state.language = language;
  writeStorage(LANGUAGE_KEY, language);
  restoreLanguageState();
  updateLanguageUI();
  initializeControls();
  await loadVocabulary();
  showToast(`Đã chuyển sang ${DATASETS[language].name}`);
}

function bindEvents() {
  elements.japaneseTab.addEventListener("click", () => changeLanguage("ja"));
  elements.englishTab.addEventListener("click", () => changeLanguage("en"));
  elements.playButton.addEventListener("click", togglePlayback);
  elements.previousButton.addEventListener("click", () => move(-1));
  elements.nextButton.addEventListener("click", () => move(1));
  elements.speakButton.addEventListener("click", () => speakCurrent());
  elements.favoriteButton.addEventListener("click", toggleFavorite);

  elements.chapterSelect.addEventListener("change", () => {
    state.selectedChapter = elements.chapterSelect.value;
    populateLessonOptions();
    applyFilters({ preserveCurrent: false, announce: true });
  });

  elements.lessonSelect.addEventListener("change", () => {
    state.selectedLesson = elements.lessonSelect.value;
    applyFilters({ preserveCurrent: false, announce: true });
  });

  elements.searchInput.addEventListener("input", () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      state.search = elements.searchInput.value;
      applyFilters({ preserveCurrent: false });
    }, 180);
  });

  elements.favoritesOnly.addEventListener("change", () => {
    state.favoritesOnly = elements.favoritesOnly.checked;
    applyFilters({ preserveCurrent: false, announce: true });
  });

  elements.sequentialMode.addEventListener("click", () =>
    setOrderMode("sequential"),
  );
  elements.randomMode.addEventListener("click", () => setOrderMode("random"));

  elements.intervalRange.addEventListener("input", () => {
    state.intervalSeconds = Number(elements.intervalRange.value);
    elements.intervalOutput.textContent = `${state.intervalSeconds} giây`;
    elements.countdownLabel.textContent = `Mỗi ${state.intervalSeconds} giây`;
    resetCycle();
    saveSettings();
  });

  elements.rateRange.addEventListener("input", () => {
    state.speechRate = Number(elements.rateRange.value);
    elements.rateOutput.textContent = `${state.speechRate
      .toFixed(1)
      .replace(".", ",")}×`;
    saveSettings();
  });

  elements.voiceSelect.addEventListener("change", () => {
    state.selectedVoiceURI = elements.voiceSelect.value;
    saveSettings();
    speakCurrent({ quietFailure: true });
  });

  elements.resetSessionButton.addEventListener("click", () => {
    state.sessionViews = 0;
    state.sessionSeen.clear();
    renderSessionStats();
    showToast("Đã đặt lại thống kê phiên học");
  });

  elements.panelToggle.addEventListener("click", () => setPanelOpen(true));
  elements.panelClose.addEventListener("click", () => setPanelOpen(false));
  elements.panelBackdrop.addEventListener("click", () => setPanelOpen(false));

  elements.helpButton.addEventListener("click", () =>
    elements.helpDialog.showModal(),
  );
  elements.helpClose.addEventListener("click", () => elements.helpDialog.close());
  elements.helpDialog.addEventListener("click", (event) => {
    if (event.target === elements.helpDialog) elements.helpDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement;
    if (isTyping) return;

    if (event.code === "Space") {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key.toLocaleLowerCase() === "s") {
      event.preventDefault();
      speakCurrent();
    } else if (event.key.toLocaleLowerCase() === "f") {
      event.preventDefault();
      toggleFavorite();
    } else if (event.key === "Escape") {
      setPanelOpen(false);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.isPlaying) {
      pausePlayback({ silent: true });
      showToast("Đã tạm dừng khi bạn rời khỏi trang");
    }
  });

  if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener("voiceschanged", populateVoices);
  }
}

function initializeControls() {
  elements.intervalRange.value = String(state.intervalSeconds);
  elements.intervalOutput.textContent = `${state.intervalSeconds} giây`;
  elements.countdownLabel.textContent = `Mỗi ${state.intervalSeconds} giây`;
  elements.rateRange.value = String(state.speechRate);
  elements.rateOutput.textContent = `${state.speechRate
    .toFixed(1)
    .replace(".", ",")}×`;
  elements.searchInput.value = state.search;
  elements.favoritesOnly.checked = state.favoritesOnly;
  elements.sequentialMode.classList.toggle(
    "is-active",
    state.orderMode === "sequential",
  );
  elements.randomMode.classList.toggle(
    "is-active",
    state.orderMode === "random",
  );
  elements.sequentialMode.setAttribute(
    "aria-pressed",
    String(state.orderMode === "sequential"),
  );
  elements.randomMode.setAttribute(
    "aria-pressed",
    String(state.orderMode === "random"),
  );
}

async function loadVocabulary() {
  elements.hiragana.textContent =
    state.language === "en" ? "LOADING" : "よみこみちゅう";
  elements.term.textContent = "Đang tải…";
  setNavigationDisabled(true);

  try {
    const response = await fetch(DATASETS[state.language].url);
    if (!response.ok) {
      throw new Error(`Không thể tải dữ liệu (${response.status})`);
    }
    const payload = await response.json();
    const words = normalizeVocabulary(payload);
    if (words.length === 0) {
      throw new Error("Dữ liệu từ vựng không hợp lệ");
    }

    state.words = words;
    elements.datasetCount.textContent = formatNumber(words.length);
    populateChapterOptions();
    applyFilters({ preserveCurrent: true });
    populateVoices();
  } catch (error) {
    pausePlayback({ silent: true });
    elements.chapterBadge.textContent = "Lỗi dữ liệu";
    elements.partOfSpeechBadge.textContent = "";
    elements.hiragana.textContent = state.language === "en" ? "ERROR" : "エラー";
    elements.term.textContent = "Chưa tải được từ vựng";
    elements.hanViet.textContent = "Hãy chạy app qua máy chủ cục bộ";
    elements.meaningList.replaceChildren();
    const item = document.createElement("li");
    item.textContent = error instanceof Error ? error.message : String(error);
    elements.meaningList.append(item);
    elements.exampleList.replaceChildren();
    elements.exampleCount.textContent = "0 ví dụ";
    elements.sourceNote.textContent = "";
    setNavigationDisabled(true);
    showToast("Không thể tải bộ dữ liệu");
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Offline support is optional; the core app remains available.
      });
    });
  }
}

updateLanguageUI();
initializeControls();
bindEvents();
loadVocabulary();
registerServiceWorker();
