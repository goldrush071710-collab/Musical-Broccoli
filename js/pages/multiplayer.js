import { signInGuest, waitForUser } from "../firebase/firebaseApp.js";
import {
    createRoom,
    joinRoom,
    subscribeToMatch,
    startMatch,
    setPlayerDeck,
    setPlayerReady,
    listPublicLobbies
} from "../firebase/multiplayerService.js";

// ── State ────────────────────────────────────────────
let currentUser = null;
let currentRoomCode = null;
let playerSlot = null;        // "p1" | "p2"
let unsubscribeMatch = null;
let unsubscribeLobbies = null;
let isReady = false;

// ── Nickname (persisted) ─────────────────────────────
// Nickname is session-only — never saved, each tab starts fresh
function getNickname() { return nicknameInput ? nicknameInput.value.trim() : ""; }
function saveNickname(v) { /* intentionally no-op — no persistence */ }

// ── DOM refs ─────────────────────────────────────────
const $ = id => document.getElementById(id);

// Views
const views = {
    landing: $("viewLanding"),
    browser: $("viewBrowser"),
    create:  $("viewCreate"),
    lobby:   $("viewLobby"),
};

function showView(name) {
    Object.values(views).forEach(v => v.classList.remove("active"));
    views[name].classList.add("active");
}

// Landing
const mpConnStatus   = $("mpConnStatus");
const nicknameInput  = $("nicknameInput");
const btnBrowse      = $("btnBrowse");
const btnCreate      = $("btnCreate");
const codeInput      = $("codeInput");
const btnJoinCode    = $("btnJoinCode");
const mpLandingError = $("mpLandingError");

// Browser
const browserList      = $("browserList");
const btnBackFromBrowser = $("btnBackFromBrowser");
const mpBrowserError   = $("mpBrowserError");

// Create
const lobbyNameInput    = $("lobbyNameInput");
const isPublicToggle    = $("isPublicToggle");
const publicToggleLabel = $("publicToggleLabel");
const createDeckSelect  = $("createDeckSelect");
const btnConfirmCreate  = $("btnConfirmCreate");
const btnBackFromCreate = $("btnBackFromCreate");
const mpCreateError     = $("mpCreateError");

// Lobby
const lobbyTitle       = $("lobbyTitle");
const lobbyCodeBox     = $("lobbyCodeBox");
const lobbyCodeDisplay = $("lobbyCodeDisplay");
const btnCopyCode      = $("btnCopyCode");
const lobbyDeckSelect  = $("lobbyDeckSelect");
const btnReady         = $("btnReady");
const btnStart         = $("btnStart");
const mpLobbyMsg       = $("mpLobbyMsg");
const mpLobbyError     = $("mpLobbyError");
const btnBackFromLobby = $("btnBackFromLobby");
const lobbyP1          = $("lobbyP1");
const lobbyP2          = $("lobbyP2");

// ── Helpers ───────────────────────────────────────────
function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
}
function clearError(el) {
    el.textContent = "";
    el.classList.add("hidden");
}
function setStatus(text, cls) {
    mpConnStatus.textContent = text;
    mpConnStatus.className = "mp-status " + cls;
}

function populateDecks(select) {
    const decks = window.getAvailableDecks?.() || [];
    select.innerHTML = "";
    if (decks.length === 0) {
        const o = document.createElement("option");
        o.textContent = "No decks saved";
        select.appendChild(o);
        return;
    }
    decks.forEach(deck => {
        const o = document.createElement("option");
        o.value = deck.id;
        o.textContent = deck.name;
        select.appendChild(o);
    });
}

function updateLobbyPlayerUI(slotEl, name, ready) {
    slotEl.querySelector(".lobby-player-name").textContent = name || "—";
    const statusEl = slotEl.querySelector(".lobby-player-status");
    if (!name) {
        statusEl.textContent = "Waiting…";
        statusEl.className = "lobby-player-status waiting";
    } else if (ready) {
        statusEl.textContent = "Ready ✓";
        statusEl.className = "lobby-player-status ready";
    } else {
        statusEl.textContent = "Not ready";
        statusEl.className = "lobby-player-status waiting";
    }
}

// ── Lobby browser ─────────────────────────────────────
function startBrowsing() {
    clearError(mpBrowserError);
    if (unsubscribeLobbies) { unsubscribeLobbies(); unsubscribeLobbies = null; }

    unsubscribeLobbies = listPublicLobbies(lobbies => {
        browserList.innerHTML = "";
        if (lobbies.length === 0) {
            browserList.innerHTML = '<div class="browser-empty">No open games right now — be the first to create one!</div>';
            return;
        }
        lobbies.forEach(lobby => {
            const row = document.createElement("div");
            row.className = "browser-row";
            row.innerHTML = `
                <div class="browser-row-info">
                    <div class="browser-row-name">${escapeHtml(lobby.name)}</div>
                    <div class="browser-row-host">Host: ${escapeHtml(lobby.host)}</div>
                </div>
                <button class="browser-row-join" data-code="${lobby.code}">Join</button>`;
            row.querySelector(".browser-row-join").addEventListener("click", () => {
                joinWithCode(lobby.code);
            });
            browserList.appendChild(row);
        });
    });
}

function stopBrowsing() {
    if (unsubscribeLobbies) { unsubscribeLobbies(); unsubscribeLobbies = null; }
}

function escapeHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Join helpers ──────────────────────────────────────
async function joinWithCode(code) {
    clearError(mpBrowserError);
    clearError(mpLandingError);
    if (!currentUser) { showError(mpLandingError, "Not connected yet — wait a moment."); return; }
    const nickname = getNickname() || "Player 2";
    try {
        stopBrowsing();
        currentRoomCode = await joinRoom(code, currentUser, nickname);
        playerSlot = "p2";
        openLobbyView();
    } catch (e) {
        showError(mpBrowserError, e.message);
        showError(mpLandingError, e.message);
        startBrowsing();
    }
}

// ── Lobby view ────────────────────────────────────────
function openLobbyView() {
    populateDecks(lobbyDeckSelect);
    clearError(mpLobbyError);
    mpLobbyMsg.textContent = "Choose your deck and ready up.";
    isReady = false;
    btnReady.disabled = false;
    btnReady.textContent = "Ready Up";
    btnStart.classList.add("hidden");

    // Show code box only for host (p1) and only if private
    lobbyCodeBox.classList.add("hidden");
    if (playerSlot === "p1") {
        lobbyCodeDisplay.textContent = currentRoomCode;
        lobbyTitle.textContent = "Your Room";
        // We'll determine public/private from match data when it loads
    } else {
        lobbyTitle.textContent = "Room — " + currentRoomCode;
    }

    // Subscribe to match updates
    if (unsubscribeMatch) { unsubscribeMatch(); }
    unsubscribeMatch = subscribeToMatch(currentRoomCode, handleMatchUpdate);

    showView("lobby");
}

function handleMatchUpdate(match) {
    if (!match) return;

    const p1 = match.players?.p1;
    const p2 = match.players?.p2;

    updateLobbyPlayerUI(lobbyP1, p1?.name, p1?.ready);
    updateLobbyPlayerUI(lobbyP2, p2?.name, p2?.ready);

    // Show code box for host if room is private
    if (playerSlot === "p1" && match.isPublic === false) {
        lobbyCodeBox.classList.remove("hidden");
    } else if (playerSlot === "p1" && match.isPublic) {
        lobbyCodeBox.classList.add("hidden");
    }

    // Always show code for private rooms (even for p2 to reshare)
    if (!match.isPublic) {
        lobbyCodeBox.classList.remove("hidden");
        lobbyCodeDisplay.textContent = currentRoomCode;
    }

    const bothReady = p1?.ready && p2?.ready;

    if (match.status === "started") {
        // Match has started — redirect to game
        if (unsubscribeMatch) { unsubscribeMatch(); unsubscribeMatch = null; }
        const url = `../html/self.html?mode=online&room=${currentRoomCode}&player=${playerSlot}`;
        window.location.href = url;
        return;
    }

    // Auto-start when both ready — host triggers it
    if (bothReady && playerSlot === "p1") {
        mpLobbyMsg.textContent = "Both ready! Starting match…";
        startMatch(currentRoomCode).catch(e => showError(mpLobbyError, e.message));
    } else if (bothReady) {
        mpLobbyMsg.textContent = "Both ready — starting match…";
    } else if (!p2) {
        mpLobbyMsg.textContent = "Waiting for opponent to join…";
    } else {
        mpLobbyMsg.textContent = "Waiting for both players to ready up.";
    }
}

// ── Init ──────────────────────────────────────────────
async function init() {
    // Load cards
    if (typeof loadCardDatabase === "function") await loadCardDatabase().catch(() => {});
    populateDecks(createDeckSelect);
    populateDecks(lobbyDeckSelect);

    // Firebase auth
    try {
        setStatus("Connecting…", "connecting");
        await signInGuest();
        currentUser = await waitForUser();
        setStatus("Connected", "connected");
    } catch (e) {
        setStatus("Connection failed", "error");
    }
}

// ── Event listeners ───────────────────────────────────

isPublicToggle.addEventListener("change", () => {
    publicToggleLabel.textContent = isPublicToggle.checked
        ? "Anyone can join from the browser"
        : "Only joinable with the room code";
});

// Landing → browse
btnBrowse.addEventListener("click", () => {
    clearError(mpLandingError);
    showView("browser");
    startBrowsing();
});

btnBackFromBrowser.addEventListener("click", () => {
    stopBrowsing();
    showView("landing");
});

// Landing → create
btnCreate.addEventListener("click", () => {
    clearError(mpLandingError);
    const nick = getNickname() || "Player";
    lobbyNameInput.value = nick + "'s Game";
    populateDecks(createDeckSelect);
    showView("create");
});

btnBackFromCreate.addEventListener("click", () => showView("landing"));

// Landing → join by code
btnJoinCode.addEventListener("click", async () => {
    const code = codeInput.value.trim().toUpperCase();
    if (!code) { showError(mpLandingError, "Enter a room code first."); return; }
    await joinWithCode(code);
});

codeInput.addEventListener("keydown", e => {
    if (e.key === "Enter") btnJoinCode.click();
});

// Create room
btnConfirmCreate.addEventListener("click", async () => {
    clearError(mpCreateError);
    if (!currentUser) { showError(mpCreateError, "Not connected yet."); return; }

    const nickname = getNickname() || "Player 1";
    const lobbyName = lobbyNameInput.value.trim() || nickname + "'s Game";
    const isPublic  = isPublicToggle.checked;

    btnConfirmCreate.disabled = true;
    btnConfirmCreate.textContent = "Creating…";

    try {
        currentRoomCode = await createRoom(currentUser, { isPublic, lobbyName, nickname });
        playerSlot = "p1";

        // Save selected deck ready for ready-up
        openLobbyView();
    } catch (e) {
        showError(mpCreateError, e.message);
    } finally {
        btnConfirmCreate.disabled = false;
        btnConfirmCreate.textContent = "Create Room";
    }
});

// Lobby — copy code
btnCopyCode.addEventListener("click", () => {
    navigator.clipboard?.writeText(currentRoomCode).then(() => {
        btnCopyCode.textContent = "Copied!";
        setTimeout(() => { btnCopyCode.textContent = "Copy"; }, 1800);
    });
});

// Lobby — ready up
btnReady.addEventListener("click", async () => {
    clearError(mpLobbyError);
    if (!currentRoomCode || !currentUser) { showError(mpLobbyError, "Not in a room."); return; }

    const selectedDeck = window.getDeckById?.(lobbyDeckSelect.value);
    if (!selectedDeck) { showError(mpLobbyError, "Choose a deck first."); return; }

    btnReady.disabled = true;
    btnReady.textContent = "Saving…";
    isReady = true;

    try {
        await setPlayerDeck(currentRoomCode, playerSlot, {
            id: selectedDeck.id,
            name: selectedDeck.name,
            leaderKey: selectedDeck.leaderKey,
            deckText: selectedDeck.deckText
        });
        await setPlayerReady(currentRoomCode, playerSlot, true);
        btnReady.textContent = "Ready ✓";
        mpLobbyMsg.textContent = "You're ready — waiting for opponent.";
    } catch (e) {
        showError(mpLobbyError, e.message);
        btnReady.disabled = false;
        btnReady.textContent = "Ready Up";
        isReady = false;
    }
});

// Lobby — start match (host only)
btnStart.addEventListener("click", async () => {
    clearError(mpLobbyError);
    btnStart.disabled = true;
    btnStart.textContent = "Starting…";
    try {
        await startMatch(currentRoomCode);
        // Redirect handled by handleMatchUpdate when status === "started"
    } catch (e) {
        showError(mpLobbyError, e.message);
        btnStart.disabled = false;
        btnStart.textContent = "Start Match";
    }
});

// Lobby — leave
btnBackFromLobby.addEventListener("click", () => {
    if (unsubscribeMatch) { unsubscribeMatch(); unsubscribeMatch = null; }
    currentRoomCode = null;
    playerSlot = null;
    isReady = false;
    showView("landing");
});

// ── Bootstrap ─────────────────────────────────────────
init();
