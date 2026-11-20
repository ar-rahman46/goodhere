
// =====================================================
// GOODHERE — COMPLETE APP.JS
// Community Feed + Area Filter + Map + Search + Assistant
// + Saved Posts + Notifications + Reports + Guidelines
// =====================================================

let allPosts = [];
let currentCategory = "All";
let currentSearch = "";
let currentPostType = "All";
let currentArea = "All";

let goodHereMap = null;
let areaMarkers = null;

const GOODHERE_AREAS = [
  "Indiranagar",
  "HSR Layout",
  "Koramangala",
  "BTM Layout",
  "Whitefield",
  "Marathahalli",
  "Bellandur",
  "Electronic City",
  "Hebbal",
  "Nagawara",
  "Other"
];

const AREA_COORDINATES = {
  "Indiranagar": [12.9784, 77.6408],
  "HSR Layout": [12.9116, 77.6389],
  "Koramangala": [12.9352, 77.6245],
  "BTM Layout": [12.9166, 77.6101],
  "Whitefield": [12.9698, 77.7500],
  "Marathahalli": [12.9591, 77.6974],
  "Bellandur": [12.9250, 77.6760],
  "Electronic City": [12.8452, 77.6602],
  "Hebbal": [13.0358, 77.5970],
  "Nagawara": [13.0435, 77.6200]
};

// =====================================================
// START APPLICATION
// =====================================================

document.addEventListener("DOMContentLoaded", initializeGoodHere);

function initializeGoodHere() {
  setupAreaSelector();
  setupHomeAreaFilter();

  initializeMap();
  loadPosts();

  setInterval(loadPosts, 20000);

  setupSharePost();
  setupSearch();
  setupCategories();
  setupPostTypeFilters();
  setupLocationButton();
  setupFilterButton();
  setupSortButton();

  addAgentStyles();
  createAgentUI();
  setupCommunityTools();
  updateAreaLabels();
}

// =====================================================
// AREA SELECTOR IN SHARE FORM
// =====================================================

function setupAreaSelector() {
  const form = document.getElementById("postForm");

  if (!form) {
    console.error("Share form not found.");
    return;
  }

  if (document.getElementById("postArea")) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.id = "postAreaWrapper";

  const label = document.createElement("label");
  label.htmlFor = "postArea";
  label.textContent = "Choose your area";
  label.className = "field-label";

  const select = document.createElement("select");
  select.id = "postArea";
  select.name = "area";
  select.className = "form-input";
  select.required = true;

  select.innerHTML = `
    <option value="">Select your area</option>
    ${GOODHERE_AREAS.map(area => `
      <option value="${escapeHTML(area)}">
        ${escapeHTML(area)}
      </option>
    `).join("")}
  `;

  wrapper.appendChild(label);
  wrapper.appendChild(select);

  const privacyNote = form.querySelector(".privacy-note");

  if (privacyNote) {
    form.insertBefore(wrapper, privacyNote);
  } else {
    form.appendChild(wrapper);
  }
}

// =====================================================
// HOMEPAGE AREA FILTER
// =====================================================

function setupHomeAreaFilter() {
  const select = document.getElementById("homeAreaFilter");

  if (!select) {
    console.error("Homepage area filter not found.");
    return;
  }

  select.value = currentArea;

  select.addEventListener("change", () => {
    currentArea = select.value || "All";

    updateAreaLabels();
    renderPosts();
    updateMapMarkers();
    moveMapToSelectedArea();
  });
}

// =====================================================
// UPDATE AREA LABELS
// =====================================================

function updateAreaLabels() {
  const headerLabel = document.getElementById("currentAreaLabel");
  const description = document.getElementById("areaFilterDescription");
  const mapLabel = document.getElementById("mapAreaLabel");

  const areaText = currentArea === "All"
    ? "All areas"
    : currentArea;

  if (headerLabel) {
    headerLabel.textContent = `${areaText}, Bengaluru`;
  }

  if (description) {
    description.textContent = currentArea === "All"
      ? "Showing community updates from all areas."
      : `Showing community updates from ${currentArea}.`;
  }

  if (mapLabel) {
    mapLabel.textContent = areaText;
  }
}

// =====================================================
// MAP INITIALIZATION
// =====================================================

function initializeMap() {
  const mapElement = document.getElementById("goodHereMap");

  if (!mapElement || goodHereMap || !window.L) {
    return;
  }

  goodHereMap = L.map(mapElement).setView(
    [12.9784, 77.6408],
    11
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  ).addTo(goodHereMap);

  areaMarkers = L.layerGroup().addTo(goodHereMap);

  setTimeout(() => {
    if (goodHereMap) {
      goodHereMap.invalidateSize();
    }
  }, 300);
}

// =====================================================
// MOVE MAP TO SELECTED AREA
// =====================================================

function moveMapToSelectedArea() {
  if (!goodHereMap) return;

  if (currentArea === "All") {
    goodHereMap.setView([12.9784, 77.6408], 11);
    return;
  }

  const coordinates = AREA_COORDINATES[currentArea];

  if (coordinates) {
    goodHereMap.setView(coordinates, 13);
  }
}

// =====================================================
// UPDATE MAP MARKERS
// =====================================================

function updateMapMarkers() {
  if (!goodHereMap || !areaMarkers || !window.L) {
    return;
  }

  areaMarkers.clearLayers();

  const postsToMap = currentArea === "All"
    ? allPosts
    : allPosts.filter(post =>
      String(post.area || "").trim() === currentArea
    );

  const postsByArea = {};

  postsToMap.forEach(post => {
    const area = String(post.area || "").trim();

    if (!AREA_COORDINATES[area]) {
      return;
    }

    if (!postsByArea[area]) {
      postsByArea[area] = [];
    }

    postsByArea[area].push(post);
  });

  Object.keys(postsByArea).forEach(area => {
    const coordinates = AREA_COORDINATES[area];
    const posts = postsByArea[area];

    const marker = L.marker(coordinates);

    const popupContent = `
      <div style="min-width:200px;max-width:280px;">

        <h3 style="margin:0 0 10px;color:#285b43;">
          ${escapeHTML(area)}
        </h3>

        <p style="margin:0 0 10px;font-weight:600;">
          ${posts.length} community update${posts.length === 1 ? "" : "s"}
        </p>

        ${posts.map(post => `
          <div style="border-top:1px solid #e5e5e5;padding:9px 0;">

            <strong>
              ${escapeHTML(post.title || "Community update")}
            </strong>

            <p style="margin:5px 0;color:#555;">
              ${escapeHTML(post.details || "")}
            </p>

            <small style="color:#52715d;">
              ${escapeHTML(post.category || "")}
              ·
              ${String(post.post_type || "offer").toLowerCase() === "request"
        ? "Request"
        : "Offer"}
            </small>

          </div>
        `).join("")}

      </div>
    `;

    marker.bindPopup(popupContent).addTo(areaMarkers);
  });
}

// =====================================================
// LOAD POSTS FROM BACKEND
// =====================================================

async function loadPosts() {
  try {
    const response = await fetch("/api/posts");

    if (!response.ok) {
      throw new Error("Could not load community posts.");
    }

    const data = await response.json();

    allPosts = Array.isArray(data) ? data : [];

    checkForNewCommunityPosts(allPosts);
    renderPosts();
    updateMapMarkers();

  } catch (error) {
    console.error("Load posts error:", error);

    const feed = document.getElementById("feed");

    if (feed) {
      feed.innerHTML = `
        <div class="agent-response">
          Could not load community posts.
          <br><br>
          Please make sure the GoodHere server is running.
        </div>
      `;
    }
  }
}

// =====================================================
// RENDER AND FILTER POSTS
// =====================================================

function renderPosts() {
  const feed = document.getElementById("feed");

  if (!feed) return;

  let posts = [...allPosts];

  // AREA FILTER
  if (currentArea !== "All") {
    posts = posts.filter(post =>
      String(post.area || "").trim() === currentArea
    );
  }

  // CATEGORY FILTER
  if (currentCategory !== "All") {
    posts = posts.filter(post =>
      post.category === currentCategory
    );
  }

  // OFFER / REQUEST FILTER
  if (currentPostType !== "All") {
    posts = posts.filter(post =>
      String(post.post_type || "offer").toLowerCase() ===
      currentPostType.toLowerCase()
    );
  }

  // SEARCH FILTER
  if (currentSearch.trim()) {
    const words = currentSearch
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(word => word.length >= 2);

    posts = posts.filter(post => {
      const text = `
        ${post.title || ""}
        ${post.details || ""}
        ${post.category || ""}
        ${post.area || ""}
      `.toLowerCase();

      return words.some(word => text.includes(word));
    });
  }

  // EMPTY RESULT
  if (posts.length === 0) {
    feed.innerHTML = `
      <div class="agent-response">
        No matching community updates found.
        <br><br>
        Try another area, search term or filter.
      </div>
    `;

    return;
  }

  // DISPLAY POSTS
  feed.innerHTML = posts
    .map(post => createPostHTML(post))
    .join("");

  // CONNECT SAVE BUTTONS
  feed.querySelectorAll(".save-post-button").forEach(button => {
    button.addEventListener("click", () => {
      const postId = Number(button.dataset.postId);
      toggleSavedPost(postId);
    });
  });

  // CONNECT REPORT BUTTONS
  feed.querySelectorAll(".report-post-button").forEach(button => {
    button.addEventListener("click", () => {
      const postId = Number(button.dataset.postId);
      reportPost(postId);
    });
  });

  const updateTime = document.getElementById("updateTime");

  if (updateTime) {
    updateTime.textContent = "just now";
  }
}

// =====================================================
// FORMAT POST TIME
// =====================================================

function formatPostTime(createdAt) {
  if (!createdAt) return "Date unavailable";

  const postDate = new Date(
    String(createdAt).replace(" ", "T") + "Z"
  );

  if (Number.isNaN(postDate.getTime())) {
    return "Date unavailable";
  }

  const seconds = Math.floor(
    (Date.now() - postDate.getTime()) / 1000
  );

  if (seconds < 0) {
    return postDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  if (seconds < 60) return "Just now";

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min ago`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hours ago`;
  }

  if (seconds < 604800) {
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  return postDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

// =====================================================
// CREATE POST HTML — WITH SAVE AND REPORT BUTTONS
// =====================================================

function createPostHTML(post) {
  const icons = {
    "Food & water": "Food",
    "Getting around": "Ride",
    "A helping hand": "Help",
    "Good to know": "Info"
  };

  const icon = icons[post.category] || "GoodHere";

  const postType = String(
    post.post_type || "offer"
  ).toLowerCase();

  const isRequest = postType === "request";

  const typeLabel = isRequest ? "REQUEST" : "OFFER";
  const typeClass = isRequest ? "request" : "offer";

  const saved = isPostSaved(post.id);

  return `
    <article class="post-card ${typeClass}-card">

      <div class="post-icon">
        ${icon}
      </div>

      <div class="post-content">

        <span class="post-type ${typeClass}">
          ${typeLabel}
        </span>

        <h3>${escapeHTML(post.title || "")}</h3>

        <p>${escapeHTML(post.details || "")}</p>

        <span class="post-category">
          ${escapeHTML(post.category || "")}
        </span>

        <span class="post-area">
          Area: ${escapeHTML(post.area || "Not specified")}
        </span>

        <span class="post-time">
          ${formatPostTime(post.created_at)}
        </span>

        <div class="post-actions">

          <button
            type="button"
            class="save-post-button"
            data-post-id="${Number(post.id)}"
            aria-pressed="${saved}"
          >
            ${saved ? "★ Saved" : "☆ Save"}
          </button>

          <button
            type="button"
            class="report-post-button"
            data-post-id="${Number(post.id)}"
          >
            Report
          </button>

        </div>

      </div>

    </article>
  `;
}

// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =====================================================
// SHARE POST
// =====================================================

function setupSharePost() {
  const shareButton = document.getElementById("shareButton");
  const dialog = document.getElementById("postDialog");
  const form = document.getElementById("postForm");

  if (!shareButton || !dialog || !form) {
    console.error("Share post elements not found.");
    return;
  }

  // MATCH RESULTS POPUP
  function showMatchResults(result) {
    let matchDialog = document.getElementById("matchResultsDialog");

    if (!matchDialog) {
      matchDialog = document.createElement("dialog");
      matchDialog.id = "matchResultsDialog";
      matchDialog.className = "match-dialog";

      matchDialog.innerHTML = `
        <div class="match-dialog-content">
          <button type="button" class="match-close"
            aria-label="Close">&times;</button>
          <p class="match-eyebrow">GOODHERE SMART MATCHING</p>
          <h2 id="matchHeading"></h2>
          <p id="matchDescription"></p>
          <div id="matchResultsList"></div>
        </div>
      `;

      document.body.appendChild(matchDialog);

      matchDialog.querySelector(".match-close")
        .addEventListener("click", () => matchDialog.close());

      matchDialog.addEventListener("click", event => {
        if (event.target === matchDialog) {
          matchDialog.close();
        }
      });

      const style = document.createElement("style");

      style.textContent = `
        .match-dialog {
          width: min(560px, calc(100% - 28px));
          max-height: 85vh;
          padding: 0;
          border: 0;
          border-radius: 20px;
          background: #fffdf6;
          color: #203c32;
          box-shadow: 0 20px 60px rgba(0,0,0,.2);
        }

        .match-dialog::backdrop {
          background: rgba(20,35,25,.6);
        }

        .match-dialog-content {
          padding: 26px;
          overflow-y: auto;
        }

        .match-close {
          float: right;
          border: 0;
          background: #e7f0d8;
          color: #285b43;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          font-size: 23px;
          cursor: pointer;
        }

        .match-eyebrow {
          color: #52715d;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .match-dialog-content h2 {
          color: #285b43;
          margin: 12px 0;
        }

        .match-result-card {
          padding: 16px;
          margin-top: 14px;
          border: 1px solid #e0e8d7;
          border-radius: 14px;
          background: white;
        }

        .match-result-card h3 {
          margin: 8px 0;
          color: #285b43;
        }

        .match-result-card p {
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .match-result-type {
          font-size: 11px;
          font-weight: 700;
          color: #52715d;
        }
      `;

      document.head.appendChild(style);
    }

    const matches = Array.isArray(result.matches)
      ? result.matches
      : [];

    matchDialog.querySelector("#matchHeading").textContent =
      matches.length
        ? `We found ${matches.length} possible match${matches.length === 1 ? "" : "es"}!`
        : "No matches yet";

    matchDialog.querySelector("#matchDescription").textContent =
      matches.length
        ? "These community posts match your area and category. Matching is based on related words too."
        : "Your post is live. We'll keep looking as neighbours add new posts.";

    const resultsList = matchDialog.querySelector("#matchResultsList");

    resultsList.innerHTML = matches.map(match => `
      <article class="match-result-card">

        <span class="match-result-type">
          ${String(match.post_type).toLowerCase() === "request"
        ? "REQUEST"
        : "OFFER"}
        </span>

        <h3>${escapeHTML(match.title || "Community post")}</h3>

        <p>${escapeHTML(match.details || "")}</p>

        <small>
          ${escapeHTML(match.category || "")}
          ·
          ${escapeHTML(match.area || "")}
        </small>

      </article>
    `).join("");

    if (!matchDialog.open) {
      matchDialog.showModal();
    }
  }

  shareButton.addEventListener("click", () => {
    if (!dialog.open) {
      dialog.showModal();
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const postType = document.getElementById("postType")?.value;
    const title = document.getElementById("postTitle")?.value.trim();
    const details = document.getElementById("postDetails")?.value.trim();
    const category = document.getElementById("postCategory")?.value;
    const area = document.getElementById("postArea")?.value;

    if (!postType || !title || !details || !category || !area) {
      showNotice(
        "Missing information",
        "Please fill in all fields and select your area."
      );
      return;
    }

    const submitButton = document.getElementById("submitPost");

    if (!submitButton) {
      showNotice("Could not share", "Submit button not found.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sharing...";

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          postType,
          title,
          details,
          category,
          area
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not create post.");
      }

      currentSearch = "";
      currentCategory = "All";
      currentPostType = "All";

      const searchInput = document.getElementById("searchInput");

      if (searchInput) {
        searchInput.value = "";
      }

      document.querySelectorAll(".chip").forEach(chip => {
        chip.classList.remove("active");
      });

      document
        .querySelector('.chip[data-category="All"]')
        ?.classList.add("active");

      document.querySelectorAll(".post-type-filter").forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.postType === "All"
        );
      });

      form.reset();
      dialog.close();

      await loadPosts();

      if (!data.post?.id) {
        showNotice(
          "Shared successfully!",
          `Your post is live in ${area}. Matching could not be checked.`
        );
        return;
      }

      try {
        const matchResponse = await fetch(
          `/api/matches/${encodeURIComponent(data.post.id)}`
        );

        const matchData = await matchResponse.json().catch(() => ({}));

        if (!matchResponse.ok) {
          throw new Error(
            matchData.error || "Matching service unavailable."
          );
        }

        showMatchResults(matchData);

      } catch (matchError) {
        console.error("Smart matching error:", matchError);

        showNotice(
          "Shared successfully!",
          `Your post is saved for the ${area} community. Matching is temporarily unavailable.`
        );
      }

    } catch (error) {
      console.error("Create post error:", error);

      showNotice(
        "Could not share",
        error.message || "Please try again."
      );

    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML =
        'Share with neighbours <span>→</span>';
    }
  });
}

// =====================================================
// NOTICE DIALOG
// =====================================================

function showNotice(title, text) {
  const dialog = document.getElementById("noticeDialog");
  const titleElement = document.getElementById("noticeTitle");
  const textElement = document.getElementById("noticeText");

  if (!dialog || !titleElement || !textElement) {
    console.error("Notice dialog elements not found.");
    return;
  }

  titleElement.textContent = title;
  textElement.textContent = text;

  if (!dialog.open) {
    dialog.showModal();
  }
}

// =====================================================
// SEARCH
// =====================================================

function setupSearch() {
  const searchInput = document.getElementById("searchInput");

  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value;
    renderPosts();
  });

  document.addEventListener("keydown", event => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      searchInput.focus();
    }
  });
}

// =====================================================
// CATEGORY FILTER
// =====================================================

function setupCategories() {
  const chips = document.querySelectorAll(".chip");

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(item => {
        item.classList.remove("active");
      });

      chip.classList.add("active");

      currentCategory = chip.dataset.category || "All";

      renderPosts();
    });
  });
}

// =====================================================
// OFFER / REQUEST FILTERS
// =====================================================

function setupPostTypeFilters() {
  const feed = document.getElementById("feed");

  if (!feed || !feed.parentNode) return;

  if (document.getElementById("postTypeFilters")) return;

  const filterBar = document.createElement("div");

  filterBar.id = "postTypeFilters";
  filterBar.className = "post-type-filters";

  filterBar.innerHTML = `
    <button class="post-type-filter active"
      data-post-type="All" type="button">All</button>

    <button class="post-type-filter"
      data-post-type="offer" type="button">Offers</button>

    <button class="post-type-filter"
      data-post-type="request" type="button">Requests</button>
  `;

  feed.parentNode.insertBefore(filterBar, feed);

  filterBar.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      currentPostType = button.dataset.postType || "All";

      filterBar.querySelectorAll("button").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      renderPosts();
    });
  });
}

// =====================================================
// LOCATION BUTTON
// =====================================================

function setupLocationButton() {
  const button = document.getElementById("locationButton");

  if (!button) return;

  button.addEventListener("click", () => {
    const areaFilter = document.getElementById("homeAreaFilter");

    if (areaFilter) {
      areaFilter.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      setTimeout(() => {
        areaFilter.focus();
      }, 400);
    }
  });
}

// =====================================================
// FILTER BUTTON
// =====================================================

function setupFilterButton() {
  const button = document.getElementById("filterButton");

  if (!button) return;

  button.addEventListener("click", () => {
    showNotice(
      "Filters",
      "Use the All, Offers and Requests buttons to choose post types. You can also select a category and neighbourhood to find relevant community updates."
    );
  });
}

// =====================================================
// SORT BUTTON
// =====================================================

function setupSortButton() {
  const button = document.getElementById("sortButton");

  if (!button) return;

  button.addEventListener("click", () => {
    showNotice(
      "Community updates",
      "Posts are currently displayed with the newest updates first."
    );
  });
}

// =====================================================
// COMMUNITY ASSISTANT UI
// =====================================================

function createAgentUI() {
  if (document.getElementById("goodHereAgent")) return;

  const agent = document.createElement("section");
  agent.id = "goodHereAgent";

  agent.innerHTML = `
    <div class="agent-box">

      <div class="agent-header">

        <div class="agent-icon" aria-hidden="true">GH</div>

        <div>
          <h2>Ask GoodHere</h2>
          <p>Your community assistant</p>
        </div>

      </div>

      <div class="agent-body">

        <textarea
          id="agentInput"
          placeholder="Try: Where can I study? I'm hungry. Is there any ride available?"
          rows="3"
          maxlength="500"
          aria-label="Ask GoodHere a question"
        ></textarea>

        <button id="agentButton" type="button">
          Ask GoodHere
        </button>

        <div
          id="agentLoading"
          class="agent-loading"
          style="display: none;"
          aria-live="polite"
        >
          GoodHere is searching community posts...
        </div>

        <div
          id="agentResponse"
          class="agent-response"
          style="display: none;"
          aria-live="polite"
        ></div>

      </div>
    </div>
  `;

  const contentGrid = document.querySelector(".content-grid");

  if (contentGrid) {
    contentGrid.insertAdjacentElement("afterend", agent);
  } else {
    document.body.appendChild(agent);
  }

  document
    .getElementById("agentButton")
    .addEventListener("click", askGoodHereAgent);

  document
    .getElementById("agentInput")
    .addEventListener("keydown", event => {
      if (
        event.key === "Enter" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        askGoodHereAgent();
      }
    });
}

// =====================================================
// ASK GOODHERE ASSISTANT
// =====================================================

async function askGoodHereAgent() {
  const input = document.getElementById("agentInput");
  const button = document.getElementById("agentButton");
  const loading = document.getElementById("agentLoading");
  const responseBox = document.getElementById("agentResponse");

  if (!input || !button || !loading || !responseBox) return;

  const message = input.value.trim();

  if (!message) {
    responseBox.textContent = "Please ask GoodHere a question.";
    responseBox.style.display = "block";
    input.focus();
    return;
  }

  button.disabled = true;
  button.textContent = "Searching...";

  loading.style.display = "block";
  responseBox.style.display = "none";

  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.details ||
        "Community assistant request failed."
      );
    }

    responseBox.textContent =
      data.answer || "GoodHere could not find an answer.";

    responseBox.style.display = "block";

  } catch (error) {
    console.error("GoodHere Assistant Error:", error);

    responseBox.textContent =
      "Sorry, GoodHere could not connect to the community assistant. Please try again.";

    responseBox.style.display = "block";

  } finally {
    button.disabled = false;
    button.textContent = "Ask GoodHere";
    loading.style.display = "none";
  }
}

// =====================================================
// ALL DYNAMIC STYLES
// =====================================================

function addAgentStyles() {
  if (document.getElementById("goodHereAgentStyles")) return;

  const style = document.createElement("style");
  style.id = "goodHereAgentStyles";

  style.textContent = `

    .area-filter-panel {
      margin: 0 0 20px;
      padding: 17px;
      border: 1px solid #e4e9df;
      border-radius: 16px;
      background: #fffdf6;
    }

    .area-filter-panel label {
      display: block;
      margin-bottom: 9px;
      color: #365447;
      font-size: 13px;
      font-weight: 700;
    }

    .area-filter-panel select {
      max-width: 340px;
      cursor: pointer;
    }

    .area-filter-panel p {
      margin: 9px 0 0;
      color: #758075;
      font-size: 12px;
    }

    .post-type-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
    }

    .post-type-filter {
      border: 1px solid #dfe7d9;
      border-radius: 999px;
      padding: 10px 18px;
      background: #ffffff;
      color: #365447;
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .post-type-filter:hover {
      border-color: #285b43;
    }

    .post-type-filter.active {
      background: #285b43;
      color: #ffffff;
      border-color: #285b43;
    }

    .post-area {
      display: block;
      margin-top: 8px;
      color: #52715d;
      font-size: 13px;
      font-weight: 600;
    }

    /* SAVE AND REPORT BUTTONS */

    .post-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-top: 14px;
    }

    .save-post-button,
    .report-post-button {
      border: 1px solid #dfe7d9;
      border-radius: 999px;
      padding: 8px 14px;
      background: #ffffff;
      color: #365447;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .save-post-button:hover {
      background: #e7f0d8;
      border-color: #285b43;
    }

    .report-post-button:hover {
      background: #fff0ed;
      border-color: #c96b5d;
      color: #a43e32;
    }

    #goodHereAgent {
      width: 100%;
      max-width: 1100px;
      margin: 32px auto;
      padding: 0 20px;
      box-sizing: border-box;
      color: #203c32;
    }

    .agent-box {
      background: #fffdf6;
      border: 1px solid #e4e8d9;
      border-radius: 24px;
      padding: 30px;
      box-shadow: 0 12px 32px rgba(39, 67, 48, 0.07);
    }

    .agent-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .agent-icon {
      width: 58px;
      height: 58px;
      flex-shrink: 0;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e7f0d8;
      color: #285b43;
      font-size: 20px;
      font-weight: 700;
    }

    .agent-header h2 {
      margin: 0;
      font-size: 24px;
      color: #234b38;
    }

    .agent-header p {
      margin: 6px 0 0;
      color: #758075;
      font-size: 14px;
    }

    #agentInput {
      width: 100%;
      box-sizing: border-box;
      resize: vertical;
      min-height: 100px;
      border: 1px solid #dce3d5;
      border-radius: 16px;
      padding: 16px;
      background: #ffffff;
      color: #203c32;
      font-family: inherit;
      font-size: 16px;
      outline: none;
      margin-bottom: 14px;
    }

    #agentInput:focus {
      border-color: #4e805b;
      box-shadow: 0 0 0 4px rgba(78, 128, 91, 0.12);
    }

    #agentButton {
      border: none;
      border-radius: 14px;
      padding: 14px 22px;
      background: #285b43;
      color: #ffffff;
      cursor: pointer;
      font-family: inherit;
      font-size: 15px;
      font-weight: 600;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    #agentButton:hover {
      background: #1d4834;
      transform: translateY(-1px);
    }

    #agentButton:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .agent-loading {
      margin-top: 16px;
      color: #758075;
      font-size: 14px;
    }

    .agent-response {
      margin-top: 20px;
      padding: 20px;
      border-radius: 16px;
      background: #f1f5e9;
      border: 1px solid #e0e8d7;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      line-height: 1.75;
      font-size: 15px;
      color: #234b38;
    }

    @media (max-width: 600px) {
      #goodHereAgent {
        margin: 24px auto;
        padding: 0 12px;
      }

      .agent-box {
        padding: 20px;
        border-radius: 20px;
      }

      .agent-header {
        gap: 12px;
      }

      .agent-header h2 {
        font-size: 21px;
      }

      #agentButton {
        width: 100%;
      }

      .post-type-filters {
        gap: 8px;
      }

      .post-type-filter {
        padding: 9px 14px;
      }
    }
  `;

  document.head.appendChild(style);
}

// =====================================================
// GOODHERE COMMUNITY TOOLS
// Saved Posts + Notifications + Reports + Guidelines
// =====================================================

const GOODHERE_SAVED_KEY = "goodhere_saved_posts_v1";
const GOODHERE_NOTICES_KEY = "goodhere_notifications_v1";
const GOODHERE_SEEN_KEY = "goodhere_seen_posts_v1";

function readLocalData(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Could not save local data:", error);
  }
}

// =====================================================
// CHECK IF POST IS SAVED
// =====================================================

function isPostSaved(postId) {
  return readLocalData(GOODHERE_SAVED_KEY)
    .some(id => Number(id) === Number(postId));
}

// =====================================================
// SAVE / UNSAVE POST
// =====================================================

function toggleSavedPost(postId) {
  let saved = readLocalData(GOODHERE_SAVED_KEY);

  if (isPostSaved(postId)) {
    saved = saved.filter(id => Number(id) !== Number(postId));

    showNotice(
      "Post removed",
      "This post was removed from your saved list."
    );

  } else {
    saved.push(Number(postId));

    showNotice(
      "Post saved",
      "You can find this post in your saved posts."
    );
  }

  saveLocalData(GOODHERE_SAVED_KEY, saved);

  renderPosts();
}

// =====================================================
// CHECK FOR NEW COMMUNITY POSTS
// =====================================================

function checkForNewCommunityPosts(posts) {
  const currentIds = posts.map(post => Number(post.id));
  const previousIds = readLocalData(GOODHERE_SEEN_KEY);

  if (previousIds.length === 0) {
    saveLocalData(GOODHERE_SEEN_KEY, currentIds);
    return;
  }

  const newPosts = posts.filter(post =>
    !previousIds.includes(Number(post.id))
  );

  if (newPosts.length > 0) {
    let notices = readLocalData(GOODHERE_NOTICES_KEY);

    newPosts.forEach(post => {
      notices.unshift({
        id: Number(post.id),
        title: post.title,
        area: post.area,
        time: new Date().toLocaleString()
      });
    });

    saveLocalData(
      GOODHERE_NOTICES_KEY,
      notices.slice(0, 30)
    );

    showNotice(
      "New community update",
      `${newPosts.length} new post(s) appeared in GoodHere.`
    );
  }

  saveLocalData(GOODHERE_SEEN_KEY, currentIds);
}

// =====================================================
// COMMUNITY TOOL BUTTONS
// =====================================================

function setupCommunityTools() {
  const header = document.querySelector(".topbar");

  if (!header || document.getElementById("goodHereTools")) {
    return;
  }

  const tools = document.createElement("div");

  tools.id = "goodHereTools";
  tools.className = "goodhere-tools";

  tools.innerHTML = `
    <button type="button" id="savedPostsButton">
      ★ Saved
    </button>

    <button type="button" id="notificationsButton">
      ♧ Updates
    </button>

    <button type="button" id="guidelinesButton">
      Community rules
    </button>
  `;

  header.appendChild(tools);

  document.getElementById("savedPostsButton")
    .addEventListener("click", showSavedPosts);

  document.getElementById("notificationsButton")
    .addEventListener("click", showCommunityNotifications);

  document.getElementById("guidelinesButton")
    .addEventListener("click", showCommunityGuidelines);
}

// =====================================================
// SHOW SAVED POSTS
// =====================================================

function showSavedPosts() {
  const savedIds = readLocalData(GOODHERE_SAVED_KEY);

  const savedPosts = allPosts.filter(post =>
    savedIds.includes(Number(post.id))
  );

  if (savedPosts.length === 0) {
    showNotice(
      "Saved posts",
      "You haven't saved any posts yet."
    );
    return;
  }

  const titles = savedPosts.map((post, index) =>
    `${index + 1}. ${post.title} — ${post.area}`
  ).join("\n");

  alert("YOUR SAVED POSTS\n\n" + titles);
}

// =====================================================
// SHOW COMMUNITY NOTIFICATIONS
// =====================================================

function showCommunityNotifications() {
  const notices = readLocalData(GOODHERE_NOTICES_KEY);

  if (notices.length === 0) {
    showNotice(
      "Community updates",
      "No new posts have appeared since you started using this browser."
    );
    return;
  }

  const message = notices.map((notice, index) =>
    `${index + 1}. ${notice.title}\nArea: ${notice.area}\n${notice.time}`
  ).join("\n\n");

  alert("NEW COMMUNITY UPDATES\n\n" + message);
}

// =====================================================
// COMMUNITY GUIDELINES
// =====================================================

function showCommunityGuidelines() {
  showNotice(
    "GoodHere Community Guidelines",
    "1. Be respectful and helpful.\n\n" +
    "2. Share genuine offers and requests.\n\n" +
    "3. Do not post spam, scams or misleading information.\n\n" +
    "4. Never share passwords, financial information or private details.\n\n" +
    "5. Avoid sharing your exact home address or phone number publicly.\n\n" +
    "6. Verify offers with the person who posted before meeting or collecting anything.\n\n" +
    "7. Report suspicious or inappropriate posts.\n\n" +
    "GoodHere is a community platform, not an emergency service."
  );
}

// =====================================================
// REPORT A POST
// =====================================================

async function reportPost(postId) {
  const reason = prompt(
    "Why are you reporting this post?\n\n" +
    "1. Spam\n" +
    "2. False information\n" +
    "3. Inappropriate content\n" +
    "4. Safety concern\n" +
    "5. Other\n\n" +
    "Enter the reason exactly as shown."
  );

  if (!reason) return;

  const details = prompt("Additional details (optional):") || "";

  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        postId,
        reason: reason.trim(),
        details: details.trim()
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Report failed.");
    }

    showNotice(
      "Report submitted",
      result.message || "Thank you. Your report has been received."
    );

  } catch (error) {
    console.error("Report error:", error);

    showNotice(
      "Report error",
      error.message || "Could not submit your report."
    );
  }
}
