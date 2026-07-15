// decks.js

const redLuffyStarterDeckText = `
4xST01-002
4xST01-003
4xST01-004
4xST01-005
4xST01-006
4xST01-007
4xST01-008
4xST01-009
4xST01-010
2xST01-011
2xST01-012
2xST01-013
2xST01-014
2xST01-015
2xST01-016
2xST01-017
`;

const availableDecks = [
    {
        id: "red-luffy-starter-deck",
        name: "Red Luffy Starter Deck (ST01)",
        leaderKey: "ST01-001",
        deckText: redLuffyStarterDeckText
    }
];

function getAvailableDecks() {
    return availableDecks;
}

function getDeckById(deckId) {
    return availableDecks.find(deck => deck.id === deckId) || availableDecks[0];
}

window.availableDecks = availableDecks;
window.getAvailableDecks = getAvailableDecks;
window.getDeckById = getDeckById;
