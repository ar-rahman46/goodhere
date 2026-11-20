# GoodHere — community help, nearby

GoodHere is a small web prototype for a bigger idea: help people nearby discover and share useful local updates, even when they speak different languages.

## Run the prototype

Open `index.html` in a current desktop or mobile browser. It uses plain HTML, CSS, and JavaScript, so there is no installation step. The map, location, and starting posts are sample data; updates you add are kept only in the open page and disappear when you refresh.

## What works in this prototype

- Search and category filtering for nearby posts.
- A map-style preview with clickable sample pins.
- Add a post and confirm that someone else's post is still available.
- Small-screen layout and keyboard shortcut `Ctrl+K` / `⌘K` for search.

## What it teaches about agents

An **AI agent** is a program that receives information, chooses a next step toward a goal, and can use tools. An **agentic workflow** gives an AI more room to plan several steps, check results, and adjust the plan. The words overlap in everyday use; the important question is what the system is allowed to decide and do.

This first version is **not an AI agent yet**. Its search and filters follow rules written in JavaScript. That is a useful foundation: a product needs working screens and clear data before AI adds value.

A possible GoodHere helper, added later, could:

1. Read a new help post.
2. Suggest a category and a short translation.
3. Check whether required details such as time and place are present.
4. Show its suggestions to a person, who reviews them before publishing.

At first, keep the AI in a **suggestion-only** role. Do not let it invent facts, expose someone's exact location, decide whether an emergency report is true, or contact anyone without the person's approval. A language model can suggest wording; ordinary application code should enforce privacy and permissions.

### A simple agent loop

`Observe → Decide → Use a tool → Check the result → Ask a person when needed`

For example, the app observes a post, the model suggests a category, the app checks that the category is allowed, and the user confirms the post. The model is not the whole app: the browser UI, server, database, and safety rules each have their own jobs.

## A practical learning path

1. **Web basics:** edit a card in `index.html`, its appearance in `styles.css`, and its behavior in `app.js`.
2. **JavaScript and data:** learn arrays, objects, events, filtering, and JSON. Add a small sample dataset and show useful empty states.
3. **Backend:** add a server and database so posts persist and multiple people can see changes. Add sign-in, moderation, and rate limits before public use.
4. **Realtime:** use a server-sent event or WebSocket connection to send new posts to open browser windows.
5. **AI feature:** call a language model from the server (never put a secret API key in browser JavaScript). Ask it for structured category and translation suggestions; validate the output and require a human review.
6. **Deploy and evaluate:** deploy a small demo, ask a few people to try it, record what confused them, and improve the flow. Test translation quality and harmful or misleading posts before expanding.

Build and understand one step at a time; don't add a multi-agent framework just to call the app agentic.

## Portfolio description you can adapt

> Designed and built GoodHere, a responsive community-help prototype with searchable local posts, category filters, confirmation actions, and a map-style discovery view. Planned a human-reviewed AI workflow for categorization and translation, with location privacy and verification safeguards.

Only describe features you have personally implemented and can explain. This prototype uses simulated location and local page state; it is not a deployed service and does not yet connect to AI, a database, or a real-time backend.

## Next small step

Change one sample post in `app.js`, refresh the page, and find it using search and a category. Then explain to a friend what the browser is doing. That is a strong first step toward being able to discuss the project in an interview.
