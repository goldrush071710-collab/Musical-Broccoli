import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getDatabase
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);

// Generate a fresh random uid every page load — never persisted anywhere.
// Each tab is always a completely independent player.
function randomUid() {
    return "guest_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const _sessionUser = { uid: randomUid() };

export function signInGuest() {
    return Promise.resolve(_sessionUser);
}

export function waitForUser() {
    return Promise.resolve(_sessionUser);
}
