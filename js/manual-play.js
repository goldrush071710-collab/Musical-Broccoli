// Manual Gameplay System - Works with existing game rendering
// This enhances the existing rendered DOM with manual controls

const manualPlay = {
    state: {
        life: 0,
        currentPlayer: "player1",
        settings: {
            autoDon: false,
            autoLife: false
        },
        notes: {}, // cardId -> note text
        restState: {}, // cardId -> boolean
        arrowMode: false,
        noteMode: false
    },

    init() {
        console.log("Initializing manual gameplay...");
        this.loadSettings();
        this.setupEventListeners();
        this.setupCardInteractions();
    },

    loadSettings() {
        const saved = localStorage.getItem("manualPlaySettings");
        if (saved) {
            try {
                this.state.settings = JSON.parse(saved);
                const autoDonToggle = document.getElementById("autoDonToggle");
                if (autoDonToggle) autoDonToggle.checked = this.state.settings.autoDon;
                const autoLifeToggle = document.getElementById("autoLifeToggle");
                if (autoLifeToggle) autoLifeToggle.checked = this.state.settings.autoLife;
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        }
    },

    saveSettings() {
        localStorage.setItem("manualPlaySettings", JSON.stringify(this.state.settings));
    },

    setupEventListeners() {
        console.log("Setting up event listeners...");
        
        // Settings toggles
        const autoDonToggle = document.getElementById("autoDonToggle");
        console.log("autoDonToggle:", autoDonToggle);
        autoDonToggle?.addEventListener("change", (e) => {
            console.log("autoDonToggle changed:", e.target.checked);
            this.state.settings.autoDon = e.target.checked;
            this.saveSettings();
        });

        const autoLifeToggle = document.getElementById("autoLifeToggle");
        console.log("autoLifeToggle:", autoLifeToggle);
        autoLifeToggle?.addEventListener("change", (e) => {
            console.log("autoLifeToggle changed:", e.target.checked);
            this.state.settings.autoLife = e.target.checked;
            this.saveSettings();
        });

        // Tools
        const drawArrowTool = document.getElementById("drawArrowTool");
        console.log("drawArrowTool:", drawArrowTool);
        drawArrowTool?.addEventListener("click", () => this.toggleArrowMode());
        
        
        const resetArrowsTool = document.getElementById("resetArrowsTool");
        console.log("resetArrowsTool:", resetArrowsTool);
        resetArrowsTool?.addEventListener("click", () => this.resetArrows());
        
        const restandAllTool = document.getElementById("restandAllTool");
        console.log("restandAllTool:", restandAllTool);
        restandAllTool?.addEventListener("click", () => this.restandAllCards());
        
        const addNoteTool = document.getElementById("addNoteTool");
        console.log("addNoteTool:", addNoteTool);
        addNoteTool?.addEventListener("click", () => this.toggleNoteMode());
        
        const clearNotesTool = document.getElementById("clearNotesTool");
        console.log("clearNotesTool:", clearNotesTool);
        clearNotesTool?.addEventListener("click", () => this.clearAllNotes());
        
        const undoTool = document.getElementById("undoTool");
        console.log("undoTool:", undoTool);
        undoTool?.addEventListener("click", () => this.undo());

        // Life controls
        const lifeMinus1 = document.getElementById("lifeMinus1");
        console.log("lifeMinus1:", lifeMinus1);
        lifeMinus1?.addEventListener("click", () => this.adjustLife(-1));
        
        const lifePlus1 = document.getElementById("lifePlus1");
        console.log("lifePlus1:", lifePlus1);
        lifePlus1?.addEventListener("click", () => this.adjustLife(1));
        
        const lifeMinus5 = document.getElementById("lifeMinus5");
        console.log("lifeMinus5:", lifeMinus5);
        lifeMinus5?.addEventListener("click", () => this.adjustLife(-5));
        
        const lifePlus5 = document.getElementById("lifePlus5");
        console.log("lifePlus5:", lifePlus5);
        lifePlus5?.addEventListener("click", () => this.adjustLife(5));
        
        const lifeDisplay = document.getElementById("lifeDisplay");
        console.log("lifeDisplay:", lifeDisplay);
        lifeDisplay?.addEventListener("click", () => this.promptLife());

        // Turn control
        const nextTurnBtn = document.getElementById("nextTurnBtn");
        console.log("nextTurnBtn:", nextTurnBtn);
        nextTurnBtn?.addEventListener("click", () => this.nextTurn());
        
        console.log("Event listeners setup complete");
    },

    setupCardInteractions() {
        console.log("=== setupCardInteractions called ===");
        
        const highlightClass = "drop-zone-highlight";
        
        // Helper to highlight all zones
        const highlightAllZones = () => {
            document.querySelectorAll(".character-area, .stage-area, .trash-area, .hand, .life-area, .deck-area").forEach(zone => {
                zone.classList.add(highlightClass);
                zone.style.background = "#4a90e2";
                zone.style.border = "3px solid #2563eb";
                zone.style.boxShadow = "0 0 20px rgba(74, 144, 226, 0.8) inset";
                zone.style.borderRadius = "8px";
            });
        };
        
        // Helper to clear all highlights
        const clearAllHighlights = () => {
            document.querySelectorAll(`.${highlightClass}`).forEach(zone => {
                zone.classList.remove(highlightClass);
                zone.style.background = "";
                zone.style.border = "";
                zone.style.boxShadow = "";
            });
            // Also clear life/deck zone split indicators
            document.querySelectorAll(".life-drop-zone, .deck-drop-zone").forEach(z => z.remove());
        };
        
        // Drag and drop - cards from deck to board/hand/life
        document.addEventListener("dragstart", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const deckCard = e.target.closest("[data-card-source='deck']");
            if (deckCard) {
                const playerKey = deckCard.getAttribute("data-player");
                const player = gameState[playerKey];
                if (!player || player.deck.length === 0) return;
                
                const topCard = player.deck[player.deck.length - 1];
                console.log("✓ DECK CARD DRAG START:", topCard.name);
                
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("cardInstanceId", topCard.instanceId);
                e.dataTransfer.setData("playerKey", playerKey);
                e.dataTransfer.setData("fromDeck", "true");
                e.dataTransfer.setData("text/html", deckCard.innerHTML);
                deckCard.style.opacity = "0.5";
                
                highlightAllZones();
            }
        }, true);

        document.addEventListener("dragend", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const deckCard = e.target.closest("[data-card-source='deck']");
            if (deckCard) {
                console.log("✓ DECK CARD DRAG END");
                deckCard.style.opacity = "1";
                clearAllHighlights();
            }
        }, true);
        
        // Drag and drop - cards from hand to board (only visible selectable cards)
        document.addEventListener("dragstart", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            console.log("DRAGSTART event fired on:", e.target);
            const handCard = e.target.closest(".hand-card.selectable-card");
            if (handCard) {
                console.log("✓ HAND CARD DRAG START:", handCard.getAttribute("data-card-instance-id"));
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("cardInstanceId", handCard.getAttribute("data-card-instance-id") || "");
                e.dataTransfer.setData("playerKey", this.state.currentPlayer);
                e.dataTransfer.setData("fromHand", "true");
                e.dataTransfer.setData("text/html", handCard.innerHTML);
                handCard.style.opacity = "0.5";
                handCard.style.cursor = "grabbing";
                
                // Highlight ALL drop zones when dragging starts
                console.log("Highlighting all drop zones");
                highlightAllZones();
            }
        }, true); // Use capture phase

        document.addEventListener("dragend", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const handCard = e.target.closest(".hand-card.selectable-card");
            if (handCard) {
                console.log("✓ HAND CARD DRAG END");
                handCard.style.opacity = "1";
                handCard.style.cursor = "grab";
                
                // Remove highlights from all zones
                console.log("Removing highlights from all drop zones");
                clearAllHighlights();
            }
        }, true); // Use capture phase
        
        // Drag board cards back to other zones/hand
        document.addEventListener("dragstart", (e) => {
            // Only process if hand card handler didn't already handle it
            if (!e.target || typeof e.target.closest !== "function") return;
            const handCard = e.target.closest(".hand-card.selectable-card");
            if (handCard) return; // Let hand card handler take it
            
            const boardCard = e.target.closest(".board-card-img");
            console.log("BOARD CARD DRAGSTART check:", boardCard ? "found" : "not found");
            
            if (boardCard) {
                const slot = boardCard.closest(".character-slot");
                const stageArea = boardCard.closest(".stage-area");
                const trashArea = boardCard.closest(".trash-area");
                
                console.log("Board card locations:", {slot: !!slot, stage: !!stageArea, trash: !!trashArea});
                
                if (slot || stageArea || trashArea) {
                    const playerKey = boardCard.getAttribute("data-player");
                    const player = gameState[playerKey];
                    console.log("Board card playerKey:", playerKey, "player exists:", !!player);
                    if (!player) return;
                    
                    let card = null;
                    if (slot) {
                        const slotIndex = parseInt(slot.getAttribute("data-slot"));
                        card = player.characters[slotIndex];
                        console.log("✓ BOARD CARD DRAG from character slot", slotIndex, "card:", card?.name);
                    } else if (stageArea) {
                        card = player.stage;
                        console.log("✓ BOARD CARD DRAG from stage, card:", card?.name);
                    } else if (trashArea) {
                        // Get the TOP card from trash (last in array)
                        card = player.trash?.length > 0 ? player.trash[player.trash.length - 1] : null;
                        console.log("✓ BOARD CARD DRAG from trash, card:", card?.name);
                    }
                    
                    if (card) {
                        console.log("✓ Setting drag data for board card");
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("cardInstanceId", card.instanceId);
                        e.dataTransfer.setData("playerKey", playerKey);
                        e.dataTransfer.setData("fromHand", "false");
                        boardCard.style.opacity = "0.5";
                        
                        // Highlight ALL drop zones when dragging board card
                        console.log("Highlighting all drop zones for board card");
                        highlightAllZones();
                    } else {
                        console.log("✗ Card not found in zone");
                    }
                }
            }
        }, true);
        
        document.addEventListener("dragend", (e) => {
            const boardCard = e.target.closest(".board-card-img");
            if (boardCard) {
                boardCard.style.opacity = "1";
                
                // Remove highlights from all zones
                console.log("Removing highlights on board card dragend");
                clearAllHighlights();
            }
        }, true);

        // Drag life cards to other zones
        document.addEventListener("dragstart", (e) => {
            const handCard = e.target.closest(".hand-card.selectable-card");
            if (handCard) return;
            
            const boardCard = e.target.closest(".board-card-img");
            if (boardCard && !e.target.closest("[data-card-source='life']")) return;
            
            const lifeCard = e.target.closest("[data-card-source='life']");
            if (lifeCard) {
                const playerKey = lifeCard.getAttribute("data-player");
                const lifeIndex = parseInt(lifeCard.getAttribute("data-life-index"));
                const player = gameState[playerKey];
                
                if (!player || !player.life[lifeIndex]) return;
                
                const card = player.life[lifeIndex];
                console.log("✓ LIFE CARD DRAG START:", card.name || "Life Card", "index:", lifeIndex);
                
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("cardInstanceId", card.instanceId);
                e.dataTransfer.setData("playerKey", playerKey);
                e.dataTransfer.setData("fromLife", "true");
                e.dataTransfer.setData("lifeIndex", String(lifeIndex));
                lifeCard.style.opacity = "0.5";
                
                highlightAllZones();
            }
        }, true);

        document.addEventListener("dragend", (e) => {
            const lifeCard = e.target.closest("[data-card-source='life']");
            if (lifeCard) {
                console.log("✓ LIFE CARD DRAG END");
                lifeCard.style.opacity = "1";
                clearAllHighlights();
            }
        }, true);

        // DON attachment system - click to select DON, then click card to attach
        let selectedDonCard = null;  // Track which DON card is selected
        let selectedDonPlayer = null;
        
        // Right-click a DON card to remove 1 from active count
        document.addEventListener("contextmenu", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const donCard = e.target.closest(".don-card-img.selectable-don");
            if (!donCard) return;
            e.preventDefault();
            e.stopPropagation();
            const playerKey = donCard.getAttribute("data-player");
            const player = gameState[playerKey];
            if (!player || player.don < 1) return;
            player.don -= 1;
            window.updateDonDisplay?.();
            window.renderLeaders?.();
            window.renderCharacters?.();
            console.log("✓ DON removed via right-click, now:", player.don);
        }, true);

        // Click a DON card to select it
        document.addEventListener("click", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const donCard = e.target.closest(".don-card-img.selectable-don");
            if (!donCard) return;
            
            const playerKey = donCard.getAttribute("data-player");
            
            // Toggle selection
            if (selectedDonPlayer === playerKey && selectedDonCard === donCard) {
                // Deselect
                donCard.style.boxShadow = "";
                selectedDonCard = null;
                selectedDonPlayer = null;
                console.log("✓ DON deselected");
            } else {
                // Clear previous selection
                if (selectedDonCard) {
                    selectedDonCard.style.boxShadow = "";
                }
                
                // Select this DON
                donCard.style.boxShadow = "0 0 12px rgba(130, 190, 255, 0.95)";
                selectedDonCard = donCard;
                selectedDonPlayer = playerKey;
                console.log("✓ DON selected from", playerKey);
            }
        }, true);
        
        // Click a character/leader to attach selected DON
        document.addEventListener("click", (e) => {
            if (!selectedDonCard || !selectedDonPlayer) return;
            if (!e.target || typeof e.target.closest !== "function") return;
            
            const charSlot = e.target.closest(".character-slot");
            const leaderArea = e.target.closest(".leader-area");
            const stageArea = e.target.closest(".stage-area");
            
            if (!charSlot && !leaderArea && !stageArea) return;
            
            const player = gameState[selectedDonPlayer];
            if (!player) return;
            
            let targetCard = null;
            
            if (charSlot) {
                const slotIndex = parseInt(charSlot.getAttribute("data-slot"));
                targetCard = player.characters[slotIndex];
                if (targetCard) {
                    if (!targetCard.attachedDon) targetCard.attachedDon = 0;
                    targetCard.attachedDon++;
                    player.don--;
                    window.updateDonDisplay?.();
                    window.renderCharacters?.();
                    console.log("✓ Attached DON to character slot", slotIndex);
                }
            } else if (leaderArea) {
                targetCard = player.leader;
                if (targetCard) {
                    if (!targetCard.attachedDon) targetCard.attachedDon = 0;
                    targetCard.attachedDon++;
                    player.don--;
                    window.updateDonDisplay?.();
                    window.renderLeaders?.();
                    console.log("✓ Attached DON to leader");
                }
            } else if (stageArea) {
                targetCard = player.stage;
                if (targetCard) {
                    if (!targetCard.attachedDon) targetCard.attachedDon = 0;
                    targetCard.attachedDon++;
                    player.don--;
                    window.updateDonDisplay?.();
                    window.renderStages?.();
                    console.log("✓ Attached DON to stage card");
                }
            }
            
            // Deselect the DON
            selectedDonCard.style.boxShadow = "";
            selectedDonCard = null;
            selectedDonPlayer = null;
        }, true);
        
        // Click a life card to select it (blue outline, same as DON cards)
        let selectedLifeCard = null;

        document.addEventListener("click", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const lifeCard = e.target.closest(".life-card");

            // Clear previous selection
            if (selectedLifeCard && selectedLifeCard !== lifeCard) {
                selectedLifeCard.style.outline = "";
                selectedLifeCard.style.boxShadow = "";
                selectedLifeCard = null;
            }

            if (!lifeCard) return;

            // Toggle selection
            if (selectedLifeCard === lifeCard) {
                lifeCard.style.outline = "";
                lifeCard.style.boxShadow = "";
                selectedLifeCard = null;
                console.log("✓ Life card deselected");
            } else {
                lifeCard.style.outline = "2px solid rgba(79, 172, 254, 0.8)";
                lifeCard.style.boxShadow = "0 0 12px rgba(79, 172, 254, 0.95)";
                selectedLifeCard = lifeCard;
                console.log("✓ Life card selected");
            }
        }, true);

        // Clear life card selection on dragstart so outline doesn't linger
        document.addEventListener("dragstart", (e) => {
            if (selectedLifeCard) {
                selectedLifeCard.style.outline = "";
                selectedLifeCard.style.boxShadow = "";
                selectedLifeCard = null;
            }
        });

        // dragover - allow zones for regular cards and show life zone split
        document.addEventListener("dragover", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const zone = e.target.closest(".character-area, .stage-area, .trash-area, .hand, .don-area, .life-area, .deck-area");
            if (zone) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                
                // If hovering over life area or deck area, show top/bottom zones
                if (zone.classList.contains("life-area") || zone.classList.contains("deck-area")) {
                    const isLife = zone.classList.contains("life-area");
                    const zoneClass = isLife ? "life-drop-zone" : "deck-drop-zone";
                    const existingZones = document.querySelectorAll("." + zoneClass);
                    if (existingZones.length === 0) {
                        const rect = zone.getBoundingClientRect();
                        const midX = rect.left + rect.width / 2;
                        
                        // Top half zone
                        const topZone = document.createElement("div");
                        topZone.className = zoneClass + " " + (isLife ? "life-top-zone" : "deck-top-zone");
                        topZone.style.position = "fixed";
                        topZone.style.top = rect.top + "px";
                        topZone.style.left = rect.left + "px";
                        topZone.style.width = rect.width + "px";
                        topZone.style.height = (rect.height / 2) + "px";
                        topZone.style.border = "2px dashed rgba(255, 255, 0, 0.8)";
                        topZone.style.backgroundColor = "rgba(255, 255, 0, 0.1)";
                        topZone.style.pointerEvents = "none";
                        topZone.style.zIndex = "999";
                        topZone.textContent = "TOP";
                        topZone.style.display = "flex";
                        topZone.style.alignItems = "center";
                        topZone.style.justifyContent = "center";
                        topZone.style.color = "white";
                        topZone.style.fontSize = "14px";
                        topZone.style.fontWeight = "bold";
                        topZone.style.textShadow = "1px 1px 3px rgba(0, 0, 0, 0.8)";
                        
                        // Bottom half zone
                        const bottomZone = document.createElement("div");
                        bottomZone.className = zoneClass + " " + (isLife ? "life-bottom-zone" : "deck-bottom-zone");
                        bottomZone.style.position = "fixed";
                        bottomZone.style.top = (rect.top + rect.height / 2) + "px";
                        bottomZone.style.left = rect.left + "px";
                        bottomZone.style.width = rect.width + "px";
                        bottomZone.style.height = (rect.height / 2) + "px";
                        bottomZone.style.border = "2px dashed rgba(255, 100, 100, 0.8)";
                        bottomZone.style.backgroundColor = "rgba(255, 100, 100, 0.1)";
                        bottomZone.style.pointerEvents = "none";
                        bottomZone.style.zIndex = "999";
                        bottomZone.textContent = "BOTTOM";
                        bottomZone.style.display = "flex";
                        bottomZone.style.alignItems = "center";
                        bottomZone.style.justifyContent = "center";
                        bottomZone.style.color = "white";
                        bottomZone.style.fontSize = "12px";
                        bottomZone.style.fontWeight = "bold";
                        bottomZone.style.textShadow = "1px 1px 3px rgba(0, 0, 0, 0.8)";
                        
                        document.body.appendChild(topZone);
                        document.body.appendChild(bottomZone);
                    }
                }
            }
        }, false);
        
        // Global dragleave - do nothing, keep highlights until dragend
        document.addEventListener("dragleave", (e) => {
            // Don't clear highlights - they stay until dragend
        }, false);
        
        // UNIFIED drop handler for all zones
        document.addEventListener("drop", (e) => {
            const cardInstanceId = e.dataTransfer.getData("cardInstanceId");
            const playerKey = e.dataTransfer.getData("playerKey");
            const fromHand = e.dataTransfer.getData("fromHand");
            const fromDonArea = e.dataTransfer.getData("fromDonArea");
            const fromDeck = e.dataTransfer.getData("fromDeck");
            const fromLife = e.dataTransfer.getData("fromLife");
            const lifeIndex = parseInt(e.dataTransfer.getData("lifeIndex") || "-1");
            
            console.log("DROP fired:", {cardInstanceId, playerKey, fromHand, fromDonArea, fromDeck, fromLife});
            
            if (!cardInstanceId || !playerKey) {
                console.log("✗ No card data");
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            clearAllHighlights();
            
            // Route to appropriate handler based on source
            if (fromDonArea === "true") {
                // DON card drop - no longer handled here (using mouse-based system)
                console.log("DON card drop ignored - handled by mouse system");
            } else if (fromDeck === "true") {
                // Card from deck to board/hand/life
                handleDeckCardDrop(e, cardInstanceId, playerKey);
            } else if (fromLife === "true") {
                // Card from life to another zone
                handleLifeCardDrop(e, cardInstanceId, playerKey, lifeIndex);
            } else if (fromHand === "true") {
                // Card from hand to board
                handleHandCardDrop(e, cardInstanceId, playerKey);
            } else if (fromHand === "false") {
                // Card from board to another zone
                handleBoardCardDrop(e, cardInstanceId, playerKey);
            }
        }, false);
        
        // Handler for deck card drops
        const handleDeckCardDrop = (e, cardInstanceId, playerKey) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const player = gameState[playerKey];
            if (!player || player.deck.length === 0) {
                console.log("✗ Deck is empty or player not found");
                return;
            }
            
            // Find the card in deck (should be top card)
            const deckIndex = player.deck.findIndex(c => c.instanceId === cardInstanceId);
            if (deckIndex === -1) {
                console.log("✗ Card not found in deck");
                return;
            }
            
            const card = player.deck[deckIndex];
            
            // Check drop zone
            const lifeArea = e.target.closest(".life-area");
            const handArea = e.target.closest(".hand");
            const charArea = e.target.closest(".character-area");
            const stageArea = e.target.closest(".stage-area");
            const trashArea = e.target.closest(".trash-area");
            const deckArea = e.target.closest(".deck-area");
            
            // Remove from deck
            player.deck.splice(deckIndex, 1);
            console.log("✓ Removed from deck:", card.name);
            
            if (deckArea) {
                // Dropping back on deck - determine top or bottom
                const rect = deckArea.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isTop = e.clientY < midY;
                
                if (isTop) {
                    player.deck.push(card);  // Top of deck = end of array (what we draw from)
                    console.log("✓ Added to TOP of deck");
                } else {
                    player.deck.unshift(card);  // Bottom of deck = front of array
                    console.log("✓ Added to BOTTOM of deck");
                }
                
                window.renderDecks?.();
            } else if (lifeArea) {
                // Determine if top or bottom based on mouse Y position
                const rect = lifeArea.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isTop = e.clientY < midY;
                
                // Create life card object (always face-down)
                const lifeCard = {
                    ...card,
                    faceUp: false,
                    instanceId: card.instanceId
                };
                
                if (isTop) {
                    player.life.unshift(lifeCard);  // Top of life pile = front of array
                    console.log("✓ Added to TOP of life");
                } else {
                    player.life.push(lifeCard);  // Bottom of life pile = end of array
                    console.log("✓ Added to BOTTOM of life");
                }
                
                window.renderLifeCards?.();
                window.renderDecks?.();
            } else if (handArea) {
                player.hand.push(card);
                console.log("✓ Added to hand");
                window.renderHands?.();
                window.renderDecks?.();
            } else if (charArea) {
                if (!player.characters) player.characters = [];
                while (player.characters.length < 5) player.characters.push(null);
                const slotIndex = player.characters.findIndex(c => !c);
                if (slotIndex === -1) {
                    console.log("✗ No empty character slots");
                    player.deck.push(card);
                    window.renderDecks?.();
                    return;
                }
                player.characters[slotIndex] = card;
                console.log("✓ Added to character slot", slotIndex);
                window.renderCharacters?.();
                window.renderDecks?.();
            } else if (stageArea) {
                player.stage = card;
                console.log("✓ Added to stage");
                window.renderStages?.();
                window.renderDecks?.();
            } else if (trashArea) {
                if (!player.trash) player.trash = [];
                player.trash.push(card);
                console.log("✓ Added to trash");
                window.renderTrash?.();
                window.renderDecks?.();
            } else {
                // No valid zone, put card back
                player.deck.push(card);
                console.log("✗ No valid drop zone, card returned to deck");
                window.renderDecks?.();
            }
        };
        
        // Handler for life card drops
        const handleLifeCardDrop = (e, cardInstanceId, playerKey, lifeIndex) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const player = gameState[playerKey];
            if (!player || lifeIndex < 0 || !player.life[lifeIndex]) {
                console.log("✗ Life card not found");
                return;
            }
            
            const card = player.life[lifeIndex];
            console.log("✓ Dragging life card:", card.name || "Life Card");
            
            // Check drop zones
            const lifeArea = e.target.closest(".life-area");
            const handArea = e.target.closest(".hand");
            const charArea = e.target.closest(".character-area");
            const stageArea = e.target.closest(".stage-area");
            const trashArea = e.target.closest(".trash-area");
            const deckArea = e.target.closest(".deck-area");
            
            // Remove from life
            player.life.splice(lifeIndex, 1);
            console.log("✓ Removed from life at index", lifeIndex);
            
            if (lifeArea) {
                // Moving to another life area (self or opponent) or reordering
                const rect = lifeArea.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isTop = e.clientY < midY;
                
                if (isTop) {
                    player.life.unshift(card);  // Top of life pile = front of array
                    console.log("✓ Added to TOP of life");
                } else {
                    player.life.push(card);  // Bottom of life pile = end of array
                    console.log("✓ Added to BOTTOM of life");
                }
                
                window.renderLifeCards?.();
            } else if (handArea) {
                player.hand.push(card);
                console.log("✓ Added to hand");
                window.renderHands?.();
                window.renderLifeCards?.();
            } else if (charArea) {
                if (!player.characters) player.characters = [];
                while (player.characters.length < 5) player.characters.push(null);
                const slotIndex = player.characters.findIndex(c => !c);
                if (slotIndex === -1) {
                    console.log("✗ No empty character slots");
                    player.life.push(card);
                    window.renderLifeCards?.();
                    return;
                }
                player.characters[slotIndex] = card;
                console.log("✓ Added to character slot", slotIndex);
                window.renderCharacters?.();
                window.renderLifeCards?.();
            } else if (stageArea) {
                player.stage = card;
                console.log("✓ Added to stage");
                window.renderStages?.();
                window.renderLifeCards?.();
            } else if (trashArea) {
                if (!player.trash) player.trash = [];
                player.trash.push(card);
                console.log("✓ Added to trash");
                window.renderTrash?.();
                window.renderLifeCards?.();
            } else if (deckArea) {
                // Determine if top or bottom based on mouse Y position
                const rect = deckArea.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isTop = e.clientY < midY;
                
                if (isTop) {
                    player.deck.push(card);  // Top of deck = end of array (what we draw from)
                    console.log("✓ Added to TOP of deck");
                } else {
                    player.deck.unshift(card);  // Bottom of deck = front of array
                    console.log("✓ Added to BOTTOM of deck");
                }
                
                window.renderDecks?.();
                window.renderLifeCards?.();
            } else {
                // No valid zone, put card back
                player.life.push(card);
                console.log("✗ No valid drop zone, card returned to life");
                window.renderLifeCards?.();
            }
        };
        
        // Handler for DON card drops
        const handleDonCardDrop = (e, cardInstanceId, playerKey) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const player = gameState[playerKey];
            if (!player) return;
            
            // Initialize floating DON array if needed
            if (!player.floatingDon) player.floatingDon = [];
            
            // Check if dropping back on don-area
            const donArea = e.target.closest(".don-area");
            if (donArea) {
                console.log("✓ DON dropped back to don-area");
                // Put the DON back in the count
                player.don++;
                window.updateDonDisplay?.();
                return;
            }
            
            // DON is being placed as a floater on the board
            // Decrement don count (only if it's a new placement)
            if (player.don > 0) {
                player.don--;
                console.log("✓ Decremented DON count to", player.don);
                window.updateDonDisplay?.();
            }
            
            // Get board-relative coordinates
            const gameBoard = document.querySelector(".game-board");
            const boardRect = gameBoard ? gameBoard.getBoundingClientRect() : { left: 0, top: 0 };
            
            // Create a floating DON card object
            const floatingDon = {
                instanceId: "DON!!" + Math.random(),
                name: "DON!!",
                image: donImage || "/images/cards/don.png",
                state: "active",
                x: e.clientX - boardRect.left - 40,  // Board-relative, centered on cursor
                y: e.clientY - boardRect.top - 55
            };
            
            player.floatingDon.push(floatingDon);
            console.log("✓ Created floating DON at", floatingDon.x, floatingDon.y);
            
            // Render the floating DON cards
            window.renderFloatingDon?.();
        };
        
        // Handler for hand card drops to board
        const handleHandCardDrop = (e, cardInstanceId, playerKey) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            let zone = null;
            const charSlot = e.target.closest(".character-slot");
            if (charSlot) zone = charSlot.parentElement;
            
            if (!zone) {
                zone = e.target.closest(".character-area, .stage-area, .trash-area, .life-area, .deck-area");
            }
            
            if (!zone) {
                console.log("✗ No zone for hand card drop");
                return;
            }
            
            const player = gameState[playerKey];
            if (!player) return;
            
            // Find and remove from hand
            const cardIndex = player.hand.findIndex(c => c.instanceId === cardInstanceId);
            if (cardIndex === -1) {
                console.log("✗ Card not in hand");
                return;
            }
            const card = player.hand[cardIndex];
            player.hand.splice(cardIndex, 1);
            console.log("✓ Removed from hand:", card.name);
            
            // Add to target zone
            let needsHandRender = false;
            if (zone.classList.contains("character-area")) {
                if (!player.characters) player.characters = [];
                while (player.characters.length < 5) player.characters.push(null);
                
                const slotIndex = player.characters.findIndex(c => !c);
                if (slotIndex === -1) {
                    console.log("✗ No empty slots");
                    player.hand.push(card);
                    window.renderHands?.();
                    return;
                }
                player.characters[slotIndex] = card;
                console.log("✓ Added to character slot", slotIndex);
                window.renderCharacters?.();
                needsHandRender = true;
            } else if (zone.classList.contains("stage-area")) {
                player.stage = card;
                console.log("✓ Added to stage");
                window.renderStages?.();
                needsHandRender = true;
            } else if (zone.classList.contains("trash-area")) {
                if (!player.trash) player.trash = [];
                player.trash.push(card);
                console.log("✓ Added to trash");
                window.renderTrash?.();
                needsHandRender = true;
            } else if (zone.classList.contains("life-area")) {
                if (!player.life) player.life = [];
                
                // Determine if top or bottom based on mouse Y position
                const rect = zone.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isTop = e.clientY < midY;
                
                const lifeCard = {
                    ...card,
                    faceUp: false,
                    instanceId: card.instanceId
                };
                
                if (isTop) {
                    player.life.unshift(lifeCard);
                    console.log("✓ Added to TOP of life");
                } else {
                    player.life.push(lifeCard);
                    console.log("✓ Added to BOTTOM of life");
                }
                
                window.renderLifeCards?.();
                needsHandRender = true;
            } else if (zone.classList.contains("deck-area")) {
                // Determine if top or bottom based on mouse Y position
                const rect = zone.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isTop = e.clientY < midY;
                
                if (isTop) {
                    player.deck.push(card);  // Top of deck = end of array (what we draw from)
                    console.log("✓ Added to TOP of deck");
                } else {
                    player.deck.unshift(card);  // Bottom of deck = front of array
                    console.log("✓ Added to BOTTOM of deck");
                }
                
                window.renderDecks?.();
                needsHandRender = true;
            }
            
            if (needsHandRender) {
                console.log("Rendering hands after card move");
                window.renderHands?.();
            }
        };
        
        // Handler for board card drops
        const handleBoardCardDrop = (e, cardInstanceId, playerKey) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const handContainer = e.target.closest(".hand");
            if (handContainer) {
                // Card returning to hand
                const player = gameState[playerKey];
                if (!player) return;
                
                let card = null;
                
                // Check character slots
                for (let i = 0; i < player.characters.length; i++) {
                    if (player.characters[i]?.instanceId === cardInstanceId) {
                        card = player.characters[i];
                        player.characters[i] = null;
                        console.log("✓ Removed from character slot", i);
                        break;
                    }
                }
                
                // Check stage
                if (!card && player.stage?.instanceId === cardInstanceId) {
                    card = player.stage;
                    player.stage = null;
                    console.log("✓ Removed from stage");
                }
                
                // Check trash
                if (!card && player.trash) {
                    const idx = player.trash.findIndex(c => c.instanceId === cardInstanceId);
                    if (idx !== -1) {
                        card = player.trash[idx];
                        player.trash.splice(idx, 1);
                        console.log("✓ Removed from trash at index", idx);
                    }
                }
                
                if (!card) {
                    console.log("✗ Card not found in any zone");
                    return;
                }
                
                player.hand.push(card);
                console.log("✓ Added to hand, hand length:", player.hand.length);
                
                window.renderHands?.();
                window.renderCharacters?.();
                window.renderStages?.();
                window.renderTrash?.();
                console.log("✓ Card returned to hand - renders called");
                return;
            }
            
            // Card moving between board zones
            let zone = null;
            const charSlot = e.target.closest(".character-slot");
            if (charSlot) zone = charSlot.parentElement;
            
            if (!zone) {
                zone = e.target.closest(".character-area, .stage-area, .trash-area, .deck-area");
            }
            
            if (!zone) {
                console.log("✗ No zone for board card move");
                return;
            }
            
            const player = gameState[playerKey];
            if (!player) return;
            
            let card = null;
            let fromZoneType = null; // Track where card came from
            
            // Find card from board zones
            for (let i = 0; i < player.characters.length; i++) {
                if (player.characters[i]?.instanceId === cardInstanceId) {
                    card = player.characters[i];
                    player.characters[i] = null;
                    fromZoneType = "characters";
                    console.log("✓ Removed from character slot", i);
                    break;
                }
            }
            if (!card && player.stage?.instanceId === cardInstanceId) {
                card = player.stage;
                player.stage = null;
                fromZoneType = "stage";
                console.log("✓ Removed from stage");
            }
            if (!card && player.trash) {
                const idx = player.trash.findIndex(c => c.instanceId === cardInstanceId);
                if (idx !== -1) {
                    card = player.trash[idx];
                    player.trash.splice(idx, 1);
                    fromZoneType = "trash";
                    console.log("✓ Removed from trash");
                }
            }
            
            if (!card) {
                console.log("✗ Card not found");
                return;
            }
            
            // Add to target zone
            if (zone.classList.contains("character-area")) {
                if (!player.characters) player.characters = [];
                while (player.characters.length < 5) player.characters.push(null);
                
                const slotIndex = player.characters.findIndex(c => !c);
                if (slotIndex === -1) {
                    console.log("✗ No empty slots");
                    // Put card back where it came from - not implemented, just lose it
                    return;
                }
                player.characters[slotIndex] = card;
                console.log("✓ Added to character slot", slotIndex);
                window.renderCharacters?.();
                
                // Also render the old zone to clear it
                if (fromZoneType === "stage") window.renderStages?.();
                if (fromZoneType === "trash") window.renderTrash?.();
            } else if (zone.classList.contains("stage-area")) {
                player.stage = card;
                console.log("✓ Added to stage");
                window.renderStages?.();
                
                // Also render the old zone to clear it
                if (fromZoneType === "characters") window.renderCharacters?.();
                if (fromZoneType === "trash") window.renderTrash?.();
            } else if (zone.classList.contains("trash-area")) {
                if (!player.trash) player.trash = [];
                player.trash.push(card);
                console.log("✓ Added to trash");
                window.renderTrash?.();
                
                // Also render the old zone to clear it
                if (fromZoneType === "characters") window.renderCharacters?.();
                if (fromZoneType === "stage") window.renderStages?.();
            } else if (zone.classList.contains("deck-area")) {
                // Determine if top or bottom based on mouse Y position
                const rect = zone.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isTop = e.clientY < midY;
                
                if (isTop) {
                    player.deck.push(card);  // Top of deck = end of array (what we draw from)
                    console.log("✓ Added to TOP of deck");
                } else {
                    player.deck.unshift(card);  // Bottom of deck = front of array
                    console.log("✓ Added to BOTTOM of deck");
                }
                
                window.renderDecks?.();
                
                // Also render the old zone to clear it
                if (fromZoneType === "characters") window.renderCharacters?.();
                if (fromZoneType === "stage") window.renderStages?.();
                if (fromZoneType === "trash") window.renderTrash?.();
            }
        };

        // Double-tap to rest/untap cards (board cards and DON)
        document.addEventListener("dblclick", (e) => {
            // Allow resting DON cards
            const donCard = e.target.closest(".don-card-img");
            if (donCard && !donCard.classList.contains("selected-don")) {
                donCard.classList.toggle("rested-don");
                console.log("DON card rested toggled");
                return;
            }
            
            // Allow resting any board card (leader, character, etc)
            const boardCard = e.target.closest(".board-leader-card, .board-character-card, .character-card");
            if (boardCard) {
                boardCard.classList.toggle("board-card-rested");
                console.log("Card rested toggled");
            }
        });
        
        // Prevent text selection on hand cards without blocking drag
        document.addEventListener("selectstart", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const handCard = e.target.closest(".hand-card");
            if (handCard) {
                e.preventDefault();
            }
        });
    },

    adjustLife(amount) {
        this.state.life += amount;
        const display = document.getElementById("lifeDisplay");
        if (display) display.textContent = this.state.life;
    },

    promptLife() {
        const value = prompt("Enter counter value:", this.state.life);
        if (value !== null && !isNaN(value)) {
            this.state.life = parseInt(value, 10);
            const display = document.getElementById("lifeDisplay");
            if (display) display.textContent = this.state.life;
        }
    },

    nextTurn() {
        // Switch to the other player
        const nextPlayer = this.state.currentPlayer === "player1" ? gameState.player2 : gameState.player1;
        
        // Start the next player's turn (which gives them DON)
        window.startPlayerTurn?.(nextPlayer);
        
        // Update sidebar state
        this.state.currentPlayer = nextPlayer === gameState.player1 ? "player1" : "player2";
        const phase = document.getElementById("phaseDisplay");
        if (phase) {
            phase.textContent = this.state.currentPlayer === "player1" ? "Your Turn" : "Opponent's Turn";
        }
    },

    _cardCenter(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },

    _getArrowSvg() {
        let svg = document.getElementById("arrow-overlay-svg");
        if (!svg) {
            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.id = "arrow-overlay-svg";
            svg.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9000;";
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
            marker.id = "arrowhead";
            marker.setAttribute("markerWidth", "10");
            marker.setAttribute("markerHeight", "7");
            marker.setAttribute("refX", "9");
            marker.setAttribute("refY", "3.5");
            marker.setAttribute("orient", "auto");
            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.setAttribute("points", "0 0, 10 3.5, 0 7");
            poly.setAttribute("fill", "#ff3333");
            marker.appendChild(poly);
            defs.appendChild(marker);
            svg.appendChild(defs);
            document.body.appendChild(svg);
        }
        return svg;
    },

    toggleArrowMode() {
        this.state.arrowMode = !this.state.arrowMode;
        this.state.arrowFirst = null;
        const btn = document.getElementById("drawArrowTool");

        document.querySelectorAll(".arrow-selectable, .arrow-selected-first").forEach(el => {
            el.classList.remove("arrow-selectable", "arrow-selected-first");
        });

        if (this.state.arrowMode) {
            if (btn) { btn.textContent = "→ Click 2 cards…"; btn.style.background = "#4a90e2"; }
            document.querySelectorAll(".board-leader-card, .board-character-card, .board-stage-card").forEach(el => {
                el.classList.add("arrow-selectable");
            });
            this._arrowClickHandler = (e) => {
                const card = e.target.closest(".arrow-selectable, .arrow-selected-first");
                if (!card) return;
                e.stopPropagation();
                if (!this.state.arrowFirst) {
                    this.state.arrowFirst = card;
                    card.classList.add("arrow-selected-first");
                    if (btn) btn.textContent = "→ Click 2nd card…";
                } else {
                    if (card === this.state.arrowFirst) return;
                    const a = this._cardCenter(this.state.arrowFirst);
                    const b = this._cardCenter(card);
                    const svg = this._getArrowSvg();
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
                    line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
                    line.setAttribute("stroke", "#ff3333");
                    line.setAttribute("stroke-width", "3");
                    line.setAttribute("marker-end", "url(#arrowhead)");
                    line.classList.add("drawn-arrow");
                    svg.appendChild(line);
                    this.state.arrowFirst.classList.remove("arrow-selected-first");
                    this.state.arrowFirst = null;
                    if (btn) btn.textContent = "→ Click 2 cards…";
                }
            };
            document.addEventListener("click", this._arrowClickHandler, true);
        } else {
            if (btn) { btn.textContent = "→ Draw Arrow"; btn.style.background = ""; }
            if (this._arrowClickHandler) {
                document.removeEventListener("click", this._arrowClickHandler, true);
                this._arrowClickHandler = null;
            }
        }
    },

    resetArrows() {
        const svg = document.getElementById("arrow-overlay-svg");
        if (svg) svg.querySelectorAll(".drawn-arrow").forEach(l => l.remove());
        this.state.arrowFirst = null;
        document.querySelectorAll(".arrow-selected-first").forEach(el => el.classList.remove("arrow-selected-first"));
        if (this.state.arrowMode) {
            const btn = document.getElementById("drawArrowTool");
            if (btn) btn.textContent = "→ Click 2 cards…";
        }
    },

    restandAllCards() {
        // Restand all board cards (leaders, characters, etc)
        document.querySelectorAll(".board-card-rested").forEach(card => {
            card.classList.remove("board-card-rested");
        });
        
        // Detach all DON from cards
        [gameState.player1, gameState.player2].forEach(player => {
            // Leaders
            if (player.leader && player.leader.attachedDon) {
                player.don += player.leader.attachedDon;
                player.leader.attachedDon = 0;
            }
            
            // Characters
            if (player.characters) {
                player.characters.forEach(char => {
                    if (char && char.attachedDon) {
                        player.don += char.attachedDon;
                        char.attachedDon = 0;
                    }
                });
            }
            
            // Stage
            if (player.stage && player.stage.attachedDon) {
                player.don += player.stage.attachedDon;
                player.stage.attachedDon = 0;
            }
        });
        
        // Re-render everything
        window.updateDonDisplay?.();
        window.renderCharacters?.();
        window.renderLeaders?.();
        window.renderStages?.();
        
        console.log("All cards rested and DON detached");
    },

    toggleNoteMode() {
        this.state.noteMode = !this.state.noteMode;
        const btn = document.getElementById("addNoteTool");

        document.querySelectorAll(".note-selectable").forEach(el => el.classList.remove("note-selectable"));

        if (this.state.noteMode) {
            if (btn) { btn.textContent = "✎ Click a card"; btn.style.background = "#4a90e2"; }
            document.querySelectorAll(".board-leader-card, .board-character-card, .board-stage-card").forEach(el => {
                el.classList.add("note-selectable");
            });
            this._noteClickHandler = (e) => {
                const card = e.target.closest(".note-selectable");
                if (!card) return;
                e.stopPropagation();
                e.preventDefault();

                // Exit note mode
                this.state.noteMode = false;
                document.querySelectorAll(".note-selectable").forEach(el => el.classList.remove("note-selectable"));
                if (btn) { btn.textContent = "✎ Add Note"; btn.style.background = ""; }
                document.removeEventListener("click", this._noteClickHandler, true);
                this._noteClickHandler = null;

                // Remove any existing popup
                document.getElementById("note-popup")?.remove();

                const popup = document.createElement("div");
                popup.id = "note-popup";
                popup.style.cssText = "position:fixed;z-index:10100;background:rgba(20,20,20,0.97);border:1px solid #666;border-radius:6px;padding:12px 14px;box-shadow:0 4px 20px rgba(0,0,0,0.7);display:flex;flex-direction:column;gap:8px;min-width:220px;";
                const rect = card.getBoundingClientRect();
                const top = Math.min(rect.bottom + 8, window.innerHeight - 180);
                popup.style.top = top + "px";
                popup.style.left = Math.max(4, rect.left) + "px";

                const lbl = document.createElement("div");
                lbl.textContent = "Note text";
                lbl.style.cssText = "color:#aaa;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;";

                const input = document.createElement("input");
                input.type = "text";
                input.placeholder = "Enter note…";
                input.style.cssText = "background:#111;color:#fff;border:1px solid #555;border-radius:4px;padding:6px 8px;font-size:13px;width:100%;box-sizing:border-box;outline:none;";

                const colorRow = document.createElement("div");
                colorRow.style.cssText = "display:flex;align-items:center;gap:8px;";
                const colorLbl = document.createElement("label");
                colorLbl.textContent = "Text color:";
                colorLbl.style.cssText = "color:#aaa;font-size:12px;";
                const colorPick = document.createElement("input");
                colorPick.type = "color";
                colorPick.value = "#ffffff";
                colorPick.style.cssText = "width:34px;height:26px;border:none;background:none;cursor:pointer;padding:0;border-radius:3px;";
                colorRow.appendChild(colorLbl);
                colorRow.appendChild(colorPick);

                const btnRow = document.createElement("div");
                btnRow.style.cssText = "display:flex;gap:8px;";
                const okBtn = document.createElement("button");
                okBtn.textContent = "Add";
                okBtn.style.cssText = "flex:1;padding:6px;background:#4a90e2;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;";
                const cancelBtn = document.createElement("button");
                cancelBtn.textContent = "Cancel";
                cancelBtn.style.cssText = "flex:1;padding:6px;background:#444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;";
                btnRow.appendChild(okBtn);
                btnRow.appendChild(cancelBtn);

                popup.appendChild(lbl);
                popup.appendChild(input);
                popup.appendChild(colorRow);
                popup.appendChild(btnRow);
                document.body.appendChild(popup);
                setTimeout(() => input.focus(), 50);

                const applyNote = () => {
                    const text = input.value.trim();
                    popup.remove();
                    if (!text) return;
                    const color = colorPick.value;
                    const container = card.closest(".leader-area, .character-slot, .stage-area") || card.parentElement;
                    container.querySelectorAll(".card-note-overlay").forEach(n => n.remove());
                    const overlay = document.createElement("div");
                    overlay.className = "card-note-overlay";
                    overlay.textContent = text;
                    overlay.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;font-weight:800;padding:4px;pointer-events:none;z-index:50;word-break:break-word;line-height:1.3;text-shadow:1px 1px 4px rgba(0,0,0,1),-1px -1px 4px rgba(0,0,0,1),1px -1px 4px rgba(0,0,0,1),-1px 1px 4px rgba(0,0,0,1);";
                    overlay.style.color = color;
                    if (getComputedStyle(container).position === "static") container.style.position = "relative";
                    container.appendChild(overlay);
                };

                okBtn.onclick = applyNote;
                cancelBtn.onclick = () => popup.remove();
                input.addEventListener("keydown", ev => {
                    if (ev.key === "Enter") applyNote();
                    if (ev.key === "Escape") popup.remove();
                });
            };
            document.addEventListener("click", this._noteClickHandler, true);
        } else {
            if (btn) { btn.textContent = "✎ Add Note"; btn.style.background = ""; }
            if (this._noteClickHandler) {
                document.removeEventListener("click", this._noteClickHandler, true);
                this._noteClickHandler = null;
            }
        }
    },

    clearAllNotes() {
        this.state.notes = {};
        document.querySelectorAll(".card-note, .card-note-overlay").forEach(n => n.remove());
    }
};

// Initialize immediately and also on DOMContentLoaded as backup
function initManualPlay() {
    console.log("manualPlay init called");
    manualPlay.init();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initManualPlay);
} else {
    // DOM already loaded
    setTimeout(initManualPlay, 100);
}
