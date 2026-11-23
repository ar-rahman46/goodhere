
const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "..")));

// =====================================================
// DATABASE
// =====================================================

const DB_PATH = process.env.DB_PATH ||
    path.join(__dirname, "goodhere.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
// GOODHERE REPORTS TABLE
// Existing posts and database records remain untouched.
db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        details TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);
db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        details TEXT NOT NULL,
        category TEXT NOT NULL,
        post_type TEXT NOT NULL DEFAULT 'offer',
        area TEXT NOT NULL DEFAULT 'Not specified',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// Safely add columns to an existing database.
let columns = db.prepare("PRAGMA table_info(posts)").all();

if (!columns.some(column => column.name === "post_type")) {
    db.exec(`
        ALTER TABLE posts
        ADD COLUMN post_type TEXT NOT NULL DEFAULT 'offer'
    `);
    console.log("Database updated: post_type added.");
}

columns = db.prepare("PRAGMA table_info(posts)").all();

if (!columns.some(column => column.name === "area")) {
    db.exec(`
        ALTER TABLE posts
        ADD COLUMN area TEXT NOT NULL DEFAULT 'Not specified'
    `);
    console.log("Database updated: area added.");
}

// =====================================================
// UPDATE OLD CATEGORY NAMES
// =====================================================

db.prepare(`
    UPDATE posts
    SET category = 'Food & essentials'
    WHERE category = 'Food & water'
`).run();

db.prepare(`
    UPDATE posts
    SET category = 'Community & local updates'
    WHERE category = 'Good to know'
`).run();

db.prepare(`
    UPDATE posts
    SET category = 'Community & local updates'
    WHERE category = 'Getting around'
`).run();


// =====================================================
// DATABASE QUERIES
// =====================================================

const getAllPosts = db.prepare(`
    SELECT id, title, details, category, post_type, area, created_at
    FROM posts
    ORDER BY id DESC
`);

const getPostById = db.prepare(`
    SELECT id, title, details, category, post_type, area, created_at
    FROM posts
    WHERE id = ?
`);

const insertPost = db.prepare(`
    INSERT INTO posts (
        id, title, details, category, post_type, area
    )
    VALUES (?, ?, ?, ?, ?, ?)
`);

const countPosts = db.prepare(`
    SELECT COUNT(*) AS total FROM posts
`);

// =====================================================
// STARTER POSTS
// =====================================================

if (countPosts.get().total === 0) {
    const starterPosts = [
        {
            id: 1,
            title: "Free tea available",
            details: "Free tea available near the community area",
            category: "Food & water",
            post_type: "offer",
            area: "Indiranagar"
        },
        {
            id: 2,
            title: "Free drinking water",
            details: "Free drinking water available near the community area",
            category: "Food & water",
            post_type: "offer",
            area: "Indiranagar"
        },
        {
            id: 3,
            title: "Quiet study place",
            details: "A quiet place is available for studying and reading",
            category: "Good to know",
            post_type: "offer",
            area: "Indiranagar"
        },
        {
            id: 4,
            title: "Ride available",
            details: "A neighbour is offering a ride nearby",
            category: "Getting around",
            post_type: "offer",
            area: "Indiranagar"
        }
    ];

    const seedPosts = db.transaction(() => {
        for (const post of starterPosts) {
            insertPost.run(
                post.id,
                post.title,
                post.details,
                post.category,
                post.post_type,
                post.area
            );
        }
    });

    seedPosts();
    console.log("Starter community posts added.");
}

// =====================================================
// HELPERS
// =====================================================

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ");
}

const allowedAreas = [
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

function normalizeArea(value) {
    if (typeof value !== "string") return null;

    const cleaned = value.trim();

    if (!cleaned || cleaned.length > 60) return null;

    return allowedAreas.find(
        area => area.toLowerCase() === cleaned.toLowerCase()
    ) || null;
}

// =====================================================
// GET COMMUNITY POSTS
// Optional: /api/posts?area=Indiranagar
// =====================================================

app.get("/api/posts", (req, res) => {
    try {
        const area = req.query.area
            ? normalizeArea(req.query.area)
            : null;

        if (req.query.area && !area) {
            return res.status(400).json({
                error: "Please select a valid area."
            });
        }

        let posts;

        if (area) {
            posts = db.prepare(`
                SELECT id, title, details, category, post_type, area, created_at
                FROM posts
                WHERE LOWER(area) = LOWER(?)
                ORDER BY id DESC
            `).all(area);
        } else {
            posts = getAllPosts.all();
        }

        res.json(posts);

    } catch (error) {
        console.error("Get posts error:", error);

        res.status(500).json({
            error: "Could not load community posts."
        });
    }
});

// =====================================================
// CREATE A COMMUNITY POST
// =====================================================

app.post("/api/posts", (req, res) => {
    try {
        const {
            postType,
            title,
            details,
            category,
            area
        } = req.body || {};

        if (
            typeof postType !== "string" ||
            !["offer", "request"].includes(postType.toLowerCase())
        ) {
            return res.status(400).json({
                error: "Please select Offer or Request."
            });
        }

        if (
            typeof title !== "string" ||
            typeof details !== "string" ||
            typeof category !== "string" ||
            !title.trim() ||
            !details.trim() ||
            !category.trim()
        ) {
            return res.status(400).json({
                error: "Title, details and category are required."
            });
        }

        if (
            title.trim().length > 100 ||
            details.trim().length > 1000 ||
            category.trim().length > 60
        ) {
            return res.status(400).json({
                error: "Please shorten your post. Title: 100 characters, details: 1000 characters."
            });
        }

        const selectedArea = normalizeArea(area);

        if (!selectedArea) {
            return res.status(400).json({
                error: "Please select a valid community area."
            });
        }

        const newPost = {
            id: Date.now(),
            title: title.trim(),
            details: details.trim(),
            category: category.trim(),
            post_type: postType.toLowerCase(),
            area: selectedArea
        };

        insertPost.run(
            newPost.id,
            newPost.title,
            newPost.details,
            newPost.category,
            newPost.post_type,
            newPost.area
        );

        const savedPost = getPostById.get(newPost.id);

        res.status(201).json({
            message: "Community post created successfully.",
            post: savedPost
        });

    } catch (error) {
        console.error("Create post error:", error);

        res.status(500).json({
            error: "Could not create your post. Please try again."
        });
    }
});

// =====================================================
// GOODHERE SMART MATCHING
// =====================================================


function getMatchingKeywords(post) {
    const ignoredWords = new Set([
        "the", "and", "for", "with", "from", "that",
        "this", "have", "has", "any", "near", "nearby",
        "available", "looking", "want", "need", "some",
        "someone", "anyone", "please", "free", "give",
        "offering", "offer", "request", "help"
    ]);

    const words = normalizeText(
        `${post.title} ${post.details}`
    )
        .split(" ")
        .filter(word => word.length >= 3 && !ignoredWords.has(word));

    return [...new Set(words)];
}


function findPostMatches(postId) {
    const post = getPostById.get(postId);

    if (!post) {
        return null;
    }

    const oppositeType =
        post.post_type === "offer" ? "request" : "offer";

    const candidates = db.prepare(`
        SELECT id, title, details, category, post_type, area, created_at
        FROM posts
        WHERE id != ?
          AND LOWER(post_type) = LOWER(?)
          AND LOWER(TRIM(category)) = LOWER(TRIM(?))
          AND LOWER(TRIM(area)) = LOWER(TRIM(?))
        ORDER BY id DESC
    `).all(
        post.id,
        oppositeType,
        post.category,
        post.area
    );

    const originalKeywords = new Set(getMatchingKeywords(post));

    const matches = candidates.map(candidate => {
        const candidateKeywords = getMatchingKeywords(candidate);

        const commonKeywords = candidateKeywords.filter(
            word => originalKeywords.has(word)
        );

        return {
            ...candidate,
            matchScore: commonKeywords.length,
            matchReason: "Same category and area",
            matchingKeywords: [...new Set(commonKeywords)]
        };
    });

    matches.sort((a, b) =>
        b.matchScore - a.matchScore || b.id - a.id
    );

    return {
        post,
        total: matches.length,
        matches
    };
}

// =====================================================
// SMART MATCHING API
// Example: GET /api/matches/123456789
// =====================================================

app.get("/api/matches/:postId", (req, res) => {
    try {
        const postId = Number(req.params.postId);

        if (!Number.isSafeInteger(postId) || postId <= 0) {
            return res.status(400).json({
                error: "Please provide a valid post ID."
            });
        }

        const result = findPostMatches(postId);

        if (!result) {
            return res.status(404).json({
                error: "Post not found."
            });
        }

        res.json({
            message: result.total > 0
                ? "GoodHere found possible community matches."
                : "No matching posts found yet.",
            post: result.post,
            total: result.total,
            matches: result.matches
        });

    } catch (error) {
        console.error("Smart matching error:", error);

        res.status(500).json({
            error: "Could not find matching community posts."
        });
    }
});


// =====================================================
// SEARCH SYNONYMS
// =====================================================

const synonyms = {
    thirsty: ["water", "drink", "tea", "coffee", "juice"],
    beverage: ["water", "drink", "tea", "coffee"],
    beverages: ["water", "drink", "tea", "coffee"],
    hungry: ["food", "snack", "meal", "eat"],
    starving: ["food", "meal", "eat"],
    snack: ["snacks", "food", "eat"],
    snacks: ["snack", "food", "eat"],
    lunch: ["food", "meal", "eat"],
    breakfast: ["food", "meal", "eat"],
    dinner: ["food", "meal", "eat"],
    lift: ["ride", "transport"],
    taxi: ["ride", "transport"],
    cab: ["ride", "transport"],
    commute: ["ride", "transport"],
    travel: ["ride", "transport"],
    reading: ["study", "library", "quiet"],
    peaceful: ["quiet", "study"],
    library: ["study", "reading", "quiet"],
    assistance: ["help", "support"],
    neighbour: ["community", "help", "support"],
    neighbor: ["community", "help", "support"],
    clothes: ["clothing", "dress"],
    clothing: ["clothes", "dress"],
    books: ["book", "study", "reading"]
};

// =====================================================
// SEARCH POSTS
// =====================================================

function searchPosts(query) {
    const searchText = normalizeText(query);

    if (!searchText) return [];

    const words = searchText
        .split(/\s+/)
        .filter(word => word.length >= 2);

    if (words.length === 0) return [];

    const expandedWords = new Set(words);

    for (const word of words) {
        if (synonyms[word]) {
            synonyms[word].forEach(
                synonym => expandedWords.add(synonym)
            );
        }
    }

    const searchWords = [...expandedWords];

    return getAllPosts.all()
        .map(post => {
            const postText = normalizeText(
                `${post.title} ${post.details} ${post.category} ${post.area}`
            );

            let score = 0;

            for (const word of searchWords) {
                if (postText.includes(word)) {
                    score += words.includes(word) ? 3 : 1;
                }
            }

            return { post, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) =>
            b.score - a.score || b.post.id - a.post.id
        )
        .map(item => item.post);
}

// =====================================================
// SEARCH API
// =====================================================

app.get("/api/search-posts", (req, res) => {
    const query = String(req.query.q || "").trim();

    if (!query) {
        return res.json({ query: "", results: [] });
    }

    try {
        const results = searchPosts(query);

        res.json({
            query,
            total: results.length,
            results
        });

    } catch (error) {
        console.error("Search error:", error);

        res.status(500).json({
            error: "Could not search community posts."
        });
    }
});

// =====================================================
// GOODHERE COMMUNITY ASSISTANT
// =====================================================

app.post("/api/agent", (req, res) => {
    try {
        const { message } = req.body || {};

        if (
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                error: "Please enter a message."
            });
        }

        if (message.trim().length > 500) {
            return res.status(400).json({
                error: "Please keep your question under 500 characters."
            });
        }

        const userMessage = normalizeText(message);

        const howToShare =
            /\bhow can i\b.*\b(share|offer|give|post)\b/.test(userMessage) ||
            /\bhow do i\b.*\b(share|offer|give|post)\b/.test(userMessage) ||
            /\bhow to\b.*\b(share|offer|give|post)\b/.test(userMessage) ||
            /\bshare help with my neighbours\b/.test(userMessage) ||
            /\bshare help with my neighbors\b/.test(userMessage);

        if (howToShare) {
            return res.json({
                answer: "You can help your neighbours by creating a community post on GoodHere. Click Share Help, choose Offer or Request, enter a title and description, select a category and area, and submit your post. Please avoid sharing private information such as your exact home address.",
                results: [],
                intent: "how_to"
            });
        }

        let intent = "general";
        let searchQuery = userMessage;

        if (/\bstudy\b|\bstudying\b|\breading\b|\blibrary\b|\bread\b|\bquiet place\b/.test(userMessage)) {
            intent = "study";
            searchQuery = "study";
        } else if (/\bride\b|\blift\b|\btransport\b|\btravel\b|\bbus\b|\bmetro\b|\bcab\b|\btaxi\b|\bvehicle\b/.test(userMessage)) {
            intent = "transport";
            searchQuery = "ride";
        } else if (/\bfood\b|\beat\b|\beating\b|\bmeal\b|\blunch\b|\bbreakfast\b|\bdinner\b|\bhungry\b|\bstarving\b|\bsnack\b|\bsnacks\b/.test(userMessage)) {
            intent = "food";
            searchQuery = "food";
        } else if (/\bdrink\b|\bdrinks\b|\bthirsty\b|\bwater\b|\btea\b|\bcoffee\b|\bjuice\b|\bbeverage\b/.test(userMessage)) {
            intent = "drink";
            searchQuery = "drink";
        } else if (/\bhelp\b|\bsupport\b|\bassistance\b/.test(userMessage)) {
            intent = "help";
            searchQuery = "help";
        }

        const posts = getAllPosts.all();

        const patterns = {
            study: /\bstudy\b|\bstudying\b|\breading\b|\blibrary\b|\bquiet\b/i,
            transport: /\bride\b|\btransport\b|\bbus\b|\bmetro\b|\bcab\b|\btaxi\b|\blift\b|\bvehicle\b/i,
            food: /\bfood\b|\bmeal\b|\blunch\b|\bbreakfast\b|\bdinner\b|\beat\b|\btea\b|\bsnack\b|\bsnacks\b/i,
            drink: /\bdrink\b|\bwater\b|\btea\b|\bcoffee\b|\bjuice\b|\bbeverage\b/i,
            help: /\bhelp\b|\bsupport\b|\bassistance\b/i
        };

        let results = [];

        if (patterns[intent]) {
            const pattern = patterns[intent];

            results = posts.filter(post => {
                const postText =
                    `${post.title} ${post.details} ${post.category}`;

                return pattern.test(postText);
            });
        } else {
            results = searchPosts(searchQuery);
        }

        const uniqueResults = results.filter(
            (post, index, array) =>
                index === array.findIndex(
                    item => item.id === post.id
                )
        );

        if (uniqueResults.length === 0) {
            const suggestions = {
                study: "study places or libraries",
                transport: "rides or transportation",
                food: "food or snacks",
                drink: "drinks, tea, coffee or water",
                help: "community help or support",
                general: "food, drinks, transportation, study places or help"
            };

            return res.json({
                answer: `I couldn't find any community posts about ${suggestions[intent]} right now.\n\nYou can create a new post using the Share Help button.`,
                results: [],
                intent,
                searchQuery
            });
        }

        let answer = "GoodHere found these community updates:\n\n";

        uniqueResults.forEach((post, index) => {
            answer += `${index + 1}. ${post.title}\n`;
            answer += `   ${post.details}\n`;
            answer += `   Category: ${post.category}\n`;
            answer += `   Type: ${post.post_type.toUpperCase()}\n`;
            answer += `   Area: ${post.area}\n\n`;
        });

        answer += "These results come from current GoodHere community posts. Please verify availability with the person who posted.";

        return res.json({
            answer,
            results: uniqueResults,
            toolUsed: "search_community_posts",
            intent,
            searchQuery
        });

    } catch (error) {
        console.error("GoodHere Agent Error:", error);

        res.status(500).json({
            error: "GoodHere assistant could not respond."
        });
    }
});
// =====================================================
// REPORT A COMMUNITY POST
// =====================================================

app.post("/api/reports", (req, res) => {
    try {
        const { postId, reason, details = "" } = req.body || {};

        const validReasons = [
            "Spam",
            "False information",
            "Inappropriate content",
            "Safety concern",
            "Other"
        ];

        const id = Number(postId);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                error: "Invalid post."
            });
        }

        if (!validReasons.includes(reason)) {
            return res.status(400).json({
                error: "Please select a valid report reason."
            });
        }

        if (typeof details !== "string" || details.length > 500) {
            return res.status(400).json({
                error: "Report details must be under 500 characters."
            });
        }

        const postExists = db.prepare(
            "SELECT id FROM posts WHERE id = ?"
        ).get(id);

        if (!postExists) {
            return res.status(404).json({
                error: "Post not found."
            });
        }

        db.prepare(`
            INSERT INTO reports (post_id, reason, details)
            VALUES (?, ?, ?)
        `).run(id, reason, details.trim());

        res.status(201).json({
            message: "Thank you. Your report has been submitted."
        });

    } catch (error) {
        console.error("Report error:", error);

        res.status(500).json({
            error: "Could not submit your report."
        });
    }
});
// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
    res.json({
        message: "GoodHere backend is connected!",
        database: "SQLite",
        status: "healthy"
    });
});

// =====================================================
// INVALID JSON HANDLER
// =====================================================

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            error: "Invalid JSON request."
        });
    }

    console.error("Server error:", error);

    res.status(500).json({
        error: "Something went wrong on the server."
    });
});

// =====================================================
// START SERVER
// =====================================================

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`GoodHere server running on port ${PORT}`);
    console.log(`SQLite database connected: ${DB_PATH}`);
});

// =====================================================
// CLEAN SHUTDOWN
// =====================================================

function shutdown() {
    console.log("\nShutting down GoodHere server...");

    server.close(() => {
        db.close();
        console.log("Database connection closed.");
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
