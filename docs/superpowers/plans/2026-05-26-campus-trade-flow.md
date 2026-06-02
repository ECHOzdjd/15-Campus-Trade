# Campus Trade Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete campus trade flow with pre-purchase seller chat, offline handoff orders, favorites, and non-placeholder pages.

**Architecture:** Reuse the existing Express REST structure. Add MySQL-backed conversation/message/favorite models and routes, use SSE for live messages, and build Vue pages on top of existing Element Plus styling and API wrapper.

**Tech Stack:** Node.js, Express, MySQL, Jest, Vue 3, Vite, Pinia, Element Plus, Playwright smoke testing.

---

## File Structure

- Modify `backend/src/scripts/init-db.sql`: add `conversations`, `messages`, `favorites` tables.
- Modify `backend/src/scripts/seed-data.sql`: add sample favorite and conversation data after seed users/products.
- Create `backend/src/models/conversationModel.js`: conversation/message database operations.
- Create `backend/src/models/favoriteModel.js`: favorite database operations.
- Create `backend/src/controllers/conversationsController.js`: conversation API handlers and SSE client handling.
- Create `backend/src/controllers/favoritesController.js`: favorite API handlers.
- Create `backend/src/routes/conversations.js`: conversation routes.
- Create `backend/src/routes/favorites.js`: favorite routes.
- Modify `backend/src/app.js`: register new routes.
- Create `backend/src/test/unit/conversationModel.test.js`: unit tests for conversation/message mapping.
- Create `backend/src/test/unit/favoriteModel.test.js`: unit tests for favorite mapping.
- Modify `backend/src/test/integration/api.test.js`: API coverage for conversations and favorites.
- Modify `frontend/src/api/index.js`: add conversation and favorite APIs.
- Modify `frontend/src/router/index.js`: add `/messages`, `/messages/:id`, `/favorites`.
- Modify `frontend/src/components/AppHeader.vue`: add messages/favorites menu entries and unread badge support.
- Modify `frontend/src/views/ProductDetailView.vue`: add contact seller/favorite actions and offline handoff copy.
- Replace `frontend/src/views/MyProductsView.vue`: functional page.
- Replace `frontend/src/views/EditProductView.vue`: functional edit page.
- Replace `frontend/src/views/OrderListView.vue`: functional order list.
- Replace `frontend/src/views/OrderDetailView.vue`: functional order detail with no delivery wording.
- Create `frontend/src/views/ConversationListView.vue`: list conversations.
- Create `frontend/src/views/ConversationDetailView.vue`: live message page.
- Create `frontend/src/views/FavoritesView.vue`: list favorite products.

## Tasks

### Task 1: Backend Conversation And Favorite Tests

- [ ] Write conversation model tests for find/create, detail normalization, message listing, and message creation.
- [ ] Write favorite model tests for list, check, add, and remove.
- [ ] Run tests to verify RED.

### Task 2: Backend Models, Tables, Routes

- [ ] Add `conversations`, `messages`, and `favorites` tables.
- [ ] Implement conversation model.
- [ ] Implement favorite model.
- [ ] Implement conversation and favorite controllers/routes.
- [ ] Register routes in `backend/src/app.js`.
- [ ] Run backend unit tests.

### Task 3: Frontend APIs And Routes

- [ ] Add conversation and favorite API clients.
- [ ] Add `/messages`, `/messages/:id`, and `/favorites` routes.
- [ ] Add header menu entries for messages and favorites.
- [ ] Run frontend lint.

### Task 4: Product, Message, Favorite Pages

- [ ] Add contact seller and favorite actions to product detail.
- [ ] Create conversation list page.
- [ ] Create conversation detail page with SSE.
- [ ] Create favorites page.
- [ ] Run frontend build.

### Task 5: My Products, Edit Product, Orders

- [ ] Replace my products placeholder.
- [ ] Replace edit product placeholder.
- [ ] Replace order list placeholder.
- [ ] Replace order detail placeholder with campus handoff copy.
- [ ] Run frontend lint/build.

### Task 6: Full Verification

- [ ] Run backend lint and tests.
- [ ] Run frontend lint and build.
- [ ] Run browser smoke test for login, contact seller, message, favorite, order, and non-placeholder pages.
- [ ] Report local status without pushing code.
