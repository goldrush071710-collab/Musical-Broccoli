// self.js

// =========================
// Image Paths
// =========================

const cardBackImage = "../images/basic/card-back-normal.jpg";
const donBackImage = "../images/basic/card-back-don.webp";
const donImage = "../images/basic/card-front-don.webp";

// =========================
// Stub Functions for Removed Game Mechanics
// =========================

// These stub functions replace the game mechanic functions that were removed.
// All game logic has been disabled to make the board fully manual.

window.CardEffects = {
    getAvailableBlockers: () => [],
    canBlock: () => false,
    hasCardName: () => false,
    canAttackOnTurnPlayed: () => false,
    canAttackCharactersOnTurnPlayed: () => false,
    hasKeyword: () => false,
    normalizeKeyword: (kw) => kw
};

function createCardInstance(card) {
    return { ...card, instanceId: `card-${Math.random()}` };
}

function getCardPlayCost(card) {
    return Number(card.cost ?? card.playCost ?? 0);
}

function getCardEffectiveCost(card) {
    return getCardPlayCost(card);
}

// =========================
// Online Stuff
// =========================

const urlParams = new URLSearchParams(window.location.search);

const gameMode = urlParams.get("mode") || "local";
const roomCode = urlParams.get("room");
const playerSlot = urlParams.get("player");

const isOnlineMatch = gameMode === "online";
const onlinePlayerLabels = {
    p1: "Player 1",
    p2: "Player 2"
};

let onlineMultiplayerService = null;
let onlineFirebaseApp = null;
let onlineMatchUnsubscribe = null;
let onlinePrivateUnsubscribe = null;
let onlineUser = null;
let onlinePublicState = null;
let onlinePrivateState = null;
let lastOnlineTurnKey = null;
let onlineProcessedTurnKey = null;
let onlineLastRevealKey = null;
let onlineLastAttackKey = null;
let onlineActiveAttackId = null;
let onlineProcessedDefenderAttackEffectId = null;
let onlineShownGameOverKey = null;
let onlinePendingWinnerSlot = null;

if (isOnlineMatch) {
    console.log("Online match loaded.");
    console.log("Room code:", roomCode);
    console.log("Player slot:", playerSlot);
}

const onlineMatchInfo = document.getElementById("onlineMatchInfo");

if (isOnlineMatch) {
    updateOnlineMatchInfo();
}

function getPlayerKeyFromOnlineSlot(slot) {
    if (slot === "p1") return "player1";
    if (slot === "p2") return "player2";

    return null;
}

function getPlayerKey(player) {
    if (!player || !gameState) return null;
    if (player === gameState.player1) return "player1";
    if (player === gameState.player2) return "player2";
    return null;
}

function getOnlineSlotFromPlayerKey(playerKey) {
    if (playerKey === "player1") return "p1";
    if (playerKey === "player2") return "p2";

    return null;
}

function isCurrentOnlinePlayer() {
    return Boolean(onlinePublicState?.currentPlayer && onlinePublicState.currentPlayer === playerSlot);
}

function getOwnOnlinePlayerKey() {
    return getPlayerKeyFromOnlineSlot(playerSlot);
}

function isOwnOnlinePlayer(player) {
    return isOnlineMatch && player && getOwnOnlinePlayerKey() && player === gameState?.[getOwnOnlinePlayerKey()];
}

function getOnlinePublicPlayerKey(playerKey) {
    return playerKey === "player1" ? "player1" : "player2";
}

function createHiddenCards(count) {
    return Array.from({ length: Number(count || 0) }, (_, index) => ({
        instanceId: `hidden-${index}`,
        hidden: true
    }));
}

function createPublicCardSnapshot(card) {
    if (!card) return null;

    return {
        name: card.name,
        image: card.image,
        cardNumber: card.cardNumber,
        cardType: card.cardType,
        type: card.type,
        color: card.color,
        cost: card.cost,
        power: card.power,
        counter: card.counter,
        attribute: card.attribute,
        keywords: card.keywords || [],
        effects: card.effects || [],
        instanceId: card.instanceId,
        state: card.state || "active",
        faceUp: Boolean(card.faceUp)
    };
}

function getOnlinePlayerSnapshot(playerKey) {
    return onlinePublicState?.[getOnlinePublicPlayerKey(playerKey)] || null;
}

function applyOnlinePlayerState(playerKey) {
    const publicPlayer = getOnlinePlayerSnapshot(playerKey);
    const player = gameState?.[playerKey];

    if (!publicPlayer || !player) return;

    const isOwnPlayer = playerKey === getOwnOnlinePlayerKey();

    player.name = playerKey === "player1" ? "Player 1" : "Player 2";
    player.leader = publicPlayer.leader;
    player.characters = publicPlayer.characters || [];
    player.stage = publicPlayer.stage || null;
    player.trash = publicPlayer.trash || [];
    player.don = Number(publicPlayer.activeTokens || 0);
    player.restedDon = Number(publicPlayer.restedTokens || 0);
    player.donDeck = Number(publicPlayer.tokenDeckCount ?? 10);
    player.turns = Number(publicPlayer.turns || 0);

    if (isOwnPlayer && onlinePrivateState) {
        player.hand = onlinePrivateState.hand || [];
        player.deck = onlinePrivateState.deck || [];
        player.life = onlinePrivateState.life || [];
    } else {
        player.hand = createHiddenCards(publicPlayer.handCount);
        player.deck = createHiddenCards(publicPlayer.deckCount);
        player.life = createHiddenCards(publicPlayer.lifeCount);

        (publicPlayer.faceUpLifeCards || []).forEach(entry => {
            const index = Number(entry.index);

            if (index >= 0 && index < player.life.length && entry.card) {
                player.life[index] = {
                    ...entry.card,
                    faceUp: true
                };
            }
        });
    }
}

function renderOnlineGameState() {
    if (!gameState) return;

    clearHandSelection();
    clearBoardSelection();
    clearSelectedCardActions();
    clearSelectedBoardActions();

    updateDonDisplay();
    renderDecks();
    renderDonDecks();
    renderLifeCards();
    renderLeaders();
    renderHands();
    renderCharacters();
    renderTrash();
    renderStages();
}

function applyOnlineStateToGame() {
    if (!isOnlineMatch || !gameState || !onlinePublicState?.player1 || !onlinePublicState?.player2) {
        return;
    }

    const currentPlayerKey = getPlayerKeyFromOnlineSlot(onlinePublicState.currentPlayer);

    applyOnlinePlayerState("player1");
    applyOnlinePlayerState("player2");

    gameState.currentPlayer = currentPlayerKey ? gameState[currentPlayerKey] : null;
    gameState.currentPhase = onlinePublicState.phase || "main";
    gameState.turnNumber = Number(onlinePublicState.turnNumber || 1);

    renderOnlineGameState();
    updateOnlinePhaseButton();
}

function updateOnlineMatchInfo() {
    if (!onlineMatchInfo) return;

    onlineMatchInfo.classList.remove("hidden");

    const currentPlayer = onlinePublicState?.currentPlayer;
    const currentPlayerText = currentPlayer
        ? onlinePlayerLabels[currentPlayer] || currentPlayer.toUpperCase()
        : "Waiting";
    const phaseText = onlinePublicState?.phase || "Waiting";
    const turnText = onlinePublicState?.turnNumber ?? "-";
    const dice = onlinePublicState?.setup?.dice || {};
    const firstPlayer = onlinePublicState?.firstPlayer ||
        onlinePublicState?.setup?.turnChoice?.firstPlayer ||
        null;
    const secondPlayer = onlinePublicState?.secondPlayer ||
        onlinePublicState?.setup?.turnChoice?.secondPlayer ||
        null;
    const turnOrderText = firstPlayer && secondPlayer
        ? `Order: ${onlinePlayerLabels[firstPlayer] || firstPlayer.toUpperCase()} first, ${onlinePlayerLabels[secondPlayer] || secondPlayer.toUpperCase()} second`
        : "Order: Not chosen";
    const setupText = onlinePublicState?.phase === "diceRoll"
        ? `Rolls: P1 ${dice.p1Roll || "-"} / P2 ${dice.p2Roll || "-"}${dice.tie ? " (tie)" : ""}`
        : `Turn #: ${turnText}`;

    onlineMatchInfo.textContent = [
        `Online Room: ${roomCode || "Unknown"}`,
        `You are ${(playerSlot || "unknown").toUpperCase()}`,
        `Turn: ${currentPlayerText}`,
        `Phase: ${phaseText}`,
        turnOrderText,
        setupText
    ].join(" | ");
}

function applyOnlinePublicState(publicState = {}) {
    if (!isOnlineMatch) return;

    onlinePublicState = {
        phase: publicState.phase || "main",
        currentPlayer: publicState.currentPlayer || null,
        turnNumber: Number(publicState.turnNumber || 1),
        winner: publicState.winner || null,
        gameOverReasonTitle: publicState.gameOverReasonTitle || null,
        gameOverReasonText: publicState.gameOverReasonText || null,
        firstPlayer: publicState.firstPlayer || null,
        secondPlayer: publicState.secondPlayer || null,
        playerTurns: publicState.playerTurns || { p1: 0, p2: 0 },
        setup: publicState.setup || {},
        revealedCards: publicState.revealedCards || [],
        currentAttack: publicState.currentAttack || null,
        player1: publicState.player1 || null,
        player2: publicState.player2 || null
    };

    const turnKey = `${onlinePublicState.currentPlayer}:${onlinePublicState.turnNumber}:${onlinePublicState.phase}`;
    const turnStartKey = `${onlinePublicState.currentPlayer}:${onlinePublicState.turnNumber}`;

    if (lastOnlineTurnKey && turnKey !== lastOnlineTurnKey) {
        addGameLog(
            `Online state updated: ${onlinePlayerLabels[onlinePublicState.currentPlayer] || "Waiting"} ` +
            `- ${onlinePublicState.phase}, turn ${onlinePublicState.turnNumber}.`
        );
    }

    lastOnlineTurnKey = turnKey;

    applyOnlineStateToGame();
    updateOnlineMatchInfo();
    maybeRunOnlineTurnStart(turnStartKey);
    showOnlineRevealedCards();
}

function removeOnlineTurnChoiceButtons() {
    document.getElementById("onlineTurnChoiceButtons")?.remove();
}

function removeOnlineMulliganButtons() {
    document.getElementById("onlineMulliganButtons")?.remove();
}

function createOnlineTurnChoiceButtons() {
    if (document.getElementById("onlineTurnChoiceButtons")) return;

    const controls = document.querySelector(".phase-controls");

    if (!controls) return;

    const choiceContainer = document.createElement("div");
    choiceContainer.className = "choice-buttons";
    choiceContainer.id = "onlineTurnChoiceButtons";

    const firstButton = document.createElement("button");
    firstButton.className = "phase-button";
    firstButton.textContent = "Go 1st";

    const secondButton = document.createElement("button");
    secondButton.className = "phase-button";
    secondButton.textContent = "Go 2nd";

    firstButton.addEventListener("click", () => {
        handleOnlineTurnChoice("first");
    });

    secondButton.addEventListener("click", () => {
        handleOnlineTurnChoice("second");
    });

    choiceContainer.appendChild(firstButton);
    choiceContainer.appendChild(secondButton);
    controls.appendChild(choiceContainer);
}

function createOnlineMulliganButtons() {
    if (document.getElementById("onlineMulliganButtons")) return;

    const controls = document.querySelector(".phase-controls");

    if (!controls) return;

    const choiceContainer = document.createElement("div");
    choiceContainer.className = "choice-buttons";
    choiceContainer.id = "onlineMulliganButtons";

    const keepButton = document.createElement("button");
    keepButton.className = "phase-button";
    keepButton.textContent = "Keep Hand";

    const mulliganButton = document.createElement("button");
    mulliganButton.className = "phase-button";
    mulliganButton.textContent = "Mulligan";

    keepButton.addEventListener("click", () => {
        handleOnlineMulligan(false);
    });

    mulliganButton.addEventListener("click", () => {
        handleOnlineMulligan(true);
    });

    choiceContainer.appendChild(keepButton);
    choiceContainer.appendChild(mulliganButton);
    controls.appendChild(choiceContainer);
}

function showOnlineRevealedCards() {
    const revealedCards = onlinePublicState?.revealedCards || [];

    if (!revealedCards.length) return;

    const latestReveal = revealedCards[revealedCards.length - 1];
    const cards = latestReveal.cards || [];

    const revealKey = latestReveal.id || `${latestReveal.player}:${cards.map(card => card.instanceId || card.cardNumber || card.name).join(",")}`;

    if (!cards.length || onlineLastRevealKey === revealKey) return;

    onlineLastRevealKey = revealKey;

    addGameLog(
        `${onlinePlayerLabels[latestReveal.player] || "Player"} revealed: ` +
        cards.map(card => card.name).join(", ")
    );
}

function handleOnlineGameOver() {
    if (!isOnlineMatch || !gameState || onlinePublicState?.phase !== "gameOver" || !onlinePublicState?.winner) {
        return;
    }

    const gameOverKey = `${onlinePublicState.winner}:${onlinePublicState.phase}`;

    if (onlineShownGameOverKey === gameOverKey) {
        return;
    }

    const winnerPlayerKey = getPlayerKeyFromOnlineSlot(onlinePublicState.winner);
    const winnerPlayer = winnerPlayerKey ? gameState[winnerPlayerKey] : null;

    if (!winnerPlayer) {
        return;
    }

    onlineShownGameOverKey = gameOverKey;
    onlinePendingWinnerSlot = onlinePublicState.winner;
    gameState.currentPhase = "gameOver";

    pendingAttack = null;
    currentAttack = null;
    pendingBlock = null;
    pendingTrashChoice = null;
    pendingReplacePlay = null;

    clearAttackTargets();
    clearBlockerTargets();
    clearBattleControls();
    clearHandSelection();
    clearBoardSelection();
    clearReplaceTargets();
    clearTrashChoiceTargets();
    clearCancelAttackButton();
    clearAttackArrow();

    showGameOverPopup(
        winnerPlayer,
        onlinePublicState.gameOverReasonTitle || "Victory",
        onlinePublicState.gameOverReasonText || `${winnerPlayer.name} won the online match.`
    );
}

async function publishOnlineReveal(cards) {
    if (!isOnlineMatch || !onlineMultiplayerService || !cards?.length) return;

    const revealedCards = onlinePublicState?.revealedCards || [];

    await onlineMultiplayerService.updatePublicState(roomCode, {
        revealedCards: [
            ...revealedCards,
            {
                id: crypto.randomUUID(),
                player: playerSlot,
                cards: cards.map(card => ({
                    name: card.name,
                    image: card.image,
                    cardNumber: card.cardNumber,
                    cardType: card.cardType,
                    type: card.type
                }))
            }
        ]
    });
}

async function syncOnlineCurrentAttack(attackState) {
    if (!isOnlineMatch || !onlineMultiplayerService) return;

    await onlineMultiplayerService.updateCurrentAttack(roomCode, attackState);
}

function applyOnlinePrivateState(privateState = {}) {
    if (!isOnlineMatch) return;

    onlinePrivateState = {
        selectedDeck: privateState.selectedDeck || null,
        hand: privateState.hand || [],
        deck: privateState.deck || [],
        life: privateState.life || []
    };

    applyOnlineStateToGame();
    updateOnlinePhaseButton();

    if (onlinePublicState) {
        maybeRunOnlineTurnStart(
            `${onlinePublicState.currentPlayer}:${onlinePublicState.turnNumber}`
        );
    }
}

function createPublicPlayerStateFromLocal(player) {
    return {
        leader: player.leader,
        characters: player.characters || [],
        stage: player.stage || null,
        trash: player.trash || [],
        handCount: player.hand?.length || 0,
        deckCount: player.deck?.length || 0,
        lifeCount: player.life?.length || 0,
        activeTokens: Number(player.don || 0),
        restedTokens: Number(player.restedDon || 0),
        tokenDeckCount: Number(player.donDeck ?? 10),
        turns: Number(player.turns || 0),
        faceUpLifeCards: (player.life || [])
            .map((card, index) => card?.faceUp ? { index, card: createPublicCardSnapshot(card) } : null)
            .filter(Boolean)
    };
}

function createOwnPrivateStateFromLocal(player) {
    return {
        selectedDeck: onlinePrivateState?.selectedDeck || null,
        hand: player.hand || [],
        deck: player.deck || [],
        life: player.life || []
    };
}

async function syncOnlineStateFromLocal() {
    if (!isOnlineMatch || !onlineMultiplayerService || !onlineUser || !gameState) return;

    const ownPlayerKey = getOwnOnlinePlayerKey();
    const ownPlayer = ownPlayerKey ? gameState[ownPlayerKey] : null;

    if (!ownPlayer) return;

    const publicKey = getOnlinePublicPlayerKey(ownPlayerKey);

    const publicState = {
        playerTurns: {
            ...(onlinePublicState?.playerTurns || {}),
            [playerSlot]: Number(ownPlayer.turns || 0)
        },
        [publicKey]: createPublicPlayerStateFromLocal(ownPlayer)
    };

    if (gameState.currentPhase === "gameOver") {
        publicState.phase = "gameOver";
        publicState.winner = onlinePublicState?.winner || onlinePendingWinnerSlot || null;
    }

    const privateState = createOwnPrivateStateFromLocal(ownPlayer);

    onlinePrivateState = privateState;

    await onlineMultiplayerService.sendMultiplayerAction(
        roomCode,
        onlineUser,
        "updateState",
        {
            publicState,
            privateState
        }
    );
}

async function syncOnlinePublicBoardFromLocal(extraState = {}) {
    if (!isOnlineMatch || !onlineMultiplayerService || !gameState) return;

    const ownPlayerKey = getOwnOnlinePlayerKey();
    const ownPlayer = ownPlayerKey ? gameState[ownPlayerKey] : null;
    const publicKey = ownPlayerKey ? getOnlinePublicPlayerKey(ownPlayerKey) : null;

    if (!ownPlayer || !publicKey) return;

    await onlineMultiplayerService.updatePublicState(roomCode, {
        [publicKey]: createPublicPlayerStateFromLocal(ownPlayer),
        ...extraState
    });
}

async function syncOnlineAllPublicBoardsFromLocal(extraState = {}) {
    if (!isOnlineMatch || !onlineMultiplayerService || !gameState) return;

    await onlineMultiplayerService.updatePublicState(roomCode, {
        player1: createPublicPlayerStateFromLocal(gameState.player1),
        player2: createPublicPlayerStateFromLocal(gameState.player2),
        ...extraState
    });
}

async function maybeRunOnlineTurnStart(turnKey) {
    if (!isOnlineMatch || !onlinePrivateState || !gameState || !isCurrentOnlinePlayer()) {
        return;
    }

    if (onlinePublicState?.phase !== "main" || onlinePublicState?.currentAttack) {
        return;
    }

    const player = gameState[getOwnOnlinePlayerKey()];

    if (!player) return;

    const expectedTurns = Number(onlinePublicState?.turnNumber || 1);
    const publicTurns = Number(
        onlinePublicState?.playerTurns?.[playerSlot] ??
        onlinePublicState?.[getOnlinePublicPlayerKey(getOwnOnlinePlayerKey())]?.turns ??
        player.turns ??
        0
    );

    if (publicTurns >= expectedTurns || onlineProcessedTurnKey === turnKey) {
        return;
    }

    onlineProcessedTurnKey = turnKey;

    const phaseInfo = createPhaseLogProxy();

    player.turns = expectedTurns;
    player.leaderAttacksThisTurn = 0;

    runRefreshPhase(player, phaseInfo);
    const drawResult = runDrawPhase(player, phaseInfo);

    if (drawResult?.deckOut || gameState.currentPhase === "gameOver") {
        await syncOnlineStateFromLocal();

        if (isOnlineMatch) {
            await syncOnlineAllPublicBoardsFromLocal();
        }
        return;
    }

    runDonPhase(player, 2, phaseInfo);

    gameState.currentPhase = "main";

    await syncOnlineStateFromLocal();
    updateOnlinePhaseButton();
}

async function initializeOnlineMultiplayer() {
    if (!isOnlineMatch) return;

    if (!roomCode || !playerSlot) {
        addGameLog("Online match URL is missing room or player slot.");
        updateOnlinePhaseButton();
        return;
    }

    if (playerSlot !== "p1" && playerSlot !== "p2") {
        addGameLog("Online match URL has an invalid player slot.");
        updateOnlinePhaseButton();
        return;
    }

    try {
        onlineMultiplayerService = await import("../firebase/multiplayerService.js");
        onlineFirebaseApp = await import("../firebase/firebaseApp.js");
        if (!onlineFirebaseApp.auth.currentUser) {
            await onlineFirebaseApp.signInGuest();
        }
        onlineUser = await onlineFirebaseApp.waitForUser();

        // Multiplayer code reads public board/count state plus this user's private zones only.
        onlineMatchUnsubscribe = onlineMultiplayerService.subscribeToPublicState(
            roomCode,
            (publicState) => applyOnlinePublicState(publicState || {})
        );
        onlinePrivateUnsubscribe = onlineMultiplayerService.subscribeToPrivateState(
            roomCode,
            onlineUser.uid,
            (privateState) => applyOnlinePrivateState(privateState || {})
        );

        addGameLog(`Connected to online room ${roomCode} as ${playerSlot.toUpperCase()}.`);
        updateOnlinePhaseButton();
    } catch (error) {
        console.error(error);
        addGameLog(`Failed to connect online match: ${error.message}`);
        updateOnlinePhaseButton();
    }
}

async function handleOnlineDiceRoll() {
    if (!onlineMultiplayerService || onlinePublicState?.phase !== "diceRoll") return;

    try {
        await onlineMultiplayerService.rollMultiplayerDice(roomCode, playerSlot);
    } catch (error) {
        console.error(error);
        addGameLog(`Failed to roll dice: ${error.message}`);
    }
}

async function handleOnlineTurnChoice(choice) {
    if (!onlineMultiplayerService || onlinePublicState?.setup?.dice?.winner !== playerSlot) {
        addGameLog("Only the dice winner can choose turn order.");
        return;
    }

    try {
        removeOnlineTurnChoiceButtons();
        await onlineMultiplayerService.chooseMultiplayerTurnOrder(roomCode, playerSlot, choice);
    } catch (error) {
        console.error(error);
        addGameLog(`Failed to choose turn order: ${error.message}`);
        updateOnlinePhaseButton();
    }
}

async function handleOnlineMulligan(tookMulligan) {
    if (!onlineMultiplayerService || !onlineUser || onlinePublicState?.phase !== "mulligan") {
        return;
    }

    try {
        removeOnlineMulliganButtons();
        await onlineMultiplayerService.setMultiplayerMulligan(
            roomCode,
            onlineUser,
            playerSlot,
            tookMulligan
        );
    } catch (error) {
        console.error(error);
        addGameLog(`Failed to choose mulligan: ${error.message}`);
        updateOnlinePhaseButton();
    }
}

async function handleOnlinePassTurn() {
    if (!isOnlineMatch) return;

    if (!onlineMultiplayerService || !onlinePublicState?.currentPlayer) {
        addGameLog("Online match is still connecting.");
        updateOnlinePhaseButton();
        return;
    }

    if (!isCurrentOnlinePlayer()) {
        addGameLog("Only the current online player can end the turn.");
        updateOnlinePhaseButton();
        return;
    }

    const phaseButton = document.getElementById("phaseButton");

    try {
        if (phaseButton) {
            phaseButton.disabled = true;
        }

        const ownPlayer = gameState[getOwnOnlinePlayerKey()];
        const phaseInfo = createPhaseLogProxy();

        if (ownPlayer) {
            const endOfTurnResults = resolveEndOfTurnEffects(ownPlayer, ui);

            endOfTurnResults.forEach(result => addGameLog(result.message));

            if (gameState.currentPhase === "gameOver") {
                await syncOnlineStateFromLocal();
                updateOnlinePhaseButton();
                return;
            }

            await syncOnlineStateFromLocal();
            await syncOnlineAllPublicBoardsFromLocal();
        }

        // Multiplayer turn owner writes private/public snapshot, then flips public turn pointer.
        const result = await onlineMultiplayerService.passTurn(roomCode, onlinePublicState.currentPlayer);

        if (!result?.committed) {
            addGameLog("Online turn was already updated.");
            updateOnlinePhaseButton();
        }
    } catch (error) {
        console.error(error);
        addGameLog(`Failed to end online turn: ${error.message}`);
        updateOnlinePhaseButton();
    }
}

// =========================
// Selected Card State
// =========================

let selectedHandCard = null;
let selectedHandCardData = null;
let pendingReplacePlay = null;

let selectedBoardCard = null;
let selectedBoardCardData = null;
let selectedDonAttachment = null;

let pendingAttack = null;
let currentAttack = null;
let pendingBlock = null;
let pendingTrashChoice = null;
let combatNextPhaseAction = null;
let pendingBoardChoice = null;

const renderedBoardCardStates = new Map();

// =========================
// Game State
// =========================

let gameState = null;

// =========================
// UI Bridge
// =========================

let ui = null;

// =========================
// Game Initialization
// =========================

function getSelectedDeckIds() {
    const params = new URLSearchParams(window.location.search);
    const defaultDeckId = window.getAvailableDecks?.()[0]?.id;

    return {
        player1DeckId: params.get("player1Deck") || defaultDeckId,
        player2DeckId: params.get("player2Deck") || defaultDeckId
    };
}

function getPracticeSnapshotDecks() {
    try {
        const raw = sessionStorage.getItem("custom-cards-sim-practice-decks");
        if (!raw) return null;

        const payload = JSON.parse(raw);
        if (!payload?.player?.leaderId || !payload?.opponent?.leaderId) {
            return null;
        }

        return {
            player1Deck: snapshotToDeckDefinition(payload.player, "practice-player-1"),
            player2Deck: snapshotToDeckDefinition(payload.opponent, "practice-player-2")
        };
    } catch (error) {
        console.warn("Could not load selected practice decks.", error);
        return null;
    }
}

function snapshotToDeckDefinition(snapshot, id) {
    const deckText = Object.entries(snapshot.deck || {})
        .filter(([, qty]) => Number(qty) > 0)
        .map(([cardId, qty]) => `${Number(qty)}x${cardId}`)
        .join("\n");

    return {
        id,
        name: snapshot.name || "Practice Deck",
        leaderKey: snapshot.leaderId,
        deckText
    };
}

function createInitialPlayerState(playerName, deckDefinition) {
    const selectedDeck = deckDefinition || window.getAvailableDecks?.()[0];
    const leader = window.leaders[selectedDeck.leaderKey];

    if (!leader) {
        throw new Error(`Leader not found for deck: ${selectedDeck.name}`);
    }

    return {
        name: playerName,
        don: 0,
        restedDon: 0,
        donDeck: 10,
        turns: 0,
        deck: shuffleDeck(parseDeckText(selectedDeck.deckText)),
        deckName: selectedDeck.name,
        hasMulliganed: false,
        hand: [],
        life: [],
        trash: [],
        leader: createCardInstance(leader),
        characters: [],
        stage: null
    };
}

function createInitialGameState() {
    const practiceDecks = getPracticeSnapshotDecks();

    if (practiceDecks) {
        return {
            player1: createInitialPlayerState("Player 1", practiceDecks.player1Deck),
            player2: createInitialPlayerState("Player 2", practiceDecks.player2Deck),

            diceWinner: null,
            firstPlayer: null,
            secondPlayer: null,
            currentPlayer: null,
            turnNumber: 1,
            currentPhase: "diceRoll"
        };
    }

    const selectedDeckIds = getSelectedDeckIds();
    const player1Deck = window.getDeckById(selectedDeckIds.player1DeckId);
    const player2Deck = window.getDeckById(selectedDeckIds.player2DeckId);

    return {
        player1: createInitialPlayerState("Player 1", player1Deck),
        player2: createInitialPlayerState("Player 2", player2Deck),

        diceWinner: null,
        firstPlayer: null,
        secondPlayer: null,
        currentPlayer: null,
        turnNumber: 1,
        currentPhase: "diceRoll"
    };
}

function createUiBridge() {
    return {
        updateDonDisplay,
        renderDonDecks,
        renderHands,
        renderDecks,
        renderLifeCards,
        renderLeaders,
        renderCharacters,
        renderTrash,
        renderStages,
        lookTopCardsAddToHand,
        chooseBoardCard: showBoardCardChoice,
        chooseEffectActivation,
        chooseEffectOption,
        revealCards: publishOnlineReveal
    };
}

// =========================
// Animation Helpers
// =========================

function takeCardAnimationClass(card) {
    const animation = card?.uiAnimation;

    if (!animation) {
        return "";
    }

    delete card.uiAnimation;

    return `card-${animation}-animation`;
}

function getBoardCardRenderKey(playerKey, cardType, slotIndex = "") {
    return `${playerKey}:${cardType}:${slotIndex}`;
}

function getBoardStateAnimationClass(card, renderKey) {
    if (!card || !renderKey) {
        return "";
    }

    const currentState = card.state || "active";
    const previousState = renderedBoardCardStates.get(renderKey);

    renderedBoardCardStates.set(renderKey, currentState);

    if (!previousState || previousState === currentState) {
        return "";
    }

    if (previousState === "active" && currentState === "rested") {
        return "card-rest-transition";
    }

    if (previousState === "rested" && currentState === "active") {
        return "card-ready-transition";
    }

    return "";
}

function applyCardAnimationClass(element, animationClass) {
    if (!element || !animationClass) {
        return;
    }

    element.classList.add(animationClass);
}

async function initializeGamePage() {
    try {
        await loadCardDatabase();

        gameState = createInitialGameState();
        ui = createUiBridge();

        setupLifeArea("lifeArea", "lifeToggleText");
        setupLifeArea("opponentLifeArea", "opponentLifeToggleText");

        updateDonDisplay();
        renderDecks();
        renderDonDecks();
        renderLeaders();
        renderHands();
        renderCharacters();
        renderTrash();
        renderStages();

        setupCharacterSlotInteractions();
        setupBoardLeaderSelection();
        setupCardPreview();
        setupDonAttachmentClearListener();
        autoStartSelfMatch();

        addGameLog(`
            Card database loaded. Game ready.<br>
            Player 1: ${gameState.player1.deckName}<br>
            Player 2: ${gameState.player2.deckName}
        `);

        initializeOnlineMultiplayer();
    } catch (error) {
        console.error(error);
        addGameLog(`Failed to load card database: ${error.message}`);
    }
}

document.addEventListener("DOMContentLoaded", initializeGamePage);

function setupDonAttachmentClearListener() {
    if (document.body.dataset.donAttachmentClearListener === "true") {
        return;
    }

    document.body.dataset.donAttachmentClearListener = "true";

    document.addEventListener("click", (event) => {
        if (!selectedDonAttachment) {
            return;
        }

        if (event.target.closest(".selectable-don, .don-attach-target, .board-leader-card, .board-character-card, .don-attachment-confirm")) {
            return;
        }

        clearSelectedDonAttachment({ silent: false });
    });
}

// =========================
// Blocker Target UI
// =========================

function clearBlockerTargets() {
    document.querySelectorAll(".blocker-target").forEach(target => {
        target.classList.remove("blocker-target");
    });
}

function enterBlockerStep(defenderPlayerKey, onResolve) {
    const defenderPlayer = gameState[defenderPlayerKey];

    if (!defenderPlayer || !currentAttack) {
        startCounterPhase(defenderPlayerKey, onResolve);
        return;
    }

    const availableBlockers = CardEffects.getAvailableBlockers(defenderPlayer);

    pendingBlock = {
        defenderPlayerKey,
        onResolve
    };

    clearBlockerTargets();

    availableBlockers.forEach(({ slotIndex }) => {
        const blockerElement = document.querySelector(
            `.board-character-card[data-player="${defenderPlayerKey}"][data-character-slot="${slotIndex}"]`
        );

        if (blockerElement) {
            blockerElement.classList.add("blocker-target");
        }
    });

    if (availableBlockers.length > 0) {
        addGameLog(`${defenderPlayer.name} may choose a Blocker or skip blocking.`);
    } else {
        addGameLog(`${defenderPlayer.name} has no available Blockers.`);
    }
}

async function handleBlockerSelection(playerKey, slotIndex) {
    if (!pendingBlock || !currentAttack) return;

    if (playerKey !== pendingBlock.defenderPlayerKey) {
        addGameLog("Only the defending player can block this attack.");
        return;
    }

    const defenderPlayer = gameState[playerKey];

    if (!defenderPlayer) return;

    const blockerCard = defenderPlayer.characters[slotIndex];

    if (!CardEffects.canBlock(blockerCard)) {
        addGameLog(`${blockerCard?.name ?? "That card"} cannot block.`);
        return;
    }

    const blockerData = {
        playerKey,
        cardType: "character",
        slotIndex
    };

    currentAttack.target = blockerData;

    restBoardCard(blockerData);

    drawAttackArrow(currentAttack.attacker, currentAttack.target);

    clearBlockerTargets();

    pendingBlock = null;

    addGameLog(`${defenderPlayer.name} blocked the attack with ${blockerCard.name}.`);

    resolveWhenBlockingEffectsBeforeCounter(defenderPlayer, blockerCard, () => {
        startCounterPhase(playerKey, () => {
            resolveCurrentAttack();
        });

        if (isOnlineMatch && onlinePublicState?.currentAttack) {
            syncOnlineCurrentAttack({
                ...onlinePublicState.currentAttack,
                target: currentAttack.target,
                targetPowerBonus: currentAttack.targetPowerBonus || 0,
                counterPhaseStarted: true
            }).catch(error => {
                console.error("Failed to sync online counter phase:", error);
            });
        }
    });

    await syncOnlinePublicBoardFromLocal();
}

function skipCurrentBlockStep(defenderPlayerKey, onResolve) {
    const defenderName = gameState[defenderPlayerKey]?.name ?? "Defender";

    pendingBlock = null;

    clearBlockerTargets();

    addGameLog(`${defenderName} skipped the Block Phase.`);

    startCounterPhase(defenderPlayerKey, onResolve);

    if (isOnlineMatch && onlinePublicState?.currentAttack) {
        syncOnlineCurrentAttack({
            ...onlinePublicState.currentAttack,
            target: currentAttack?.target || onlinePublicState.currentAttack.target,
            targetPowerBonus: currentAttack?.targetPowerBonus || 0,
            counterPhaseStarted: true
        }).catch(error => {
            console.error("Failed to sync online counter phase:", error);
        });
    }
}

// =========================
// Game Over UI
// =========================

function showGameOverPopup(winnerPlayer, reasonTitle = "Victory", reasonText = "") {
    removeGameOverPopup();

    const overlay = document.createElement("div");
    overlay.className = "game-over-overlay";
    overlay.id = "gameOverOverlay";

    const popup = document.createElement("div");
    popup.className = "game-over-popup";

    const title = document.createElement("h2");
    title.textContent = "Game Over";

    const message = document.createElement("p");
    message.textContent = `${winnerPlayer.name} wins!`;

    const reasonHeading = document.createElement("h3");
    reasonHeading.className = "game-over-reason-title";
    reasonHeading.textContent = reasonTitle;

    const reasonMessage = document.createElement("p");
    reasonMessage.className = "game-over-reason-text";
    reasonMessage.textContent = reasonText;

    const buttons = document.createElement("div");
    buttons.className = "game-over-buttons";

    const mainMenuButton = document.createElement("a");
    mainMenuButton.className = "game-over-button main-menu";
    mainMenuButton.href = "../index.html";
    mainMenuButton.textContent = "Main Menu";

    const playAgainButton = document.createElement("button");
    playAgainButton.className = "game-over-button play-again";
    playAgainButton.textContent = "Play Again";

    playAgainButton.addEventListener("click", () => {
        if (isOnlineMatch) {
            window.location.href = "multiplayer.html";
            return;
        }

        window.location.reload();
    });

    buttons.appendChild(mainMenuButton);
    buttons.appendChild(playAgainButton);

    popup.appendChild(title);
    popup.appendChild(message);
    popup.appendChild(reasonHeading);
    popup.appendChild(reasonMessage);
    popup.appendChild(buttons);

    overlay.appendChild(popup);

    document.body.appendChild(overlay);
}

function removeGameOverPopup() {
    const oldPopup = document.getElementById("gameOverOverlay");

    if (oldPopup) {
        oldPopup.remove();
    }
}

function endGame(winnerPlayer, reasonTitle = "Victory", reasonText = "") {
    gameState.currentPhase = "gameOver";

    pendingAttack = null;
    currentAttack = null;
    pendingBlock = null;
    pendingTrashChoice = null;
    pendingReplacePlay = null;

    clearAttackTargets();
    clearBlockerTargets();
    clearBattleControls();
    clearHandSelection();
    clearBoardSelection();
    clearReplaceTargets();
    clearTrashChoiceTargets();
    clearCancelAttackButton();
    clearAttackArrow();

    addGameLog(`${winnerPlayer.name} wins the game! ${reasonTitle}: ${reasonText}`);

    showGameOverPopup(winnerPlayer, reasonTitle, reasonText);

    if (isOnlineMatch && onlineMultiplayerService) {
        const winnerSlot = getOnlineSlotFromPlayerKey(getPlayerKey(winnerPlayer));

        onlinePendingWinnerSlot = winnerSlot;

        syncOnlineStateFromLocal().catch(error => {
            console.error("Failed to sync final online state:", error);
        });

        if (winnerSlot) {
            syncOnlineAllPublicBoardsFromLocal({
                phase: "gameOver",
                currentAttack: null,
                winner: winnerSlot,
                gameOverReasonTitle: reasonTitle,
                gameOverReasonText: reasonText
            }).catch(error => {
                console.error("Failed to sync online game over:", error);
            });
        }
    }
}

// =========================
// Attack Arrow UI
// =========================

function getBoardElementFromData(boardCardData) {
    if (!boardCardData) return null;

    if (boardCardData.cardType === "leader") {
        return document.querySelector(
            `.board-leader-card[data-player="${boardCardData.playerKey}"]`
        );
    }

    if (boardCardData.cardType === "character") {
        return document.querySelector(
            `.board-character-card[data-player="${boardCardData.playerKey}"][data-character-slot="${boardCardData.slotIndex}"]`
        );
    }

    return null;
}

// =========================
// Life Area Setup
// =========================

function setupLifeArea(areaId, textId) {
    const lifeArea = document.getElementById(areaId);
    const lifeToggleText = document.getElementById(textId);

    if (!lifeArea || !lifeToggleText) return;

    lifeToggleText.textContent = "View Life Cards";

    lifeArea.addEventListener("mouseenter", () => {
        if (!lifeArea.classList.contains("open")) {
            lifeToggleText.textContent = "Life Cards";
        }
    });

    lifeArea.addEventListener("mouseleave", () => {
        if (!lifeArea.classList.contains("open")) {
            lifeToggleText.textContent = "View Life Cards";
        }
    });

    lifeArea.addEventListener("click", () => {
        lifeArea.classList.toggle("open");

        if (lifeArea.classList.contains("open")) {
            lifeToggleText.textContent = "Life Cards View Locked";
        } else {
            lifeToggleText.textContent = "View Life Cards";
        }
    });
}

// =========================
// Phase Controls UI
// =========================

function canPassTurnNow() {
    if (!gameState) {
        return {
            canPass: false,
            reason: "Game is not ready yet."
        };
    }

    if (gameState.currentPhase !== "main") {
        return {
            canPass: false,
            reason: "Finish the current phase before passing turn."
        };
    }

    if (pendingAttack || currentAttack || pendingBlock || combatNextPhaseAction) {
        return {
            canPass: false,
            reason: "Resolve the current attack before passing turn."
        };
    }

    if (pendingReplacePlay) {
        return {
            canPass: false,
            reason: "Choose whether to replace the character slot first."
        };
    }

    if (pendingTrashChoice) {
        return {
            canPass: false,
            reason: "Finish trashing the required card first."
        };
    }

    if (selectedDonAttachment) {
        return {
            canPass: false,
            reason: "Attach or clear the selected DON!! before passing turn."
        };
    }

    const activeOverlay = document.querySelector(
        "#lookTopOverlay, #boardChoiceOverlay, #effectChoiceOverlay, #donAttachmentConfirm, #trashViewerOverlay, #searchCardImageOverlay, #powerBreakdownOverlay"
    );

    if (activeOverlay) {
        return {
            canPass: false,
            reason: "Finish the open effect window before passing turn."
        };
    }

    return {
        canPass: true,
        reason: ""
    };
}

function autoStartSelfMatch() {
    if (isOnlineMatch || !gameState || gameState.currentPhase !== "diceRoll") {
        return;
    }

    // Auto-start: Player 1 goes first
    gameState.diceWinner = gameState.player1;
    gameState.firstPlayer = gameState.player1;
    gameState.secondPlayer = gameState.player2;
    gameState.turnNumber = 1;

    // Draw initial 5 cards for each player
    for (let i = 0; i < 5; i++) {
        if (gameState.player1.deck.length > 0) {
            gameState.player1.hand.push(gameState.player1.deck.shift());
        }
        if (gameState.player2.deck.length > 0) {
            gameState.player2.hand.push(gameState.player2.deck.shift());
        }
    }

    // Mark players as not having mulliganed yet
    gameState.player1.hasMulliganed = false;
    gameState.player2.hasMulliganed = false;
    gameState.player1.turnCount = 0;
    gameState.player2.turnCount = 0;

    // Display hands and decks first
    renderDecks();
    renderHands();
    renderCharacters();
    updateDonDisplay();
    
    addGameLog("Both players drew 5 cards. Checking for mulligans...");
    
    // Ask Player 1 to mulligan
    showMulliganChoice(gameState.player1, "Player 1", () => {
        // After Player 1 decides, ask Player 2
        showMulliganChoice(gameState.player2, "Player 2", () => {
            // After both mulligan decisions, set up Player 1's turn
            startPlayerTurn(gameState.player1);
        });
    });
}

function showMulliganChoice(player, playerName, callback) {
    if (player.hasMulliganed) {
        callback();
        return;
    }

    // Create a modal dialog instead of confirm so hand is visible
    const modal = document.createElement("div");
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    const dialog = document.createElement("div");
    dialog.style.cssText = `
        background: #1a1a2e;
        border: 2px solid #4a90e2;
        border-radius: 8px;
        padding: 30px;
        text-align: center;
        color: #fff;
        font-size: 16px;
        max-width: 400px;
    `;
    
    dialog.innerHTML = `
        <h2 style="color: #4a90e2; margin-bottom: 20px;">${playerName}</h2>
        <p style="margin-bottom: 20px;">Do you want to mulligan?<br>(Shuffle hand back and draw 5 new cards)</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="mulliganYes" style="padding: 10px 20px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">Yes, Mulligan</button>
            <button id="mulliganNo" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">No, Keep Hand</button>
        </div>
    `;
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    document.getElementById("mulliganYes").addEventListener("click", () => {
        // Shuffle hand back into deck
        player.deck.push(...player.hand);
        player.hand = [];
        
        // Shuffle the deck
        player.deck = shuffleDeck(player.deck);
        
        // Draw 5 new cards
        for (let i = 0; i < 5; i++) {
            if (player.deck.length > 0) {
                player.hand.push(player.deck.shift());
            }
        }
        
        player.hasMulliganed = true;
        addGameLog(`${playerName} took a mulligan.`);
        renderHands();
        renderDecks();
        
        modal.remove();
        callback();
    });
    
    document.getElementById("mulliganNo").addEventListener("click", () => {
        player.hasMulliganed = true;
        addGameLog(`${playerName} kept their hand.`);
        
        modal.remove();
        callback();
    });
}

function startPlayerTurn(player) {
    const playerKey = player === gameState.player1 ? "player1" : "player2";
    gameState.currentPlayer = player;
    
    // Increment turn count for this player
    player.turnCount = (player.turnCount || 0) + 1;
    
    // Draw 1 card at start of turn (except first player's first turn)
    const shouldDraw = !(player === gameState.firstPlayer && player.turnCount === 1);
    if (shouldDraw && player.deck.length > 0) {
        player.hand.push(player.deck.shift());
        const playerNum = playerKey === "player1" ? "1" : "2";
        addGameLog(`Player ${playerNum} drew 1 card.`);
        renderHands();
        renderDecks();
    }
    
    // Give DON based on turn count (capped at 10 max)
    if (player.turnCount === 1) {
        // First turn: give 1 DON if first player, 2 DON if second player
        if (player === gameState.firstPlayer) {
            player.don = 1;
            addGameLog("Player 1's turn starts with 1 DON");
        } else {
            player.don = 2;
            addGameLog("Player 2's turn starts with 2 DON");
        }
    } else {
        // Subsequent turns: add 2 DON (but cap at 10)
        player.don = Math.min((player.don || 0) + 2, 10);
        const playerNum = playerKey === "player1" ? "1" : "2";
        if (player.don === 10) {
            addGameLog(`Player ${playerNum}'s turn starts: +2 DON (capped at 10)`);
        } else {
            addGameLog(`Player ${playerNum}'s turn starts: +2 DON`);
        }
    }
    
    gameState.currentPhase = "main";
    updateDonDisplay();
    
    // Update phase display
    const phaseDisplay = document.getElementById("phaseDisplay");
    if (phaseDisplay) {
        phaseDisplay.textContent = playerKey === "player1" ? "Your Turn" : "Opponent's Turn";
    }
}

function showDiceRollAnimation(player1Roll, player2Roll, winner) {
    const phaseControls = document.querySelector(".phase-controls");

    if (!phaseControls) return;

    removeDiceRollDisplay();

    const display = document.createElement("div");
    display.className = "dice-roll-display";
    display.id = "diceRollDisplay";

    const player1Die = createD20Die({
        playerLabel: "Player 1",
        colorClass: "blue-d20",
        finalValue: player1Roll
    });

    const player2Die = createD20Die({
        playerLabel: "Player 2",
        colorClass: "red-d20",
        finalValue: player2Roll
    });

    const center = document.createElement("div");
    center.className = "dice-roll-center";
    center.textContent = "D20";

    const result = document.createElement("div");
    result.className = "dice-roll-result";
    result.textContent = `${winner.name} wins`;

    display.appendChild(player1Die.root);
    display.appendChild(center);
    display.appendChild(player2Die.root);
    display.appendChild(result);

    phaseControls.insertBefore(display, phaseControls.querySelector(".choice-buttons"));

    animateD20(player1Die.valueElement, player1Roll);
    animateD20(player2Die.valueElement, player2Roll);
}

function createD20Die({ playerLabel, colorClass, finalValue }) {
    const root = document.createElement("div");
    root.className = `d20-roll ${colorClass}`;

    const die = document.createElement("div");
    die.className = "d20-die rolling";

    const value = document.createElement("span");
    value.className = "d20-value";
    value.textContent = finalValue;

    const label = document.createElement("span");
    label.className = "d20-label";
    label.textContent = playerLabel;

    die.appendChild(value);
    root.appendChild(die);
    root.appendChild(label);

    return {
        root,
        valueElement: value
    };
}

function animateD20(valueElement, finalValue) {
    let ticks = 0;
    const die = valueElement.closest(".d20-die");

    const intervalId = window.setInterval(() => {
        ticks++;
        valueElement.textContent = Math.floor(Math.random() * 20) + 1;

        if (ticks >= 12) {
            window.clearInterval(intervalId);
            valueElement.textContent = finalValue;
            die?.classList.remove("rolling");
            die?.classList.add("rolled");
        }
    }, 55);
}

function removeDiceRollDisplay() {
    const oldDisplay = document.getElementById("diceRollDisplay");

    if (oldDisplay) {
        oldDisplay.remove();
    }
}

window.showDiceRollAnimation = showDiceRollAnimation;
window.removeDiceRollDisplay = removeDiceRollDisplay;

function showTurnBanner(title, subtitle = "", tone = "turn") {
    const oldBanner = document.getElementById("turnBanner");

    if (oldBanner) {
        oldBanner.remove();
    }

    const banner = document.createElement("div");
    banner.id = "turnBanner";
    banner.className = `turn-banner ${tone}`;

    const titleElement = document.createElement("div");
    titleElement.className = "turn-banner-title";
    titleElement.textContent = title;

    banner.appendChild(titleElement);

    if (subtitle) {
        const subtitleElement = document.createElement("div");
        subtitleElement.className = "turn-banner-subtitle";
        subtitleElement.textContent = subtitle;
        banner.appendChild(subtitleElement);
    }

    document.body.appendChild(banner);

    window.setTimeout(() => {
        banner.classList.add("turn-banner-exit");
    }, 1500);

    window.setTimeout(() => {
        banner.remove();
    }, 2050);
}

window.showTurnBanner = showTurnBanner;

function removeChoiceButtons() {
    const oldButtons = document.querySelector(".choice-buttons");

    if (oldButtons) {
        oldButtons.remove();
    }
}

// =========================
// Game Log
// =========================

function addGameLog(message) {
    const gameLogMessages = document.getElementById("gameLogMessages");

    if (!gameLogMessages) return;

    const cleanMessage = message
        .replace(/^\s*(<br>\s*)+/gi, "")
        .replace(/(<br>\s*){3,}/gi, "<br><br>")
        .trim();

    if (!cleanMessage) return;

    const logMessage = document.createElement("div");

    logMessage.className = "log-message";
    logMessage.innerHTML = cleanMessage;

    gameLogMessages.appendChild(logMessage);

    gameLogMessages.scrollTop = gameLogMessages.scrollHeight;
}

// =========================
// DON!! Rendering
// =========================

function updateDonDisplay() {
    renderDonArea(gameState.player1, "player1DonArea");
    renderDonArea(gameState.player2, "player2DonArea");
}

function renderDonArea(player, areaId) {
    const donArea = document.getElementById(areaId);

    if (!donArea) return;

    donArea.innerHTML = "";
    const playerKey = getPlayerKey(player);

    for (let i = 0; i < player.don; i++) {
        const img = document.createElement("img");

        img.src = donImage;
        img.alt = "Active DON!!";
        img.className = "don-card-img selectable-don";
        img.dataset.player = playerKey;
        img.dataset.donIndex = String(i);
        img.draggable = true;

        donArea.appendChild(img);
    }

    for (let i = 0; i < player.restedDon; i++) {
        const img = document.createElement("img");

        img.src = donImage;
        img.alt = "Rested DON!!";
        img.className = "don-card-img rested-don";
        img.dataset.player = playerKey;
        img.draggable = true;

        donArea.appendChild(img);
    }
}

function renderFloatingDon() {
    if (!gameState) return;
    
    // Update existing floating DON elements instead of recreating
    document.querySelectorAll(".floating-don").forEach(el => {
        const playerKey = el.getAttribute("data-player");
        const donId = el.getAttribute("data-don-id");
        const player = gameState[playerKey];
        
        if (player && player.floatingDon) {
            const don = player.floatingDon.find(d => d.instanceId === donId);
            if (don) {
                el.style.left = don.x + "px";
                el.style.top = don.y + "px";
                
                // Ensure context menu handler is attached
                if (!el.dataset.hasContextMenu) {
                    el.oncontextmenu = (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        
                        const menu = document.createElement("div");
                        menu.className = "context-menu";
                        menu.style.position = "fixed";
                        menu.style.top = event.clientY + "px";
                        menu.style.left = event.clientX + "px";
                        menu.style.zIndex = "10001";
                        menu.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
                        menu.style.border = "1px solid #888";
                        menu.style.borderRadius = "4px";
                        menu.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
                        
                        const btn = document.createElement("div");
                        btn.textContent = "Return to DON!! Deck";
                        btn.style.padding = "8px 16px";
                        btn.style.cursor = "pointer";
                        btn.style.color = "#fff";
                        btn.style.fontSize = "14px";
                        btn.onmouseenter = () => btn.style.backgroundColor = "rgba(100, 150, 255, 0.3)";
                        btn.onmouseleave = () => btn.style.backgroundColor = "transparent";
                        btn.onclick = () => {
                            const currentPlayer = gameState[playerKey];
                            currentPlayer.don++;
                            gameState[playerKey].floatingDon = gameState[playerKey].floatingDon.filter(d => d.instanceId !== don.instanceId);
                            window.updateDonDisplay?.();
                            el.remove();
                            window.addGameLog?.(`DON!! returned to deck`);
                            document.body.removeChild(menu);
                        };
                        menu.appendChild(btn);
                        document.body.appendChild(menu);
                        
                        const closeMenu = () => {
                            if (menu.parentNode) document.body.removeChild(menu);
                            document.removeEventListener("click", closeMenu);
                        };
                        setTimeout(() => document.addEventListener("click", closeMenu), 0);
                    };
                    el.dataset.hasContextMenu = "true";
                }
            } else {
                el.remove();
            }
        } else {
            el.remove();
        }
    });
    
    // Create new floating DON elements if they don't exist
    if (gameState.player1.floatingDon && gameState.player1.floatingDon.length > 0) {
        gameState.player1.floatingDon.forEach(don => {
            if (!document.querySelector(`[data-player="player1"][data-don-id="${don.instanceId}"]`)) {
                const div = document.createElement("div");
                div.className = "floating-don";
                div.style.position = "absolute";
                div.style.left = don.x + "px";
                div.style.top = don.y + "px";
                div.style.width = "80px";
                div.style.height = "110px";
                div.style.cursor = "grab";
                div.style.zIndex = "50";
                div.style.userSelect = "none";
                div.style.pointerEvents = "auto";
                div.setAttribute("data-player", "player1");
                div.setAttribute("data-don-id", don.instanceId);
                
                const img = document.createElement("img");
                img.src = don.image;
                img.alt = "DON!!";
                img.className = "don-card-img";
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.pointerEvents = "none";
                img.style.borderRadius = "8px";
                img.draggable = false;
                
                // Right-click to show context menu
                div.oncontextmenu = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    const menu = document.createElement("div");
                    menu.className = "context-menu";
                    menu.style.position = "fixed";
                    menu.style.top = event.clientY + "px";
                    menu.style.left = event.clientX + "px";
                    menu.style.zIndex = "10001";
                    menu.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
                    menu.style.border = "1px solid #888";
                    menu.style.borderRadius = "4px";
                    menu.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
                    
                    const btn = document.createElement("div");
                    btn.textContent = "Return to DON!! Deck";
                    btn.style.padding = "8px 16px";
                    btn.style.cursor = "pointer";
                    btn.style.color = "#fff";
                    btn.style.fontSize = "14px";
                    btn.onmouseenter = () => btn.style.backgroundColor = "rgba(100, 150, 255, 0.3)";
                    btn.onmouseleave = () => btn.style.backgroundColor = "transparent";
                    btn.onclick = () => {
                        const player = gameState.player1;
                        player.don++;
                        gameState.player1.floatingDon = gameState.player1.floatingDon.filter(d => d.instanceId !== don.instanceId);
                        window.updateDonDisplay?.();
                        div.remove();
                        window.addGameLog?.(`DON!! returned to deck`);
                        document.body.removeChild(menu);
                    };
                    menu.appendChild(btn);
                    document.body.appendChild(menu);
                    
                    const closeMenu = () => {
                        if (menu.parentNode) document.body.removeChild(menu);
                        document.removeEventListener("click", closeMenu);
                    };
                    setTimeout(() => document.addEventListener("click", closeMenu), 0);
                };
                
                div.appendChild(img);
                document.querySelector(".game-board").appendChild(div);
            }
        });
    }
    
    // Create new floating DON elements if they don't exist
    if (gameState.player2.floatingDon && gameState.player2.floatingDon.length > 0) {
        gameState.player2.floatingDon.forEach(don => {
            if (!document.querySelector(`[data-player="player2"][data-don-id="${don.instanceId}"]`)) {
                const div = document.createElement("div");
                div.className = "floating-don";
                div.style.position = "absolute";
                div.style.left = don.x + "px";
                div.style.top = don.y + "px";
                div.style.width = "80px";
                div.style.height = "110px";
                div.style.cursor = "grab";
                div.style.zIndex = "50";
                div.style.userSelect = "none";
                div.style.pointerEvents = "auto";
                div.setAttribute("data-player", "player2");
                div.setAttribute("data-don-id", don.instanceId);
                
                const img = document.createElement("img");
                img.src = don.image;
                img.alt = "DON!!";
                img.className = "don-card-img";
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.pointerEvents = "none";
                img.style.borderRadius = "8px";
                img.draggable = false;
                
                // Right-click to show context menu
                div.oncontextmenu = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    const menu = document.createElement("div");
                    menu.className = "context-menu";
                    menu.style.position = "fixed";
                    menu.style.top = event.clientY + "px";
                    menu.style.left = event.clientX + "px";
                    menu.style.zIndex = "10001";
                    menu.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
                    menu.style.border = "1px solid #888";
                    menu.style.borderRadius = "4px";
                    menu.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
                    
                    const btn = document.createElement("div");
                    btn.textContent = "Return to DON!! Deck";
                    btn.style.padding = "8px 16px";
                    btn.style.cursor = "pointer";
                    btn.style.color = "#fff";
                    btn.style.fontSize = "14px";
                    btn.onmouseenter = () => btn.style.backgroundColor = "rgba(100, 150, 255, 0.3)";
                    btn.onmouseleave = () => btn.style.backgroundColor = "transparent";
                    btn.onclick = () => {
                        const player = gameState.player2;
                        player.don++;
                        gameState.player2.floatingDon = gameState.player2.floatingDon.filter(d => d.instanceId !== don.instanceId);
                        window.updateDonDisplay?.();
                        div.remove();
                        window.addGameLog?.(`DON!! returned to deck`);
                        document.body.removeChild(menu);
                    };
                    menu.appendChild(btn);
                    document.body.appendChild(menu);
                    
                    const closeMenu = () => {
                        if (menu.parentNode) document.body.removeChild(menu);
                        document.removeEventListener("click", closeMenu);
                    };
                    setTimeout(() => document.addEventListener("click", closeMenu), 0);
                };
                
                
                div.appendChild(img);
                document.querySelector(".game-board").appendChild(div);
            }
        });
    }
}

function handleDonSelectionClick(player, donIndex) {
    const playerKey = getPlayerKey(player);

    if (!playerKey || gameState.currentPhase !== "main" || gameState.currentPlayer !== player) {
        clearSelectedDonAttachment();
        addGameLog("DON!! can only be selected during your Main Phase.");
        return;
    }

    const selectedIndexes = selectedDonAttachment?.playerKey === playerKey
        ? [...(selectedDonAttachment.indexes || [])]
        : [];
    const clickedIndex = Number(donIndex);
    const existingIndex = selectedIndexes.indexOf(clickedIndex);

    if (existingIndex === -1) {
        selectedIndexes.push(clickedIndex);
    } else {
        selectedIndexes.splice(existingIndex, 1);
    }

    selectedIndexes.sort((left, right) => left - right);

    selectedDonAttachment = selectedIndexes.length > 0
        ? { playerKey, indexes: selectedIndexes }
        : null;

    clearHandSelection();
    clearBoardSelection();
    updateDonDisplay();
    renderLeaders();
    renderCharacters();

    if (selectedDonAttachment) {
        addGameLog(`${player.name} selected ${selectedDonAttachment.indexes.length} DON!! to attach.`);
    }

    updatePhaseButtonPassState();
}

function clearSelectedDonAttachment({ silent = true } = {}) {
    if (!selectedDonAttachment) {
        return;
    }

    selectedDonAttachment = null;
    updateDonDisplay();
    renderLeaders();
    renderCharacters();

    if (!silent) {
        addGameLog("DON!! attachment selection cleared.");
    }

    updatePhaseButtonPassState();
}

async function attachSelectedDonToBoardCard(playerKey, card) {
    if (!selectedDonAttachment) {
        return false;
    }

    const player = gameState[playerKey];

    if (!player || selectedDonAttachment.playerKey !== playerKey) {
        clearSelectedDonAttachment({ silent: false });
        return true;
    }

    if (!canAttachDonToBoardCard(player, card)) {
        addGameLog(`${player.name} cannot attach DON!! to ${card?.name || "that card"} right now.`);
        clearSelectedDonAttachment();
        return true;
    }

    const donAmount = Math.min(
        selectedDonAttachment.indexes?.length || 0,
        Number(player.don || 0)
    );

    if (donAmount < 1) {
        clearSelectedDonAttachment();
        return true;
    }

    showDonAttachmentConfirm(player, card, donAmount);

    return true;
}

function showDonAttachmentConfirm(player, card, donAmount) {
    removeDonAttachmentConfirm();

    const overlay = document.createElement("div");
    overlay.className = "look-top-overlay don-attachment-confirm";
    overlay.id = "donAttachmentConfirm";

    const popup = document.createElement("div");
    popup.className = "look-top-popup don-attachment-popup";

    const heading = document.createElement("h2");
    heading.textContent = "Attach DON!!";

    const body = document.createElement("div");
    body.className = "don-attachment-body";

    const cardImage = document.createElement("img");
    cardImage.src = card.image;
    cardImage.alt = card.name;
    cardImage.className = "don-attachment-card";

    const summary = document.createElement("div");
    summary.className = "don-attachment-summary";

    const amountBadge = document.createElement("div");
    amountBadge.className = "don-attachment-amount";
    amountBadge.textContent = `x${donAmount}`;

    const message = document.createElement("p");
    message.textContent = `Attach ${donAmount} active DON!! to ${card.name}?`;

    const buttonRow = document.createElement("div");
    buttonRow.className = "look-top-buttons don-attachment-buttons";

    const attachButton = document.createElement("button");
    attachButton.className = "look-top-action-button";
    attachButton.textContent = "Attach";

    const cancelButton = document.createElement("button");
    cancelButton.className = "look-top-action-button secondary";
    cancelButton.textContent = "Nevermind";

    attachButton.addEventListener("click", async () => {
        const result = attachActiveDonToCard(player, card, ui, donAmount);

        addGameLog(result.message);
        removeDonAttachmentConfirm();
        clearSelectedDonAttachment();

        if (result.success) {
            await syncOnlineStateFromLocal();
        }
    });

    cancelButton.addEventListener("click", () => {
        removeDonAttachmentConfirm();
        clearSelectedDonAttachment({ silent: false });
    });

    buttonRow.appendChild(attachButton);
    buttonRow.appendChild(cancelButton);
    summary.appendChild(amountBadge);
    summary.appendChild(message);
    summary.appendChild(buttonRow);

    body.appendChild(cardImage);
    body.appendChild(summary);

    popup.appendChild(heading);
    popup.appendChild(body);
    overlay.appendChild(popup);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            removeDonAttachmentConfirm();
            clearSelectedDonAttachment({ silent: false });
        }
    });

    document.body.appendChild(overlay);

    updatePhaseButtonPassState();
}

function removeDonAttachmentConfirm() {
    const oldOverlay = document.getElementById("donAttachmentConfirm");

    if (oldOverlay) {
        oldOverlay.remove();
    }

    updatePhaseButtonPassState();
}

function renderDonDecks() {
    renderDonDeck(gameState.player1, "player1DonDeckArea");
    renderDonDeck(gameState.player2, "player2DonDeckArea");
}

function renderDonDeck(player, areaId) {
    const donDeckArea = document.getElementById(areaId);

    if (!donDeckArea) return;

    donDeckArea.innerHTML = "";
    donDeckArea.style.cursor = "pointer";

    const symbol = document.createElement("div");
    symbol.className = "don-deck-symbol";
    
    // Calculate remaining DON in deck: 10 total - floatingDon cards on field
    const remaining = 10 - (player.floatingDon?.length || 0);
    symbol.title = `${remaining} DON!! left in deck - Click to add DON to field`;
    symbol.style.cursor = "pointer";

    const glyph = document.createElement("span");
    glyph.className = "don-deck-glyph";
    glyph.textContent = "ド!!";

    const count = document.createElement("div");
    count.className = "don-deck-number";
    count.textContent = remaining;

    symbol.appendChild(glyph);
    
    // Click to add DON from deck to field
    const handleClick = (event) => {
        event.stopPropagation();
        if (remaining > 0 && player.don < 10) {
            player.don++;
            window.updateDonDisplay?.();
            window.renderDonDecks?.();
            window.addGameLog?.(`Added DON to field`);
        } else if (player.don >= 10) {
            window.addGameLog?.(`Cannot add DON - maximum 10 on field`);
        } else if (remaining <= 0) {
            window.addGameLog?.(`No DON left in deck`);
        }
    };
    
    // Only add handler to symbol, not donDeckArea (avoid duplicate handlers)
    symbol.addEventListener("click", handleClick);
    
    donDeckArea.appendChild(symbol);
    donDeckArea.appendChild(count);
}

// =========================
// Deck Rendering
// =========================

function renderDecks() {
    renderDeck(gameState.player1, "player1DeckArea");
    renderDeck(gameState.player2, "player2DeckArea");
}

function renderDeck(player, deckAreaId) {
    const deckArea = document.getElementById(deckAreaId);

    if (!deckArea) return;

    deckArea.innerHTML = "";

    deckArea.classList.remove("deck-warning");

    if (player.deck.length > 0 && player.deck.length <= 2) {
        deckArea.classList.add("deck-warning");
    }

    if (player.deck.length > 0) {
        const img = document.createElement("img");

        img.src = cardBackImage;
        img.alt = `${player.name} Deck`;
        img.className = "deck-card-img life-card-img";
        img.draggable = true;
        img.setAttribute("data-card-source", "deck");
        img.setAttribute("data-player", player === gameState.player1 ? "player1" : "player2");
        img.oncontextmenu = (event) => {
            event.preventDefault();
            event.stopPropagation();
            showDeckViewer(player);
        };

        deckArea.appendChild(img);
    } else {
        deckArea.textContent = "";
    }

    const count = document.createElement("div");
    count.className = "deck-count-badge main-deck-count";
    count.textContent = player.deck.length;

    deckArea.appendChild(count);
}

function showDeckViewer(player) {
    const overlay = document.createElement("div");
    overlay.className = "look-top-overlay";
    overlay.id = "deckViewerOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "10000";

    const popup = document.createElement("div");
    popup.className = "look-top-popup";
    popup.style.width = "90%";
    popup.style.maxWidth = "800px";
    popup.style.maxHeight = "80vh";
    popup.style.backgroundColor = "rgba(30, 30, 30, 0.98)";
    popup.style.border = "2px solid #888";
    popup.style.borderRadius = "8px";
    popup.style.display = "flex";
    popup.style.flexDirection = "column";
    popup.style.overflow = "hidden";

    const title = document.createElement("h2");
    title.textContent = `${player.name}'s Deck`;
    title.style.color = "#fff";
    title.style.padding = "16px";
    title.style.margin = "0";
    title.style.borderBottom = "1px solid #555";

    const toolbar = document.createElement("div");
    toolbar.style.padding = "12px";
    toolbar.style.borderBottom = "1px solid #555";
    toolbar.style.display = "flex";
    toolbar.style.gap = "8px";

    const revealAllBtn = document.createElement("button");
    revealAllBtn.textContent = "Reveal All";
    revealAllBtn.style.padding = "6px 12px";
    revealAllBtn.style.backgroundColor = "#4CAF50";
    revealAllBtn.style.color = "white";
    revealAllBtn.style.border = "none";
    revealAllBtn.style.borderRadius = "4px";
    revealAllBtn.style.cursor = "pointer";
    revealAllBtn.onclick = () => {
        player.deck.forEach(card => card.faceUp = true);
        removeDeckViewer();
        showDeckViewer(player);
        addGameLog(`${player.name}'s deck revealed`);
    };
    toolbar.appendChild(revealAllBtn);

    const hideAllBtn = document.createElement("button");
    hideAllBtn.textContent = "Hide All";
    hideAllBtn.style.padding = "6px 12px";
    hideAllBtn.style.backgroundColor = "#2196F3";
    hideAllBtn.style.color = "white";
    hideAllBtn.style.border = "none";
    hideAllBtn.style.borderRadius = "4px";
    hideAllBtn.style.cursor = "pointer";
    hideAllBtn.onclick = () => {
        player.deck.forEach(card => card.faceUp = false);
        removeDeckViewer();
        showDeckViewer(player);
        addGameLog(`${player.name}'s deck hidden`);
    };
    toolbar.appendChild(hideAllBtn);

    const shuffleBtn = document.createElement("button");
    shuffleBtn.textContent = "🔀 Shuffle";
    shuffleBtn.style.padding = "6px 12px";
    shuffleBtn.style.backgroundColor = "#FF9800";
    shuffleBtn.style.color = "white";
    shuffleBtn.style.border = "none";
    shuffleBtn.style.borderRadius = "4px";
    shuffleBtn.style.cursor = "pointer";
    shuffleBtn.onclick = () => {
        shuffleDeck(player.deck);
        removeDeckViewer();
        showDeckViewer(player);
        addGameLog(`${player.name}'s deck shuffled`);
    };
    toolbar.appendChild(shuffleBtn);

    const cardGrid = document.createElement("div");
    cardGrid.style.overflowY = "auto";
    cardGrid.style.flex = "1";
    cardGrid.style.padding = "12px";
    cardGrid.style.display = "grid";
    cardGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(180px, 1fr))";
    cardGrid.style.gap = "12px";

    // Show deck from top to bottom (last element is top)
    [...player.deck].reverse().forEach((card, displayIndex) => {
        
        const cardFrame = document.createElement("div");
        cardFrame.style.position = "relative";
        cardFrame.style.display = "flex";
        cardFrame.style.flexDirection = "column";
        cardFrame.style.backgroundColor = "#222";
        cardFrame.style.border = "1px solid #666";
        cardFrame.style.borderRadius = "4px";
        cardFrame.style.overflow = "visible";

        const cardImg = document.createElement("img");
        cardImg.src = card.faceUp && card.image ? card.image : cardBackImage;
        cardImg.alt = card.faceUp && card.name ? card.name : "Card";
        cardImg.style.width = "100%";
        cardImg.style.height = "220px";
        cardImg.style.objectFit = "cover";
        cardImg.style.flexShrink = "0";

        const cardButtons = document.createElement("div");
        cardButtons.style.display = "flex";
        cardButtons.style.flexDirection = "column";
        cardButtons.style.gap = "6px";
        cardButtons.style.padding = "8px";
        cardButtons.style.backgroundColor = "#111";
        cardButtons.style.flexShrink = "0";

        const revealBtn = document.createElement("button");
        revealBtn.textContent = card.faceUp ? "Hide" : "Reveal";
        revealBtn.style.padding = "6px 10px";
        revealBtn.style.fontSize = "12px";
        revealBtn.style.backgroundColor = "#2196F3";
        revealBtn.style.color = "white";
        revealBtn.style.border = "none";
        revealBtn.style.borderRadius = "2px";
        revealBtn.style.cursor = "pointer";
        revealBtn.onmouseover = () => revealBtn.style.backgroundColor = "#1976D2";
        revealBtn.onmouseout = () => revealBtn.style.backgroundColor = "#2196F3";
        revealBtn.onclick = () => {
            card.faceUp = !card.faceUp;
            removeDeckViewer();
            showDeckViewer(player);
        };

        const handBtn = document.createElement("button");
        handBtn.textContent = "→ Hand";
        handBtn.style.padding = "6px 10px";
        handBtn.style.fontSize = "12px";
        handBtn.style.backgroundColor = "#FF9800";
        handBtn.style.color = "white";
        handBtn.style.border = "none";
        handBtn.style.borderRadius = "2px";
        handBtn.style.cursor = "pointer";
        handBtn.onmouseover = () => handBtn.style.backgroundColor = "#F57C00";
        handBtn.onmouseout = () => handBtn.style.backgroundColor = "#FF9800";
        handBtn.onclick = () => {
            // Find current index instead of pre-calculating
            const currentIndex = player.deck.indexOf(card);
            if (currentIndex === -1) return;
            player.hand.push(card);
            player.deck.splice(currentIndex, 1);
            window.renderHands?.();
            window.renderDecks?.();
            removeDeckViewer();
            addGameLog(`Card moved to ${player.name}'s hand`);
        };

        const bottomBtn = document.createElement("button");
        bottomBtn.textContent = "↓ Bottom";
        bottomBtn.style.padding = "6px 10px";
        bottomBtn.style.fontSize = "12px";
        bottomBtn.style.backgroundColor = "#9C27B0";
        bottomBtn.style.color = "white";
        bottomBtn.style.border = "none";
        bottomBtn.style.borderRadius = "2px";
        bottomBtn.style.cursor = "pointer";
        bottomBtn.onmouseover = () => bottomBtn.style.backgroundColor = "#7B1FA2";
        bottomBtn.onmouseout = () => bottomBtn.style.backgroundColor = "#9C27B0";
        bottomBtn.onclick = () => {
            // Move to bottom = position 0 (front of array)
            // Find current index instead of pre-calculating
            const currentIndex = player.deck.indexOf(card);
            if (currentIndex === -1) return;
            player.deck.splice(currentIndex, 1);
            player.deck.unshift(card);
            window.renderDecks?.();
            removeDeckViewer();
            showDeckViewer(player);
            addGameLog(`Card moved to bottom of ${player.name}'s deck`);
        };

        const trashBtn = document.createElement("button");
        trashBtn.textContent = "🗑 Trash";
        trashBtn.style.padding = "6px 10px";
        trashBtn.style.fontSize = "12px";
        trashBtn.style.backgroundColor = "#F44336";
        trashBtn.style.color = "white";
        trashBtn.style.border = "none";
        trashBtn.style.borderRadius = "2px";
        trashBtn.style.cursor = "pointer";
        trashBtn.onmouseover = () => trashBtn.style.backgroundColor = "#D32F2F";
        trashBtn.onmouseout = () => trashBtn.style.backgroundColor = "#F44336";
        trashBtn.onclick = () => {
            // Find current index instead of pre-calculating
            const currentIndex = player.deck.indexOf(card);
            if (currentIndex === -1) return;
            if (!player.trash) player.trash = [];
            player.trash.push(card);
            player.deck.splice(currentIndex, 1);
            window.renderTrash?.();
            window.renderDecks?.();
            removeDeckViewer();
            addGameLog(`Card moved to ${player.name}'s trash`);
        };

        cardButtons.appendChild(revealBtn);
        cardButtons.appendChild(handBtn);
        cardButtons.appendChild(bottomBtn);
        cardButtons.appendChild(trashBtn);

        cardFrame.appendChild(cardImg);
        cardFrame.appendChild(cardButtons);
        cardGrid.appendChild(cardFrame);
    });

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.padding = "8px 16px";
    closeButton.style.backgroundColor = "#666";
    closeButton.style.color = "white";
    closeButton.style.border = "none";
    closeButton.style.cursor = "pointer";
    closeButton.style.alignSelf = "flex-end";
    closeButton.onclick = removeDeckViewer;

    popup.appendChild(title);
    popup.appendChild(toolbar);
    popup.appendChild(cardGrid);
    popup.appendChild(closeButton);

    overlay.appendChild(popup);
    overlay.onclick = (e) => {
        if (e.target === overlay) removeDeckViewer();
    };

    document.body.appendChild(overlay);
}

function removeDeckViewer() {
    const overlay = document.getElementById("deckViewerOverlay");
    if (overlay) overlay.remove();
}

function shuffleDeck(deck) {
    // Fisher-Yates shuffle algorithm
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// =========================
// Hand Rendering
// =========================

function renderHands() {
    if (isOnlineMatch) {
        renderPlayerHand(gameState.player1, "player1Hand", playerSlot !== "p1");
        renderPlayerHand(gameState.player2, "player2Hand", playerSlot !== "p2");
        return;
    }

    renderPlayerHand(gameState.player1, "player1Hand", false);
    renderPlayerHand(gameState.player2, "player2Hand", false);
}

function renderPlayerHand(player, handElementId, hidden) {
    const handElement = document.getElementById(handElementId);

    if (!handElement) return;

    handElement.innerHTML = "";

    handElement.style.setProperty("--hand-total", player.hand.length);

    player.hand.forEach((card, index) => {
        const cardElement = document.createElement("div");
        cardElement.className = hidden ? "hand-card hidden-card" : "hand-card";
        cardElement.draggable = true; // Enable native HTML5 drag
        cardElement.style.setProperty("--hand-index", index);
        cardElement.style.setProperty("--hand-middle", (player.hand.length - 1) / 2);

        if (hidden) {
            const img = document.createElement("img");

            img.src = cardBackImage;
            img.alt = "Hidden Card";
            img.className = "hand-card-img";

            cardElement.appendChild(img);
        } else {
            cardElement.setAttribute("data-card-image", card.image);
            cardElement.setAttribute("data-player", player === gameState.player1 ? "player1" : "player2");
            cardElement.setAttribute("data-card-instance-id", card.instanceId);
            cardElement.classList.add("selectable-card");
            applyCardAnimationClass(cardElement, takeCardAnimationClass(card));

            const img = document.createElement("img");

            img.src = card.image;
            img.alt = card.name;
            img.className = "hand-card-img";

            cardElement.appendChild(img);
        }

        handElement.appendChild(cardElement);
    });

    if (!hidden) {
        const sortButton = document.createElement("button");
        sortButton.className = "hand-sort-button";
        sortButton.type = "button";
        sortButton.textContent = "S";
        sortButton.setAttribute("aria-label", "Sort hand");
        sortButton.title = "Sort hand by category, cost, then card ID.";

        sortButton.addEventListener("click", async (event) => {
            event.stopPropagation();

            await sortPlayerHand(player);
        });

        handElement.appendChild(sortButton);
    }

    const count = document.createElement("div");

    count.className = "hand-count";
    count.textContent = player.hand.length;

    handElement.appendChild(count);

    setupCardPreview();
    setupHandCardSelection();
    setupHandGlide();
}

async function sortPlayerHand(player) {
    if (!player || !Array.isArray(player.hand)) {
        return;
    }

    const indexedHand = player.hand.map((card, index) => ({ card, index }));

    indexedHand.sort((left, right) => {
        const leftKey = getHandSortKey(left.card);
        const rightKey = getHandSortKey(right.card);

        return leftKey.category - rightKey.category ||
            leftKey.cost - rightKey.cost ||
            leftKey.cardId.localeCompare(rightKey.cardId) ||
            left.index - right.index;
    });

    player.hand = indexedHand.map(entry => entry.card);

    clearHandSelection();
    renderHands();

    addGameLog(`${player.name}'s hand was sorted.`);

    if (isOnlineMatch && player === gameState[getOwnOnlinePlayerKey()]) {
        await syncOnlineStateFromLocal();
    }
}

function getHandSortKey(card) {
    const categoryOrder = {
        stage: 0,
        event: 1,
        character: 2
    };
    const cardType = String(card?.cardType || "").toLowerCase();

    return {
        category: categoryOrder[cardType] ?? 3,
        cost: Number(card?.cost ?? card?.playCost ?? 0),
        cardId: String(card?.cardNumber || card?.id || card?.name || "")
    };
}

// =========================
// Life Rendering
// =========================

function renderLifeCards() {
    renderPlayerLife(gameState.player2, "lifeArea");
    renderPlayerLife(gameState.player1, "opponentLifeArea");
}

function renderPlayerLife(player, lifeAreaId) {
    const lifeArea = document.getElementById(lifeAreaId);

    if (!lifeArea) return;

    lifeArea.querySelectorAll(".life-card").forEach(card => card.remove());
    lifeArea.querySelectorAll(".life-count").forEach(counter => counter.remove());
    lifeArea.querySelectorAll(".life-drop-zone").forEach(zone => zone.remove());

    const playerKey = player === gameState.player1 ? "player1" : "player2";

    // Render life cards (face-down by default)
    player.life.forEach((lifeCard, lifeIndex) => {
        const cardElement = document.createElement("div");
        cardElement.className = "life-card";
        cardElement.draggable = true;
        cardElement.setAttribute("data-card-source", "life");
        cardElement.setAttribute("data-player", playerKey);
        cardElement.setAttribute("data-life-index", lifeIndex);

        const img = document.createElement("img");

        // Show face-down (card back) for life cards, or revealed if faceUp
        img.src = lifeCard?.faceUp && lifeCard.image ? lifeCard.image : cardBackImage;
        img.alt = lifeCard?.faceUp && lifeCard.name ? lifeCard.name : "Life Card";
        img.className = "life-card-img board-card-img";
        img.setAttribute("data-card-image", img.src);
        img.setAttribute("data-player", playerKey);
        img.setAttribute("data-life-index", lifeIndex);
        img.oncontextmenu = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const menu = document.createElement("div");
            menu.className = "context-menu";
            menu.style.position = "fixed";
            menu.style.top = event.clientY + "px";
            menu.style.left = event.clientX + "px";
            menu.style.zIndex = "10001";
            menu.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
            menu.style.border = "1px solid #888";
            menu.style.borderRadius = "4px";
            menu.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
            
            const options = [
                {
                    label: lifeCard?.faceUp ? "Hide Card" : "Reveal Card",
                    action: () => {
                        lifeCard.faceUp = !lifeCard.faceUp;
                        renderLifeCards();
                        window.addGameLog?.(`Life card ${lifeCard.faceUp ? "revealed" : "hidden"}`);
                    }
                },
                {
                    label: "Send to Top Deck",
                    action: () => {
                        player.deck.push(lifeCard);  // Top = push (end of array)
                        player.life.splice(lifeIndex, 1);
                        renderLifeCards();
                        window.renderDecks?.();
                        window.addGameLog?.(`Card sent to top of deck`);
                    }
                },
                {
                    label: "Send to Bottom Deck",
                    action: () => {
                        player.deck.unshift(lifeCard);  // Bottom = unshift (front of array)
                        player.life.splice(lifeIndex, 1);
                        renderLifeCards();
                        window.renderDecks?.();
                        window.addGameLog?.(`Card sent to bottom of deck`);
                    }
                },
                {
                    label: "Send to Trash",
                    action: () => {
                        if (!player.trash) player.trash = [];
                        player.trash.push(lifeCard);
                        player.life.splice(lifeIndex, 1);
                        renderLifeCards();
                        window.renderTrash?.();
                        window.addGameLog?.(`Life card sent to trash`);
                    }
                }
            ];
            
            options.forEach(opt => {
                const btn = document.createElement("div");
                btn.textContent = opt.label;
                btn.style.padding = "8px 16px";
                btn.style.cursor = "pointer";
                btn.style.color = "#fff";
                btn.style.borderBottom = "1px solid #555";
                btn.style.fontSize = "14px";
                btn.onmouseenter = () => btn.style.backgroundColor = "rgba(100, 150, 255, 0.3)";
                btn.onmouseleave = () => btn.style.backgroundColor = "transparent";
                btn.onclick = () => {
                    opt.action();
                    document.body.removeChild(menu);
                };
                menu.appendChild(btn);
            });
            
            document.body.appendChild(menu);
            
            const closeMenu = () => {
                if (menu.parentNode) document.body.removeChild(menu);
                document.removeEventListener("click", closeMenu);
            };
            setTimeout(() => document.addEventListener("click", closeMenu), 0);
        };

        cardElement.appendChild(img);
        lifeArea.appendChild(cardElement);
    });

    const count = document.createElement("div");

    count.className = "life-count";
    count.textContent = player.life.length;

    lifeArea.appendChild(count);

    setupCardPreview();
}

// =========================
// Leader Rendering
// =========================

function renderLeaders() {
    renderLeader(gameState.player1, "player1LeaderArea");
    renderLeader(gameState.player2, "player2LeaderArea");
}

function renderLeader(player, areaId) {
    const leaderArea = document.getElementById(areaId);

    if (!leaderArea) return;

    leaderArea.innerHTML = "";
    leaderArea.classList.remove("don-attach-target");
    leaderArea.onclick = null;

    if (!player.leader.state) {
        player.leader.state = "active";
    }

    const playerKey = player === gameState.player1 ? "player1" : "player2";
    const renderKey = getBoardCardRenderKey(playerKey, "leader");

    const img = document.createElement("img");

    img.src = player.leader.image;
    img.alt = player.leader.name;
    img.className = "leader-card-img board-leader-card";

    img.setAttribute("data-card-image", player.leader.image);
    img.setAttribute("data-player", playerKey);
    img.setAttribute("data-board-card-type", "leader");

    const leaderState = player.leader.state || "active";

    img.dataset.cardState = leaderState;

    if (leaderState === "rested") {
        img.classList.add("board-card-rested");
    }

    applyCardAnimationClass(img, takeCardAnimationClass(player.leader));
    applyCardAnimationClass(img, getBoardStateAnimationClass(player.leader, renderKey));

    leaderArea.classList.toggle("don-attach-target", isDonAttachmentTarget(playerKey, player.leader));
    leaderArea.onclick = async (event) => {
        if (selectedDonAttachment) {
            event.stopPropagation();
            await attachSelectedDonToBoardCard(playerKey, player.leader);
            return;
        }
    };

     leaderArea.appendChild(img);
    renderKeywordTags(player.leader, leaderArea);
    renderAttachedDonBadge(player.leader, leaderArea);

    setupCardPreview();
    setupBoardLeaderSelection();
    setupBoardContextMenus();
}

// =========================
// Character Rendering
// =========================

function renderCharacters() {
    renderPlayerCharacters(gameState.player1, "player1");
    renderPlayerCharacters(gameState.player2, "player2");
}

function renderPlayerCharacters(player, playerKey) {
    const slots = document.querySelectorAll(`.character-slot[data-player="${playerKey}"]`);

    slots.forEach((slot, index) => {
        slot.innerHTML = "";
        slot.classList.remove("don-attach-target");
        slot.onclick = null;

        const card = player.characters[index];

        if (!card) {
            slot.dataset.state = "empty";
            slot.classList.remove("occupied-slot");
            renderedBoardCardStates.delete(getBoardCardRenderKey(playerKey, "character", index));
            return;
        }

        const renderKey = getBoardCardRenderKey(playerKey, "character", index);
        slot.dataset.state = "occupied";
        slot.classList.add("occupied-slot");
        slot.classList.toggle("don-attach-target", isDonAttachmentTarget(playerKey, card));
         slot.onclick = async (event) => {
            if (selectedDonAttachment) {
                event.stopPropagation();
                await attachSelectedDonToBoardCard(playerKey, card);
                return;
            }
        };

        const img = document.createElement("img");

        img.src = card.image;
        img.alt = card.name;
        img.className = "board-card-img board-character-card";

        img.setAttribute("data-card-image", card.image);
        img.setAttribute("data-player", playerKey);
        img.setAttribute("data-character-slot", index);

        const cardState = card.state || "active";

        img.dataset.cardState = cardState;

        if (cardState === "rested") {
            img.classList.add("board-card-rested");
        }

        applyCardAnimationClass(img, takeCardAnimationClass(card));
        applyCardAnimationClass(img, getBoardStateAnimationClass(card, renderKey));

        slot.appendChild(img);
        renderKeywordTags(card, slot);
        renderAttachedDonBadge(card, slot);
    });

    setupCardPreview();
    setupBoardCharacterSelection();
    setupBoardContextMenus();
}

function isDonAttachmentTarget(playerKey, card) {
    const player = gameState?.[playerKey];

    return Boolean(
        selectedDonAttachment &&
        selectedDonAttachment.playerKey === playerKey &&
        canAttachDonToBoardCard(player, card)
    );
}

// =========================
// Stage Rendering
// =========================

function renderStages() {
    renderPlayerStage(gameState.player1, "player1StageArea");
    renderPlayerStage(gameState.player2, "player2StageArea");
}

function getVisibleKeywords(card) {
    const boardOwner = typeof getPlayerForBoardCard === "function"
        ? getPlayerForBoardCard(card)
        : null;
    const keywords = [
        ...(Array.isArray(card?.keywords) ? card.keywords : []),
        ...(Array.isArray(card?.temporaryKeywords) ? card.temporaryKeywords : []),
        ...(Array.isArray(card?.battleKeywords) ? card.battleKeywords : []),
        ...(Array.isArray(card?.effects)
            ? card.effects
                .filter(effect => window.CustomEffectV2Engine?.isV2Effect?.(effect))
                .filter(effect => window.CustomEffectV2Engine?.getEventType?.(effect) === "static")
                .filter(effect => !window.CustomEffectV2Engine?.canUseEffect || window.CustomEffectV2Engine.canUseEffect(boardOwner, card, effect).ok)
                .flatMap(effect => effect.actions || [])
                .filter(action => action.type === "giveKeyword" && (!action.target || action.target === "thisCard"))
                .filter(action => {
                    const conditions = Array.isArray(action.conditions) ? action.conditions : [];
                    return conditions.every(condition => window.CustomEffectV2Engine?.conditionMet?.(boardOwner, card, condition) !== false);
                })
                .map(action => action.keyword)
            : [])
    ];
    const wanted = ["Blocker", "Rush", "Rush:Characters", "Double Attack", "Banish", "Unblockable"];
    const seen = new Set();

    return keywords
        .map(keyword => String(keyword || "").trim())
        .filter(Boolean)
        .map(keyword => {
            const normalized = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "");
            const match = wanted.find(item => item.toLowerCase().replace(/[^a-z0-9]+/g, "") === normalized);
            return match || keyword;
        })
        .filter(keyword => {
            const key = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "");
            if (!wanted.some(item => item.toLowerCase().replace(/[^a-z0-9]+/g, "") === key) || seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
}

function getVisibleStatusTags(card) {
    const statuses = [
        { field: "cannotAttackUntil", label: "No Attack" },
        { field: "cannotBlockUntil", label: "No Block" },
        { field: "cannotBecomeActiveUntil", label: "No Active" },
        { field: "cannotBeRestedUntil", label: "No Rest" },
        { field: "cannotBeKOdUntil", label: "No K.O." }
    ];

    return statuses
        .filter(status => isCardStatusActive(card?.[status.field], card))
        .map(status => status.label);
}

function isCardStatusActive(status, card) {
    if (!status) return false;

    const expiringPlayer = status.expiresAtPlayerKey
        ? gameState?.[status.expiresAtPlayerKey]
        : getPlayerForBoardCard(card);

    if (!expiringPlayer) return true;

    return Number(expiringPlayer.turns || 0) <= Number(status.expiresAtEndOfTurns ?? 0);
}

function renderKeywordTags(card, container) {
    const keywords = getVisibleKeywords(card);
    const statusTags = getVisibleStatusTags(card);
    const tags = [...keywords, ...statusTags];

    if (!container || tags.length === 0) return;

    const tagWrap = document.createElement("div");
    tagWrap.className = "keyword-tags";

    tags.forEach(keyword => {
        const tag = document.createElement("span");
        tag.className = `keyword-tag ${keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
        tag.textContent = keyword === "Rush:Characters" ? "Rush:Character" : keyword;
        tagWrap.appendChild(tag);
    });

    container.appendChild(tagWrap);
}

function renderPlayerStage(player, stageAreaId) {
    const stageArea = document.getElementById(stageAreaId);

    if (!stageArea) return;

    stageArea.innerHTML = "";

    if (!player.stage) {
        stageArea.textContent = "";
        stageArea.dataset.state = "empty";
        renderedBoardCardStates.delete(getBoardCardRenderKey(
            player === gameState.player1 ? "player1" : "player2",
            "stage"
        ));
        return;
    }

    stageArea.dataset.state = "occupied";
    const playerKey = player === gameState.player1 ? "player1" : "player2";
    const renderKey = getBoardCardRenderKey(playerKey, "stage");

    const img = document.createElement("img");

    img.src = player.stage.image;
    img.alt = player.stage.name;
    img.className = "deck-card-img board-card-img board-stage-card";

    img.setAttribute("data-card-image", player.stage.image);
    img.setAttribute("data-player", playerKey);
    img.setAttribute("data-board-card-type", "stage");

    const stageState = player.stage.state || "active";

    img.dataset.cardState = stageState;

    if (stageState === "rested") {
        img.classList.add("board-card-rested");
    }

    applyCardAnimationClass(img, takeCardAnimationClass(player.stage));
    applyCardAnimationClass(img, getBoardStateAnimationClass(player.stage, renderKey));

    stageArea.classList.toggle("don-attach-target", isDonAttachmentTarget(playerKey, player.stage));
    stageArea.onclick = async (event) => {
        if (selectedDonAttachment) {
            event.stopPropagation();
            await attachSelectedDonToBoardCard(playerKey, player.stage);
            return;
        }
        
        // If card has attached DON, show detach button
        if (player.stage.attachedDon && player.stage.attachedDon > 0) {
            const detachButton = document.createElement("button");
            detachButton.textContent = `Detach ${player.stage.attachedDon} DON!!`;
            detachButton.className = "tool-btn secondary";
            detachButton.style.position = "fixed";
            detachButton.style.top = "50%";
            detachButton.style.left = "50%";
            detachButton.style.transform = "translate(-50%, -50%)";
            detachButton.style.zIndex = "10000";
            
            detachButton.onclick = () => {
                gameState[playerKey].don += player.stage.attachedDon;
                player.stage.attachedDon = 0;
                document.body.removeChild(detachButton);
                updateDonDisplay();
                renderStages();
                console.log("✓ Detached DON from stage");
            };
            
            document.body.appendChild(detachButton);
        }
    };

    stageArea.appendChild(img);
    renderKeywordTags(player.stage, stageArea);
    renderAttachedDonBadge(player.stage, stageArea);

    setupCardPreview();
    setupBoardStageSelection();
}

// =========================
// Trash Rendering
// =========================

function renderTrash() {
    renderPlayerTrash(gameState.player1, "player1TrashArea");
    renderPlayerTrash(gameState.player2, "player2TrashArea");
}

function renderPlayerTrash(player, trashAreaId) {
    const trashArea = document.getElementById(trashAreaId);

    if (!trashArea) return;

    trashArea.innerHTML = "";
    trashArea.classList.toggle("clickable-trash", player.trash.length > 0);
    trashArea.onclick = () => {
        if (player.trash.length === 0) return;

        showTrashViewer(player);
    };

    if (player.trash.length > 0) {
        const topCard = player.trash[player.trash.length - 1];

        const img = document.createElement("img");

        img.src = topCard.image;
        img.alt = topCard.name;
        img.className = "deck-card-img life-card-img board-card-img";
        img.setAttribute("data-card-image", topCard.image);
        img.setAttribute("data-player", getPlayerKey(player));
        applyCardAnimationClass(img, takeCardAnimationClass(topCard));

        trashArea.appendChild(img);
    } else {
        trashArea.replaceChildren();
    }

    const count = document.createElement("div");

    count.className = "trash-count";
    count.textContent = player.trash.length;

    trashArea.appendChild(count);

    setupCardPreview();
}

function showTrashViewer(player) {
    removeTrashViewer();

    const overlay = document.createElement("div");
    overlay.className = "look-top-overlay";
    overlay.id = "trashViewerOverlay";

    const popup = document.createElement("div");
    popup.className = "look-top-popup trash-viewer-popup";

    const title = document.createElement("h2");
    title.textContent = `${player.name}'s Trash`;

    const description = document.createElement("p");
    description.textContent = player.trash.length > 0
        ? "Cards are shown from newest to oldest."
        : "Trash is empty.";

    const cardGrid = document.createElement("div");
    cardGrid.className = "look-top-card-grid trash-viewer-grid";

    [...player.trash].reverse().forEach((card, displayIndex) => {
        const cardFrame = document.createElement("div");
        cardFrame.className = "look-top-card-button trash-viewer-card";
        cardFrame.style.position = "relative";
        cardFrame.style.display = "flex";
        cardFrame.style.flexDirection = "column";
        cardFrame.style.backgroundColor = "#222";
        cardFrame.style.border = "1px solid #666";
        cardFrame.style.borderRadius = "4px";
        cardFrame.style.overflow = "visible";

        const img = document.createElement("img");
        img.src = card.image;
        img.alt = card.name;
        img.className = "look-top-card-img";
        img.setAttribute("data-card-image", card.image);
        img.style.width = "120px";
        img.style.height = "180px";
        img.style.objectFit = "cover";
        img.addEventListener("click", (event) => {
            event.stopPropagation();
            showSearchCardImagePopup(card);
        });

        const cardButtons = document.createElement("div");
        cardButtons.style.display = "flex";
        cardButtons.style.flexDirection = "column";
        cardButtons.style.gap = "4px";
        cardButtons.style.padding = "6px";
        cardButtons.style.backgroundColor = "#222";

        // Send to Hand button
        const handBtn = document.createElement("button");
        handBtn.textContent = "→ Hand";
        handBtn.style.padding = "6px 10px";
        handBtn.style.fontSize = "11px";
        handBtn.style.backgroundColor = "#FF9800";
        handBtn.style.color = "white";
        handBtn.style.border = "none";
        handBtn.style.borderRadius = "2px";
        handBtn.style.cursor = "pointer";
        handBtn.style.flex = "1";
        handBtn.onmouseover = () => handBtn.style.backgroundColor = "#F57C00";
        handBtn.onmouseout = () => handBtn.style.backgroundColor = "#FF9800";
        handBtn.onclick = () => {
            const currentIndex = player.trash.indexOf(card);
            if (currentIndex === -1) return;
            player.hand.push(card);
            player.trash.splice(currentIndex, 1);
            window.renderHands?.();
            window.renderTrash?.();
            removeTrashViewer();
            addGameLog(`Card moved to ${player.name}'s hand`);
        };
        cardButtons.appendChild(handBtn);

        // Send to Top Deck button
        const topBtn = document.createElement("button");
        topBtn.textContent = "↑ Top Deck";
        topBtn.style.padding = "6px 10px";
        topBtn.style.fontSize = "11px";
        topBtn.style.backgroundColor = "#2196F3";
        topBtn.style.color = "white";
        topBtn.style.border = "none";
        topBtn.style.borderRadius = "2px";
        topBtn.style.cursor = "pointer";
        topBtn.style.flex = "1";
        topBtn.onmouseover = () => topBtn.style.backgroundColor = "#1976D2";
        topBtn.onmouseout = () => topBtn.style.backgroundColor = "#2196F3";
        topBtn.onclick = () => {
            const currentIndex = player.trash.indexOf(card);
            if (currentIndex === -1) return;
            player.deck.push(card);
            player.trash.splice(currentIndex, 1);
            window.renderDecks?.();
            window.renderTrash?.();
            removeTrashViewer();
            addGameLog(`Card moved to top of ${player.name}'s deck`);
        };
        cardButtons.appendChild(topBtn);

        // Send to Bottom Deck button
        const bottomBtn = document.createElement("button");
        bottomBtn.textContent = "↓ Bottom Deck";
        bottomBtn.style.padding = "6px 10px";
        bottomBtn.style.fontSize = "11px";
        bottomBtn.style.backgroundColor = "#9C27B0";
        bottomBtn.style.color = "white";
        bottomBtn.style.border = "none";
        bottomBtn.style.borderRadius = "2px";
        bottomBtn.style.cursor = "pointer";
        bottomBtn.style.flex = "1";
        bottomBtn.onmouseover = () => bottomBtn.style.backgroundColor = "#7B1FA2";
        bottomBtn.onmouseout = () => bottomBtn.style.backgroundColor = "#9C27B0";
        bottomBtn.onclick = () => {
            const currentIndex = player.trash.indexOf(card);
            if (currentIndex === -1) return;
            player.deck.unshift(card);
            player.trash.splice(currentIndex, 1);
            window.renderDecks?.();
            window.renderTrash?.();
            removeTrashViewer();
            addGameLog(`Card moved to bottom of ${player.name}'s deck`);
        };
        cardButtons.appendChild(bottomBtn);

        cardFrame.appendChild(img);
        cardFrame.appendChild(cardButtons);
        cardGrid.appendChild(cardFrame);
    });

    const buttonRow = document.createElement("div");
    buttonRow.className = "look-top-buttons";

    const closeButton = document.createElement("button");
    closeButton.className = "look-top-action-button secondary";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", removeTrashViewer);

    buttonRow.appendChild(closeButton);

    popup.appendChild(title);
    popup.appendChild(description);
    popup.appendChild(cardGrid);
    popup.appendChild(buttonRow);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    setupCardPreview();
}

function removeTrashViewer() {
    const oldOverlay = document.getElementById("trashViewerOverlay");

    if (oldOverlay) {
        oldOverlay.remove();
    }
}

// =========================
// Card Preview
// =========================

function setupCardPreview() {
    document.querySelectorAll("[data-card-image]").forEach(cardElement => {
        cardElement.onmouseenter = () => {
            if (selectedHandCard) return;

            const imageSrc = cardElement.getAttribute("data-card-image");

            showCardPreview(imageSrc);
        };

        cardElement.onmouseleave = () => {
            if (selectedHandCard) return;

            if (selectedBoardCard) {
                const selectedImage = selectedBoardCard.getAttribute("data-card-image");

                if (selectedImage) {
                    showCardPreview(selectedImage);
                    return;
                }
            }

            clearCardPreview();
        };
    });
}

function showCardPreview(imageSrc) {
    const previewImage = document.getElementById("previewImage");
    const previewPlaceholder = document.getElementById("previewPlaceholder");

    if (!previewImage || !previewPlaceholder || !imageSrc) return;

    previewImage.src = imageSrc;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";
}

function clearCardPreview() {
    const previewImage = document.getElementById("previewImage");
    const previewPlaceholder = document.getElementById("previewPlaceholder");

    if (!previewImage || !previewPlaceholder) return;

    previewImage.src = "";
    previewImage.style.display = "none";
    previewPlaceholder.style.display = "block";
}

// =========================
// Hand Card Selection
// =========================

function setupHandCardSelection() {
    const previewImage = document.getElementById("previewImage");
    const previewPlaceholder = document.getElementById("previewPlaceholder");

    if (!previewImage || !previewPlaceholder) return;

    document.querySelectorAll(".hand-card.selectable-card[data-card-instance-id]").forEach(cardElement => {
        cardElement.onclick = () => {
            if (pendingTrashChoice) {
                handlePendingTrashChoice(
                    cardElement.getAttribute("data-player"),
                    cardElement.getAttribute("data-card-instance-id")
                );
                return;
            }

            if (gameState.currentPhase === "counterPhase") {
                if (!currentAttack) {
                    return;
                }
            } else if (pendingReplacePlay || pendingAttack || pendingBlock || currentAttack) {
                return;
            }

            const imageSrc = cardElement.getAttribute("data-card-image");
            const playerKey = cardElement.getAttribute("data-player");
            const cardInstanceId = cardElement.getAttribute("data-card-instance-id");

            if (selectedHandCard === cardElement) {
                clearHandSelection();
                return;
            }

            clearHandSelection();
            clearBoardSelection();

            pendingReplacePlay = null;
            clearReplaceTargets();

            selectedHandCard = cardElement;

            selectedHandCardData = playerKey && cardInstanceId
                ? {
                    playerKey,
                    cardInstanceId
                }
                : null;

            cardElement.classList.add("selected-card");

            showCardPreview(imageSrc);

            if (gameState.currentPhase === "counterPhase") {
                showSelectedCounterActions();
            } else {
                showSelectedCardActions();
            }
        };
    });
}

function showSelectedCardActions() {
    clearSelectedCardActions();

    if (!selectedHandCard || !selectedHandCardData) return;

    const player = gameState[selectedHandCardData.playerKey];

    if (!player) return;

    const handIndex = findHandCardIndexByInstanceId(
        player,
        selectedHandCardData.cardInstanceId
    );

    if (handIndex === -1) return;

    const card = player.hand[handIndex];

    if (!card) return;

    const playButton = document.createElement("button");

    playButton.className = "card-action-button-on-card";
    playButton.textContent = "Play";

    const cardCost = getCardPlayCost(card, player);
    const canAfford = canPlayerAffordCard(player, card);
    const openSlotIndex = getFirstOpenCharacterSlotIndex(player);
    const canPlayNow = canPlayerPlayCards(player);
    const playLocked = typeof isCardTypePlayLocked === "function" && isCardTypePlayLocked(player, card.cardType);

    if (!canPlayNow) {
        playButton.disabled = true;

        if (gameState.currentPhase === "mulligan") {
            playButton.textContent = "Wait";
            playButton.title = "Cards cannot be played during the mulligan phase.";
        } else if (!gameState.currentPlayer) {
            playButton.textContent = "Wait";
            playButton.title = "Cards cannot be played before the first turn starts.";
        } else if (gameState.currentPlayer !== player) {
            playButton.textContent = "Not Turn";
            playButton.title = `It is currently ${gameState.currentPlayer.name}'s turn.`;
        } else {
            playButton.textContent = "Wait";
            playButton.title = "Cards cannot be played right now.";
        }
    } else if (playLocked) {
        playButton.disabled = true;
        playButton.textContent = "Locked";
        playButton.title = `${player.name} cannot play ${card.cardType} cards this turn.`;
    } else if (!canAfford) {
        playButton.disabled = true;
        playButton.textContent = `Need ${cardCost}`;
        playButton.title = `${player.name} does not have enough active DON!! to play this card.`;
    } else if (card.cardType === "character" && openSlotIndex === -1) {
        playButton.textContent = `Replace ${cardCost}`;
        playButton.title = `${player.name}'s board is full. Click to choose a character to replace.`;
    } else if (card.cardType === "stage") {
        playButton.textContent = `Stage ${cardCost}`;
        playButton.title = `Play ${card.name} to the stage area.`;
    } else if (card.cardType === "event") {
        playButton.textContent = `Event ${cardCost}`;
        playButton.title = `Play ${card.name}, then place it in trash.`;
    } else {
        playButton.textContent = `Play ${cardCost}`;
    }

    playButton.addEventListener("click", async (event) => {
        event.stopPropagation();

        if (playButton.disabled) return;

        if (!canPlayerPlayCards(player)) {
            addGameLog("Cards cannot be played right now.");
            return;
        }

        const latestHandIndex = findHandCardIndexByInstanceId(
            player,
            selectedHandCardData.cardInstanceId
        );

        if (latestHandIndex === -1) {
            addGameLog("Selected card could not be found.");
            return;
        }

        const currentCard = player.hand[latestHandIndex];

        if (!currentCard) {
            addGameLog("Selected card could not be found.");
            return;
        }

        const currentOpenSlotIndex = getFirstOpenCharacterSlotIndex(player);

        if (currentCard.cardType === "character" && currentOpenSlotIndex === -1) {
            enterReplaceMode(
                selectedHandCardData.playerKey,
                selectedHandCardData.cardInstanceId
            );
            return;
        }

        const result = playCard(player, latestHandIndex, ui);

        addGameLog(result.message);

        if (!result.success) return;

        clearHandSelection();
        clearReplaceTargets();

        pendingReplacePlay = null;

        await syncOnlineStateFromLocal();
    });

    selectedHandCard.appendChild(playButton);
}

function showSelectedCounterActions() {
    clearSelectedCardActions();

    if (!selectedHandCard || !selectedHandCardData || !currentAttack) return;

    const player = gameState[selectedHandCardData.playerKey];

    if (!player) return;

    const handIndex = findHandCardIndexByInstanceId(
        player,
        selectedHandCardData.cardInstanceId
    );

    if (handIndex === -1) return;

    const card = player.hand[handIndex];

    if (!card) return;

    const defenderPlayerKey = currentAttack.defenderPlayerKey;
    const isDefender = selectedHandCardData.playerKey === defenderPlayerKey;
    const isOnlineOwnDefender = !isOnlineMatch ||
        (isDefender && selectedHandCardData.playerKey === getOwnOnlinePlayerKey());
    const counterValue = typeof getCounterPowerForUse === "function"
        ? getCounterPowerForUse(card, player)
        : getCardCounterValue(card, player);

    const counterButton = document.createElement("button");

    counterButton.className = "card-action-button-on-card";

    if (!isOnlineOwnDefender) {
        counterButton.disabled = true;
        counterButton.textContent = "Not Def.";
        counterButton.title = "Only the defending player can counter with their own hand.";
    } else if (!canCardBeUsedAsCounter(card, player)) {
        counterButton.disabled = true;
        counterButton.textContent = "No Counter";
        counterButton.title = `${card.name} has no counter value.`;
    } else {
        counterButton.textContent = counterValue > 0
            ? `Counter +${counterValue}`
            : "Counter";
        counterButton.title = `Use ${card.name} as counter.`;
    }

    counterButton.addEventListener("click", async (event) => {
        event.stopPropagation();

        if (counterButton.disabled) return;

        const latestHandIndex = findHandCardIndexByInstanceId(
            player,
            selectedHandCardData.cardInstanceId
        );

        if (latestHandIndex === -1) {
            addGameLog("Selected counter card could not be found.");
            return;
        }

        const result = useCounterFromHand(player, latestHandIndex, ui);

        addGameLog(result.message);

        if (!result.success) return;

        if (isOnlineMatch) {
            await syncOnlineStateFromLocal();
        }

        if (result.counterPower > 0) {
            applyCounterPowerToCurrentAttack(result.counterPower);

            addGameLog(
                `${player.name}'s attack target has +${currentAttack.targetPowerBonus} counter power this battle.`
            );
        }

        if (isOnlineMatch && onlinePublicState?.currentAttack) {
            await syncOnlineCurrentAttack({
                ...onlinePublicState.currentAttack,
                target: currentAttack.target,
                targetPowerBonus: currentAttack.targetPowerBonus || 0,
                counterPhaseStarted: true
            });
        }

        clearHandSelection();

        if (!isOnlineMatch) {
            await syncOnlineStateFromLocal();
        }
    });

    selectedHandCard.appendChild(counterButton);
}

function clearSelectedCardActions() {
    document.querySelectorAll(".card-action-button-on-card").forEach(button => {
        button.remove();
    });
}

// =========================
// Board Card Selection
// =========================

function setupBoardCharacterSelection() {
    document.querySelectorAll(".board-character-card").forEach(cardElement => {
        cardElement.onclick = async (event) => {
            event.stopPropagation();

            const playerKey = cardElement.getAttribute("data-player");
            const slotIndex = Number(cardElement.getAttribute("data-character-slot"));
            const player = gameState[playerKey];
            const card = player?.characters?.[slotIndex];

            if (pendingBoardChoice && await handleInlineBoardChoiceSelection({
                playerKey,
                cardType: "character",
                slotIndex
            })) {
                return;
            }

            if (pendingReplacePlay) {
                await handlePendingReplaceSlot(playerKey, slotIndex);
                return;
            }

            if (await attachSelectedDonToBoardCard(playerKey, card)) {
                return;
            }

            if (pendingBlock) {
                handleBlockerSelection(playerKey, slotIndex);
                return;
            }

            if (pendingReplacePlay || pendingAttack) {
                return;
            }

            if (!player) return;

            if (!card) return;

            if (selectedBoardCard === cardElement) {
                clearBoardSelection();
                return;
            }

            clearBoardSelection();
            clearHandSelection();

            selectedBoardCard = cardElement;
            selectedBoardCardData = {
                playerKey,
                cardType: "character",
                slotIndex
            };

            cardElement.classList.add("selected-board-card");

            showCardPreview(cardElement.getAttribute("data-card-image"));

            showSelectedBoardActions();

            addGameLog(`${player.name} selected ${card.name}.`);
        };
    });
}

function setupBoardLeaderSelection() {
    document.querySelectorAll(".board-leader-card").forEach(leaderElement => {
        leaderElement.onclick = async (event) => {
            event.stopPropagation();

            const playerKey = leaderElement.getAttribute("data-player");

            if (pendingBoardChoice && await handleInlineBoardChoiceSelection({
                playerKey,
                cardType: "leader"
            })) {
                return;
            }

            if (pendingReplacePlay || pendingAttack) {
                return;
            }

            const player = gameState[playerKey];

            if (!player || !player.leader) return;

            if (await attachSelectedDonToBoardCard(playerKey, player.leader)) {
                return;
            }

            if (selectedBoardCard === leaderElement) {
                clearBoardSelection();
                return;
            }

            clearBoardSelection();
            clearHandSelection();

            selectedBoardCard = leaderElement;
            selectedBoardCardData = {
                playerKey,
                cardType: "leader"
            };

            leaderElement.classList.add("selected-board-card");

            showCardPreview(leaderElement.getAttribute("data-card-image"));

            showSelectedBoardActions();

            addGameLog(`${player.name} selected ${player.leader.name}.`);
        };
    });
}

function showSelectedBoardActions() {
    clearSelectedBoardActions();

    if (!selectedBoardCard || !selectedBoardCardData) return;

    const player = gameState[selectedBoardCardData.playerKey];
    const card = getSelectedBoardCardObject();

    if (!player || !card) return;

    const actionButtons = [];

    const inspectButton = document.createElement("button");

    inspectButton.className = "board-action-button-on-card inspect-board-card-button";
    inspectButton.textContent = "Inspect";
    inspectButton.title = `Inspect ${card.name}.`;
    inspectButton.addEventListener("click", (event) => {
        event.stopPropagation();
        showSearchCardImagePopup(card);
    });

    actionButtons.push(inspectButton);

    if (selectedBoardCardData.cardType === "leader" || selectedBoardCardData.cardType === "character") {
        const breakdownButton = document.createElement("button");

        breakdownButton.className = "board-action-button-on-card power-breakdown-button";
        breakdownButton.textContent = "Power";
        breakdownButton.title = "Show this card's power breakdown.";
        breakdownButton.addEventListener("click", (event) => {
            event.stopPropagation();
            showPowerBreakdown(card, player, selectedBoardCardData);
        });

        actionButtons.push(breakdownButton);
    }

    const buttonContainer = getBoardActionButtonContainer();

    if (!buttonContainer) return;

    actionButtons.forEach((button, index) => {
        button.style.bottom = `${8 + (index * 35)}px`;
        buttonContainer.appendChild(button);
    });
}

function canAttachDonToBoardCard(player, card) {
    if (!player || !card) {
        return false;
    }

    if (pendingAttack || currentAttack) {
        return false;
    }

    if (gameState.currentPhase !== "main") {
        return false;
    }

    if (gameState.currentPlayer !== player) {
        return false;
    }

    if (card.cardType !== "leader" && card.cardType !== "character") {
        return false;
    }

    return player.don > 0;
}

function createAttachDonButton(player, card) {
    const attachDonButton = document.createElement("button");

    attachDonButton.className = "board-action-button-on-card attach-don-button";
    attachDonButton.textContent = "Attach DON";
    attachDonButton.title = `Attach 1 active DON!! to ${card.name}.`;

    attachDonButton.addEventListener("click", async (event) => {
        event.stopPropagation();

        if (!canAttachDonToBoardCard(player, card)) {
            addGameLog(`${player.name} cannot attach DON!! right now.`);
            return;
        }

        const result = attachActiveDonToCard(player, card, ui);

        addGameLog(result.message);

        if (!result.success) return;

        if (refreshSelectedBoardCardElement()) {
            showSelectedBoardActions();
        } else {
            clearBoardSelection();
        }

        await syncOnlineStateFromLocal();
    });

    return attachDonButton;
}

function refreshSelectedBoardCardElement() {
    if (!selectedBoardCardData) {
        return false;
    }

    let cardElement = null;

    if (selectedBoardCardData.cardType === "leader") {
        cardElement = document.querySelector(
            `.board-leader-card[data-player="${selectedBoardCardData.playerKey}"]`
        );
    }

    if (selectedBoardCardData.cardType === "character") {
        cardElement = document.querySelector(
            `.board-character-card[data-player="${selectedBoardCardData.playerKey}"][data-character-slot="${selectedBoardCardData.slotIndex}"]`
        );
    }

    if (selectedBoardCardData.cardType === "stage") {
        cardElement = document.querySelector(
            `.board-stage-card[data-player="${selectedBoardCardData.playerKey}"]`
        );
    }

    if (!cardElement) {
        return false;
    }

    selectedBoardCard = cardElement;
    selectedBoardCard.classList.add("selected-board-card");

    return true;
}

function setupBoardContextMenus() {
    document.querySelectorAll(".board-leader-card, .board-character-card").forEach(cardElement => {
        cardElement.oncontextmenu = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const playerKey = cardElement.getAttribute("data-player");
            const player = gameState[playerKey];
            const cardType = cardElement.classList.contains("board-leader-card") ? "leader" : "character";
            const slotIndex = Number(cardElement.getAttribute("data-character-slot"));
            const card = cardType === "leader"
                ? player?.leader
                : player?.characters?.[slotIndex];

            if (!player || !card) return;

            // Create context menu
            const menu = document.createElement("div");
            menu.className = "context-menu";
            menu.style.position = "fixed";
            menu.style.top = event.clientY + "px";
            menu.style.left = event.clientX + "px";
            menu.style.zIndex = "10001";
            menu.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
            menu.style.border = "1px solid #888";
            menu.style.borderRadius = "4px";
            menu.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
            
            const options = [];
            
            // For characters: add movement and trash options
            if (cardType === "character") {
                options.push({
                    label: "Send to Bottom Deck",
                    action: () => {
                        player.characters.splice(slotIndex, 1);
                        player.deck.push(card);
                        renderCharacters();
                        addGameLog(`${card.name} sent to bottom of deck`);
                    }
                });
                options.push({
                    label: "Send to Top Deck",
                    action: () => {
                        player.characters.splice(slotIndex, 1);
                        player.deck.unshift(card);
                        renderCharacters();
                        addGameLog(`${card.name} sent to top of deck`);
                    }
                });
                options.push({
                    label: "Send to Trash",
                    action: () => {
                        player.characters.splice(slotIndex, 1);
                        player.trash.push(card);
                        renderCharacters();
                        addGameLog(`${card.name} sent to trash`);
                    }
                });
            }
            
            // Both characters and leaders can detach DON
            options.push({
                label: "Detach All DON!!",
                action: () => {
                    if (card.attachedDon && card.attachedDon > 0) {
                        gameState[playerKey].don += card.attachedDon;
                        card.attachedDon = 0;
                        updateDonDisplay();
                        if (cardType === "leader") {
                            renderLeaders();
                        } else {
                            renderCharacters();
                        }
                        addGameLog(`Detached ${card.attachedDon} DON!! from ${card.name}`);
                    }
                }
            });
            
            // Render menu items
            options.forEach(opt => {
                const btn = document.createElement("div");
                btn.textContent = opt.label;
                btn.style.padding = "8px 16px";
                btn.style.cursor = "pointer";
                btn.style.color = "#fff";
                btn.style.borderBottom = "1px solid #555";
                btn.style.fontSize = "14px";
                btn.onmouseenter = () => btn.style.backgroundColor = "rgba(100, 150, 255, 0.3)";
                btn.onmouseleave = () => btn.style.backgroundColor = "transparent";
                btn.onclick = () => {
                    opt.action();
                    document.body.removeChild(menu);
                };
                menu.appendChild(btn);
            });
            
            document.body.appendChild(menu);
            
            // Close menu when clicking elsewhere
            const closeMenu = () => {
                if (menu.parentNode) document.body.removeChild(menu);
                document.removeEventListener("click", closeMenu);
            };
            setTimeout(() => document.addEventListener("click", closeMenu), 0);
        };
    });
}

function setupHandGlide() {
    document.querySelectorAll(".hand").forEach(handElement => {
        handElement.onmousemove = (event) => {
            const cards = Array.from(
                handElement.querySelectorAll(".hand-card.selectable-card[data-card-image]")
            );

            if (cards.length === 0) {
                return;
            }

            let nearestCard = null;
            let nearestDistance = Number.POSITIVE_INFINITY;

            cards.forEach(cardElement => {
                const rect = cardElement.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distance = Math.abs(event.clientX - centerX) + Math.abs(event.clientY - centerY) * 0.35;

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestCard = cardElement;
                }
            });

            cards.forEach(cardElement => {
                cardElement.classList.toggle("hand-card-glide", cardElement === nearestCard);
            });

            if (!selectedHandCard && !selectedBoardCard && nearestCard) {
                showCardPreview(nearestCard.getAttribute("data-card-image"));
            }
        };

        handElement.onmouseleave = () => {
            handElement
                .querySelectorAll(".hand-card-glide")
                .forEach(cardElement => cardElement.classList.remove("hand-card-glide"));

            if (!selectedHandCard && !selectedBoardCard) {
                clearCardPreview();
            }
        };
    });
}

function resolveBoardActionEffect(player, card, effect) {
    if (effect.actionId === "drawOneCard") {
        const drawResult = drawCard(player, ui);

        return {
            success: !drawResult?.deckOut,
            message: drawResult?.deckOut
                ? `${player.name} could not draw a card.`
                : `${player.name} drew 1 card.`
        };
    }

    if (effect.id === "DD01-015-activate-main-power") {
        if ((card.state || "active") === "rested") {
            return {
                success: false,
                message: `${card.name} is already rested.`
            };
        }

        card.state = "rested";
        renderCharacters();

        const message = chooseOwnBoardCard(player, card, {
            prompt: "Choose up to 1 Ayase Seiko or Okarun to give +3000 power for its next battle.",
            optional: true,
            includeLeader: true,
            filter: targetCard => {
                return CardEffects.hasCardName(targetCard, "Ayase Seiko") ||
                    CardEffects.hasCardName(targetCard, "Okarun");
            },
            onSelect: ({ card: targetCard }) => {
                addBattlePowerBonus(targetCard, Number(effect.powerModifier ?? 3000));
                renderLeaders();
                renderCharacters();
                addGameLog(`${card.name} gave ${targetCard.name} +3000 power for its next battle.`);
            },
            skipMessage: `${player.name} rested ${card.name} but did not choose a target.`,
            emptyMessage: `${card.name} found no Ayase Seiko or Okarun cards.`
        });

        renderCharacters();

        return {
            success: true,
            message
        };
    }

    if (
        effect.id === "EGG1-002-activate-main-copy" ||
        effect.id === "EGG1-006-activate-main-base-power" ||
        effect.id === "EGG1-008-activate-main-trash-power"
    ) {
        if (effect.id === "EGG1-002-activate-main-copy") {
            const copyChoices = getOpponentBoardChoices(player, {
                includeLeader: true,
                filter: targetCard => getCopyableEffects(targetCard).length > 0
            });

            if (copyChoices.length === 0) {
                return {
                    success: false,
                    message: `${card.name} found no opposing leader or character abilities to copy.`
                };
            }
        }

        if (effect.id === "EGG1-006-activate-main-base-power") {
            const ownEggmanCharacters = getOwnBoardChoices(player, {
                includeLeader: false,
                filter: targetCard => targetCard.cardType === "character" && hasTypeText(targetCard, "Eggman Empire")
            });
            const opponentCharacters = getOpponentCharacterChoices(player);

            if (ownEggmanCharacters.length === 0 || opponentCharacters.length === 0) {
                return {
                    success: false,
                    message: `${card.name} needs one of your Eggman Empire characters and one opposing character.`
                };
            }
        }

        if (effect.id === "EGG1-008-activate-main-trash-power") {
            const otherCharacters = getOwnBoardChoices(player, {
                includeLeader: false,
                filter: targetCard => targetCard.cardType === "character" && targetCard.instanceId !== card.instanceId
            });

            if (otherCharacters.length === 0) {
                return {
                    success: false,
                    message: `${card.name} needs another character to trash.`
                };
            }
        }
        const message = resolveEffectAction(player, card, effect, ui, {
            skipActivationPrompt: true
        });

        return {
            success: Boolean(message),
            message: message || `${card.name}'s effect is not implemented yet.`
        };
    }

    const message = resolveEffectAction(player, card, effect, ui, {
        skipActivationPrompt: true
    });

    if (message) {
        return {
            success: true,
            message
        };
    }

    return {
        success: false,
        message: `${card.name}'s effect is not implemented yet.`
    };
}

function clearSelectedBoardActions() {
    document.querySelectorAll(".board-action-button-on-card").forEach(button => {
        button.remove();
    });
}

// =========================
// Selection Clearing
// =========================

function clearHandSelection() {
    document.querySelectorAll(".selected-card").forEach(card => {
        card.classList.remove("selected-card");
    });

    selectedHandCard = null;
    selectedHandCardData = null;

    clearSelectedCardActions();

    clearCardPreview();
}

function clearBoardSelection() {
    document.querySelectorAll(".selected-board-card").forEach(card => {
        card.classList.remove("selected-board-card");
    });

    clearSelectedBoardActions();

    selectedBoardCard = null;
    selectedBoardCardData = null;

    clearCardPreview();
}

// =========================
// Replace Mode UI
// =========================

function clearReplaceTargets() {
    document.querySelectorAll(".character-slot.replace-target").forEach(slot => {
        slot.classList.remove("replace-target");
    });
}

function enterReplaceMode(playerKey, cardInstanceId) {
    const player = gameState[playerKey];

    if (!player) return;

    const handIndex = findHandCardIndexByInstanceId(player, cardInstanceId);
    const card = player.hand[handIndex];

    if (!card || handIndex === -1) return;

    pendingReplacePlay = {
        playerKey,
        cardInstanceId
    };

    clearReplaceTargets();

    document
        .querySelectorAll(`.character-slot[data-player="${playerKey}"]`)
        .forEach(slot => {
            const slotIndex = Number(slot.getAttribute("data-slot"));

            if (player.characters[slotIndex]) {
                slot.classList.add("replace-target");
            }
        });

    addGameLog(`${player.name}'s board is full. Choose a character to replace with ${card.name}.`);
}

function setupCharacterSlotInteractions() {
    document.querySelectorAll(".character-slot").forEach(slot => {
        if (slot.dataset.replaceListenerAttached === "true") {
            return;
        }

        slot.dataset.replaceListenerAttached = "true";

        slot.addEventListener("click", async () => {
            if (!pendingReplacePlay) return;

            const slotPlayerKey = slot.getAttribute("data-player");
            const slotIndex = Number(slot.getAttribute("data-slot"));

            await handlePendingReplaceSlot(slotPlayerKey, slotIndex);
        });
    });
}

async function handlePendingReplaceSlot(slotPlayerKey, slotIndex) {
    if (!pendingReplacePlay) return;

    if (slotPlayerKey !== pendingReplacePlay.playerKey) {
        addGameLog("You can only replace that player's own characters.");
        return;
    }

    const player = gameState[slotPlayerKey];

    if (!canPlayerPlayCards(player)) {
        addGameLog("Cards cannot be played right now.");
        return;
    }

    if (!player.characters[slotIndex]) {
        addGameLog("Choose an occupied character slot to replace.");
        return;
    }

    const handIndex = findHandCardIndexByInstanceId(
        player,
        pendingReplacePlay.cardInstanceId
    );

    if (handIndex === -1) {
        addGameLog("Selected card could not be found.");

        pendingReplacePlay = null;
        clearReplaceTargets();

        return;
    }

    const result = playCard(
        player,
        handIndex,
        ui,
        { targetSlotIndex: slotIndex }
    );

    addGameLog(result.message);

    if (!result.success) return;

    pendingReplacePlay = null;

    clearReplaceTargets();
    clearHandSelection();

    await syncOnlineStateFromLocal();
}

function setupBoardStageSelection() {
    document.querySelectorAll(".board-stage-card").forEach(stageElement => {
        stageElement.onclick = async (event) => {
            event.stopPropagation();

            const playerKey = stageElement.getAttribute("data-player");

            if (pendingBoardChoice && await handleInlineBoardChoiceSelection({
                playerKey,
                cardType: "stage"
            })) {
                return;
            }

            if (pendingReplacePlay || pendingAttack || selectedDonAttachment) {
                return;
            }

            const player = gameState[playerKey];

            if (!player || !player.stage) return;

            if (selectedBoardCard === stageElement) {
                clearBoardSelection();
                return;
            }

            clearBoardSelection();
            clearHandSelection();

            selectedBoardCard = stageElement;
            selectedBoardCardData = {
                playerKey,
                cardType: "stage"
            };

            stageElement.classList.add("selected-board-card");
            showCardPreview(stageElement.getAttribute("data-card-image"));
            showSelectedBoardActions();

            addGameLog(`${player.name} selected ${player.stage.name}.`);
        };
    });
}

// =========================
// Battle Controls UI
// =========================

// =========================
// Attack Flow UI
// =========================

function resolveWhenBlockingEffectsBeforeCounter(player, sourceCard, onComplete) {
    const v2Effects = sourceCard?.effects
        ?.filter(effect => window.CustomEffectV2Engine?.getEventType?.(effect) === "whenBlocking") ?? [];

    const promptNext = index => {
        const effect = v2Effects[index];

        if (!effect) {
            const oldOnBlockMessage = resolveOnBlockEffects(player, sourceCard, ui);

            if (oldOnBlockMessage) {
                addGameLog(oldOnBlockMessage);
            }

            if (typeof onComplete === "function") {
                onComplete();
            }

            return;
        }

        const canUse = window.CustomEffectV2Engine.canUseEffect(player, sourceCard, effect);

        if (!canUse.ok) {
            promptNext(index + 1);
            return;
        }

        const runEffect = () => {
            let completed = false;
            const finish = () => {
                if (completed) return;
                completed = true;
                promptNext(index + 1);
            };

            const result = window.CustomEffectV2Engine.runEffect({
                player,
                sourceCard,
                effect,
                gameState,
                ui,
                options: {
                    skipActivationPrompt: true,
                    onComplete: finish
                }
            });

            if (result.message) {
                addGameLog(result.message);
            }

            if (!result.pending) {
                finish();
            }
        };

        if (effect.optional) {
            chooseEffectActivation({
                player,
                sourceCard,
                effect,
                title: sourceCard.name,
                prompt: effect.generatedText || effect.text || effect.sourceText || "Activate this When Blocking effect?",
                activateText: "Activate",
                skipText: "Skip",
                onComplete: shouldActivate => {
                    if (!shouldActivate) {
                        addGameLog(`${player.name} skipped ${sourceCard.name}'s When Blocking effect.`);
                        promptNext(index + 1);
                        return;
                    }

                    runEffect();
                }
            });
            return;
        }

        runEffect();
    };

    promptNext(0);
}

function highlightTrashChoiceTargets(playerKey) {
    clearTrashChoiceTargets();

    document
        .querySelectorAll(`.hand-card.selectable-card[data-player="${playerKey}"]`)
        .forEach(cardElement => {
            cardElement.classList.add("trash-choice-card");
        });
}

function clearTrashChoiceTargets() {
    document.querySelectorAll(".trash-choice-card").forEach(cardElement => {
        cardElement.classList.remove("trash-choice-card");
    });
}

async function handlePendingTrashChoice(playerKey, cardInstanceId) {
    if (!pendingTrashChoice) return;

    if (playerKey !== pendingTrashChoice.playerKey) {
        addGameLog("Choose a card from the attacking player's hand.");
        return;
    }

    const player = gameState[playerKey];

    if (!player) return;

    const handIndex = findHandCardIndexByInstanceId(player, cardInstanceId);

    if (handIndex === -1) {
        addGameLog("Selected card could not be found.");
        return;
    }

    const trashedCard = player.hand.splice(handIndex, 1)[0];
    const onComplete = pendingTrashChoice.onComplete;
    const sourceCardName = pendingTrashChoice.sourceCardName;

    moveCardToTrash(player, trashedCard, ui);

    pendingTrashChoice = null;
    clearTrashChoiceTargets();
    clearHandSelection();

    ui.renderHands();
    ui.renderTrash();

    addGameLog(`${player.name} trashed ${trashedCard.name} for ${sourceCardName}'s When Attacking effect.`);

    if (typeof onComplete === "function") {
        onComplete();
    }

    ui.renderHands();

    await syncOnlineStateFromLocal();
}

async function resolveCurrentAttack() {
    // Game mechanics disabled - this function is now a stub
}

function clearCancelAttackButton() {
    document.querySelectorAll(".cancel-attack-button-on-card").forEach(button => {
        button.remove();
    });
}

function showCancelAttackButton(attackerData) {
    clearCancelAttackButton();

    const buttonContainer = getBoardActionButtonContainerFromData(attackerData);

    if (!buttonContainer) return;

    const cancelButton = document.createElement("button");

    cancelButton.className = "board-action-button-on-card cancel-attack-button-on-card";
    cancelButton.textContent = "Cancel Attack";

    cancelButton.addEventListener("click", (event) => {
        event.stopPropagation();

        cancelPendingAttack();
    });

    buttonContainer.appendChild(cancelButton);
}

function cancelPendingAttack() {
    if (!pendingAttack) return;

    const attackerPlayer = gameState[pendingAttack.attackerPlayerKey];
    const attackerCard = getBoardCardFromData(pendingAttack.attacker);
    const attackerData = { ...pendingAttack.attacker };

    setBoardCardActive(attackerData);

    addGameLog(`${attackerPlayer.name} cancelled the attack with ${attackerCard.name}.`);

    pendingAttack = null;
    currentAttack = null;

    clearAttackTargets();
    clearBattleControls();
    clearAttackArrow();
    clearCancelAttackButton();

    gameState.currentPhase = "main";
}

// =========================
// Look Top Cards UI
// =========================

function lookTopCardsAddToHand({
    player,
    sourceCard,
    cards,
    isSelectable,
    onComplete,
    revealSelected = true,
    descriptionText = null,
    maxSelect = 1
}) {
    removeLookTopOverlay();

    const overlay = document.createElement("div");
    overlay.className = "look-top-overlay";
    overlay.id = "lookTopOverlay";

    const popup = document.createElement("div");
    popup.className = "look-top-popup";

    const title = document.createElement("h2");
    title.textContent = sourceCard
        ? `${sourceCard.name}`
        : "Look at cards";

    const description = document.createElement("p");
    description.textContent = descriptionText ||
        `Choose up to 1 valid card to add to ${player.name}'s hand. The rest go to the bottom of the deck.`;

    const cardGrid = document.createElement("div");
    cardGrid.className = "look-top-card-grid";

    const maximumSelections = Math.max(1, Number(maxSelect || 1));
    const selectedIndexes = new Set();
    let selectedIndex = null;

    const completeLookTopSelection = async (selection) => {
        const selectedIndexes = Array.isArray(selection?.selectedIndexes)
            ? selection.selectedIndexes
            : selection?.selectedIndex !== null && selection?.selectedIndex !== undefined
                ? [selection.selectedIndex]
                : [];
        const selectedCards = selectedIndexes
            .map(index => cards[index])
            .filter(Boolean);
        const selectedCard = selectedCards[0] || null;

        if (typeof onComplete === "function") {
            onComplete(selection);
        }

        // Multiplayer search pools stay local/private; only explicitly revealed chosen cards go public.
        if (isOnlineMatch && player === gameState[getOwnOnlinePlayerKey()]) {
            if (revealSelected && selectedCards.length) {
                await publishOnlineReveal(selectedCards.filter(card => isSelectable(card)));
            }

            await syncOnlineStateFromLocal();
        }
    };

    const continueToBottomOrder = () => {
        const remainingCards = cards
            .map((card, index) => ({ card, index }))
            .filter(entry => !selectedIndexes.has(entry.index));

        if (remainingCards.length <= 1) {
            removeLookTopOverlay();

            completeLookTopSelection({
                selectedIndex,
                selectedIndexes: [...selectedIndexes],
                bottomOrder: remainingCards.map(entry => entry.index)
            });

            return;
        }

        renderBottomOrderStep({
            player,
            sourceCard,
            remainingCards,
            selectedIndex,
            selectedIndexes: [...selectedIndexes],
            onComplete: completeLookTopSelection
        });
    };

    const selectCard = (cardButton, index, validChoice) => {
        if (!validChoice) return;

        if (maximumSelections > 1) {
            if (selectedIndexes.has(index)) {
                selectedIndexes.delete(index);
            } else if (selectedIndexes.size < maximumSelections) {
                selectedIndexes.add(index);
            }

            selectedIndex = selectedIndexes.size ? [...selectedIndexes][0] : null;
        } else {
            selectedIndexes.clear();
            selectedIndexes.add(index);
            selectedIndex = index;
        }

        document.querySelectorAll(".look-top-card-button").forEach(button => {
            button.classList.remove("selected-look-card");
        });

        selectedIndexes.forEach(selected => {
            document.querySelectorAll(".look-top-card-button")[selected]?.classList.add("selected-look-card");
        });

        addButton.disabled = selectedIndexes.size < 1;
    };

    cards.forEach((card, index) => {
        const cardButton = document.createElement("button");
        cardButton.className = "look-top-card-button";

        const validChoice = isSelectable(card);

        if (!validChoice) {
            cardButton.classList.add("disabled-choice");
            cardButton.title = "This card is not a valid choice, but you can inspect it.";
        } else {
            cardButton.title = "Click to inspect. Use Select Card to add it.";
        }

        const img = document.createElement("img");
        img.src = card.image;
        img.alt = card.name;
        img.className = "look-top-card-img";

        const name = document.createElement("span");
        name.className = "look-top-card-name";
        name.textContent = card.name;

        cardButton.appendChild(img);
        cardButton.appendChild(name);

        cardButton.addEventListener("click", () => {
            selectCard(cardButton, index, validChoice);
            showSearchCardImagePopup(card, {
                canSelect: validChoice,
                onSelect: () => {
                    selectCard(cardButton, index, validChoice);
                    if (maximumSelections === 1) {
                        continueToBottomOrder();
                    }
                }
            });
        });

        cardGrid.appendChild(cardButton);
    });

    const buttonRow = document.createElement("div");
    buttonRow.className = "look-top-buttons";

    const addButton = document.createElement("button");
    addButton.className = "look-top-action-button";
    addButton.textContent = "Add Selected";
    addButton.disabled = true;

    const skipButton = document.createElement("button");
    skipButton.className = "look-top-action-button secondary";
    skipButton.textContent = "Add Nothing";

    addButton.addEventListener("click", () => {
        if (selectedIndexes.size < 1) return;

        continueToBottomOrder();
    });

    skipButton.addEventListener("click", () => {
        selectedIndex = null;
        selectedIndexes.clear();

        continueToBottomOrder();
    });

    buttonRow.appendChild(addButton);
    buttonRow.appendChild(skipButton);

    popup.appendChild(title);
    popup.appendChild(description);
    popup.appendChild(cardGrid);
    popup.appendChild(buttonRow);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

function showSearchCardImagePopup(card, options = {}) {
    if (!card?.image) return;

    removeSearchCardImagePopup();

    const overlay = document.createElement("div");
    overlay.className = "search-card-image-overlay";
    overlay.id = "searchCardImageOverlay";

    const popup = document.createElement("div");
    popup.className = "search-card-image-popup";

    const image = document.createElement("img");
    image.src = card.image;
    image.alt = card.name;
    image.className = "search-card-image-large";

    const name = document.createElement("h3");
    name.textContent = card.name;

    const buttons = document.createElement("div");
    buttons.className = "search-card-image-buttons";

    if (options.canSelect) {
        const selectButton = document.createElement("button");
        selectButton.className = "look-top-action-button";
        selectButton.textContent = "Select Card";
        selectButton.addEventListener("click", () => {
            if (typeof options.onSelect === "function") {
                options.onSelect();
            }

            removeSearchCardImagePopup();
        });

        buttons.appendChild(selectButton);
    }

    const closeButton = document.createElement("button");
    closeButton.className = "look-top-action-button secondary";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", removeSearchCardImagePopup);

    buttons.appendChild(closeButton);

    popup.appendChild(image);
    popup.appendChild(name);
    popup.appendChild(buttons);
    overlay.appendChild(popup);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            removeSearchCardImagePopup();
        }
    });

    document.body.appendChild(overlay);
}

function removeSearchCardImagePopup() {
    const oldOverlay = document.getElementById("searchCardImageOverlay");

    if (oldOverlay) {
        oldOverlay.remove();
    }
}

function removeLookTopOverlay() {
    removeSearchCardImagePopup();

    const oldOverlay = document.getElementById("lookTopOverlay");

    if (oldOverlay) {
        oldOverlay.remove();
    }
}

// =========================
// Board Choice UI
// =========================

function showBoardCardChoice({
    player,
    sourceCard,
    prompt,
    choices,
    optional,
    onComplete
}) {
    removeBoardChoiceOverlay();

    if (choices.every(isInlineBoardChoice)) {
        showInlineBoardChoice({
            player,
            sourceCard,
            prompt,
            choices,
            optional,
            onComplete
        });
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "look-top-overlay";
    overlay.id = "boardChoiceOverlay";

    const popup = document.createElement("div");
    popup.className = "look-top-popup";

    const title = document.createElement("h2");
    title.textContent = sourceCard ? sourceCard.name : "Choose a card";

    const description = document.createElement("p");
    description.textContent = prompt || `Choose a card for ${player.name}.`;

    const cardGrid = document.createElement("div");
    cardGrid.className = "look-top-card-grid";

    let selectedChoice = null;

    const getFreshChoice = (choice) => {
        if (!choice) return null;

        const freshCard = getBoardCardFromData(choice);

        return freshCard
            ? { ...choice, card: freshCard }
            : choice;
    };

    choices.forEach(choice => {
        const cardButton = document.createElement("button");
        cardButton.className = "look-top-card-button";

        const img = document.createElement("img");
        img.src = choice.card.image;
        img.alt = choice.card.name;
        img.className = "look-top-card-img";

        const name = document.createElement("span");
        name.className = "look-top-card-name";
        name.textContent = choice.card.name;

        cardButton.appendChild(img);
        cardButton.appendChild(name);

        cardButton.addEventListener("click", () => {
            selectedChoice = choice;

            document.querySelectorAll("#boardChoiceOverlay .look-top-card-button").forEach(button => {
                button.classList.remove("selected-look-card");
            });

            cardButton.classList.add("selected-look-card");

            chooseButton.disabled = false;
        });

        cardGrid.appendChild(cardButton);
    });

    const buttonRow = document.createElement("div");
    buttonRow.className = "look-top-buttons";

    const chooseButton = document.createElement("button");
    chooseButton.className = "look-top-action-button";
    chooseButton.textContent = "Choose";
    chooseButton.disabled = true;

    const skipButton = document.createElement("button");
    skipButton.className = "look-top-action-button secondary";
    skipButton.textContent = "Skip";
    skipButton.disabled = !optional;

    chooseButton.addEventListener("click", async () => {
        if (!selectedChoice) return;

        removeBoardChoiceOverlay();

        if (typeof onComplete === "function") {
            await onComplete(getFreshChoice(selectedChoice));
        }

        await syncOnlineStateFromLocal();

        if (isOnlineMatch) {
            await syncOnlineAllPublicBoardsFromLocal();
        }
    });

    skipButton.addEventListener("click", async () => {
        removeBoardChoiceOverlay();

        if (typeof onComplete === "function") {
            await onComplete(null);
        }

        await syncOnlineStateFromLocal();

        if (isOnlineMatch) {
            await syncOnlineAllPublicBoardsFromLocal();
        }
    });

    buttonRow.appendChild(chooseButton);
    buttonRow.appendChild(skipButton);

    popup.appendChild(title);
    popup.appendChild(description);
    popup.appendChild(cardGrid);
    popup.appendChild(buttonRow);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

function renderBottomOrderStep({
    player,
    sourceCard,
    remainingCards,
    selectedIndex,
    selectedIndexes = [],
    onComplete
}) {
    const overlay = document.getElementById("lookTopOverlay");
    const popup = overlay?.querySelector(".look-top-popup");

    if (!overlay || !popup) return;

    popup.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = sourceCard
        ? `${sourceCard.name}`
        : "Order cards";

    const description = document.createElement("p");
    description.textContent = `Click the remaining cards in the order ${player.name} wants to place them on the bottom of the deck.`;

    const cardGrid = document.createElement("div");
    cardGrid.className = "look-top-card-grid";

    const selectedOrder = [];
    const doneButton = document.createElement("button");

    const updateDoneState = () => {
        doneButton.disabled = selectedOrder.length !== remainingCards.length;
    };

    remainingCards.forEach(entry => {
        const cardButton = document.createElement("button");
        cardButton.className = "look-top-card-button bottom-order-card-button";

        const orderBadge = document.createElement("span");
        orderBadge.className = "bottom-order-badge";

        const img = document.createElement("img");
        img.src = entry.card.image;
        img.alt = entry.card.name;
        img.className = "look-top-card-img";

        const name = document.createElement("span");
        name.className = "look-top-card-name";
        name.textContent = entry.card.name;

        cardButton.appendChild(orderBadge);
        cardButton.appendChild(img);
        cardButton.appendChild(name);

        cardButton.addEventListener("click", () => {
            if (selectedOrder.includes(entry.index)) return;

            selectedOrder.push(entry.index);
            orderBadge.textContent = selectedOrder.length;
            cardButton.classList.add("selected-look-card", "bottom-order-selected");
            updateDoneState();
        });

        cardGrid.appendChild(cardButton);
    });

    const buttonRow = document.createElement("div");
    buttonRow.className = "look-top-buttons";

    doneButton.className = "look-top-action-button";
    doneButton.textContent = "Place on Bottom";
    doneButton.disabled = true;

    const resetButton = document.createElement("button");
    resetButton.className = "look-top-action-button secondary";
    resetButton.textContent = "Reset Order";

    doneButton.addEventListener("click", () => {
        if (selectedOrder.length !== remainingCards.length) return;

        removeLookTopOverlay();

        if (typeof onComplete === "function") {
            onComplete({
                selectedIndex,
                selectedIndexes,
                bottomOrder: selectedOrder
            });
        }
    });

    resetButton.addEventListener("click", () => {
        selectedOrder.splice(0, selectedOrder.length);

        cardGrid.querySelectorAll(".bottom-order-card-button").forEach(cardButton => {
            cardButton.classList.remove("selected-look-card", "bottom-order-selected");
            const orderBadge = cardButton.querySelector(".bottom-order-badge");

            if (orderBadge) {
                orderBadge.textContent = "";
            }
        });

        updateDoneState();
    });

    buttonRow.appendChild(doneButton);
    buttonRow.appendChild(resetButton);

    popup.appendChild(title);
    popup.appendChild(description);
    popup.appendChild(cardGrid);
    popup.appendChild(buttonRow);
}

function removeBoardChoiceOverlay() {
    clearInlineBoardChoice();

    const oldOverlay = document.getElementById("boardChoiceOverlay");

    if (oldOverlay) {
        oldOverlay.remove();
    }
}

function isInlineBoardChoice(choice) {
    return choice &&
        choice.playerKey &&
        ["leader", "character", "stage"].includes(choice.cardType);
}

function showInlineBoardChoice({
    player,
    sourceCard,
    prompt,
    choices,
    optional,
    onComplete
}) {
    clearInlineBoardChoice();
    clearBoardSelection();
    clearHandSelection();

    pendingBoardChoice = {
        player,
        sourceCard,
        choices,
        optional,
        onComplete
    };

    choices.forEach(choice => {
        const element = getBoardElementForChoice(choice);

        if (!element) return;

        element.classList.add("board-choice-target");
        element.classList.toggle("board-choice-own", gameState[choice.playerKey] === player);
        element.classList.toggle("board-choice-opponent", gameState[choice.playerKey] !== player);
        element.title = `${gameState[choice.playerKey]?.name || "Player"}: ${choice.card?.name || "Card"}`;
    });

    renderInlineBoardChoicePrompt(prompt || `Choose a card for ${player.name}.`, Boolean(optional));
}

function renderInlineBoardChoicePrompt(prompt, optional) {
    const box = document.createElement("div");
    box.id = "inlineBoardChoicePrompt";
    box.className = "inline-board-choice-prompt";

    const text = document.createElement("span");
    text.textContent = prompt;

    box.appendChild(text);

    if (optional) {
        const skipButton = document.createElement("button");
        skipButton.type = "button";
        skipButton.textContent = "Skip";
        skipButton.addEventListener("click", async () => {
            const choice = pendingBoardChoice;

            clearInlineBoardChoice();

            if (typeof choice?.onComplete === "function") {
                await choice.onComplete(null);
            }

            await syncOnlineStateFromLocal();
        });

        box.appendChild(skipButton);
    }

    document.body.appendChild(box);
}

function clearInlineBoardChoice() {
    pendingBoardChoice = null;

    document.querySelectorAll(".board-choice-target").forEach(element => {
        element.classList.remove("board-choice-target", "board-choice-own", "board-choice-opponent");
        element.removeAttribute("title");
    });

    document.getElementById("inlineBoardChoicePrompt")?.remove();
}

async function handleInlineBoardChoiceSelection(choiceData) {
    const choiceState = pendingBoardChoice;

    if (!choiceState) return false;

    const selectedChoice = choiceState.choices.find(choice => {
        return choice.playerKey === choiceData.playerKey &&
            choice.cardType === choiceData.cardType &&
            (choice.cardType !== "character" || Number(choice.slotIndex) === Number(choiceData.slotIndex));
    });

    if (!selectedChoice) {
        addGameLog("That card is not a valid choice for this effect.");
        return true;
    }

    const freshCard = getBoardCardFromData(selectedChoice);
    const finalChoice = freshCard
        ? { ...selectedChoice, card: freshCard }
        : selectedChoice;

    clearInlineBoardChoice();

    if (typeof choiceState.onComplete === "function") {
        await choiceState.onComplete(finalChoice);
    }

    await syncOnlineStateFromLocal();

    if (isOnlineMatch) {
        await syncOnlineAllPublicBoardsFromLocal();
    }

    return true;
}

function getBoardElementForChoice(choice) {
    if (!choice) return null;

    if (choice.cardType === "leader") {
        return document.querySelector(`.board-leader-card[data-player="${choice.playerKey}"]`);
    }

    if (choice.cardType === "character") {
        return document.querySelector(`.board-character-card[data-player="${choice.playerKey}"][data-character-slot="${choice.slotIndex}"]`);
    }

    if (choice.cardType === "stage") {
        return document.querySelector(`.board-stage-card[data-player="${choice.playerKey}"]`);
    }

    return null;
}

// =========================
// Effect Choice UI
// =========================

function chooseEffectActivation({
    player,
    sourceCard,
    effect,
    title,
    prompt,
    activateText = "Activate This Effect",
    skipText = "Do Not Activate",
    onComplete
}) {
    chooseEffectOption({
        player,
        sourceCard,
        effect,
        title,
        prompt,
        activationPrompt: true,
        options: [
            {
                label: activateText,
                value: true
            },
            {
                label: skipText,
                value: false,
                secondary: true
            }
        ],
        onComplete
    });
}

function chooseEffectOption({
    sourceCard,
    title,
    prompt,
    options,
    activationPrompt = false,
    onComplete
}) {
    removeEffectChoiceOverlay();

    const overlay = document.createElement("div");
    overlay.className = "look-top-overlay";
    overlay.id = "effectChoiceOverlay";

    const popup = document.createElement("div");
    popup.className = "look-top-popup effect-choice-popup";
    if (activationPrompt) {
        popup.classList.add("effect-activation-popup");
    }

    const heading = document.createElement("h2");
    heading.textContent = title || sourceCard?.name || "Choose Effect";

    const body = document.createElement("div");
    body.className = "effect-choice-body";

    if (sourceCard?.image) {
        const image = document.createElement("img");
        image.src = sourceCard.image;
        image.alt = sourceCard.name;
        image.className = "effect-choice-card-img";
        body.appendChild(image);
    }

    const content = document.createElement("div");
    content.className = "effect-choice-content";

    const description = document.createElement("p");
    description.textContent = prompt || "Choose how to resolve this effect.";

    if (activationPrompt && effect) {
        const effectText = document.createElement("div");
        effectText.className = "effect-activation-text";
        effectText.textContent = effect.generatedText || effect.text || effect.sourceText || "";
        if (effectText.textContent.trim()) {
            content.appendChild(effectText);
        }
    }

    const buttonRow = document.createElement("div");
    const hasCardOptions = options.some(option => option.card?.image);
    buttonRow.className = hasCardOptions
        ? "look-top-card-grid effect-choice-card-options"
        : "look-top-buttons effect-choice-buttons";

    options.forEach(option => {
        const button = document.createElement("button");
        button.className = hasCardOptions && option.card
            ? "look-top-card-button effect-choice-card-option"
            : option.secondary
                ? "look-top-action-button secondary"
                : "look-top-action-button";

        if (option.card?.image) {
            const img = document.createElement("img");
            img.src = option.card.image;
            img.alt = option.card.name || option.label;
            img.className = "look-top-card-img";

            const name = document.createElement("span");
            name.className = "look-top-card-name";
            name.textContent = option.card.name || option.label;

            button.appendChild(img);
            button.appendChild(name);
        } else {
            button.textContent = option.label;
        }

        button.addEventListener("click", async () => {
            const completeChoice = async () => {
                removeEffectChoiceOverlay();

                if (typeof onComplete === "function") {
                    await onComplete(option.value);
                }

                await syncOnlineStateFromLocal();
            };

            if (option.card?.image) {
                showSearchCardImagePopup(option.card, {
                    canSelect: true,
                    onSelect: completeChoice
                });
                return;
            }

            await completeChoice();
        });

        buttonRow.appendChild(button);
    });

    content.appendChild(description);
    content.appendChild(buttonRow);
    body.appendChild(content);

    popup.appendChild(heading);
    popup.appendChild(body);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

function removeEffectChoiceOverlay() {
    const oldOverlay = document.getElementById("effectChoiceOverlay");

    if (oldOverlay) {
        oldOverlay.remove();
    }
}

// =========================
// Board Helpers
// =========================

function getSelectedBoardCardObject() {
    if (!selectedBoardCardData) return null;

    return getBoardCardFromData(selectedBoardCardData);
}

function canSelectedBoardCardAttack() {
    if (pendingAttack || currentAttack) {
        return false;
    }

    if (!selectedBoardCardData) {
        return false;
    }

    const player = gameState[selectedBoardCardData.playerKey];

    if (!player) {
        return false;
    }

    if (gameState.currentPhase !== "main") {
        return false;
    }

    if (gameState.currentPlayer !== player) {
        return false;
    }

    if (!canCurrentPlayerAttack()) {
        return false;
    }

    const card = getSelectedBoardCardObject();

    if (!card) {
        return false;
    }

    if (
        selectedBoardCardData.cardType === "character" &&
        isCharacterPlayedThisTurn(player, card) &&
        !CardEffects.canAttackOnTurnPlayed(card) &&
        !CardEffects.canAttackCharactersOnTurnPlayed(card)
    ) {
        return false;
    }

    const cardState = card.state || "active";

    if (cardState !== "active") {
        return false;
    }

    if (selectedBoardCardData.cardType === "character" && isCharacterAttackLocked(card, player)) {
        return false;
    }

    return true;
}

function getBoardActionButtonContainer() {
    if (!selectedBoardCard || !selectedBoardCardData) return null;

    if (selectedBoardCardData.cardType === "leader") {
        return selectedBoardCard.closest(".leader-area");
    }

    if (selectedBoardCardData.cardType === "character") {
        return selectedBoardCard.closest(".character-slot");
    }

    if (selectedBoardCardData.cardType === "stage") {
        return selectedBoardCard.closest(".stage-area");
    }

    return null;
}

function getOpponentPlayerKey(playerKey) {
    return playerKey === "player1" ? "player2" : "player1";
}

function isCharacterPlayedThisTurn(player, card) {
    if (!player || !card) {
        return false;
    }

    return card.cardType === "character" && card.playedOnTurn === player.turns;
}

let resolvingCustomEffectV2SetPower = false;

function getPrintedPower(card) {
    if (card?.temporaryBasePower && !isTemporaryBasePowerExpired(card.temporaryBasePower)) {
        return Number(card.temporaryBasePower.value ?? card.power ?? 0);
    }

    if (card?.cardNumber === "BK01-007") {
        const owner = getPlayerForBoardCard(card);
        const player = owner;

        if (player?.characters?.some(character => CardEffects.hasCardName(character, "Guts"))) {
            return 6000;
        }
    }

    return Number(card?.power ?? 0);
}

function isTemporaryBasePowerExpired(basePowerEntry) {
    const playerKey = basePowerEntry?.expiresAtPlayerKey;
    const player = playerKey ? gameState?.[playerKey] : null;

    return Boolean(player && Number(player.turns || 0) > Number(basePowerEntry.expiresAtEndOfTurns ?? 0));
}

function getPowerModifier(card, player = null) {
    if (!card) {
        return 0;
    }

    return getYourTurnPowerBonus(card, player) +
        getTurboGrannyFormPowerModifier(card, player) +
        getSerpicoFarnesePowerModifier(card, player) +
        getGutsLeaderPowerModifier(card, player) +
        getRimuruTempestPowerModifier(card, player) +
        getOpponentTurnPowerModifier(card, player) +
        getAttachedDonPowerModifier(card, player) +
        getST01PowerModifier(card, player) +
        getCustomEffectV2PowerModifier(card, player) +
        getTemporaryPowerModifier(card) +
        getDurationPowerModifier(card) +
        getTokenAttachedPowerModifier(card) +
        getBattlePowerModifier(card);
}

function getST01PowerModifier(card, player) {
    if (!card || !player) {
        return 0;
    }

    if (card.cardNumber === "ST01-013" && Number(card.attachedDon || 0) >= 1) {
        return 1000;
    }

    return 0;
}

function getPlayerForBoardCard(card) {
    if (!card || !gameState) {
        return null;
    }

    return [gameState.player1, gameState.player2].find(player => {
        return player.leader === card || player.stage === card || player.characters.includes(card);
    }) || null;
}

function getYourTurnPowerBonus(card, player) {
    if (!card || !player) {
        return 0;
    }

    if (gameState.currentPlayer !== player) {
        return 0;
    }

    return card.effects
        ?.filter(effect => effect.type === "yourTurn")
        .reduce((total, effect) => {
            if (effect.actionId === "leaderPowerPerCharacter") {
                return total + player.characters.filter(Boolean).length * 1000;
            }

            if (effect.actionId === "attachedDonPower") {
                const requiredTokens = Number(effect.requiredTokens ?? 1);

                if (Number(card.attachedDon || 0) >= requiredTokens) {
                    return total + Number(effect.powerModifier ?? 0);
                }
            }

            return total;
        }, 0) ?? 0;
}

function getTurboGrannyFormPowerModifier(card, player) {
    if (!card || !player || !player.stage) {
        return 0;
    }

    if (card.cardType !== "leader" && card.cardType !== "character") {
        return 0;
    }

    if (!CardEffects.hasCardName(player.stage, "Turbo Granny Form")) {
        return 0;
    }

    if (!CardEffects.hasCardName(card, "Okarun")) {
        return 0;
    }

    return player.stage.effects
        ?.filter(effect => {
            return effect.type === "continuous" &&
                effect.id === "DD01-002-your-turn-power";
        })
        .reduce((total, effect) => {
            return total + Number(effect.powerModifier ?? 0);
        }, 0) ?? 0;
}

function getOpponentTurnPowerModifier(card, player) {
    if (!card || !player) {
        return 0;
    }

    if (gameState.currentPlayer === player) {
        return 0;
    }

    return card.effects
        ?.filter(effect => effect.type === "opponentsTurn")
        .reduce((total, effect) => {
            return total + Number(effect.powerModifier ?? 0);
        }, 0) ?? 0;
}

function getCustomEffectV2PowerModifier(card, player) {
    if (!card || !player || !window.CustomEffectV2Engine?.isV2Effect) {
        return 0;
    }

    const sources = [
        player.leader,
        player.stage,
        ...player.characters.filter(Boolean)
    ].filter(Boolean);

    return sources.reduce((total, sourceCard) => {
        return total + (sourceCard.effects || [])
            .filter(effect => window.CustomEffectV2Engine.isV2Effect(effect))
            .filter(effect => {
                const eventType = window.CustomEffectV2Engine.getEventType(effect);
                if (eventType === "yourTurn") return gameState.currentPlayer === player;
                if (eventType === "opponentTurn") return gameState.currentPlayer !== player;
                return eventType === "static";
            })
            .filter(effect => window.CustomEffectV2Engine.canUseEffect?.(player, sourceCard, effect)?.ok)
            .flatMap(effect => (effect.actions || []).map(action => ({ effect, action })))
            .filter(entry => entry.action.type === "modifyPower")
            .filter(entry => {
                const conditions = Array.isArray(entry.action.conditions) ? entry.action.conditions : [];
                return conditions.every(condition => window.CustomEffectV2Engine.conditionMet?.(player, sourceCard, condition) !== false);
            })
            .filter(entry => customEffectV2ActionAppliesToCard(entry.action, entry.effect, sourceCard, card, player))
            .reduce((effectTotal, entry) => effectTotal + Number(entry.action.amount || 0), 0);
    }, 0);
}

function getCustomEffectV2SetPowerValue(card, player) {
    if (!card || !player || resolvingCustomEffectV2SetPower || !window.CustomEffectV2Engine?.isV2Effect) {
        return null;
    }

    const sources = [
        player.leader,
        player.stage,
        ...player.characters.filter(Boolean)
    ].filter(Boolean);

    resolvingCustomEffectV2SetPower = true;

    try {
        let setPowerValue = null;

        sources.forEach(sourceCard => {
            (sourceCard.effects || [])
                .filter(effect => window.CustomEffectV2Engine.isV2Effect(effect))
                .filter(effect => {
                    const eventType = window.CustomEffectV2Engine.getEventType(effect);
                    if (eventType === "yourTurn") return gameState.currentPlayer === player;
                    if (eventType === "opponentTurn") return gameState.currentPlayer !== player;
                    return eventType === "static";
                })
                .filter(effect => window.CustomEffectV2Engine.canUseEffect?.(player, sourceCard, effect)?.ok)
                .flatMap(effect => (effect.actions || []).map(action => ({ effect, action })))
                .filter(entry => entry.action.type === "setPower")
                .filter(entry => !entry.action.duration || entry.action.duration === window.CustomEffectV2?.DURATIONS?.permanent)
                .filter(entry => {
                    const conditions = Array.isArray(entry.action.conditions) ? entry.action.conditions : [];
                    return conditions.every(condition => window.CustomEffectV2Engine.conditionMet?.(player, sourceCard, condition) !== false);
                })
                .filter(entry => customEffectV2ActionAppliesToCard(entry.action, entry.effect, sourceCard, card, player))
                .forEach(entry => {
                    const amount = Number(entry.action.amount);
                    if (Number.isFinite(amount)) setPowerValue = amount;
                });
        });

        return setPowerValue;
    } finally {
        resolvingCustomEffectV2SetPower = false;
    }
}

function customEffectV2ActionAppliesToCard(action, effect, sourceCard, card, player) {
    const target = String(action.target || "");

    if (target === "thisCard") return sourceCard === card;
    if (target === "thisLeader" || target === "yourLeader") return player.leader === card;
    if (target === "yourCharacters") return card.cardType === "character" && player.characters.includes(card);
    if (target === "yourLeaderOrCharacters") {
        return player.leader === card || (card.cardType === "character" && player.characters.includes(card));
    }

    const selection = (effect.targets || []).find(entry => entry.id === target);
    if (!selection || selection.controller === "opponent") return false;

    if (selection.zone === "characters" && card.cardType !== "character") return false;
    if (selection.zone === "leader" && card.cardType !== "leader") return false;
    if (selection.zone === "stage" && card.cardType !== "stage") return false;
    if (selection.zone === "leaderOrCharacters" && card.cardType !== "leader" && card.cardType !== "character") return false;
    if (selection.zone !== "board" && selection.zone !== "leaderOrCharacters" && selection.zone !== "characters" && selection.zone !== "leader" && selection.zone !== "stage") return false;

    return customEffectV2FiltersMatch(card, selection.filters || []);
}

function customEffectV2FiltersMatch(card, filters) {
    return filters.every(filter => {
        if (filter.field === "any") {
            return (filter.branches || []).some(branch => customEffectV2FiltersMatch(card, branch));
        }
        if (filter.field === "cost") return compareCustomEffectV2Number(getCardEffectiveCost(card), filter.operator, filter.value);
        if (filter.field === "power") return compareCustomEffectV2Number(Number(card.power || 0), filter.operator, filter.value);
        if (filter.field === "basePower") return compareCustomEffectV2Number(Number(card.power || 0), filter.operator, filter.value);
        if (filter.field === "attachedDon") return compareCustomEffectV2Number(Number(card.attachedDon || 0), filter.operator, filter.value);
        if (filter.field === "cardType") return String(card.cardType || "").toLowerCase() === String(filter.value || "").toLowerCase();
        if (filter.field === "name") {
            if (filter.operator === "!=") {
                return !String(card.name || "").toLowerCase().includes(String(filter.value || "").toLowerCase());
            }
            return String(card.name || "").toLowerCase().includes(String(filter.value || "").toLowerCase());
        }
        if (filter.field === "type") return typeof hasExactTypeText === "function"
            ? hasExactTypeText(card, filter.value)
            : String(card.type || "").toLowerCase().includes(String(filter.value || "").toLowerCase());
        if (filter.field === "color") {
            const colors = Array.isArray(card.colors)
                ? card.colors
                : String(card.color || "").split(/[\/,]/);
            return colors.some(color => String(color || "").trim().toLowerCase() === String(filter.value || "").toLowerCase());
        }
        if (filter.field === "keyword") return CardEffects.hasKeyword(card, filter.value);
        return true;
    });
}

function compareCustomEffectV2Number(actual, operator, expected) {
    if (operator === "<=") return Number(actual) <= Number(expected);
    if (operator === ">=") return Number(actual) >= Number(expected);
    if (operator === "==") return Number(actual) === Number(expected);
    return true;
}

function getTokenAttachedPowerModifier(card) {
    if (!card) {
        return 0;
    }

    const attachedDon = Number(card.attachedDon ?? 0);

    return card.effects
        ?.filter(effect => effect.type === "tokenAttached")
        .reduce((total, effect) => {
            const requiredTokens = Number(effect.requiredTokens ?? 0);

            if (attachedDon < requiredTokens) {
                return total;
            }

            return total + Number(effect.powerModifier ?? 0);
        }, 0) ?? 0;
}

function getSerpicoFarnesePowerModifier(card, player) {
    if (!card || !player || card.cardType !== "character") {
        return 0;
    }

    if (!CardEffects.hasCardName(card, "Farnese")) {
        return 0;
    }

    return player.characters
        .filter(character => character?.cardNumber === "BK01-010")
        .reduce((total, character) => {
            const effect = character.effects?.find(cardEffect => cardEffect.id === "BK01-010-farnese-power");
            return total + Number(effect?.powerModifier ?? 0);
        }, 0);
}

function getGutsLeaderPowerModifier(card, player) {
    if (!card || !player || card.cardType !== "leader") {
        return 0;
    }

    if (!CardEffects.hasCardName(card, "Guts")) {
        return 0;
    }

    return player.characters
        .filter(character => character?.cardNumber === "BK01-016")
        .reduce((total, character) => {
            const effect = character.effects?.find(cardEffect => cardEffect.id === "BK01-016-guts-rush-leader-power");
            return total + Number(effect?.leaderPowerModifier ?? 0);
        }, 0);
}

function getRimuruTempestPowerModifier(card, player) {
    if (!card || !player || !player.leader || !CardEffects.hasCardName(player.leader, "Rimuru Tempest")) {
        return 0;
    }

    if (card.cardNumber === "RIM1-004") {
        return 1000;
    }

    return 0;
}

function getAttachedDonPowerModifier(card, player) {
    if (gameState.currentPlayer !== player) {
        return 0;
    }

    return Number(card?.attachedDon ?? 0) * 1000;
}

function getTemporaryPowerModifier(card) {
    return Number(card?.temporaryPowerBonus ?? 0);
}

function getDurationPowerModifier(card) {
    return card?.durationPowerBonuses
        ?.filter(entry => !isDurationPowerBonusExpired(card, entry))
        .reduce((total, entry) => total + Number(entry.amount ?? 0), 0) ?? 0;
}

function isDurationPowerBonusExpired(card, entry) {
    const fallbackPlayer = getPlayerForBoardCard(card);
    const expiringPlayer = entry?.expiresAtPlayerKey
        ? gameState?.[entry.expiresAtPlayerKey]
        : fallbackPlayer;

    if (!expiringPlayer) {
        return false;
    }

    return Number(expiringPlayer.turns || 0) > Number(entry.expiresAtEndOfTurns ?? 0);
}

function getCostModifier(card) {
    return card?.costModifiers
        ?.reduce((total, entry) => total + Number(entry.amount ?? 0), 0) ?? 0;
}

function renderCostModifierBadge(card, container) {
    if (!card || !container || card.cardType !== "character") {
        return;
    }

    const modifier = getCostModifier(card);

    if (modifier === 0) {
        return;
    }

    const printedCost = Number(card.cost ?? card.playCost ?? 0);
    const sign = modifier > 0 ? "+" : "";
    const badge = document.createElement("div");

    badge.className = modifier < 0
        ? "cost-modifier-badge cost-modifier-negative"
        : "cost-modifier-badge cost-modifier-positive";
    badge.textContent = `${sign}${modifier} Cost`;
    badge.title = `Cost modifier: ${sign}${modifier} (${printedCost} printed cost)`;

    container.appendChild(badge);
}

function renderPowerModifierBadge(card, player, container, boardCardData = null) {
    if (!card || !container) {
        return;
    }

    const modifier = getPowerModifier(card, player) +
        getCurrentAttackTargetPowerBonus(boardCardData);

    if (modifier === 0) {
        return;
    }

    const badge = document.createElement("div");
    const sign = modifier > 0 ? "+" : "";
    const printedPower = getPrintedPower(card);
    const currentPower = printedPower + modifier;

    badge.className = modifier > 0
        ? "power-modifier-badge power-modifier-positive"
        : "power-modifier-badge power-modifier-negative";

    badge.textContent = `${sign}${modifier}`;
    badge.title = `Current power: ${currentPower} (${printedPower} ${sign}${modifier})`;

    container.appendChild(badge);
}

function renderLivePowerBadge(card, player, container, boardCardData = null) {
    if (!card || !container || (card.cardType !== "leader" && card.cardType !== "character")) {
        return;
    }

    const battlePower = getCardBattlePower(card, player) + getCurrentAttackTargetPowerBonus(boardCardData);
    const badge = document.createElement("button");

    badge.type = "button";
    badge.className = "live-power-badge";
    badge.textContent = String(battlePower);
    badge.title = "Power breakdown";
    badge.addEventListener("click", event => {
        event.stopPropagation();
        showPowerBreakdown(card, player, boardCardData);
    });

    container.appendChild(badge);
}

function renderBasePowerBadge(card, container) {
    if (!card || !container || (card.cardType !== "leader" && card.cardType !== "character")) {
        return;
    }

    const basePower = getPrintedPower(card);
    const badge = document.createElement("div");

    badge.className = "base-power-badge";
    badge.textContent = `Base ${basePower}`;
    badge.title = `Base power: ${basePower}`;

    container.appendChild(badge);
}

function renderAttachedDonBadge(card, container) {
    if (!card || !container) {
        return;
    }

    const attachedDon = Number(card.attachedDon ?? 0);

    if (attachedDon <= 0) {
        return;
    }

    const badge = document.createElement("div");
    badge.className = "attached-don-badge";
    badge.textContent = `DON!! x${attachedDon}`;
    badge.title = `${attachedDon} attached DON!!: +${attachedDon * 1000} power`;

    container.appendChild(badge);
}

function getCurrentAttackTargetPowerBonus(boardCardData) {
    if (!currentAttack || !boardCardData) {
        return 0;
    }

    if (!isSameBoardCard(currentAttack.target, boardCardData)) {
        return 0;
    }

    return Number(currentAttack.targetPowerBonus || 0);
}

function isSameBoardCard(firstCardData, secondCardData) {
    if (!firstCardData || !secondCardData) {
        return false;
    }

    if (firstCardData.playerKey !== secondCardData.playerKey) {
        return false;
    }

    if (firstCardData.cardType !== secondCardData.cardType) {
        return false;
    }

    if (firstCardData.cardType === "character") {
        return Number(firstCardData.slotIndex) === Number(secondCardData.slotIndex);
    }

    return true;
}

function getBoardActionButtonContainerFromData(boardCardData) {
    if (!boardCardData) return null;

    if (boardCardData.cardType === "leader") {
        const leaderElement = document.querySelector(
            `.board-leader-card[data-player="${boardCardData.playerKey}"]`
        );

        return leaderElement?.closest(".leader-area") ?? null;
    }

    if (boardCardData.cardType === "character") {
        const characterElement = document.querySelector(
            `.board-character-card[data-player="${boardCardData.playerKey}"][data-character-slot="${boardCardData.slotIndex}"]`
        );

        return characterElement?.closest(".character-slot") ?? null;
    }

    if (boardCardData.cardType === "stage") {
        const stageElement = document.querySelector(
            `.board-stage-card[data-player="${boardCardData.playerKey}"]`
        );

        return stageElement?.closest(".stage-area") ?? null;
    }

    return null;
}

function powerLine(label, amount) {
    return {
        label,
        amount: Number(amount || 0)
    };
}

function getPowerBreakdown(card, player, boardCardData = null) {
    const lines = [powerLine("Printed/Base power", getPrintedPower(card))];
    const addLine = (label, amount) => {
        const value = Number(amount || 0);

        if (value !== 0) {
            lines.push(powerLine(label, value));
        }
    };

    addLine("Your Turn effects", getYourTurnPowerBonus(card, player));
    addLine("Stage/field effects", getTurboGrannyFormPowerModifier(card, player));
    addLine("Serpico/Farnese effects", getSerpicoFarnesePowerModifier(card, player));
    addLine("Guts leader effects", getGutsLeaderPowerModifier(card, player));
    addLine("Rimuru leader effects", getRimuruTempestPowerModifier(card, player));
    addLine("Opponent's Turn effects", getOpponentTurnPowerModifier(card, player));
    addLine("Attached DON!!", getAttachedDonPowerModifier(card, player));
    addLine("DON!! condition effects", getST01PowerModifier(card, player));
    addLine("Temporary power", getTemporaryPowerModifier(card));
    addLine("Duration power", getDurationPowerModifier(card));
    addLine("Token attached power", getTokenAttachedPowerModifier(card));
    addLine("Battle counter power", getBattlePowerModifier(card));
    addLine("Current attack bonus", getCurrentAttackTargetPowerBonus(boardCardData));

    const total = lines.reduce((sum, line) => sum + line.amount, 0);

    return { lines, total };
}

function showPowerBreakdown(card, player, boardCardData = null) {
    if (!card || !player) return;

    document.getElementById("powerBreakdownOverlay")?.remove();

    const breakdown = getPowerBreakdown(card, player, boardCardData);
    const overlay = document.createElement("div");
    overlay.className = "look-top-overlay";
    overlay.id = "powerBreakdownOverlay";

    const popup = document.createElement("div");
    popup.className = "look-top-popup power-breakdown-popup";

    const title = document.createElement("h2");
    title.textContent = `${card.name} Power`;

    const list = document.createElement("div");
    list.className = "power-breakdown-list";

    breakdown.lines.forEach(line => {
        const row = document.createElement("div");
        row.className = "power-breakdown-row";

        const label = document.createElement("span");
        label.textContent = line.label;

        const value = document.createElement("strong");
        value.textContent = line.amount > 0 && line.label !== "Printed/Base power"
            ? `+${line.amount}`
            : String(line.amount);

        row.append(label, value);
        list.appendChild(row);
    });

    const total = document.createElement("div");
    total.className = "power-breakdown-total";
    total.innerHTML = `<span>Total</span><strong>${breakdown.total}</strong>`;

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.addEventListener("click", () => overlay.remove());

    popup.append(title, list, total, close);
    overlay.appendChild(popup);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
}

// =========================
// General Helpers
// =========================

function rollD20() {
    return Math.floor(Math.random() * 20) + 1;
}

// =========================
// Stub Functions (Game Mechanics Removed)
// =========================
// These functions are called by other code but do nothing since game mechanics are disabled.

function clearAttackTargets() {}
function clearBattleControls() {}
function clearAttackArrow() {}
function drawAttackArrow() {}
function createPhaseLogProxy() { return { get innerHTML() { return ""; }, set innerHTML(v) {} }; }
function setupPhaseControls() {}
function updatePhaseButtonPassState() {}
function createTurnOrderButtons() {}
function createMulliganButtons() {}
function setupAttackTargetSelection() {}
function enterAttackTargetSelection() {}
function beginAttack() {}
function createBattleButton() { return document.createElement("button"); }
function showResolveAttackButton() {}
function showCounterPhaseControls() {}
function canCurrentPlayerAttack() { return false; }
function isCharacterAttackLocked() { return false; }
function getCardBattlePower() { return 0; }
function getActivateMainEffect() { return null; }
function createActivateMainButton() { return document.createElement("button"); }
function canUseActivateMainEffect() { return false; }
function resolveWhenAttackingEffectsBeforeBattle() {}
function promptOptionalWhenAttackingEffects() {}
function promptOnOpponentAttackCharacterEffects() {}
function promptTrashOneCardForAttack() {}
function markAttackEffectSkipped() {}
function isAttackEffectSkipped() { return false; }
function clearBattleOnlyEffectsForCurrentAttack() {}
function setCombatNextPhaseButton() {}
function isCurrentAttackingCard() { return false; }
function concludeAttackBecauseAttackerLeft() { return false; }
function applyCounterPowerToCurrentAttack() {}
function createSkipBlockButton() { return document.createElement("button"); }
function showWaitingForOnlineDefenderEffects() {}
function maybeRunOnlineDefenderAttackEffects() { return false; }
function showOnlineAttackLog() {}
function applyOnlineCurrentAttack() {}
function renderOnlineAttackControls() {}
function updateOnlinePhaseButton() {}
