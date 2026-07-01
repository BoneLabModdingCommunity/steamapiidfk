/* =========================================
   CloudPlay - FIXED FULL SCRIPT
   Steam Search + Game Details + Cloud PCs
========================================= */

const API_URL = "/api/steam?q=";

const GITHUB_URL =
"https://raw.githubusercontent.com/BoneLabModdingCommunity/PC/refs/heads/main/README.md";

// ---------- STATE ----------
let state = {
    games: [],
    selectedGame: null,
    pcs: []
};

// ---------- ELEMENTS ----------
const searchInput = document.getElementById("searchInput");
const gameGrid = document.getElementById("gameGrid");
const detailsSection = document.getElementById("detailsSection");
const resultsSection = document.getElementById("resultsSection");
const landing = document.getElementById("landing");

const gameTitle = document.getElementById("gameTitle");
const gameHeader = document.getElementById("gameHeader");
const description = document.getElementById("description");
const genres = document.getElementById("genres");
const developer = document.getElementById("developer");
const publisher = document.getElementById("publisher");
const release = document.getElementById("release");

const playButton = document.getElementById("playButton");
const steamButton = document.getElementById("steamButton");

const loadingOverlay = document.getElementById("loadingOverlay");
const playerSection = document.getElementById("playerSection");
const gameFrame = document.getElementById("gameFrame");
const closePlayer = document.getElementById("closePlayer");
const openExternal = document.getElementById("openExternal");
const iframeBlocked = document.getElementById("iframeBlocked");

// ============================
// INIT
// ============================

window.addEventListener("load", () => {
    loadPCs();
});

// ============================
// SEARCH (FIXED + DEBOUNCE)
// ============================

let searchTimeout;

searchInput.addEventListener("input", (e) => {

    const q = e.target.value.trim();

    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        if (q.length < 2) return;
        searchSteam(q);
    }, 300);
});

// ============================
// STEAM SEARCH (ROBUST)
// ============================

async function searchSteam(query) {

    gameGrid.innerHTML = `<div class="loading">Searching Steam...</div>`;

    try {

        const res = await fetch(API_URL + encodeURIComponent(query));
        const html = await res.text();

        const games = parseSteam(html);

        if (!games.length) {
            gameGrid.innerHTML = `<div class="loading">No results found</div>`;
            return;
        }

        state.games = games;
        renderGames(games);

    } catch (err) {
        console.error(err);
        gameGrid.innerHTML = `<div class="loading">Search failed</div>`;
    }
}

// ============================
// STEAM PARSER (FIXED)
// ============================

function parseSteam(html) {

    const doc = new DOMParser().parseFromString(html, "text/html");

    let results = [];

    const links = doc.querySelectorAll("a");

    links.forEach(a => {

        const href = a.getAttribute("href");
        if (!href || !href.includes("/app/")) return;

        const title =
            a.querySelector(".match_name")?.innerText ||
            a.textContent?.trim();

        const img = a.querySelector("img")?.src;

        if (!title) return;

        results.push({
            title: title.slice(0, 80),
            img: img || "https://cdn.cloudflare.steamstatic.com/steam/apps/0/header.jpg",
            link: href
        });

    });

    // remove duplicates
    const seen = new Set();
    return results.filter(g => {
        if (seen.has(g.link)) return false;
        seen.add(g.link);
        return true;
    }).slice(0, 20);
}

// ============================
// RENDER GAMES
// ============================

function renderGames(games) {

    gameGrid.innerHTML = "";

    games.forEach(game => {

        const card = document.createElement("div");
        card.className = "gameCard";

        card.innerHTML = `
            <img src="${game.img}">
            <div class="gameCardContent">
                <h3>${game.title}</h3>
                <span>Steam</span>
            </div>
        `;

        card.onclick = () => openGame(game);

        gameGrid.appendChild(card);
    });
}

// ============================
// OPEN GAME
// ============================

async function openGame(game) {

    state.selectedGame = game;

    landing.style.display = "none";
    resultsSection.style.display = "none";
    detailsSection.classList.remove("hidden");

    gameTitle.textContent = game.title;
    gameHeader.src = game.img;

    steamButton.onclick = () => window.open(game.link, "_blank");

    description.textContent = "Loading...";

    const data = await getSteamDetails(game.title);

    if (data) renderDetails(data);
}

// ============================
// STEAM DETAILS (SAFE API)
// ============================

async function getSteamDetails(title) {

    try {

        const game = state.games.find(g =>
            g.title.toLowerCase().includes(title.toLowerCase())
        );

        if (!game) return null;

        const id = game.link.match(/app\/(\d+)/)?.[1];

        if (!id) return null;

        const res = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${id}`
        );

        const json = await res.json();

        return json[id]?.data;

    } catch (e) {
        return null;
    }
}

// ============================
// RENDER DETAILS
// ============================

function renderDetails(data) {

    if (!data) return;

    gameTitle.textContent = data.name;
    gameHeader.src = data.header_image;
    description.innerHTML = data.short_description || "";

    developer.textContent = data.developers?.[0] || "Unknown";
    publisher.textContent = data.publishers?.[0] || "Unknown";
    release.textContent = data.release_date?.date || "Unknown";

    genres.innerHTML = "";

    (data.genres || []).forEach(g => {
        const el = document.createElement("span");
        el.textContent = g.description;
        genres.appendChild(el);
    });

    renderScreenshots(data.screenshots || []);
}

// ============================
// SCREENSHOTS
// ============================

function renderScreenshots(images) {

    const box = document.getElementById("screenshots");
    box.innerHTML = "";

    images.slice(0, 6).forEach(img => {

        const el = document.createElement("img");
        el.src = img.path_full;

        el.onclick = () => window.open(img.path_full, "_blank");

        box.appendChild(el);
    });
}

// ============================
// LOAD PCS
// ============================

async function loadPCs() {

    try {

        const res = await fetch(GITHUB_URL);
        const text = await res.text();

        state.pcs = parsePCs(text);

    } catch (e) {
        console.error("PC load failed", e);
    }
}

// ============================
// PARSE PCS
// ============================

function parsePCs(text) {

    const lines = text.split("\n");

    let pcs = [];

    lines.forEach(line => {

        if (!line.includes("http")) return;

        const parts = line.split("http");

        const name = parts[0].replace(/[-–]/g, "").trim();
        const url = "http" + parts[1].trim();

        pcs.push({
            name: name.toLowerCase(),
            url
        });
    });

    return pcs;
}

// ============================
// PLAY BUTTON
// ============================

playButton.onclick = async () => {

    if (!state.selectedGame) return;

    loadingOverlay.classList.remove("hidden");

    await loadPCs();

    const pc = state.pcs.find(p =>
        state.selectedGame.title.toLowerCase().includes(p.name)
    );

    setTimeout(() => {

        loadingOverlay.classList.add("hidden");

        if (!pc) {
            alert("No PC found for this game");
            return;
        }

        playerSection.classList.remove("hidden");
        gameFrame.src = pc.url;
        openExternal.href = pc.url;

    }, 1200);
};

// ============================
// CLOSE PLAYER
// ============================

closePlayer.onclick = () => {
    playerSection.classList.add("hidden");
    gameFrame.src = "";
};
