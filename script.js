/* =========================================
   CloudPlay - script.js (Part 1)
   Search + State + Steam API parsing
========================================= */

const API_URL = "/api/steam?q=";

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

// Details
const gameTitle = document.getElementById("gameTitle");
const gameHeader = document.getElementById("gameHeader");
const description = document.getElementById("description");
const genres = document.getElementById("genres");
const developer = document.getElementById("developer");
const publisher = document.getElementById("publisher");
const release = document.getElementById("release");

// Buttons
const playButton = document.getElementById("playButton");
const steamButton = document.getElementById("steamButton");

// ---------- SEARCH INPUT ----------
searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();

    if (query.length < 2) return;

    searchSteam(query);
});

// ---------- STEAM SEARCH ----------
async function searchSteam(query) {

    gameGrid.innerHTML = `<div class="loading">Searching Steam...</div>`;

    try {

        const res = await fetch(API_URL + encodeURIComponent(query));
        const html = await res.text();

        const games = parseSteamHTML(html);

        state.games = games;

        renderGames(games);

    } catch (err) {
        console.error(err);
        gameGrid.innerHTML = `<div class="loading">Failed to load Steam results</div>`;
    }
}

// ---------- PARSE STEAM HTML ----------
function parseSteamHTML(html) {

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const rows = doc.querySelectorAll(".match_search_row");

    let results = [];

    rows.forEach(row => {

        const title = row.querySelector(".match_name")?.innerText;
        const img = row.querySelector("img")?.src;
        const link = row.getAttribute("href");

        if (!title) return;

        results.push({
            title,
            img,
            link
        });

    });

    return results;
}

// ---------- RENDER GAMES ----------
function renderGames(games) {

    if (!games.length) {
        gameGrid.innerHTML = `<div class="loading">No games found</div>`;
        return;
    }

    gameGrid.innerHTML = "";

    games.forEach(game => {

        const card = document.createElement("div");
        card.className = "gameCard";

        card.innerHTML = `
            <img src="${game.img}" alt="">
            <div class="gameCardContent">
                <h3>${game.title}</h3>
                <span>Steam Game</span>
            </div>
        `;

        card.addEventListener("click", () => openGame(game));

        gameGrid.appendChild(card);

    });
}

// ---------- OPEN GAME ----------
async function openGame(game) {

    state.selectedGame = game;

    resultsSection.style.display = "none";
    landing.style.display = "none";
    detailsSection.classList.remove("hidden");

    gameTitle.textContent = game.title;
    steamButton.onclick = () => window.open(game.link, "_blank");

    // placeholder image
    gameHeader.src = game.img;

    description.textContent = "Loading game details...";

    loadGameDetails(game.title);
}
/* =========================================
   CloudPlay - script.js (Part 2)
   Game Details + Steam Store Data
========================================= */

// ---------- LOAD GAME DETAILS ----------
async function loadGameDetails(title) {

    try {

        // Steam store "search suggestions → appid trick"
        const appId = await findSteamAppId(title);

        if (!appId) {
            description.textContent = "No detailed data found.";
            return;
        }

        const data = await fetchSteamGameData(appId);

        renderGameDetails(data);

    } catch (err) {
        console.error(err);
        description.textContent = "Failed to load game details.";
    }
}

// ---------- FIND APP ID ----------
async function findSteamAppId(title) {

    try {

        const res = await fetch(`/api/steam?q=${encodeURIComponent(title)}`);
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const first = doc.querySelector(".match_search_row");

        if (!first) return null;

        const link = first.getAttribute("href");

        const match = link.match(/app\/(\d+)/);

        return match ? match[1] : null;

    } catch (e) {
        return null;
    }
}

// ---------- FETCH STEAM GAME DATA ----------
async function fetchSteamGameData(appId) {

    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
    const json = await res.json();

    return json[appId].data;
}

// ---------- RENDER DETAILS ----------
function renderGameDetails(data) {

    if (!data) return;

    // Title
    gameTitle.textContent = data.name;

    // Header image
    gameHeader.src = data.header_image;

    // Description
    description.innerHTML = data.short_description || "No description available.";

    // Developer / Publisher
    developer.textContent = data.developers?.[0] || "Unknown";
    publisher.textContent = data.publishers?.[0] || "Unknown";

    // Release date
    release.textContent = data.release_date?.date || "Unknown";

    // Genres
    genres.innerHTML = "";
    (data.genres || []).forEach(g => {
        const span = document.createElement("span");
        span.textContent = g.description;
        genres.appendChild(span);
    });

    // Screenshots
    renderScreenshots(data.screenshots || []);
}

// ---------- SCREENSHOTS ----------
function renderScreenshots(images) {

    const container = document.getElementById("screenshots");
    container.innerHTML = "";

    images.slice(0, 6).forEach(img => {

        const el = document.createElement("img");
        el.src = img.path_full;

        el.onclick = () => window.open(img.path_full, "_blank");

        container.appendChild(el);

    });
}
/* =========================================
   CloudPlay - script.js (Part 3)
   GitHub PCs + Play System + Cloud Launch
========================================= */

const GITHUB_URL =
"https://raw.githubusercontent.com/BoneLabModdingCommunity/PC/refs/heads/main/README.md";

const loadingOverlay = document.getElementById("loadingOverlay");
const playerSection = document.getElementById("playerSection");
const gameFrame = document.getElementById("gameFrame");
const closePlayer = document.getElementById("closePlayer");
const openExternal = document.getElementById("openExternal");
const iframeBlocked = document.getElementById("iframeBlocked");

// ---------- LOAD PCS FROM GITHUB ----------
async function loadPCs() {

    try {

        const res = await fetch(GITHUB_URL);
        const text = await res.text();

        state.pcs = parsePCLinks(text);

        console.log("PCs loaded:", state.pcs);

    } catch (err) {
        console.error("Failed to load PCs", err);
    }
}

// ---------- PARSE README ----------
function parsePCLinks(text) {

    const lines = text.split("\n");

    let pcs = [];

    for (let i = 0; i < lines.length; i++) {

        const line = lines[i].trim();

        // simple pattern: "Game Name - URL"
        if (line.includes("http")) {

            const parts = line.split("http");

            const name = parts[0].trim().replace(/[-–]/g, "").trim();
            const url = "http" + parts[1].trim();

            pcs.push({
                name: name.toLowerCase(),
                url
            });

        }
    }

    return pcs;
}

// ---------- FIND MATCHING PC ----------
function findPC(gameName) {

    if (!state.pcs.length) return null;

    const clean = gameName.toLowerCase();

    return state.pcs.find(pc =>
        clean.includes(pc.name) ||
        pc.name.includes(clean)
    );
}

// ---------- PLAY BUTTON ----------
playButton.addEventListener("click", async () => {

    if (!state.selectedGame) return;

    loadingOverlay.classList.remove("hidden");

    await loadPCs();

    const pc = findPC(state.selectedGame.title);

    setTimeout(() => {

        loadingOverlay.classList.add("hidden");

        if (!pc) {

            alert("No PC found for this game in GitHub README");
            return;

        }

        launchPC(pc.url);

    }, 1500);

});

// ---------- LAUNCH CLOUD PC ----------
function launchPC(url) {

    playerSection.classList.remove("hidden");

    gameFrame.src = url;

    openExternal.href = url;

    // iframe check fallback
    gameFrame.onload = () => {

        try {

            const test = gameFrame.contentWindow.location;

        } catch (e) {

            iframeBlocked.classList.remove("hidden");
            gameFrame.style.display = "none";

        }

    };

}

// ---------- CLOSE PLAYER ----------
closePlayer.addEventListener("click", () => {

    playerSection.classList.add("hidden");

    gameFrame.src = "";

});

// ---------- INIT ----------
window.addEventListener("load", () => {

    loadPCs();

});