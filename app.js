const STORAGE_KEY = "custom-cards-sim-luffy-only-v1";
const SAVED_DECKS_KEY = "custom-cards-sim-luffy-only-saved-decks-v1";
const CUSTOM_CARDS_KEY = "custom-cards-sim-imported-cards-v1";
const PROJECT_CARDS_API = "/api/project-cards";
const CARD_FILES = [
  { path: "data/cards/leaders.json", category: "leader" },
  { path: "data/cards/characters.json", category: "character" },
  { path: "data/cards/events.json", category: "event" },
  { path: "data/cards/stages.json", category: "stage" },
  { path: "data/cards/custom-project-cards.json", optional: true, projectCards: true }
];
const CARD_BACK_IMAGE = "images/basic/card-back-custom.png";
const DON_CARD_IMAGE = "images/basic/don-card-custom.png";
const DON_DECK_IMAGE = "images/basic/don-deck-custom.png";
const IMPORT_IMAGE_MAX_WIDTH = 760;
const IMPORT_IMAGE_MAX_HEIGHT = 1064;
const IMPORT_IMAGE_QUALITY = 0.84;

function initialView() {
  const requestedView = new URLSearchParams(window.location.search).get("view");
  return ["home", "builder", "game"].includes(requestedView) ? requestedView : "home";
}

const state = {
  cards: [],
  leaderId: "",
  deck: {},
  deckName: "",
  activeView: initialView(),
  game: null,
  practiceDecks: {
    player: "current",
    opponent: "current"
  },
  searchMode: "AND",
  sortField: "number",
  rotationOnly: false,
  leaderColorsOnly: false,
  searchRenderTimer: null,
  editingCardId: "",
  creationImageData: ""
};

const el = {
  viewButtons: document.querySelectorAll("[data-view]"),
  viewPanels: document.querySelectorAll("[data-view-panel]"),
  navTabs: document.querySelectorAll(".nav-tab"),
  homeLeader: document.querySelector("#homeLeader"),
  homeDeckCount: document.querySelector("#homeDeckCount"),
  homePoolCount: document.querySelector("#homePoolCount"),
  leaderTotal: document.querySelector("#leaderTotal"),
  characterTotal: document.querySelector("#characterTotal"),
  eventTotal: document.querySelector("#eventTotal"),
  stageTotal: document.querySelector("#stageTotal"),
  deckTitle: document.querySelector("#deckTitle"),
  deckName: document.querySelector("#deckName"),
  deckCount: document.querySelector("#deckCount"),
  deckWarnings: document.querySelector("#deckWarnings"),
  leaderSlot: document.querySelector("#leaderSlot"),
  deckList: document.querySelector("#deckList"),
  cardGrid: document.querySelector("#cardGrid"),
  filteredCount: document.querySelector("#filteredCount"),
  searchInput: document.querySelector("#searchInput"),
  filterQuick: document.querySelector("#filterQuick"),
  categoryFilter: document.querySelector("#categoryFilter"),
  colorFilter: document.querySelector("#colorFilter"),
  setFilter: document.querySelector("#setFilter"),
  costFilter: document.querySelector("#costFilter"),
  powerFilter: document.querySelector("#powerFilter"),
  counterFilter: document.querySelector("#counterFilter"),
  rarityFilter: document.querySelector("#rarityFilter"),
  blockFilter: document.querySelector("#blockFilter"),
  clearSearch: document.querySelector("#clearSearch"),
  runSearch: document.querySelector("#runSearch"),
  showSearchTips: document.querySelector("#showSearchTips"),
  closeSearchTips: document.querySelector("#closeSearchTips"),
  searchTipsDialog: document.querySelector("#searchTipsDialog"),
  openCardImport: document.querySelector("#openCardImport"),
  closeCardImport: document.querySelector("#closeCardImport"),
  cardImportDialog: document.querySelector("#cardImportDialog"),
  cardImportForm: document.querySelector("#cardImportForm"),
  importImage: document.querySelector("#importImage"),
  importCardNumber: document.querySelector("#importCardNumber"),
  importName: document.querySelector("#importName"),
  importCategory: document.querySelector("#importCategory"),
  importColors: document.querySelector("#importColors"),
  importCost: document.querySelector("#importCost"),
  importPower: document.querySelector("#importPower"),
  importCounter: document.querySelector("#importCounter"),
  importAttribute: document.querySelector("#importAttribute"),
  importTypes: document.querySelector("#importTypes"),
  importRarity: document.querySelector("#importRarity"),
  importKeywords: document.querySelector("#importKeywords"),
  importEffectText: document.querySelector("#importEffectText"),
  importStatus: document.querySelector("#importStatus"),
  clearImportedCards: document.querySelector("#clearImportedCards"),
  saveDeck: document.querySelector("#saveDeck"),
  startPracticeTop: document.querySelector("#startPracticeTop"),
  quickBuild: document.querySelector("#quickBuild"),
  clearDeckHome: document.querySelector("#clearDeckHome"),
  autoFillDeck: document.querySelector("#autoFillDeck"),
  clearDeck: document.querySelector("#clearDeck"),
  resetFilters: document.querySelector("#resetFilters"),
  saveDeckMini: document.querySelector("#saveDeckMini"),
  savedDecksTab: document.querySelector("#savedDecksTab"),
  savedDecksPanel: document.querySelector("#savedDecksPanel"),
  closeSavedDecks: document.querySelector("#closeSavedDecks"),
  savedDeckList: document.querySelector("#savedDeckList"),
  cardCreationTab: document.querySelector("#cardCreationTab"),
  cardCreationPanel: document.querySelector("#cardCreationPanel"),
  closeCardCreation: document.querySelector("#closeCardCreation"),
  cardCreationForm: document.querySelector("#cardCreationForm"),
  creationImage: document.querySelector("#creationImage"),
  creationCardNumber: document.querySelector("#creationCardNumber"),
  creationName: document.querySelector("#creationName"),
  creationCategory: document.querySelector("#creationCategory"),
  creationColors: document.querySelector("#creationColors"),
  creationCost: document.querySelector("#creationCost"),
  creationPower: document.querySelector("#creationPower"),
  creationCounter: document.querySelector("#creationCounter"),
  creationAttribute: document.querySelector("#creationAttribute"),
  creationTypes: document.querySelector("#creationTypes"),
  creationRarity: document.querySelector("#creationRarity"),
  creationKeywords: document.querySelector("#creationKeywords"),
  creationEffectText: document.querySelector("#creationEffectText"),
  creationStatus: document.querySelector("#creationStatus"),
  clearCreationForm: document.querySelector("#clearCreationForm"),
  creationImagePreview: document.querySelector("#creationImagePreview"),
  startGame: document.querySelector("#startGame"),
  drawCard: document.querySelector("#drawCard"),
  addDon: document.querySelector("#addDon"),
  passTurn: document.querySelector("#passTurn"),
  endGame: document.querySelector("#endGame"),
  phaseAction: document.querySelector("#phaseAction"),
  phaseStatus: document.querySelector("#phaseStatus"),
  gameTitle: document.querySelector("#gameTitle"),
  turnBadge: document.querySelector("#turnBadge"),
  phaseLog: document.querySelector("#phaseLog"),
  gameBoard: document.querySelector("#gameBoard"),
  gameLogMessages: document.querySelector("#gameLogMessages"),
  previewImage: document.querySelector("#previewImage"),
  previewPlaceholder: document.querySelector("#previewPlaceholder"),
  cardDialog: document.querySelector("#cardDialog"),
  cardPreview: document.querySelector("#cardPreview"),
  closePreview: document.querySelector("#closePreview")
};

function isBlockEffect(effect) {
  return Boolean(
    effect &&
    effect.system !== "customEffectV2" &&
    effect.timing &&
    Array.isArray(effect.actions)
  );
}

function isCustomEffectV2(effect) {
  return effect?.system === "customEffectV2";
}

function effectDedupeKey(effect) {
  if (!effect || typeof effect !== "object") return JSON.stringify(effect);
  const system = effect.system || effect.type || "effect";
  const id = effect.id || "";
  if (id) return `${system}:${id}`;
  return `${system}:${effect.event?.type || effect.timing?.type || ""}:${effect.generatedText || effect.text || effect.sourceText || JSON.stringify(effect)}`;
}

function dedupeEffects(effects) {
  const seen = new Set();
  const deduped = [];

  (Array.isArray(effects) ? effects : []).forEach(effect => {
    const key = effectDedupeKey(effect);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(effect);
  });

  return deduped;
}

function dedupeCustomEffectV2(rawEffects, explicitEffects = []) {
  return dedupeEffects([
    ...(Array.isArray(explicitEffects) ? explicitEffects : []),
    ...(Array.isArray(rawEffects) ? rawEffects.filter(isCustomEffectV2) : [])
  ]);
}

function normalizeCard(raw, category) {
  const id = String(raw.id || raw.cardNumber || crypto.randomUUID());
  const cardNumber = raw.cardNumber || id;
  const setCode = String(cardNumber).split("-")[0] || "";
  const colorText = String(raw.color || raw.colors || "colorless");
  const normalizedCategory = normalizeCategory(category || raw.category || raw.cardType);
  const colors = colorText
    .split(/[,/]/)
    .map(color => color.trim().toLowerCase())
    .filter(Boolean);
  const rawEffects = dedupeEffects(Array.isArray(raw.effects) ? raw.effects : []);
  const customEffectV2 = dedupeCustomEffectV2(rawEffects, raw.customEffectV2);
  const blockEffects = Array.isArray(raw.effectBlocks)
    ? raw.effectBlocks
    : rawEffects.filter(isBlockEffect);
  const effects = rawEffects.length
    ? rawEffects
        .map(effect => effect.generatedText || effect.text || effect.sourceText)
        .filter(Boolean)
        .join("\n")
    : String(raw.effect || raw.text || "");

  return {
    id,
    cardNumber,
    setCode,
    block: setCode.replace(/\d.*/, "") || setCode,
    name: raw.name || "Unnamed Card",
    category: normalizedCategory,
    type: raw.type || "",
    colors: colors.length ? colors : ["colorless"],
    attribute: raw.attribute || "",
    cost: raw.cost ?? "",
    power: raw.power ?? "",
    counter: raw.counter ?? "",
    life: raw.life ?? "",
    rarity: raw.rarity || "",
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    effects,
    rawEffects,
    customEffectV2,
    effectBlocks: blockEffects,
    imageUrl: normalizeImagePath(raw.image || ""),
    effectScript: raw.effectScript || raw.script || "",
    imported: Boolean(raw.imported || raw.needsCoding),
    needsCoding: Boolean(raw.needsCoding),
    importSource: raw.importSource || null,
    effectStatus: raw.effectStatus || ""
  };
}

function normalizeImportedCard(raw) {
  const category = normalizeCategory(raw.category || raw.cardType || raw.type);
  return normalizeCard(raw, category);
}

function normalizeCategory(value) {
  const text = String(value || "").trim().toLowerCase();
  if (["leader", "character", "event", "stage"].includes(text)) return text;
  if (text.includes("leader")) return "leader";
  if (text.includes("event")) return "event";
  if (text.includes("stage")) return "stage";
  return "character";
}

function normalizeImagePath(path) {
  return String(path || "").replace(/^\.\.\//, "");
}

async function loadCardFile(file) {
  const cacheBreaker = file.optional ? `?v=${Date.now()}` : "";
  const response = await fetch(`${file.path}${cacheBreaker}`, { cache: file.optional ? "no-store" : "default" });

  if (!response.ok) {
    if (file.optional) return [];
    throw new Error(`Could not load ${file.path}`);
  }

  const payload = await response.json();
  const cards = Array.isArray(payload)
    ? payload
    : Object.values(payload || {});

  return cards.map(card => normalizeCard(card, file.category || card.category || card.cardType));
}

function cardLibraryKey(card) {
  const category = normalizeCategory(card.category || card.cardType);
  const name = String(card.name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return category === "leader" && name
    ? `${category}:${name}`
    : `${category}:${String(card.cardNumber || card.id || name).toLowerCase()}`;
}

function dedupeCards(cards) {
  const seen = new Set();
  const deduped = [];

  cards.forEach(card => {
    const key = cardLibraryKey(card);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(card);
  });

  return deduped;
}

async function loadCardPool() {
  try {
    const groups = await Promise.all(CARD_FILES.map(loadCardFile));
    const loadedCards = groups.flat();
    const loadedKeys = new Set(loadedCards.map(cardLibraryKey));
    const legacyCards = loadImportedCards()
      .map(normalizeImportedCard)
      .filter(card => !loadedKeys.has(cardLibraryKey(card)));

    state.cards = dedupeCards([
      ...loadedCards,
      ...legacyCards
    ]).sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));
    populateFilterOptions();
    renderAll();
    updateImportStatus();
  } catch (error) {
    el.cardGrid.innerHTML = `<div class="empty">Card data could not be loaded. Run this through the included local server, then refresh.</div>`;
    if (el.phaseLog) el.phaseLog.textContent = error.message;
    setGameLog(error.message);
  }
}

function loadImportedCards() {
  try {
    const cards = JSON.parse(localStorage.getItem(CUSTOM_CARDS_KEY) || "[]");
    if (!Array.isArray(cards)) return [];
    return dedupeImportedCards(cards);
  } catch {
    localStorage.removeItem(CUSTOM_CARDS_KEY);
    return [];
  }
}

function importedCardDedupeKey(card) {
  const category = normalizeCategory(card.category || card.cardType || card.type);
  const name = String(card.name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return category === "leader" && name
    ? `${category}:${name}`
    : `${category}:${card.cardNumber || card.id || name}`;
}

function dedupeImportedCards(cards) {
  const seen = new Set();
  const deduped = [];

  cards.forEach(card => {
    const key = importedCardDedupeKey(card);

    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(card);
  });

  if (deduped.length !== cards.length) {
    try {
      localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(deduped));
    } catch (error) {
      console.warn(error);
    }
  }

  return deduped;
}

function saveImportedCards(cards) {
  try {
    localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
    return true;
  } catch (error) {
    console.error(error);
    toast("Card library storage is full. Clear imports or use a smaller image.");
    return false;
  }
}

async function loadProjectCards() {
  try {
    const response = await fetch(`data/cards/custom-project-cards.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload) ? payload : Object.values(payload || {});
  } catch {
    return [];
  }
}

function projectCardsToObject(cards) {
  return cards.reduce((result, card) => {
    const key = String(card.cardNumber || card.id || "").trim();
    if (!key) return result;
    const effects = dedupeEffects(card.effects || []);
    const effectKeys = new Set(effects.map(effectDedupeKey));
    const customEffectV2 = dedupeCustomEffectV2([], card.customEffectV2)
      .filter(effect => !effectKeys.has(effectDedupeKey(effect)));
    const effectBlocks = dedupeEffects(card.effectBlocks || []);
    result[key] = {
      ...card,
      id: card.id || key,
      cardNumber: card.cardNumber || key,
      effects,
      customEffectV2,
      effectBlocks,
      imported: card.imported !== false
    };
    return result;
  }, {});
}

async function saveProjectCards(cards) {
  try {
    const response = await fetch(PROJECT_CARDS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectCardsToObject(cards))
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Server returned ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error(error);
    toast("Permanent save failed. Start the local server with npm run dev, then try again.");
    return false;
  }
}

function nextImportedCardNumber(prefix = "JJBA") {
  const numbers = [
    ...state.cards,
    ...loadImportedCards()
  ]
    .map(card => String(card.cardNumber || ""))
    .map(number => number.match(new RegExp(`^${prefix}-(\\d+)$`, "i"))?.[1])
    .filter(Boolean)
    .map(Number);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function updateImportStatus() {
  if (!el.importStatus) return;
  const importedCount = state.cards.filter(card => card.imported || card.needsCoding).length;
  el.importStatus.textContent = `Custom/project cards: ${importedCount}`;
}

function openCardImportDialog() {
  if (!el.cardImportDialog) return;
  if (!el.importCardNumber.value.trim()) {
    el.importCardNumber.value = nextImportedCardNumber();
  }
  updateImportStatus();
  el.cardImportDialog.showModal();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImageSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load card image."));
    image.src = source;
  });
}

async function compressImageDataUrl(source) {
  if (!source?.startsWith("data:image/")) return source;
  try {
    const image = await loadImageSource(source);
    const scale = Math.min(
      1,
      IMPORT_IMAGE_MAX_WIDTH / image.naturalWidth,
      IMPORT_IMAGE_MAX_HEIGHT / image.naturalHeight
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const compressed = canvas.toDataURL("image/webp", IMPORT_IMAGE_QUALITY);
    if (compressed.startsWith("data:image/webp") && compressed.length < source.length) {
      return compressed;
    }
    const jpeg = canvas.toDataURL("image/jpeg", IMPORT_IMAGE_QUALITY);
    return jpeg.length < source.length ? jpeg : source;
  } catch (error) {
    console.warn(error);
    return source;
  }
}

async function compressImportedCardImages(cards) {
  const compactCards = [];
  for (const card of cards) {
    if (String(card.image || "").startsWith("data:image/")) {
      compactCards.push({ ...card, image: await compressImageDataUrl(card.image) });
    } else {
      compactCards.push(card);
    }
  }
  return compactCards;
}

function csvValues(value) {
  return String(value || "")
    .split(/[,/]/)
    .map(part => part.trim())
    .filter(Boolean);
}

function setSelectValueWithFallback(select, value) {
  if (!select) return;
  const normalized = String(value ?? "");

  if (normalized && ![...select.options].some(option => option.value === normalized)) {
    const option = document.createElement("option");
    option.value = normalized;
    option.textContent = normalized;
    select.appendChild(option);
  }

  select.value = normalized;
}

const EFFECT_BRICKS = {
  attachRestedDon: {
    label: "Attach Rested DON!!",
    type: "activateMain",
    actionId: "attachRestedDonToLeaderOrCharacter",
    fields: [
      ["timing", "Timing", "select", "activateMain", [["activateMain", "Activate: Main"], ["onPlay", "On Play"], ["whenAttacking", "When Attacking"]]],
      ["amount", "Amount", "number", 1],
      ["target", "Target", "select", "leaderOrCharacter", [["leaderOrCharacter", "Leader or Character"], ["character", "Character only"]]],
      ["oncePerTurn", "Once per turn", "checkbox", true],
      ["optional", "Optional / up to", "checkbox", true]
    ]
  },
  searchTopDeck: {
    label: "Search Top Deck",
    type: "onPlay",
    actionId: "lookTopCards",
    fields: [
      ["timing", "Timing", "select", "onPlay", [["onPlay", "On Play"], ["main", "Main"], ["trigger", "Trigger"]]],
      ["look", "Look at top", "number", 5],
      ["add", "Add up to", "number", 1],
      ["typeText", "Type contains", "text", ""],
      ["maxCost", "Cost or less", "number", ""],
      ["destination", "Rest go to", "select", "bottomDeck", [["bottomDeck", "Bottom deck"], ["trash", "Trash"], ["life", "Life"]]],
      ["thenDraw", "Then draw 1", "checkbox", false]
    ]
  },
  drawCards: {
    label: "Draw Cards",
    type: "onPlay",
    actionId: "drawCards",
    fields: [
      ["timing", "Timing", "select", "onPlay", [["onPlay", "On Play"], ["main", "Main"], ["activateMain", "Activate: Main"], ["endOfYourTurn", "End of Your Turn"]]],
      ["amount", "Amount", "number", 1],
      ["requiredName", "Requires character name", "text", ""],
      ["requiredAttachedDon", "Requires attached DON!!", "number", ""]
    ]
  },
  powerBoost: {
    label: "Power Boost",
    type: "main",
    actionId: "powerBoost",
    fields: [
      ["timing", "Timing", "select", "main", [["main", "Main"], ["counter", "Counter"], ["trigger", "Trigger"], ["yourTurn", "Your Turn"]]],
      ["target", "Target", "select", "leaderOrCharacter", [["leaderOrCharacter", "Leader or Character"], ["charactersWithDon", "Characters with DON!!"], ["self", "This card"]]],
      ["power", "Power", "number", 1000],
      ["duration", "Duration", "select", "turn", [["turn", "This turn"], ["battle", "This battle"]]],
      ["requiredTokens", "DON!! x", "number", ""]
    ]
  },
  koOpponent: {
    label: "K.O. Opponent Character",
    type: "main",
    actionId: "koOpponentCharacterByPower",
    fields: [
      ["timing", "Timing", "select", "main", [["main", "Main"], ["trigger", "Trigger"], ["whenAttacking", "When Attacking"]]],
      ["maxPower", "Power or less", "number", ""],
      ["maxCost", "Cost or less", "number", ""],
      ["keyword", "Keyword", "text", ""]
    ]
  },
  restCard: {
    label: "Rest / Ready Cards",
    type: "main",
    actionId: "restOpponentCardThenSetOwnCostActive",
    fields: [
      ["timing", "Timing", "select", "main", [["main", "Main"], ["counter", "Counter"]]],
      ["restOpponent", "Rest opponent card", "checkbox", true],
      ["setOwnActive", "Set own card active", "checkbox", false],
      ["maxCost", "Own cost or less", "number", ""]
    ]
  },
  playNamedFromHand: {
    label: "Play Named From Hand",
    type: "onPlay",
    actionId: "restDonPlayNamedCharacterFromHand",
    fields: [
      ["timing", "Timing", "select", "onPlay", [["onPlay", "On Play"], ["main", "Main"], ["whenAttacking", "When Attacking"]]],
      ["requiredName", "Name", "text", ""],
      ["costActiveDon", "Rest DON!! cost", "number", 1]
    ]
  },
  trashNamedReadySelf: {
    label: "Trash Named, Ready Self",
    type: "whenAttacking",
    actionId: "trashOwnNamedCharacterSetSourceActive",
    fields: [
      ["timing", "Timing", "select", "whenAttacking", [["whenAttacking", "When Attacking"], ["activateMain", "Activate: Main"]]],
      ["requiredName", "Name to trash", "text", ""],
      ["oncePerTurn", "Once per turn", "checkbox", true]
    ]
  },
  activateEventFromHand: {
    label: "Activate Event From Hand",
    type: "whenAttacking",
    actionId: "activateHamonEventFromHandThenDraw",
    fields: [
      ["timing", "Timing", "select", "whenAttacking", [["whenAttacking", "When Attacking"], ["activateMain", "Activate: Main"]]],
      ["typeText", "Event type", "text", "Hamon"],
      ["thenDraw", "Then draw 1", "checkbox", true]
    ]
  }
};

function parseEffectTextToBlocks(effectText, cardNumber) {
  const text = String(effectText || "").trim();

  if (!text) {
    return {
      effects: [],
      validation: { valid: true, errors: [], warnings: [] }
    };
  }

  try {
    const result = window.CustomEffectV2?.parseAndValidate
      ? window.CustomEffectV2.parseAndValidate(text, { cardNumber })
      : window.EffectBlockValidator?.parseAndValidate(text, { cardNumber });

    if (!result) {
      return {
        effects: [],
        validation: { valid: true, errors: [], warnings: [] }
      };
    }

    return {
      effects: result.valid ? result.effects : result.effects,
      validation: result.validation
    };
  } catch (error) {
    return {
      effects: [],
      validation: {
        valid: false,
        errors: [error.message],
        warnings: []
      }
    };
  }
}

function initializeEffectBlockEditor() {
  // Effect block editor disabled - effects saved as plain text only
}


function creationBlockEffectsForSave(cardNumber) {
  return {
    effects: [],
    validation: { valid: true, errors: [], warnings: [] }
  };
}

function effectTimingText(effect) {
  if (isCustomEffectV2(effect)) {
    return window.CustomEffectV2?.labelForEvent?.(effect.event?.type) || effect.event?.type || "Effect";
  }

  return timingLabel(effect?.timing?.type || effect?.type);
}

function targetText(effect, targetId) {
  const target = effect?.targets?.find(item => item.id === targetId);
  if (!target) return targetId || "no target";

  const player = {
    self: "your",
    opponent: "opponent's",
    any: "any"
  }[target.controller] || target.controller;
  const zone = {
    leader: "Leader",
    opponentLeader: "Leader",
    characters: "Characters",
    leaderOrCharacters: "Leader or Characters",
    stage: "Stage",
    hand: "hand",
    trash: "trash",
    deck: "deck",
    deckTop: "top deck",
    board: "board cards",
    source: "this card",
    don: "DON!!",
    activeDon: "active DON!!",
    restedDon: "rested DON!!",
    life: "life"
  }[target.zone] || target.zone;
  const amount = target.count?.max
    ? `${target.optional ? "up to " : ""}${target.count.max} `
    : "";
  const filters = target.filters?.length
    ? ` (${target.filters.map(filter => `${filter.field} ${filter.operator} ${filter.value}`).join(", ")})`
    : "";

  return `${amount}${player} ${zone}${filters}`;
}

function costText(cost) {
  const labels = {
    donMinus: `DON!! -${cost.amount ?? 1}`,
    restDon: `Rest ${cost.amount ?? 1} DON!!`,
    restThisCard: "Rest this card",
    trashThisCard: "Trash this card",
    trashCardsFromHand: `Trash ${cost.amount ?? 1} card(s) from hand`,
    discardCards: `Discard ${cost.amount ?? 1} card(s)`,
    returnDon: `Return ${cost.amount ?? 1} DON!!`,
    trashLife: `Trash ${cost.amount ?? 1} life`
  };

  return labels[cost.type] || cost.type;
}

function actionText(effect, action) {
  const target = isCustomEffectV2(effect)
    ? friendlyV2TargetText(effect, action.target)
    : targetText(effect, action.target);
  const duration = {
    untilEndOfTurn: "this turn",
    untilOpponentNextTurn: "opponent's next turn",
    duringBattle: "this battle",
    permanent: "the game"
  }[action.duration] || action.duration || "turn";
  const labels = {
    draw: `Draw ${action.amount ?? 1} card(s)`,
    ko: `K.O. ${target}`,
    rest: `Rest ${target}`,
    setActive: `Set ${target} active`,
    modifyPower: `Give ${target} ${Number(action.amount || 0) >= 0 ? "+" : ""}${action.amount ?? 0} power during ${duration}`,
    setPower: `Set ${target} power to ${action.amount ?? 0}${action.duration === "permanent" ? "" : ` during ${duration}`}`,
    giveKeyword: `Give ${target} ${action.keyword || "keyword"} during ${duration}`,
    addStatus: `Give ${target} ${statusText(action.status)} during ${duration}`,
    preventEvent: "Prevent the current event",
    addRestedDon: `Add ${action.amount ?? 1} rested DON!!`,
    setDonActive: `Set ${action.amount ?? 1} DON!! active`,
    returnDon: `Return ${action.amount ?? 1} DON!!`,
    chooseOne: `Choose one mode (${Array.isArray(action.options) ? action.options.length : 0} option(s))`,
    playFromHand: `Play ${target} from hand`,
    playFromTrash: `Play ${target} from trash`,
    playThisCard: "Play this card",
    addThisCardToHand: "Add this card to hand",
    activateMainEffect: "Activate this card's Main effect",
    trashTopDeck: `Trash top ${action.amount ?? 1} card(s) of deck`,
    trashSelectedHand: `Trash ${target} from hand`,
    opponentPlaceHandBottomDeck: `Place ${action.amount ?? 1} opponent hand card(s) on bottom deck`,
    addTrashToBottomDeck: `Put ${action.amount ?? 1} trash card(s) on bottom deck`,
    searchTopDeck: `Look at top ${action.amount ?? 1} card(s) of deck; choose ${target} to ${searchDestinationText(action.selectedDestination || "hand")}; rest to ${searchDestinationText(action.restDestination || "bottomDeck")}`,
    reveal: `Reveal ${target}`,
    addToHand: `Add ${target} to hand`,
    putRestBottomDeck: "Put the remaining cards on bottom deck",
    putRestTrash: "Put the remaining cards in trash",
    trashOpponentLife: `Trash ${action.amount ?? 1} opponent life`,
    healLife: `Add ${action.amount ?? 1} life`,
    trashThisCard: "Trash this card",
    bounceToHand: `Return ${target} to hand`,
    placeBottomDeck: `Place ${target} on bottom deck`,
    placeTrashBottomDeckSelected: `Place ${target} on bottom deck`,
    attachRestedDon: `Attach up to ${action.amount ?? 1} rested DON!! to ${target}`,
    playSelected: `Play ${target}`
  };

  const label = labels[action.type] || action.type;
  const conditions = Array.isArray(action.conditions) && action.conditions.length
    ? ` if ${action.conditions.map(conditionText).join(" and ")}`
    : "";

  return `${label}${conditions}`;
}

function statusText(status) {
  const labels = {
    cannotAttackLeader: "cannot attack leaders",
    cannotAttack: "cannot attack",
    cannotBlock: "cannot block",
    cannotBecomeActive: "cannot become active",
    cannotBeRested: "cannot be rested"
  };

  return labels[status] || status || "a restriction";
}

function searchDestinationText(destination) {
  return {
    hand: "hand",
    characterField: "field",
    trash: "trash",
    bottomDeck: "bottom deck",
    topDeck: "top deck",
    life: "life"
  }[destination] || destination || "hand";
}

function conditionText(condition = {}) {
  if (condition.type === "controlCardName") {
    return `you control ${condition.value}`;
  }

  if (condition.type === "leaderNameEquals") {
    return `your Leader is exactly ${condition.value}`;
  }

  if (condition.type === "leaderNameIncludes") {
    return `your Leader name includes ${condition.value}`;
  }

  if (condition.type === "selfControlsCharacterPower") {
    return `you control a Character with power ${condition.operator || ">="} ${condition.value}`;
  }

  if (condition.type === "opponentControlsCharacterPower") {
    return `opponent controls a Character with power ${condition.operator || ">="} ${condition.value}`;
  }

  const controller = condition.controller === "opponent" ? "opponent" : "you";
  const value = condition.value ?? condition.amount ?? "";
  const operator = condition.operator ? ` ${condition.operator}` : "";

  return `${controller} ${condition.field || condition.type}${operator}${value !== "" ? ` ${value}` : ""}`;
}

function friendlyV2TargetText(effect, targetId) {
  if (!targetId) return "no target";

  const selectionTarget = effect?.targets?.find(target => target.id === targetId);

  if (selectionTarget) {
    return window.CustomEffectV2?.labelForSelectionTarget?.(selectionTarget) || selectionTarget.label || "chosen card";
  }

  return window.CustomEffectV2?.labelForTarget?.(targetId) || targetId;
}

function v2EventDetailsText(effect) {
  if (effect?.event?.type !== "wouldBeKOd") return "";

  const target = effect.event.target || { controller: "self", zone: "characters" };
  const controller = {
    self: "your",
    opponent: "opponent's",
    any: "any"
  }[target.controller] || target.controller || "your";
  const zone = {
    characters: "Characters",
    leader: "Leader",
    leaderOrCharacters: "Leader or Characters",
    stage: "Stage",
    board: "board cards"
  }[target.zone] || target.zone || "Characters";
  const cause = {
    cardEffect: "by a card effect",
    battle: "by battle",
    any: "by any cause"
  }[effect.event.sourceType] || "by a card effect";

  return `Replaces: ${controller} ${zone} would be K.O.'d ${cause}`;
}


function importedCardFromForm(imageDataUrl) {
  const cardNumber = el.importCardNumber.value.trim() || nextImportedCardNumber();
  const category = normalizeCategory(el.importCategory.value);
  const effectText = el.importEffectText.value.trim();
  const parsedBlocks = parseEffectTextToBlocks(effectText, cardNumber);
  const colors = csvValues(el.importColors.value).map(color => color.toLowerCase());
  const keywords = csvValues(el.importKeywords.value);
  const costOrLife = el.importCost.value === "" ? "" : Number(el.importCost.value);
  const customEffectV2 = parsedBlocks.effects.filter(isCustomEffectV2);
  const oldEffectBlocks = parsedBlocks.effects.filter(isBlockEffect);

  return {
    id: cardNumber,
    cardNumber,
    name: el.importName.value.trim(),
    category,
    cardType: category,
    type: el.importTypes.value.trim(),
    color: colors.join(","),
    colors,
    cost: category === "leader" ? "" : costOrLife,
    life: category === "leader" ? costOrLife : "",
    power: el.importPower.value === "" ? "" : Number(el.importPower.value),
    counter: el.importCounter.value === "" ? "" : Number(el.importCounter.value),
    attribute: el.importAttribute.value.trim(),
    rarity: el.importRarity.value.trim(),
    keywords,
    effects: parsedBlocks.validation.valid && parsedBlocks.effects.length
      ? parsedBlocks.effects
      : effectText
        ? [{ id: `${cardNumber}-text`, type: "text", text: effectText }]
        : [],
    effect: effectText,
    customEffectV2: parsedBlocks.validation.valid ? customEffectV2 : [],
    effectBlocks: parsedBlocks.validation.valid ? oldEffectBlocks : [],
    image: imageDataUrl,
    importedAt: new Date().toISOString(),
    imported: true,
    needsCoding: true
  };
}

function initializeCardCreation() {
  if (el.creationCardNumber && !el.creationCardNumber.value.trim()) {
    el.creationCardNumber.value = nextImportedCardNumber();
  }
}



function timingLabel(timing) {
  return {
    onPlay: "On Play",
    main: "Main",
    activateMain: "Activate: Main",
    whenAttacking: "When Attacking",
    counter: "Counter",
    trigger: "Trigger",
    yourTurn: "Your Turn",
    endOfYourTurn: "End of Your Turn"
  }[timing] || "Effect";
}

const CARD_SCRIPT_EVENTS = {
  on_play: "onPlay",
  main: "main",
  activate_main: "activateMain",
  when_attacking: "whenAttacking",
  counter: "counter",
  trigger: "trigger",
  your_turn: "yourTurn",
  end_of_your_turn: "endOfYourTurn"
};


function quotedValue(command, keyword) {
  const pattern = new RegExp(`(?:^|\\s)${keyword}\\s+"([^"]+)"`, "i");
  return (command.match(pattern) || [])[1] || "";
}

function numberAfter(command, keyword, fallback = "") {
  const pattern = new RegExp(`${keyword}\\s*(\\d+)`, "i");
  const value = (command.match(pattern) || [])[1];
  return value === undefined ? fallback : Number(value);
}

function unquotedToken(command, keyword) {
  const pattern = new RegExp(`(?:^|\\s)${keyword}\\s+([^\\s]+)`, "i");
  return (command.match(pattern) || [])[1] || "";
}

function expandFriendlyCardScript(script) {
  const lines = String(script || "").split(/\r?\n/);
  const output = [];
  let friendlyBlock = null;

  const flushFriendlyBlock = () => {
    if (!friendlyBlock) return;
    output.push(...translateFriendlyBlock(friendlyBlock.type, friendlyBlock.lines));
    friendlyBlock = null;
  };

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    const eventMatch = line.match(/^([a-z_]+)(?:\s+([^:]+))?:\s*$/i);
    const friendlyLabel = line.match(/^([a-z ]+):\s*$/i);

    if (eventMatch && CARD_SCRIPT_EVENTS[eventMatch[1]]) {
      flushFriendlyBlock();
      output.push(rawLine);
      return;
    }

    if (friendlyLabel) {
      const label = friendlyLabel[1].toLowerCase().replace(/\s+/g, "_");
      const blockType = {
        search: "search",
        set_don_active: "setDonActive",
        set_active_don: "setDonActive",
        rest_don_cost: "restDonCost",
        cannot_play: "cannotPlay",
        attach_rested_don: "attachRestedDon",
        give_keyword: "giveKeyword",
        trash_from_hand: "trashFromHand",
        place_opponent_card: "placeOpponentCard",
        if_no_card_played: "ifNoCardPlayed",
        play_from_hand: "playFromHand",
        draw: "draw",
        power: "power",
        ko: "ko",
        rest: "rest",
        play: "play",
        use_event: "useEvent",
        activate_event: "useEvent",
        return: "return",
        trash_named: "trashNamed",
        trash_self: "trashSelf",
        ready_self: "readySelf",
        ready: "ready"
      }[label];

      if (blockType) {
        flushFriendlyBlock();
        friendlyBlock = { type: blockType, lines: [] };
        return;
      }
    }

    if (friendlyBlock) {
      friendlyBlock.lines.push(line);
      return;
    }

    output.push(rawLine);
  });

  flushFriendlyBlock();
  return output.join("\n");
}

function translateFriendlyBlock(type, lines) {
  const text = lines.join(" ");
  const lower = text.toLowerCase();

  if (type === "search") {
    const top = (text.match(/\btop\s+(\d+)/i) || [])[1] || 5;
    const reveal = text.match(/\breveal\s+(?:(up\s*to|up_to)\s+)?(\d+)/i);
    const add = text.match(/\badd\s+(?:(up\s*to|up_to)\s+)?(\d+)/i);
    const addAmount = (reveal || add || [])[2] || 1;
    const addMode = (reveal?.[1] || add?.[1]) ? "add_up_to" : "add";
    const toLine = lines.find(line => /\bto field\b/i.test(line) || /\bto\s+(hand|life|trash|character field|character_field|field|play)\b/i.test(line)) || "";
    const restLine = lines.find(line => /\bsend rest to\b/i.test(line) || /\brest_to\b/i.test(line)) || "";
    const toField = (toLine.match(/\bto field\s*:?\s*([a-z_ ]+)/i) || toLine.match(/\bto\s+(hand|life|trash|character field|character_field|field|play)/i) || [])[1] || "hand";
    const restTo = (restLine.match(/\bsend rest to\s+([a-z_]+)/i) || restLine.match(/\brest_to\s+([a-z_]+)/i) || [])[1] || "bottom_deck";
    const filters = searchFilterCommandParts(text).join(" ");
    const grantKeyword = (text.match(/\bgains?\s+([a-z ]+?)(?=\s|$)/i) || [])[1];
    return [`  search_top ${top} ${addMode} ${addAmount}${filters ? ` ${filters}` : ""} to ${toField.trim().replace(/\s+/g, "_")}${grantKeyword ? ` grant_keyword "${grantKeyword.trim()}"` : ""} rest_to ${restTo.trim().replace(/\s+/g, "_")}`];
  }

  if (type === "setDonActive") {
    return [`  set_active_don up_to ${Number((text.match(/(\d+)/) || [])[1] || 1)}`];
  }

  if (type === "cannotPlay") {
    const cardType = lower.includes("event")
      ? "event"
      : lower.includes("stage")
        ? "stage"
        : lower.includes("leader")
          ? "leader"
          : "character";
    return [`  lock_play ${cardType} this_turn`];
  }

  if (type === "restDonCost") {
    return [`  rest_don_cost ${Number((text.match(/(\d+)/) || [])[1] || 1)}`];
  }

  if (type === "attachRestedDon") {
    const amount = Number((text.match(/(?:up\s*to|up_to|exactly)?\s*(\d+)/i) || [])[1] || 1);
    const target = lower.includes("characters") && !lower.includes("leader")
      ? "characters"
      : lower.includes("character") && !lower.includes("leader")
        ? "character"
        : "leader_or_character";
    return [`  attach_rested_don up_to ${amount} to ${target}`];
  }

  if (type === "giveKeyword") {
    const keyword = (text.match(/\bkeyword\s+["{[]?([^"\]}]+)["}\]]?/i) || text.match(/\b(unblockable|rush|blocker|double attack|banish)\b/i) || [])[1] || "unblockable";
    const target = lower.includes("opponent")
      ? "opponent_card"
      : lower.includes("leader") && !lower.includes("character")
        ? "leader"
        : "own_card";
    const duration = lower.includes("battle") ? "battle" : "turn";
    return [`  give_keyword target ${target} keyword "${keyword.trim()}" duration ${duration}`];
  }

  if (type === "trashFromHand") {
    return [`  trash_from_hand ${Number((text.match(/(\d+)/) || [])[1] || 1)}`];
  }

  if (type === "placeOpponentCard") {
    const filters = searchFilterCommandParts(text).join(" ");
    const destination = lower.includes("top_or_bottom") || lower.includes("top or bottom")
      ? "top_or_bottom_deck"
      : lower.includes("top")
        ? "top_deck"
        : "bottom_deck";
    return [`  place_opponent_card${filters ? ` ${filters}` : ""} to ${destination}`];
  }

  if (type === "ifNoCardPlayed") {
    return ["  if_no_card_played"];
  }

  if (type === "playFromHand") {
    const amount = (text.match(/(?:up\s*to|up_to)?\s*(\d+)/i) || [])[1] || 1;
    const filters = searchFilterCommandParts(text).join(" ");
    const toLine = lines.find(line => /\bto\s+(hand|life|trash|character field|character_field|field|play)\b/i.test(line)) || "";
    const toField = (toLine.match(/\bto\s+(hand|life|trash|character field|character_field|field|play)/i) || [])[1] || "character_field";
    return [`  play_from_hand up_to ${amount}${filters ? ` ${filters}` : ""} to ${toField.trim().replace(/\s+/g, "_")}`];
  }

  if (type === "draw") {
    return [`  draw ${Number((text.match(/(\d+)/) || [])[1] || 1)}`];
  }

  if (type === "power") {
    const power = (text.match(/[+＋]\s*(\d+)/) || [])[1] || (text.match(/(\d+)\s*power/i) || [])[1] || 1000;
    const duration = lower.includes("battle") ? "battle" : "turn";
    const target = lower.includes("target leader") && !lower.includes("character")
      ? "leader"
      : "leader_or_character";
    return [`  power target ${target} +${power} duration ${duration}`];
  }

  if (type === "ko") {
    const filters = searchFilterCommandParts(text).join(" ");
    return [`  ko_opponent${filters ? ` ${filters}` : ""}`];
  }

  if (type === "rest") {
    return ["  rest_opponent card"];
  }

  if (type === "ready") {
    const cost = (text.match(/cost\s*(?:<=|or less|less than or equal to)?\s*(\d+)/i) || [])[1] || "";
    return [`  set_own_active${cost ? ` cost_or_less ${cost}` : ""}`];
  }

  if (type === "play") {
    const name = (text.match(/\[([^\]]+)\]/) || text.match(/"([^"]+)"/) || [])[1] || "Card Name";
    const restDon = (text.match(/rest\s+(\d+)\s+don/i) || [])[1] || 0;
    return [`  play_named "${name}" from hand rest_don ${restDon}`];
  }

  if (type === "useEvent") {
    const eventType = (text.match(/\{([^}]+)\}/) || text.match(/"([^"]+)"/) || [])[1] || "Hamon";
    return [`  activate_event_type "${eventType}" from hand${lower.includes("draw") ? " then_draw" : ""}`];
  }

  if (type === "return") {
    const cost = (text.match(/cost\s*(?:<=|or less|less than or equal to)?\s*(\d+)/i) || [])[1] || 3;
    return [`  return_opponent_character cost_or_less ${cost}`];
  }

  if (type === "trashNamed") {
    const name = (text.match(/\[([^\]]+)\]/) || text.match(/"([^"]+)"/) || [])[1] || "Card Name";
    return [`  trash_named "${name}"`];
  }

  if (type === "trashSelf") {
    return ["  trash_self"];
  }

  if (type === "readySelf") {
    return ["  ready_self"];
  }

  return lines.map(line => `  ${line}`);
}

function searchFilterCommandParts(text) {
  const parts = [];
  const quote = value => `"${String(value).replace(/"/g, "")}"`;
  const filterPatterns = [
    ["type", /\b(?:type|subtype)\s+(?:includes?|=|is)?\s*["{[]([^"}\]]+)["}\]]/ig],
    ["type", /\b(?:type|subtype)\s+(?:includes?|=|is)?\s*([a-z][a-z0-9 /-]*?)(?=\s+(?:cost|power|counter|life|color|card type|card_type|category|name|rarity|set|attribute|keyword)\b|$)/ig],
    ["color", /\bcolor\s+(?:=|is)?\s*"?([a-z]+)"?/ig],
    ["card_type", /\b(?:card type|card_type|category)\s+(?:=|is)?\s*"?([a-z]+)"?/ig],
    ["attribute", /\battribute\s+(?:=|is)?\s*"?([a-z]+)"?/ig],
    ["keyword", /\bkeyword\s+(?:includes?|=|is)?\s*"?([a-z ]+?)"?(?=\s+(?:cost|power|counter|color|type|card|name|rarity|set|attribute)\b|$)/ig],
    ["name", /\bname\s+(?:includes?|=|is)?\s*["[]([^"\]]+)["\]]/ig],
    ["name_not", /\bname\s+(?:not|!=|other than)\s*["[]([^"\]]+)["\]]/ig],
    ["rarity", /\brarity\s+(?:=|is)?\s*"?([a-z]+)"?/ig],
    ["set", /\bset\s+(?:=|is)?\s*"?([a-z0-9-]+)"?/ig]
  ];

  filterPatterns.forEach(([key, pattern]) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      parts.push(`${key} ${quote(match[1].trim())}`);
    }
  });

  [
    ["cost_or_less", /\bcost\s*(?:<=|≤|or less|less than or equal to)\s*(\d+)/i],
    ["cost_at_least", /\bcost\s*(?:>=|≥|or more|at least)\s*(\d+)/i],
    ["power_or_less", /\bpower\s*(?:<=|≤|or less|less than or equal to)\s*(\d+)/i],
    ["power_at_least", /\bpower\s*(?:>=|≥|or more|at least)\s*(\d+)/i],
    ["counter_or_less", /\bcounter\s*(?:<=|≤|or less|less than or equal to)\s*(\d+)/i],
    ["counter_at_least", /\bcounter\s*(?:>=|≥|or more|at least)\s*(\d+)/i],
    ["life_or_less", /\blife\s*(?:<=|≤|or less|less than or equal to)\s*(\d+)/i],
    ["life_at_least", /\blife\s*(?:>=|≥|or more|at least)\s*(\d+)/i]
  ].forEach(([key, pattern]) => {
    const value = (text.match(pattern) || [])[1];
    if (value !== undefined) parts.push(`${key} ${value}`);
  });

  if (/\bno counter\b|\bwithout counter\b/i.test(text)) parts.push("counter 0");
  return parts;
}

function parseSearchCommand(command) {
  const quoted = key => quotedValue(command, key) || unquotedToken(command, key);

  return {
    amount: numberAfter(command, "search_top", 5),
    add: numberAfter(command, "add_up_to", numberAfter(command, "add", 1)),
    typeText: quoted("type"),
    color: quoted("color"),
    cardTypeFilter: quoted("card_type"),
    attributeFilter: quoted("attribute"),
    keyword: quoted("keyword"),
    nameIncludes: quoted("name"),
    nameNot: quoted("name_not"),
    rarityFilter: quoted("rarity"),
    setFilter: quoted("set"),
    grantKeyword: quoted("grant_keyword"),
    maxCost: numberAfter(command, "cost_or_less", ""),
    minCost: numberAfter(command, "cost_at_least", ""),
    maxPower: numberAfter(command, "power_or_less", ""),
    minPower: numberAfter(command, "power_at_least", ""),
    maxCounter: numberAfter(command, "counter_or_less", ""),
    minCounter: numberAfter(command, "counter_at_least", ""),
    exactCounter: numberAfter(command, "\\bcounter", ""),
    maxLife: numberAfter(command, "life_or_less", ""),
    minLife: numberAfter(command, "life_at_least", ""),
    toField: quoted("to") || unquotedToken(command, "to") || "hand",
    destination: quoted("rest_to") || unquotedToken(command, "rest_to") || "bottomDeck"
  };
}

function parseRestDonCostCommand(command) {
  return Math.max(0, Number((String(command || "").match(/rest_don_cost\s+(\d+)/i) || [])[1] || 0));
}

function parseGiveKeywordCommand(command) {
  return {
    target: unquotedToken(command, "target") || "own_card",
    keyword: quotedValue(command, "keyword") || unquotedToken(command, "keyword") || "unblockable",
    duration: unquotedToken(command, "duration") || "turn"
  };
}

function parseTrashFromHandCommand(command) {
  return Math.max(1, Number((String(command || "").match(/trash_from_hand\s+(\d+)/i) || [])[1] || 1));
}

function parsePlaceOpponentCardCommand(command) {
  const filters = parseSearchCommand(`search_top 0 add 1 ${String(command || "").replace(/^place_opponent_card\s*/i, "")}`);

  return {
    ...filters,
    destination: unquotedToken(command, "to") || quotedValue(command, "to") || "bottom_deck"
  };
}

function parsePlayFromHandCommand(command) {
  const search = parseSearchCommand(`search_top 0 add ${numberAfter(command, "up_to", 1)} ${String(command || "").replace(/^play_from_hand\s*/i, "")}`);

  return {
    ...search,
    amount: numberAfter(command, "up_to", 1),
    toField: unquotedToken(command, "to") || quotedValue(command, "to") || "character_field"
  };
}

function parseCardScript(script, cardNumber) {
  const lines = expandFriendlyCardScript(script).split(/\r?\n/);
  const blocks = [];
  const errors = [];
  let current = null;

  const finishBlock = () => {
    if (current) blocks.push(current);
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    const eventMatch = line.match(/^([a-z_]+)(?:\s+([^:]+))?:\s*$/i);
    if (eventMatch && CARD_SCRIPT_EVENTS[eventMatch[1]]) {
      finishBlock();
      current = {
        eventKey: eventMatch[1],
        type: CARD_SCRIPT_EVENTS[eventMatch[1]],
        modifiers: String(eventMatch[2] || "").toLowerCase(),
        commands: []
      };
      return;
    }

    if (!current) {
      errors.push(`Line ${index + 1}: start with an event block like on_play:`);
      return;
    }

    current.commands.push(line);
  });

  finishBlock();

  if (!blocks.length && String(script || "").trim()) {
    errors.push("No event blocks found. Try on_play:, main:, activate_main:, or when_attacking:.");
  }

  const effects = blocks.flatMap((block, index) => {
    const effect = effectFromScriptBlock(block, cardNumber, index, errors);
    return Array.isArray(effect) ? effect : [effect];
  });
  return { effects: effects.filter(Boolean), errors };
}

function scriptBlockText(block) {
  const label = timingLabel(block.type);
  return `${label}${block.modifiers.includes("once_per_turn") ? " Once Per Turn" : ""}: ${block.commands.join(" Then, ")}`;
}

function effectFromScriptBlock(block, cardNumber, index, errors) {
  const commands = block.commands.map(command => command.toLowerCase());
  const rawCommands = block.commands;
  const base = {
    id: `${cardNumber}-script-${index + 1}`,
    type: block.type,
    text: scriptBlockText(block),
    oncePerTurn: block.modifiers.includes("once_per_turn")
  };

  const setDonCommand = rawCommands.find(command => /^set_active_don\b/i.test(command));
  const attachCommand = rawCommands.find(command => /^attach_rested_don\b/i.test(command));
  const searchCommand = rawCommands.find(command => /^search_top\b/i.test(command));
  const drawCommand = rawCommands.find(command => /^draw\b/i.test(command));
  const lockCommand = rawCommands.find(command => /^lock_play\b/i.test(command));
  const playNamedCommand = rawCommands.find(command => /^play_named\b/i.test(command));
  const activateEventCommand = rawCommands.find(command => /^activate_event_type\b/i.test(command));
  const trashNamedCommand = rawCommands.find(command => /^trash_named\b/i.test(command));
  const trashSelfCommand = rawCommands.find(command => /^trash_self\b/i.test(command));
  const readySelfCommand = rawCommands.find(command => /^ready_self\b/i.test(command));
  const koCommand = rawCommands.find(command => /^ko_opponent\b/i.test(command));
  const restCommand = rawCommands.find(command => /^rest_opponent\b/i.test(command));
  const powerCommand = rawCommands.find(command => /^power\b/i.test(command));
  const returnCommand = rawCommands.find(command => /^return_opponent_character\b/i.test(command));
  const setOwnActiveCommand = rawCommands.find(command => /^set_own_active\b/i.test(command));
  const restDonCostCommand = rawCommands.find(command => /^rest_don_cost\b/i.test(command));
  const giveKeywordCommand = rawCommands.find(command => /^give_keyword\b/i.test(command));
  const trashFromHandCommand = rawCommands.find(command => /^trash_from_hand\b/i.test(command));
  const placeOpponentCardCommand = rawCommands.find(command => /^place_opponent_card\b/i.test(command));
  const ifNoCardPlayedCommand = rawCommands.find(command => /^if_no_card_played\b/i.test(command));
  const playFromHandCommand = rawCommands.find(command => /^play_from_hand\b/i.test(command));

  if (drawCommand && searchCommand) {
    const drawIndex = rawCommands.indexOf(drawCommand);
    const searchIndex = rawCommands.indexOf(searchCommand);
    const drawEffect = {
      ...base,
      id: `${base.id}-draw`,
      text: `${timingLabel(block.type)}: ${drawCommand}`,
      actionId: "drawCards",
      amount: numberAfter(drawCommand, "draw", 1)
    };
    const searchBlock = {
      ...block,
      commands: rawCommands.filter(command => command !== drawCommand)
    };
    const searchEffect = effectFromScriptBlock(searchBlock, cardNumber, `${index + 1}-search`, errors);
    const ordered = drawIndex < searchIndex
      ? [drawEffect, searchEffect]
      : [searchEffect, drawEffect];

    return ordered.filter(Boolean);
  }

  if (setDonCommand && lockCommand) {
    return {
      ...base,
      actionId: "setActiveDonThenLockCardType",
      amount: numberAfter(setDonCommand, "up_to", 1),
      lockCardType: lockCommand.toLowerCase().includes("event")
        ? "event"
        : lockCommand.toLowerCase().includes("stage")
          ? "stage"
          : "character"
    };
  }

  if (trashSelfCommand && restCommand) {
    return {
      ...base,
      actionId: "trashSelfThenRestOpponentCard"
    };
  }

  if (trashSelfCommand) {
    return {
      ...base,
      actionId: "trashSelf"
    };
  }

  if (searchCommand && ifNoCardPlayedCommand && playFromHandCommand) {
    const search = parseSearchCommand(searchCommand);
    const fallback = parsePlayFromHandCommand(playFromHandCommand);

    return {
      ...base,
      actionId: "searchPlayOrPlayFromHand",
      ...search,
      fallbackTypeText: fallback.typeText,
      fallbackColor: fallback.color,
      fallbackCardTypeFilter: fallback.cardTypeFilter || "character",
      fallbackAttributeFilter: fallback.attributeFilter,
      fallbackKeyword: fallback.keyword,
      fallbackNameIncludes: fallback.nameIncludes,
      fallbackNameNot: fallback.nameNot,
      fallbackMaxCost: fallback.maxCost,
      fallbackMinCost: fallback.minCost,
      fallbackToField: fallback.toField,
      fallbackAmount: fallback.amount
    };
  }

  if (restDonCostCommand && giveKeywordCommand) {
    const keywordEffect = parseGiveKeywordCommand(giveKeywordCommand);

    return {
      ...base,
      actionId: "restDonGiveKeyword",
      costActiveDon: parseRestDonCostCommand(restDonCostCommand),
      ...keywordEffect
    };
  }

  if (trashFromHandCommand && powerCommand) {
    return {
      ...base,
      actionId: "trashHandThenPower",
      trashCount: parseTrashFromHandCommand(trashFromHandCommand),
      powerModifier: numberAfter(powerCommand, "\\+", 1000),
      target: unquotedToken(powerCommand, "target") || "leader_or_character",
      duration: unquotedToken(powerCommand, "duration") || (block.type === "counter" ? "battle" : "turn")
    };
  }

  if (restDonCostCommand && placeOpponentCardCommand) {
    const place = parsePlaceOpponentCardCommand(placeOpponentCardCommand);

    return {
      ...base,
      actionId: "restDonPlaceOpponentCardOnDeck",
      costActiveDon: parseRestDonCostCommand(restDonCostCommand),
      ...place
    };
  }

  if (setDonCommand) {
    return {
      ...base,
      actionId: "setActiveDon",
      amount: numberAfter(setDonCommand, "up_to", 1)
    };
  }

  if (attachCommand) {
    const amount = numberAfter(attachCommand, "up_to", numberAfter(attachCommand, "exactly", 1));
    const toCharacters = attachCommand.toLowerCase().includes("to characters");
    if (toCharacters && drawCommand) {
      return {
        ...base,
        actionId: "attachRestedDonToCharactersThenDraw",
        amount
      };
    }

    return {
      ...base,
      actionId: "attachRestedDonToLeaderOrCharacter",
      amount,
      optional: attachCommand.toLowerCase().includes("up_to")
    };
  }

  if (searchCommand) {
    const search = parseSearchCommand(searchCommand);

    return {
      ...base,
      actionId: drawCommand ? "lookTopFiveTypeThenDrawOne" : "lookTopFiveTypeAddOne",
      ...search
    };
  }

  if (playNamedCommand) {
    return {
      ...base,
      actionId: "restDonPlayNamedCharacterFromHand",
      requiredName: quotedValue(playNamedCommand, "play_named"),
      costActiveDon: numberAfter(playNamedCommand, "rest_don", 1),
      optional: true
    };
  }

  if (activateEventCommand) {
    return {
      ...base,
      actionId: "activateHamonEventFromHandThenDraw",
      typeText: quotedValue(activateEventCommand, "activate_event_type") || "Hamon",
      optional: true
    };
  }

  if (trashNamedCommand && readySelfCommand) {
    return {
      ...base,
      actionId: "trashOwnNamedCharacterSetSourceActive",
      requiredName: quotedValue(trashNamedCommand, "trash_named")
    };
  }

  if (powerCommand && returnCommand) {
    return {
      ...base,
      actionId: "turnPowerThenBounceCostCharacter",
      powerModifier: numberAfter(powerCommand, "\\+", 3000),
      maxCost: numberAfter(returnCommand, "cost_or_less", 3)
    };
  }

  if (restCommand && setOwnActiveCommand) {
    return {
      ...base,
      actionId: "restOpponentCardThenSetOwnCostActive",
      maxCost: numberAfter(setOwnActiveCommand, "cost_or_less", 5)
    };
  }

  if (restCommand) {
    return {
      ...base,
      actionId: "restOpponentCard"
    };
  }

  if (koCommand) {
    const maxCost = numberAfter(koCommand, "cost_or_less", "");
    const maxPower = numberAfter(koCommand, "power_or_less", "");
    return {
      ...base,
      actionId: maxCost !== "" ? "koOpponentCharacterByCostAndKeyword" : "koOpponentCharacterByPower",
      maxCost,
      maxPower,
      keyword: quotedValue(koCommand, "keyword")
    };
  }

  if (drawCommand) {
    return {
      ...base,
      actionId: "drawCards",
      amount: numberAfter(drawCommand, "draw", 1)
    };
  }

  if (powerCommand) {
    return {
      ...base,
      actionId: block.type === "counter" ? "leaderOrCharacterCounterPower" : "leaderOrCharacterTriggerPower",
      powerModifier: numberAfter(powerCommand, "\\+", 1000)
    };
  }

  errors.push(`${timingLabel(block.type)} has commands I can save as text, but cannot play yet: ${rawCommands.join(", ")}`);
  return {
    ...base
  };
}


function suggestCardScriptFromText(text) {
  const lower = String(text || "").toLowerCase();
  const lines = [];
  const event = lower.includes("when attacking")
    ? "when_attacking once_per_turn:"
    : lower.includes("activate:main") || lower.includes("activate: main")
      ? "activate_main once_per_turn:"
      : lower.includes("counter")
        ? "counter:"
        : lower.includes("main")
          ? "main:"
          : "on_play:";

  lines.push(event);

  if (lower.includes("set up to") && lower.includes("don") && lower.includes("active")) {
    lines.push("Set DON Active:");
    lines.push(`  Up to ${Number((lower.match(/set up to\s+(\d+)/) || [])[1] || 1)}`);
  }

  if (lower.includes("cannot play character")) {
    lines.push("Cannot Play:");
    lines.push("  character");
    lines.push("  this turn");
  }

  if (lower.includes("attach") && lower.includes("rested don")) {
    const amount = Number((lower.match(/up to\s+(\d+)/) || [])[1] || 1);
    const target = lower.includes("characters in any way") || lower.includes("to your characters")
      ? "characters"
      : "leader_or_character";
    lines.push("Attach Rested DON:");
    lines.push(`  Up to ${amount}`);
    lines.push(`  To ${target}`);
  }

  if (lower.includes("look at the top")) {
    const look = Number((lower.match(/top\s+(\d+)/) || [])[1] || 5);
    const add = Number((lower.match(/up to\s+(\d+)/) || [])[1] || 1);
    const type = (text.match(/[{\[]([^}\]]+)[}\]]/) || [])[1] || "";
    const cost = (lower.match(/cost\s+(\d+)\s+or less/) || [])[1];
    lines.push("Search:");
    lines.push(`  Top ${look}`);
    lines.push(`  Reveal up_to ${add}`);
    if (type) lines.push(`  Where type includes "${type}"`);
    if (cost) lines.push(`  Where cost <= ${cost}`);
    lines.push(lower.includes("play up to") ? "  Add revealed to character_field" : "  Add revealed to hand");
    if (lower.includes("gains") && lower.includes("rush")) lines.push("  If played character gains Rush");
    lines.push("  Send rest to bottom_deck");
  }

  if (lower.includes("play up to 1") && lower.includes("from your hand")) {
    const name = (text.match(/\[([^\]]+)\]/) || [])[1] || "Card Name";
    const restDon = (lower.match(/rest\s+(\d+)\s+don/) || [])[1] || 1;
    lines.push("Play:");
    lines.push(`  "${name}" from hand`);
    lines.push(`  Rest ${restDon} DON`);
  }

  if (lower.includes("activate up to 1") && lower.includes("event")) {
    const type = (text.match(/[{\[]([^}\]]+)[}\]]/) || [])[1] || "Hamon";
    lines.push("Use Event:");
    lines.push(`  Type "${type}" from hand`);
    if (lower.includes("draw")) lines.push("  Then draw");
  }

  if (lower.includes("trash") && lower.includes("set this card") && lower.includes("active")) {
    const name = (text.match(/\[([^\]]+)\]/) || [])[1] || "Card Name";
    lines.push("Trash Named:");
    lines.push(`  "${name}"`);
    lines.push("Ready Self:");
  } else if (lower.includes("trash this character") || lower.includes("trash this card")) {
    lines.push("Trash Self:");
  }

  if (lower.includes("draw 1") && !lines.some(line => line.includes("then_draw")) && !lines.includes("Search:")) {
    lines.push("Draw:");
    lines.push("  1");
  }

  if (lines.length === 1) {
    lines.push("  # I need more specific text. Try saying: draw 1, search_top 5, attach rested DON, or set active DON.");
  }

  return lines.join("\n");
}


function effectsToCardScript(card) {
  if (card.effectScript) return card.effectScript;
  const text = String(card.effects || "");
  return text
    ? `on_play:\n  # Existing text-only effect:\n  # ${text.replace(/\n/g, "\n  # ")}`
    : "";
}


function creationCardFromForm(imageDataUrl) {
  const cardNumber = el.creationCardNumber.value.trim() || nextImportedCardNumber();
  const category = normalizeCategory(el.creationCategory.value);
  const colors = csvValues(el.creationColors.value).map(color => color.toLowerCase());
  const keywords = csvValues(el.creationKeywords.value);
  const costOrLife = el.creationCost.value === "" ? "" : Number(el.creationCost.value);
  const effectText = el.creationEffectText?.value.trim() || "";

  return {
    id: cardNumber,
    cardNumber,
    name: el.creationName.value.trim(),
    category,
    cardType: category,
    type: el.creationTypes.value.trim(),
    color: colors.join(","),
    colors,
    cost: category === "leader" ? "" : costOrLife,
    life: category === "leader" ? costOrLife : "",
    power: el.creationPower.value === "" ? "" : Number(el.creationPower.value),
    counter: el.creationCounter.value === "" ? "" : Number(el.creationCounter.value),
    attribute: el.creationAttribute.value.trim(),
    rarity: el.creationRarity.value.trim(),
    keywords,
    effect: effectText,
    image: imageDataUrl,
    imported: true,
    importedAt: new Date().toISOString()
  };
}

async function saveCreatedCard(event) {
  event.preventDefault();
  const file = el.creationImage.files?.[0];

  if (!file && !state.creationImageData) {
    toast("Upload a card image first");
    return;
  }

  if (!el.creationName.value.trim()) {
    toast("Name is required");
    return;
  }

  const imageDataUrl = file
    ? await compressImageDataUrl(await readFileAsDataUrl(file))
    : state.creationImageData;
  const card = creationCardFromForm(imageDataUrl);
  const cards = await compressImportedCardImages(
    (await loadProjectCards()).filter(existing => {
      return existing.id !== card.id &&
        existing.cardNumber !== card.cardNumber &&
        existing.id !== state.editingCardId &&
        existing.cardNumber !== state.editingCardId;
    })
  );

  cards.push(card);
  if (!await saveProjectCards(cards)) return;
  clearCreationForm(true);
  toast(`${card.name} saved`);
  await loadCardPool();
}

function clearCreationForm(resetNumber = true) {
  el.cardCreationForm?.reset();
  state.editingCardId = "";
  state.creationImageData = "";
  if (resetNumber && el.creationCardNumber) el.creationCardNumber.value = nextImportedCardNumber();
  if (el.creationImagePreview) el.creationImagePreview.innerHTML = `<span>No image yet</span>`;
  if (el.creationStatus) el.creationStatus.textContent = "Ready";
}

async function previewCreationImage() {
  const file = el.creationImage.files?.[0];
  if (!file || !el.creationImagePreview) return;
  const imageDataUrl = await readFileAsDataUrl(file);
  state.creationImageData = imageDataUrl;
  el.creationImagePreview.innerHTML = `<img src="${escapeAttr(imageDataUrl)}" alt="">`;
}

async function importCardFromForm(event) {
  event.preventDefault();
  const file = el.importImage.files?.[0];

  if (!file) {
    toast("Upload a card image first");
    return;
  }

  if (!el.importName.value.trim()) {
    toast("Name is required");
    return;
  }

  const imageDataUrl = await compressImageDataUrl(await readFileAsDataUrl(file));
  const card = importedCardFromForm(imageDataUrl);
  const cards = await compressImportedCardImages(
    (await loadProjectCards()).filter(existing => existing.id !== card.id && existing.cardNumber !== card.cardNumber)
  );

  cards.push(card);
  if (!await saveProjectCards(cards)) return;
  el.cardImportForm.reset();
  el.importCardNumber.value = nextImportedCardNumber();
  toast(`${card.name} imported`);
  await loadCardPool();
}

async function deleteImportedCard(cardId) {
  const card = getCard(cardId);

  if (!card?.imported) {
    toast("Only imported cards can be deleted from here");
    return;
  }

  if (!window.confirm(`Delete ${card.name} from your custom library?`)) return;

  const projectCards = await loadProjectCards();
  const cards = projectCards.filter(existing => {
    return existing.id !== cardId && existing.cardNumber !== cardId;
  });

  if (!await saveProjectCards(cards)) return;

  delete state.deck[cardId];
  if (state.leaderId === cardId) state.leaderId = "";
  saveDeck(false);
  await loadCardPool();
  toast(`${card.name} deleted`);
}

function openCardForEditing(card) {
  if (!card?.imported) {
    toast("Only custom cards can be edited here");
    return;
  }

  initializeCardCreation();
  state.editingCardId = card.id;
  state.creationImageData = card.imageUrl || "";

  if (el.creationImage) el.creationImage.value = "";
  el.creationCardNumber.value = card.cardNumber || card.id;
  el.creationName.value = card.name || "";
  el.creationCategory.value = normalizeCategory(card.category || card.cardType);
  setSelectValueWithFallback(el.creationColors, (card.colors || []).join(", "));
  setSelectValueWithFallback(el.creationCost, card.category === "leader" ? card.life || "" : card.cost || "");
  el.creationPower.value = card.power || "";
  setSelectValueWithFallback(el.creationCounter, card.counter || "");
  setSelectValueWithFallback(el.creationAttribute, card.attribute || "");
  el.creationTypes.value = card.type || "";
  setSelectValueWithFallback(el.creationRarity, card.rarity || "");
  setSelectValueWithFallback(el.creationKeywords, (card.keywords || []).join(", "));
  if (el.creationEffectText) el.creationEffectText.value = card.effect || card.effects || "";
  if (el.creationImagePreview) {
    el.creationImagePreview.innerHTML = card.imageUrl
      ? `<img src="${escapeAttr(card.imageUrl)}" alt="">`
      : `<span>No image yet</span>`;
  }
  if (el.creationStatus) el.creationStatus.textContent = `Editing ${card.name}`;
  if (el.savedDecksPanel) el.savedDecksPanel.hidden = true;
  if (el.cardCreationPanel) el.cardCreationPanel.hidden = false;
}

async function clearImportedCards() {
  const cards = await loadProjectCards();
  const legacyCards = loadImportedCards();
  if (!cards.length) {
    toast(legacyCards.length ? "Only legacy browser cards found. Clearing those now." : "No editable project cards to clear");
    if (legacyCards.length) localStorage.removeItem(CUSTOM_CARDS_KEY);
    return;
  }

  if (!window.confirm(`Delete ${cards.length} editable project card${cards.length === 1 ? "" : "s"}? Base set cards stay installed.`)) {
    return;
  }

  const importedIds = new Set(cards.flatMap(card => [card.id, card.cardNumber].filter(Boolean)));

  if (!await saveProjectCards([])) return;
  localStorage.removeItem(CUSTOM_CARDS_KEY);
  Object.keys(state.deck).forEach(id => {
    if (importedIds.has(id)) delete state.deck[id];
  });
  if (importedIds.has(state.leaderId)) state.leaderId = "";
  saveDeck(false);
  await loadCardPool();
  toast("Editable project card overrides cleared");
}

function loadSavedDeck() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.leaderId = saved.leaderId || "";
    state.deck = saved.deck || {};
    state.deckName = saved.deckName || "";
    el.deckName.value = state.deckName;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveDeck(showToast = true) {
  state.deckName = el.deckName.value.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    leaderId: state.leaderId,
    deck: state.deck,
    deckName: state.deckName
  }));
  saveNamedDeck();
  if (showToast) toast("Deck saved");
  renderAll();
  queueDeckTableResize();
}

function savedDecks() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_DECKS_KEY) || "[]");
  } catch {
    localStorage.removeItem(SAVED_DECKS_KEY);
    return [];
  }
}

function currentDeckSnapshot() {
  return {
    name: state.deckName || el.deckName.value.trim() || "Current Deck",
    leaderId: state.leaderId,
    deck: { ...state.deck },
    savedAt: ""
  };
}

function deckSnapshotCount(deck) {
  return Object.values(deck || {}).reduce((sum, qty) => sum + Number(qty || 0), 0);
}

function isPlayableDeckSnapshot(snapshot) {
  return Boolean(snapshot?.leaderId && getCard(snapshot.leaderId) && deckSnapshotCount(snapshot.deck) > 0);
}

function deckTextToSnapshot(deckDefinition) {
  const deck = {};
  String(deckDefinition?.deckText || "").trim().split(/\n+/).forEach(line => {
    const match = line.trim().match(/^(\d+)x(.+)$/);
    if (!match) return;
    const id = match[2].trim();
    deck[id] = (deck[id] || 0) + Number(match[1]);
  });

  return {
    name: deckDefinition?.name || "Template Deck",
    leaderId: deckDefinition?.leaderKey || "",
    deck,
    savedAt: ""
  };
}

function templateDeckOptions() {
  return (window.availableDecks || []).map(deckDefinition => ({
    value: `template:${deckDefinition.id}`,
    label: deckDefinition.name,
    snapshot: deckTextToSnapshot(deckDefinition)
  }));
}

function practiceDeckOptions() {
  const options = [
    {
      value: "current",
      label: "Current Deck",
      snapshot: currentDeckSnapshot()
    },
    ...savedDecks().map((deck, index) => ({
      value: `saved:${index}`,
      label: deck.name || `Saved Deck ${index + 1}`,
      snapshot: deck
    })),
    ...templateDeckOptions()
  ];

  return options;
}

function practiceDeckSnapshot(choice) {
  if (choice === "current") return currentDeckSnapshot();
  if (String(choice || "").startsWith("template:")) {
    const deckId = String(choice).slice("template:".length);
    const deckDefinition = (window.availableDecks || []).find(deck => deck.id === deckId);
    return deckDefinition ? deckTextToSnapshot(deckDefinition) : null;
  }
  const match = String(choice || "").match(/^saved:(\d+)$/);
  if (!match) return null;
  return savedDecks()[Number(match[1])] || null;
}

function normalizePracticeDeckChoices() {
  const playable = practiceDeckOptions().filter(option => isPlayableDeckSnapshot(option.snapshot));
  if (!playable.length) return;
  ["player", "opponent"].forEach(key => {
    if (!isPlayableDeckSnapshot(practiceDeckSnapshot(state.practiceDecks[key]))) {
      state.practiceDecks[key] = playable[0].value;
    }
  });
}

function saveNamedDeck() {
  const name = state.deckName || el.deckName.value.trim() || `Deck ${new Date().toLocaleDateString()}`;
  const decks = savedDecks().filter(deck => deck.name !== name);
  decks.unshift({
    name,
    leaderId: state.leaderId,
    deck: state.deck,
    savedAt: new Date().toISOString()
  });
  localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(decks.slice(0, 24)));
}

function loadNamedDeck(index) {
  const deck = savedDecks()[index];
  if (!deck) return;
  state.deckName = deck.name;
  state.leaderId = deck.leaderId || "";
  state.deck = deck.deck || {};
  el.deckName.value = state.deckName;
  saveDeck(false);
  el.savedDecksPanel.hidden = true;
  toast(`${deck.name} loaded`);
}

function deleteNamedDeck(index) {
  const decks = savedDecks();
  const deck = decks[index];
  if (!deck) return;
  const name = deck.name || `Deck ${index + 1}`;
  if (!window.confirm(`Delete saved deck "${name}"?`)) return;
  decks.splice(index, 1);
  localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(decks));
  renderSavedDecks();
  toast(`${name} deleted`);
}

function showView(view) {
  state.activeView = view;
  el.viewPanels.forEach(panel => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  el.navTabs.forEach(button => button.classList.toggle("active", button.dataset.view === view));
  if (view === "builder") queueDeckTableResize();
}

function cardsByCategory(category) {
  return state.cards.filter(card => card.category === category);
}

function getCard(id) {
  return state.cards.find(card => card.id === id);
}

function deckMainCount() {
  return Object.values(state.deck).reduce((sum, qty) => sum + qty, 0);
}

function deckEntries() {
  return Object.entries(state.deck)
    .map(([id, qty]) => ({ card: getCard(id), qty }))
    .filter(entry => entry.card)
    .sort((a, b) => {
      const costA = Number(a.card.cost || 0);
      const costB = Number(b.card.cost || 0);
      return costA - costB || a.card.name.localeCompare(b.card.name);
    });
}

function addToDeck(id) {
  const card = getCard(id);
  if (!card) return;

  if (card.category === "leader") {
    state.leaderId = id;
    pruneDeckForLeader();
    saveDeck(false);
    toast(`${card.name} set as leader`);
    return;
  }

  if (!state.leaderId) {
    toast("Pick a leader first");
    return;
  }

  if (!canCardJoinLeader(card)) {
    toast("That card does not match your leader colors");
    return;
  }

  if (deckMainCount() >= 50) {
    toast("Main deck is already at 50 cards");
    return;
  }

  const current = state.deck[id] || 0;
  if (current >= 4) {
    toast("Copy limit reached");
    return;
  }

  state.deck[id] = current + 1;
  saveDeck(false);
}

function addFourToDeck(id) {
  const card = getCard(id);
  if (!card) return;
  if (card.category === "leader") {
    addToDeck(id);
    return;
  }
  if (!state.leaderId) {
    toast("Pick a leader first");
    return;
  }
  if (!canCardJoinLeader(card)) {
    toast("That card does not match your leader colors");
    return;
  }
  let added = 0;
  while ((state.deck[id] || 0) < 4 && deckMainCount() < 50) {
    state.deck[id] = (state.deck[id] || 0) + 1;
    added += 1;
  }
  saveDeck(false);
  toast(added ? `Added ${added} ${card.name}` : "Could not add more copies");
}

function canCardJoinLeader(card) {
  const leader = getCard(state.leaderId);
  if (!leader) return false;
  const leaderColors = new Set(leader.colors || []);
  return card.colors?.some(color => leaderColors.has(color));
}

function pruneDeckForLeader() {
  Object.keys(state.deck).forEach(id => {
    const card = getCard(id);
    if (!card || !canCardJoinLeader(card)) delete state.deck[id];
  });
}

function removeFromDeck(id) {
  if (!state.deck[id]) return;
  state.deck[id] -= 1;
  if (state.deck[id] <= 0) delete state.deck[id];
  saveDeck(false);
}

function clearDeck() {
  state.deck = {};
  state.leaderId = "";
  state.game = null;
  saveDeck(false);
}

function autoFillDeck() {
  if (!state.leaderId) {
    const firstLeader = cardsByCategory("leader")[0];
    if (firstLeader) state.leaderId = firstLeader.id;
  }

  const leader = getCard(state.leaderId);
  if (!leader) {
    toast("No leader available yet");
    return;
  }

  state.deck = {};
  const leaderColors = new Set(leader.colors);
  const candidates = state.cards
    .filter(card => card.category !== "leader")
    .filter(card => card.colors.some(color => leaderColors.has(color)))
    .sort((a, b) => Number(a.cost || 0) - Number(b.cost || 0));

  for (const card of candidates) {
    while ((state.deck[card.id] || 0) < 4 && deckMainCount() < 50) {
      state.deck[card.id] = (state.deck[card.id] || 0) + 1;
    }
    if (deckMainCount() >= 50) break;
  }

  saveDeck(false);
  toast("Deck auto-filled");
}

function filteredCards() {
  const query = el.searchInput.value.trim();
  const category = el.categoryFilter.value;
  const color = el.colorFilter.value;
  const leader = getCard(state.leaderId);
  const leaderColors = new Set(leader?.colors || []);

  return state.cards.filter(card => {
    return (!query || evaluateSearchQuery(query, card, state.searchMode))
      && (!category || card.category === category)
      && (!color || card.colors.includes(color))
      && (!el.setFilter.value || card.setCode === el.setFilter.value)
      && (!el.costFilter.value || String(displayCost(card)) === el.costFilter.value)
      && (!el.powerFilter.value || String(card.power) === el.powerFilter.value)
      && (!el.counterFilter.value || String(card.counter) === el.counterFilter.value)
      && (!el.rarityFilter.value || card.rarity === el.rarityFilter.value)
      && (!el.blockFilter.value || card.block === el.blockFilter.value)
      && (!state.rotationOnly || !/^test/i.test(card.cardNumber))
      && (!state.leaderColorsOnly || !leader || card.category === "leader" || card.colors.some(cardColor => leaderColors.has(cardColor)));
  }).sort(compareCards);
}

function compareCards(a, b) {
  if (state.sortField === "cost") return displayCost(a) - displayCost(b) || a.cardNumber.localeCompare(b.cardNumber);
  if (state.sortField === "name") return a.name.localeCompare(b.name) || a.cardNumber.localeCompare(b.cardNumber);
  if (state.sortField === "power") return Number(a.power || 0) - Number(b.power || 0) || a.cardNumber.localeCompare(b.cardNumber);
  return a.cardNumber.localeCompare(b.cardNumber);
}

function displayCost(card) {
  return Number(card.category === "leader" ? card.life || 0 : card.cost || 0);
}

function searchableText(card) {
  return [
    card.name,
    card.id,
    card.cardNumber,
    card.setCode,
    card.block,
    card.category,
    card.type,
    card.attribute,
    card.colors.join(" "),
    card.rarity,
    card.effects,
    card.keywords.join(" ")
  ].join(" ").toLowerCase();
}

function evaluateSearchQuery(query, card, mode = "AND") {
  const tokens = tokenizeSearch(query);
  if (!tokens.length) return true;
  let index = 0;

  function parseExpression() {
    let value = parseTerm();
    while (tokens[index] === "||") {
      index += 1;
      value = value || parseTerm();
    }
    return value;
  }

  function parseTerm() {
    let value = parseFactor();
    while (index < tokens.length && tokens[index] !== ")" && tokens[index] !== "||") {
      if (tokens[index] === "&&") index += 1;
      else if (mode === "OR") return value || parseTerm();
      value = value && parseFactor();
    }
    return value;
  }

  function parseFactor() {
    const token = tokens[index];
    index += 1;
    if (token === "(") {
      const value = parseExpression();
      if (tokens[index] === ")") index += 1;
      return value;
    }
    if (token === ")" || token === "&&" || token === "||") return true;
    return matchSearchToken(card, token);
  }

  return parseExpression();
}

function tokenizeSearch(query) {
  const tokens = [];
  const pattern = /\[[^\]]+\]|\(|\)|&&|\|\||[^\s()]+/g;
  let match;
  while ((match = pattern.exec(query)) !== null) tokens.push(match[0]);
  return tokens;
}

function matchSearchToken(card, token) {
  const text = searchableText(card);
  const exact = token.match(/^\[(.+)\]$/);
  if (exact) return text.includes(exact[1].toLowerCase());

  const range = token.match(/^(\d+)\.\.(\d+)$/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return [displayCost(card), Number(card.power || 0), Number(card.counter || 0), Number(card.life || 0)]
      .some(value => value >= min && value <= max);
  }

  return text.includes(token.toLowerCase());
}

function populateFilterOptions() {
  setSelectOptions(el.setFilter, "Set", uniqueValues(card => card.setCode));
  setSelectOptions(el.costFilter, "Cost", uniqueValues(card => String(displayCost(card))).sort((a, b) => Number(a) - Number(b)));
  setSelectOptions(el.powerFilter, "Power", uniqueValues(card => String(card.power)).sort((a, b) => Number(a) - Number(b)));
  setSelectOptions(el.counterFilter, "Counter", uniqueValues(card => String(card.counter)).sort((a, b) => Number(a) - Number(b)));
  setSelectOptions(el.rarityFilter, "Rarity", uniqueValues(card => card.rarity));
  setSelectOptions(el.blockFilter, "Block", uniqueValues(card => card.block));
}

function uniqueValues(reader) {
  return [...new Set(state.cards.map(reader).filter(value => value !== "" && value !== "undefined"))];
}

function setSelectOptions(select, label, values) {
  select.innerHTML = `<option value="">${label}</option>` + values
    .map(value => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`)
    .join("");
}

function setToggle(onButton, offButton, isOn) {
  onButton.classList.toggle("active", isOn);
  offButton.classList.toggle("active", !isOn);
}

function renderAll() {
  showView(state.activeView);
  renderHome();
  renderBuilder();
  renderGame();
}

function renderHome() {
  const leader = getCard(state.leaderId);
  const counts = {
    leader: cardsByCategory("leader").length,
    character: cardsByCategory("character").length,
    event: cardsByCategory("event").length,
    stage: cardsByCategory("stage").length
  };

  el.homeLeader.textContent = leader ? leader.name : "None";
  el.homeDeckCount.textContent = String(deckMainCount());
  el.homePoolCount.textContent = String(state.cards.length || 0);
  el.leaderTotal.textContent = String(counts.leader);
  el.characterTotal.textContent = String(counts.character);
  el.eventTotal.textContent = String(counts.event);
  el.stageTotal.textContent = String(counts.stage);
}

function renderBuilder() {
  const leader = getCard(state.leaderId);
  const mainCount = deckMainCount();
  const warnings = [];

  el.deckTitle.textContent = state.deckName || el.deckName.value.trim() || "Untitled Deck";
  el.deckCount.textContent = String(mainCount);

  if (!leader) warnings.push("Choose exactly 1 leader.");
  if (mainCount !== 50) warnings.push(`Main deck has ${mainCount} cards. OPTCG style decks use 50.`);

  el.deckWarnings.innerHTML = warnings.map(text => `<div class="warning">${escapeHtml(text)}</div>`).join("");
  el.leaderSlot.innerHTML = leader ? renderDeckRow(leader, 1, true) : `<div class="empty">Leader slot</div>`;

  const entries = deckEntries();
  el.deckList.innerHTML = entries.length
    ? entries.map(entry => renderDeckRow(entry.card, entry.qty)).join("")
    : `<div class="empty">Add up to 50 non-leader cards.</div>`;

  renderCardGrid();
  renderSavedDecks();
  queueDeckTableResize();
}

function renderDeckRow(card, qty, isLeader = false) {
  const removeButton = isLeader
    ? `<button class="deck-icon-btn remove-card-btn" type="button" data-clear-leader aria-label="Remove leader" title="Remove"><span aria-hidden="true">-</span></button>`
    : `<button class="deck-icon-btn remove-card-btn" type="button" data-remove="${escapeAttr(card.id)}" aria-label="Remove one ${escapeAttr(card.name)}" title="Remove one"><span aria-hidden="true">-</span></button>`;

  return `
    <div class="deck-row" data-card-id="${escapeAttr(card.id)}">
      <div class="mini-card-art">${cardVisual(card)}</div>
      <span class="qty">${qty}</span>
      <div class="deck-row-actions">
        ${removeButton}
        <button class="deck-icon-btn inspect-card-btn" type="button" data-inspect="${escapeAttr(card.id)}" aria-label="Inspect ${escapeAttr(card.name)}" title="Inspect">
          <span class="magnifier-icon" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;
}

function renderSavedDecks() {
  const decks = savedDecks();
  el.savedDeckList.innerHTML = decks.length
    ? decks.map((deck, index) => {
      const leader = getCard(deck.leaderId);
      const count = deckSnapshotCount(deck.deck);

      return `
      <article class="saved-deck-row">
        <div class="saved-deck-leader-art">
          ${leader ? cardVisual(leader) : `<div class="proxy-card">No Leader</div>`}
        </div>
        <div class="saved-deck-info">
          <strong>${escapeHtml(deck.name)}</strong>
          <span>${leader ? escapeHtml(leader.name) : "No leader"} · ${count}/50 main deck</span>
          <small>${escapeHtml(deck.savedAt ? new Date(deck.savedAt).toLocaleString() : "No save date")}</small>
        </div>
        <div class="saved-deck-actions">
          <button type="button" data-load-deck="${index}">Load</button>
          <button class="ghost danger" type="button" data-delete-deck="${index}">Delete</button>
        </div>
      </article>
    `;
    }).join("")
    : `<div class="empty">No saved decks yet. Name a deck and hit Save.</div>`;
}

function queueDeckTableResize() {
  requestAnimationFrame(updateDeckTableHeight);
}

function updateDeckTableHeight() {
  const builderMain = document.querySelector(".builder-main");
  const deckTable = document.querySelector(".deck-table");
  const deckList = document.querySelector(".deck-list");
  const leaderSlot = document.querySelector(".leader-slot");
  const board = document.querySelector(".deck-board-scroll");
  if (!builderMain || !deckTable || !deckList || !board) return;

  const entries = deckEntries().length;
  const deckListWidth = Math.max(1, deckList.getBoundingClientRect().width);
  const minColumnWidth = 98;
  const columnGap = 28;
  const columns = Math.max(1, Math.floor((deckListWidth + columnGap) / (minColumnWidth + columnGap)));
  const mainRows = entries ? Math.ceil(entries / columns) : 1;
  const visualRows = Math.max(mainRows, state.leaderId ? 1 : 0);

  const cardRowHeight = 148;
  const rowGap = 12;
  const boardPadding = 28;
  const deckChrome = 88;
  const warningHeight = el.deckWarnings.children.length ? 38 : 0;
  const boardHeight = boardPadding + Math.max(148, visualRows * cardRowHeight + Math.max(0, visualRows - 1) * rowGap);
  const desired = Math.ceil(deckChrome + warningHeight + boardHeight);
  const max = Math.floor(builderMain.getBoundingClientRect().height * 0.72);
  const min = state.leaderId || entries ? 230 : 170;
  const height = Math.max(min, Math.min(desired, max));

  builderMain.style.setProperty("--deck-table-height", `${height}px`);
}

function renderCardGrid() {
  clearTimeout(state.searchRenderTimer);
  const cards = filteredCards();
  el.filteredCount.textContent = String(cards.length);
  el.cardGrid.innerHTML = "";

  if (!cards.length) {
    el.cardGrid.innerHTML = `<div class="empty">No custom cards match those filters.</div>`;
    return;
  }

  const template = document.querySelector("#cardTemplate");
  cards.forEach(card => {
    const node = template.content.cloneNode(true);
    const article = node.querySelector(".card-tile");
    const image = node.querySelector(".card-image");
    const name = node.querySelector(".card-body strong");
    const meta = node.querySelector(".card-body span");
    const deleteButton = node.querySelector('[data-action="delete"]');
    const editButton = node.querySelector('[data-action="edit"]');

    article.dataset.id = card.id;
    image.innerHTML = cardVisual(card);
    name.textContent = card.name;
    meta.textContent = cardMeta(card);

    if (card.category === "leader") {
      article.querySelector('[data-action="add"]').textContent = "Leader";
    }

    if (card.imported && deleteButton) {
      deleteButton.hidden = false;
    }

    if (card.imported && editButton) {
      editButton.hidden = false;
    }

    el.cardGrid.appendChild(node);
  });
}

function scheduleCardGridRender() {
  clearTimeout(state.searchRenderTimer);
  state.searchRenderTimer = setTimeout(renderCardGrid, 160);
}

function cardVisual(card) {
  if (card?.imageUrl) {
    return `
      <img
        alt="${escapeAttr(card.name)}"
        src="${escapeAttr(card.imageUrl)}"
        data-fallback-name="${escapeAttr(card.name)}"
        data-fallback-number="${escapeAttr(card.cardNumber)}"
        data-fallback-color="${escapeAttr(colorValue(card))}"
      >
    `;
  }

  return proxyCardMarkup(card?.name || "Empty", card?.cardNumber || "", colorValue(card));
}

function tableCardVisual(card) {
  if (!card?.imageUrl) return proxyCardMarkup(card?.name || "Empty", card?.cardNumber || "", colorValue(card));
  return `
    <div class="table-card-art">
      <img
        alt="${escapeAttr(card.name)}"
        src="${escapeAttr(card.imageUrl)}"
        data-fallback-name="${escapeAttr(card.name)}"
        data-fallback-number="${escapeAttr(card.cardNumber)}"
        data-fallback-color="${escapeAttr(colorValue(card))}"
      >
    </div>
  `;
}

function proxyCardMarkup(name, number, color) {
  return `
    <div class="proxy-card" style="border-top: 6px solid ${escapeAttr(color)}">
      <strong>${escapeHtml(name)}</strong>
      <small>${escapeHtml(number)}</small>
    </div>
  `;
}

function cardMeta(card) {
  const bits = [
    card.cardNumber,
    capitalize(card.category),
    card.colors.join("/"),
    card.cost !== "" ? `Cost ${card.cost}` : "",
    card.power ? `${card.power} power` : ""
  ].filter(Boolean);
  return bits.join(" - ");
}

function previewCard(card) {
  if (!card) return;
  updatePracticePreview(card);
  el.cardPreview.innerHTML = `
    <div class="preview-layout">
      <div class="card-image">${cardVisual(card)}</div>
      <div>
        <p class="eyebrow">${escapeHtml(card.cardNumber)} - ${escapeHtml(capitalize(card.category))}</p>
        <h2>${escapeHtml(card.name)}</h2>
        <p>${escapeHtml(cardMeta(card))}</p>
        <p class="preview-copy">${escapeHtml(card.effects || "No effect text.")}</p>
      </div>
    </div>
  `;

  if (typeof el.cardDialog.showModal === "function") {
    el.cardDialog.showModal();
  }
}

function startPractice() {
  normalizePracticeDeckChoices();
  const playerDeck = practiceDeckSnapshot(state.practiceDecks.player);
  const opponentDeck = practiceDeckSnapshot(state.practiceDecks.opponent);

  if (!isPlayableDeckSnapshot(playerDeck) || !isPlayableDeckSnapshot(opponentDeck)) {
    toast("Pick two playable decks first");
    return;
  }

  sessionStorage.setItem("custom-cards-sim-practice-decks", JSON.stringify({
    player: playerDeck,
    opponent: opponentDeck
  }));
  window.location.href = "html/self.html";
  return;

  state.game = {
    turn: 1,
    active: "player",
    phase: "main",
    playerTurns: { player: 0, opponent: 0 },
    log: "",
    player: createPlayer("Player 1", playerDeck),
    opponent: createPlayer("Player 2", opponentDeck)
  };
  beginTurn("player");
  showView("game");
  renderGame();
}

function endPractice() {
  state.game = null;
  renderGame();
}

function createPlayer(name, deckSnapshot) {
  const leader = createInstance(getCard(deckSnapshot.leaderId));
  const deck = [];
  deckSnapshotEntries(deckSnapshot).forEach(({ card, qty }) => {
    for (let i = 0; i < qty; i += 1) deck.push(createInstance(card));
  });
  shuffle(deck);

  const player = {
    name,
    leader,
    deck,
    life: [],
    hand: [],
    characters: Array(5).fill(null),
    stage: null,
    trash: [],
    don: 0,
    maxDon: 0,
    donDeck: 10
  };

  const lifeCount = Math.max(1, Number(leader.life || 5));
  for (let i = 0; i < lifeCount; i += 1) drawTo(player, "life");
  for (let i = 0; i < 5; i += 1) drawTo(player, "hand");
  return player;
}

function deckSnapshotEntries(snapshot) {
  return Object.entries(snapshot?.deck || {})
    .map(([id, qty]) => ({ card: getCard(id), qty }))
    .filter(entry => entry.card)
    .sort((a, b) => {
      const costA = Number(a.card.cost || 0);
      const costB = Number(b.card.cost || 0);
      return costA - costB || a.card.name.localeCompare(b.card.name);
    });
}

function createInstance(card) {
  return {
    ...card,
    instanceId: crypto.randomUUID(),
    rested: false
  };
}

function drawTo(player, zone) {
  const card = player.deck.shift();
  if (card) player[zone].push(card);
  return card;
}

function beginTurn(playerKey) {
  const game = state.game;
  if (!game) return;
  const player = game[playerKey];
  game.active = playerKey;
  game.phase = "main";
  game.playerTurns[playerKey] += 1;
  if (playerKey === "player" && game.playerTurns[playerKey] > 1) game.turn += 1;

  refreshPlayer(player);
  const isFirstPlayerOpeningTurn = playerKey === "player" && game.playerTurns[playerKey] === 1;
  if (!isFirstPlayerOpeningTurn) drawTo(player, "hand");
  addDonForTurn(player, isFirstPlayerOpeningTurn ? 1 : 2);
  game.log = `${player.name}: Main Phase.`;
}

function refreshPlayer(player) {
  player.leader.rested = false;
  player.characters.forEach(card => {
    if (card) card.rested = false;
  });
  if (player.stage) player.stage.rested = false;
  player.don = player.maxDon;
}

function addDonForTurn(player, count) {
  const amount = Math.min(count, player.donDeck, 10 - player.maxDon);
  player.maxDon += amount;
  player.donDeck -= amount;
  player.don = player.maxDon;
}

function endMainPhase() {
  if (!state.game) return;
  const nextPlayer = state.game.active === "player" ? "opponent" : "player";
  beginTurn(nextPlayer);
  renderGame();
}

function renderGame() {
  const shell = document.querySelector(".practice-shell");
  shell?.classList.toggle("setup-mode", !state.game);
  shell?.classList.toggle("game-running", Boolean(state.game));
  if (el.startGame) el.startGame.hidden = Boolean(state.game);
  if (el.endGame) el.endGame.hidden = !state.game;
  if (el.phaseAction) el.phaseAction.hidden = !state.game;

  if (!state.game) {
    if (el.gameTitle) el.gameTitle.textContent = "Self-practice setup";
    if (el.turnBadge) el.turnBadge.textContent = "";
    if (el.phaseStatus) el.phaseStatus.textContent = "Select decks";
    normalizePracticeDeckChoices();
    setGameLog("Choose decks for both sides, then start the self-test.");
    updatePracticePreview(null);
    el.gameBoard.innerHTML = renderPracticeSetup();
    return;
  }

  if (el.gameTitle) el.gameTitle.textContent = state.deckName || "Practice Game";
  if (el.turnBadge) el.turnBadge.textContent = `Turn ${state.game.turn} - ${state.game[state.game.active].name}`;
  if (el.phaseStatus) el.phaseStatus.textContent = `Turn ${state.game.turn} - ${state.game[state.game.active].name} - Main Phase`;
  setGameLog(state.game.log);
  
  // Use manual board renderer for gameplay
  if (window.manualBoardRenderer) {
    console.log("Rendering manual board...");
    window.manualBoardRenderer.renderGameBoard(state.game);
    
    // Populate hand cards
    const handContainer = document.getElementById("handCards");
    if (handContainer && state.game.player && state.game.player.hand) {
      handContainer.innerHTML = state.game.player.hand
        .map(card => window.manualBoardRenderer.createCardElement(card, "hand"))
        .join("");
    }
  } else {
    console.warn("Manual board renderer not available, using fallback");
    el.gameBoard.innerHTML = renderPracticeBoard(state.game);
  }
}

function renderPracticeSetup() {
  const canStart = isPlayableDeckSnapshot(practiceDeckSnapshot(state.practiceDecks.player))
    && isPlayableDeckSnapshot(practiceDeckSnapshot(state.practiceDecks.opponent));

  return `
    <section class="practice-setup">
      <div class="practice-setup-head">
        <p class="eyebrow">Play vs self test mode</p>
        <h2>Select decks for both boards</h2>
      </div>
      <div class="practice-deck-selectors">
        ${renderPracticeDeckPicker("player", "Player 1 Board")}
        ${renderPracticeDeckPicker("opponent", "Player 2 Board")}
      </div>
      <div class="practice-setup-actions">
        <button type="button" data-start-practice ${canStart ? "" : "disabled"}>Start Game</button>
        <button class="ghost" type="button" data-open-builder>Open Deck Builder</button>
      </div>
    </section>
  `;
}

function renderPracticeDeckPicker(key, label) {
  const options = practiceDeckOptions();
  const selected = state.practiceDecks[key];
  const snapshot = practiceDeckSnapshot(selected);
  const leader = getCard(snapshot?.leaderId);
  const mainCount = deckSnapshotCount(snapshot?.deck);

  return `
    <article class="practice-deck-card">
      <label>
        <span>${escapeHtml(label)}</span>
        <select data-practice-deck="${escapeAttr(key)}">
          ${options.map(option => `
            <option value="${escapeAttr(option.value)}" ${option.value === selected ? "selected" : ""} ${isPlayableDeckSnapshot(option.snapshot) ? "" : "disabled"}>
              ${escapeHtml(option.label)}${isPlayableDeckSnapshot(option.snapshot) ? "" : " - needs cards"}
            </option>
          `).join("")}
        </select>
      </label>
      <div class="practice-deck-summary">
        <div class="practice-leader-preview">${leader ? cardVisual(leader) : `<div class="empty">No leader</div>`}</div>
        <div>
          <strong>${escapeHtml(snapshot?.name || "No deck selected")}</strong>
          <span>${leader ? escapeHtml(leader.name) : "No leader selected"}</span>
          <small>${mainCount}/50 main deck</small>
        </div>
      </div>
    </article>
  `;
}

function renderPracticeBoard(game) {
  return `
    <svg id="attackArrowOverlay" class="attack-arrow-overlay" aria-hidden="true"></svg>
    <div class="hand opponent-hand" id="player2Hand">${renderHand(game.opponent, "opponent")}</div>
    ${renderPlayArea(game.opponent, "opponent", game)}
    ${renderPlayArea(game.player, "player", game)}
    <div class="hand player-hand" id="player1Hand">${renderHand(game.player, "player")}</div>
  `;
}

function renderPlayArea(player, key, game = state.game) {
  const isActive = game && key === game.active;
  const leaderMarkup = player.leader
    ? `<div class="leader-card" data-preview-card="${escapeAttr(player.leader.id)}">${tableCardVisual(player.leader)}${renderKeywordBadges(player.leader)}</div>`
    : `<div class="empty-zone area-placeholder"></div>`;

  return `
    <section class="play-area ${key === "opponent" ? "opponent-area" : "player-area"}">
      <div class="character-area">
        ${player.characters.map((card, index) => renderBoardSlot(card, key, "characters", index)).join("")}
      </div>

      <div class="life-area">
        ${renderLifeCounter(player.life.length)}
      </div>

      <div class="area leader-area">
        ${isActive ? `<div class="active-player-dot"></div>` : ""}
        ${leaderMarkup}
      </div>
      <div class="area stage-area">${player.stage ? renderBoardSlot(player.stage, key, "stage", 0) : ""}</div>
      <div class="area deck-area">${renderCardPile(player.deck.length, "Deck", CARD_BACK_IMAGE)}</div>

      <div class="area don-deck-area">${renderCardPile(player.donDeck, "DON!! Deck", DON_DECK_IMAGE)}</div>
      <div class="area don-area">${renderDonArea(player)}</div>
      <button class="area trash-area" type="button" data-view-trash="${key}">${renderTrashPile(player)}</button>
    </section>
  `;
}

function renderLifeCounter(count) {
  const life = Math.max(0, count || 0);
  return `
    <div class="life-heart ${life === 1 ? "low-life" : ""} ${life === 0 ? "empty-life" : ""}" aria-label="${life} life">
      <span>${life}</span>
    </div>
  `;
}

function renderCardPile(count, label, image) {
  const stack = Math.min(4, Math.max(1, count || 0));
  return `
    <div class="card-pile" aria-label="${escapeAttr(label)}">
      ${Array.from({ length: stack }, (_, index) => `
        <img class="pile-card" src="${escapeAttr(image)}" alt="" style="--stack-index: ${index}">
      `).join("")}
      <span>${count}</span>
    </div>
  `;
}

function renderDonArea(player) {
  const donCards = Math.max(0, player.maxDon || player.don || 0);
  if (!donCards) {
    return `
      <div class="don-field-empty">
        <img src="${DON_CARD_IMAGE}" alt="">
        <span>${player.don}/${player.maxDon}</span>
      </div>
    `;
  }

  return `
    <div class="don-field">
      ${Array.from({ length: donCards }, (_, index) => `
        <img class="don-card-mini ${index >= player.don ? "rested-don" : ""}" src="${DON_CARD_IMAGE}" alt="DON!!">
      `).join("")}
      <span>${player.don}/${player.maxDon}</span>
    </div>
  `;
}

function renderTrashPile(player) {
  const lastCard = player.trash[player.trash.length - 1];
  return `
    <div class="trash-pile">
      ${lastCard ? tableCardVisual(lastCard) : `<span class="trash-empty"></span>`}
      <span>${player.trash.length}</span>
    </div>
  `;
}

function renderHand(player, key) {
  return player.hand.length
    ? player.hand.map(card => renderHandCard(card, key)).join("")
    : `<div class="empty">Hand is empty.</div>`;
}

function renderBoardSlot(card, playerKey, zone, index) {
  if (!card) {
    return `
      <div class="character-slot empty-zone">
      </div>
    `;
  }
  return `
    <div class="character-slot zone ${card.rested ? "rested" : ""}" data-player-key="${playerKey}" data-zone="${zone}" data-index="${index}" data-preview-card="${escapeAttr(card.id)}">
      ${tableCardVisual(card)}
      ${renderKeywordBadges(card)}
      <div class="zone-actions">
        <button class="ghost" type="button" data-board-action="rest">Rest</button>
        <button class="ghost danger" type="button" data-board-action="trash">Trash</button>
      </div>
    </div>
  `;
}

function renderHandCard(card, playerKey) {
  return `
    <div class="hand-card" title="${escapeAttr(card.name)}" data-preview-card="${escapeAttr(card.id)}">
      ${cardVisual(card)}
      <button class="play-card-btn" type="button" data-play-card="${escapeAttr(card.instanceId)}" data-player-key="${playerKey}">Play ${displayCost(card)}</button>
    </div>
  `;
}

function renderKeywordBadges(card) {
  const keywords = cardKeywords(card);
  if (!keywords.length) return "";
  return `
    <div class="keyword-tags">
      ${keywords.map(keyword => `<span class="keyword-tag ${escapeAttr(keyword.className)}">${escapeHtml(keyword.label)}</span>`).join("")}
    </div>
  `;
}

function cardKeywords(card) {
  const normalizeKeyword = keyword => String(keyword || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const values = new Set((card?.keywords || []).map(normalizeKeyword));
  const text = `${card?.effects || ""} ${(card?.keywords || []).join(" ")}`.toLowerCase();
  const hasCharacterRush = values.has("rushcharacters") || /\b(?:rush\s*:\s*characters?|characters?\s*:\s*rush)\b/i.test(text);
  const checks = [
    { key: "blocker", label: "Blocker", className: "blocker", test: () => values.has("blocker") || /\bblocker\b/.test(text) },
    { key: "rushCharacters", label: "Rush:Character", className: "rush", test: () => hasCharacterRush },
    { key: "rush", label: "Rush", className: "rush", test: () => values.has("rush") || (/\brush\b/.test(text) && !hasCharacterRush) },
    { key: "doubleAttack", label: "2x Attack", className: "double-attack", test: () => values.has("doubleattack") || /double attack/.test(text) },
    { key: "banish", label: "Banish", className: "banish", test: () => values.has("banish") || /\bbanish\b/.test(text) },
    { key: "unblockable", label: "Unblockable", className: "unblockable", test: () => values.has("unblockable") || /\bunblockable\b/.test(text) }
  ];

  return checks.filter(check => check.test()).map(({ label, className }) => ({ label, className }));
}

function setGameLog(message) {
  if (!el.gameLogMessages) return;
  el.gameLogMessages.innerHTML = `<div class="log-message">${escapeHtml(message || "No actions yet.")}</div>`;
}

function updatePracticePreview(card) {
  if (!el.previewImage || !el.previewPlaceholder) return;

  if (!card) {
    el.previewImage.hidden = true;
    el.previewImage.removeAttribute("src");
    el.previewPlaceholder.hidden = false;
    el.previewPlaceholder.textContent = "Hover a card to preview it";
    return;
  }

  if (card.imageUrl) {
    el.previewImage.hidden = false;
    el.previewImage.src = card.imageUrl;
    el.previewImage.alt = card.name;
    el.previewPlaceholder.hidden = true;
    return;
  }

  el.previewImage.hidden = true;
  el.previewImage.removeAttribute("src");
  el.previewPlaceholder.hidden = false;
  el.previewPlaceholder.textContent = `${card.name} - ${card.cardNumber}`;
}

function activePlayer() {
  return state.game ? state.game[state.game.active] : null;
}

function handleDraw() {
  const player = activePlayer();
  if (!player) return;
  const card = drawTo(player, "hand");
  state.game.log = card ? `${player.name} drew ${card.name}.` : `${player.name} tried to draw from an empty deck.`;
  renderGame();
}

function handleAddDon() {
  const player = activePlayer();
  if (!player) return;
  player.maxDon = Math.min(10, player.maxDon + 1);
  player.don = player.maxDon;
  state.game.log = `${player.name} set DON to ${player.don}/${player.maxDon}.`;
  renderGame();
}

function handlePassTurn() {
  if (!state.game) return;
  state.game.active = state.game.active === "player" ? "opponent" : "player";
  if (state.game.active === "player") state.game.turn += 1;
  state.game.log = `${state.game[state.game.active].name}'s turn.`;
  renderGame();
}

function playFromHand(playerKey, instanceId) {
  if (!state.game) return;
  if (state.game.active !== playerKey || state.game.phase !== "main") {
    toast("You can only play cards during your Main Phase");
    return;
  }
  const player = state.game[playerKey];
  const index = player.hand.findIndex(card => card.instanceId === instanceId);
  if (index < 0) return;

  const [card] = player.hand.splice(index, 1);
  const cost = Number(card.cost || 0);
  if (cost > player.don) {
    player.hand.splice(index, 0, card);
    toast(`Need ${cost} active DON!!`);
    renderGame();
    return;
  }
  player.don -= cost;

  if (card.category === "character") {
    const slot = player.characters.findIndex(value => !value);
    if (slot === -1) {
      player.hand.splice(index, 0, card);
      player.don += cost;
      toast("No open character slots");
      renderGame();
      return;
    }
    player.characters[slot] = card;
    state.game.log = `${player.name} played ${card.name}.`;
  } else if (card.category === "stage") {
    if (player.stage) player.trash.push(player.stage);
    player.stage = card;
    state.game.log = `${player.name} set ${card.name} as stage.`;
  } else {
    player.trash.push(card);
    state.game.log = `${player.name} used ${card.name} and sent it to trash.`;
  }

  renderGame();
}

function showTrash(playerKey) {
  if (!state.game) return;
  const player = state.game[playerKey];
  el.cardPreview.innerHTML = `
    <div class="trash-viewer">
      <h2>${escapeHtml(player.name)} Trash</h2>
      <div class="trash-card-grid">
        ${player.trash.length
          ? player.trash.slice().reverse().map(card => `
            <button class="trash-card-view" type="button" data-trash-preview="${escapeAttr(card.id)}">
              ${cardVisual(card)}
            </button>
          `).join("")
          : `<div class="empty">Trash is empty.</div>`}
      </div>
    </div>
  `;
  if (typeof el.cardDialog.showModal === "function") el.cardDialog.showModal();
}

function updateBoardCard(target, action) {
  if (!state.game) return;
  const player = state.game[target.dataset.playerKey];
  const zone = target.dataset.zone;
  const index = Number(target.dataset.index);
  const card = zone === "stage" ? player.stage : player.characters[index];
  if (!card) return;

  if (action === "rest") {
    card.rested = !card.rested;
    state.game.log = `${player.name} ${card.rested ? "rested" : "set active"} ${card.name}.`;
  }

  if (action === "trash") {
    if (zone === "stage") player.stage = null;
    else player.characters[index] = null;
    player.trash.push(card);
    state.game.log = `${player.name} moved ${card.name} to trash.`;
  }

  renderGame();
}

function shuffle(cards) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
}

function colorValue(card) {
  const color = card?.colors?.[0] || "colorless";
  return {
    red: "var(--red)",
    green: "var(--green)",
    blue: "var(--blue)",
    purple: "var(--purple)",
    yellow: "var(--yellow)",
    black: "#6f7986"
  }[color] || "var(--accent)";
}

function capitalize(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}

function bindEvents() {
  document.addEventListener("error", event => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.dataset.fallbackName) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = proxyCardMarkup(
      target.dataset.fallbackName,
      target.dataset.fallbackNumber,
      target.dataset.fallbackColor || "var(--accent)"
    ).trim();
    target.replaceWith(wrapper.firstElementChild);
  }, true);

  el.viewButtons.forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.getElementById("multiplayerButton").addEventListener("click", () => {
    window.location.href = "html/multiplayer.html";
  });

  document.querySelectorAll("[data-open-self]").forEach(button => {
    button.addEventListener("click", () => {
      window.location.href = "html/self.html";
    });
  });

  [
    el.categoryFilter,
    el.colorFilter,
    el.setFilter,
    el.costFilter,
    el.powerFilter,
    el.counterFilter,
    el.rarityFilter,
    el.blockFilter
  ].forEach(input => {
    input.addEventListener("input", renderCardGrid);
  });

  el.filterQuick.addEventListener("input", () => {
    el.searchInput.value = el.filterQuick.value;
  });

  el.filterQuick.addEventListener("keydown", event => {
    if (event.key === "Enter") renderCardGrid();
  });

  el.searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      el.filterQuick.value = el.searchInput.value;
      renderCardGrid();
    }
  });

  el.runSearch.addEventListener("click", () => {
    el.filterQuick.value = el.searchInput.value;
    renderCardGrid();
  });

  el.deckName.addEventListener("input", () => {
    state.deckName = el.deckName.value.trim();
    renderHome();
    renderBuilder();
  });

  el.cardGrid.addEventListener("click", event => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    const article = event.target.closest(".card-tile");
    if (!action || !article) return;
    const card = getCard(article.dataset.id);
    if (!card) return;
    if (action === "preview" || action === "inspect") previewCard(card);
    if (action === "add") addToDeck(card.id);
    if (action === "edit") openCardForEditing(card);
    if (action === "delete") deleteImportedCard(card.id);
  });

  el.cardGrid.addEventListener("contextmenu", event => {
    const article = event.target.closest(".card-tile");
    if (!article) return;
    event.preventDefault();
    addFourToDeck(article.dataset.id);
  });

  el.deckList.addEventListener("click", event => {
    const removeId = event.target.closest("[data-remove]")?.dataset.remove;
    if (removeId) removeFromDeck(removeId);
    const inspectId = event.target.closest("[data-inspect]")?.dataset.inspect;
    if (inspectId) previewCard(getCard(inspectId));
  });

  el.leaderSlot.addEventListener("click", event => {
    if (event.target.closest("[data-clear-leader]")) {
      state.leaderId = "";
      saveDeck(false);
    }
    const inspectId = event.target.closest("[data-inspect]")?.dataset.inspect;
    if (inspectId) previewCard(getCard(inspectId));
  });

  el.clearDeck.addEventListener("click", clearDeck);
  el.clearDeckHome.addEventListener("click", clearDeck);
  el.quickBuild.addEventListener("click", autoFillDeck);
  el.saveDeck?.addEventListener("click", () => saveDeck(true));
  el.saveDeckMini.addEventListener("click", () => saveDeck(true));
  el.resetFilters.addEventListener("click", () => {
    el.searchInput.value = "";
    el.filterQuick.value = "";
    el.categoryFilter.value = "";
    el.colorFilter.value = "";
    el.setFilter.value = "";
    el.costFilter.value = "";
    el.powerFilter.value = "";
    el.counterFilter.value = "";
    el.rarityFilter.value = "";
    el.blockFilter.value = "";
    document.querySelectorAll("[data-color-shortcut]").forEach(wedge => wedge.classList.remove("selected"));
    renderCardGrid();
  });
  el.clearSearch?.addEventListener("click", () => {
    el.searchInput.value = "";
    el.filterQuick.value = "";
    renderCardGrid();
  });
  document.querySelectorAll("[data-color-shortcut]").forEach(button => {
    button.addEventListener("click", () => {
      el.colorFilter.value = button.dataset.colorShortcut;
      document.querySelectorAll("[data-color-shortcut]").forEach(wedge => {
        wedge.classList.toggle("selected", wedge.dataset.colorShortcut === button.dataset.colorShortcut);
      });
      renderCardGrid();
    });
  });
  document.querySelectorAll("[data-search-mode]").forEach(button => {
    button.addEventListener("click", () => {
      state.searchMode = button.dataset.searchMode;
      document.querySelectorAll("[data-search-mode]").forEach(modeButton => {
        modeButton.classList.toggle("active", modeButton === button);
      });
      renderCardGrid();
    });
  });
  document.querySelectorAll("[data-sort-field]").forEach(button => {
    button.addEventListener("click", () => {
      state.sortField = button.dataset.sortField;
      document.querySelectorAll("[data-sort-field]").forEach(sortButton => {
        sortButton.classList.toggle("active", sortButton === button);
      });
      renderCardGrid();
    });
  });
  el.showSearchTips.addEventListener("click", () => el.searchTipsDialog.showModal());
  el.closeSearchTips.addEventListener("click", () => el.searchTipsDialog.close());
  el.openCardImport?.addEventListener("click", openCardImportDialog);
  el.closeCardImport?.addEventListener("click", () => el.cardImportDialog.close());
  el.cardImportForm?.addEventListener("submit", importCardFromForm);
  el.clearImportedCards?.addEventListener("click", clearImportedCards);
  el.importCategory?.addEventListener("change", () => {
    el.importCost.placeholder = el.importCategory.value === "leader"
      ? "Life total"
      : "Cost";
  });
  el.savedDecksTab.addEventListener("click", () => {
    renderSavedDecks();
    el.savedDecksPanel.hidden = false;
    if (el.cardCreationPanel) el.cardCreationPanel.hidden = true;
  });
  el.closeSavedDecks.addEventListener("click", () => {
    el.savedDecksPanel.hidden = true;
  });
  el.savedDeckList.addEventListener("click", event => {
    const deleteIndex = event.target.closest("[data-delete-deck]")?.dataset.deleteDeck;
    if (deleteIndex !== undefined) {
      deleteNamedDeck(Number(deleteIndex));
      return;
    }
    const index = event.target.closest("[data-load-deck]")?.dataset.loadDeck;
    if (index !== undefined) loadNamedDeck(Number(index));
  });
  el.cardCreationTab?.addEventListener("click", () => {
    initializeCardCreation();
    el.savedDecksPanel.hidden = true;
    el.cardCreationPanel.hidden = false;
  });
  el.closeCardCreation?.addEventListener("click", () => {
    el.cardCreationPanel.hidden = true;
  });
  el.cardCreationForm?.addEventListener("submit", saveCreatedCard);
  el.creationImage?.addEventListener("change", previewCreationImage);
  el.clearCreationForm?.addEventListener("click", () => clearCreationForm());
  el.creationCategory?.addEventListener("change", () => {
    el.creationCost.placeholder = el.creationCategory.value === "leader"
      ? "Life total"
      : "Cost";
  });
  el.startGame?.addEventListener("click", startPractice);
  el.startPracticeTop?.addEventListener("click", startPractice);
  el.endGame?.addEventListener("click", endPractice);
  el.phaseAction?.addEventListener("click", endMainPhase);
  el.drawCard?.addEventListener("click", handleDraw);
  el.addDon?.addEventListener("click", handleAddDon);
  el.passTurn?.addEventListener("click", handlePassTurn);
  el.closePreview.addEventListener("click", () => el.cardDialog.close());

  el.gameBoard.addEventListener("click", event => {
    if (event.target.closest("[data-start-practice]")) {
      startPractice();
      return;
    }

    if (event.target.closest("[data-open-builder]")) {
      showView("builder");
      return;
    }

    const trashButton = event.target.closest("[data-view-trash]");
    if (trashButton) {
      showTrash(trashButton.dataset.viewTrash);
      return;
    }

    const playButton = event.target.closest("[data-play-card]");
    if (playButton) {
      playFromHand(playButton.dataset.playerKey, playButton.dataset.playCard);
      return;
    }

    const actionButton = event.target.closest("[data-board-action]");
    const boardCard = event.target.closest("[data-player-key][data-zone]");
    if (actionButton && boardCard) updateBoardCard(boardCard, actionButton.dataset.boardAction);
  });

  el.cardPreview.addEventListener("click", event => {
    const trashPreviewId = event.target.closest("[data-trash-preview]")?.dataset.trashPreview;
    if (!trashPreviewId) return;
    previewCard(getCard(trashPreviewId));
  });

  el.gameBoard.addEventListener("change", event => {
    const select = event.target.closest("[data-practice-deck]");
    if (!select) return;
    state.practiceDecks[select.dataset.practiceDeck] = select.value;
    renderGame();
  });

  el.gameBoard.addEventListener("mouseover", event => {
    const previewNode = event.target.closest("[data-preview-card]");
    if (!previewNode) return;
    updatePracticePreview(getCard(previewNode.dataset.previewCard));
  });
}

loadSavedDeck();
bindEvents();
initializeCardCreation();
loadCardPool();
window.addEventListener("resize", () => {
  if (state.activeView === "builder") queueDeckTableResize();
});
