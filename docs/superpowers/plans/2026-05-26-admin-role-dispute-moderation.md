# Admin Role Dispute Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary mock dispute flow with a real admin role: only admins arbitrate disputes, and admins can remove违规商品.

**Architecture:** Add `users.role` as `user/admin`, expose role through auth responses and JWT, enforce admin-only routes on the backend, and add a focused frontend admin console. Keep buyer/seller dispute response on order detail, but remove all participant-side mock resolution UI and API.

**Tech Stack:** Node.js/Express/MySQL/Jest backend; Vue 3/Element Plus frontend; Docker Compose for local runtime.

---

### Task 1: Backend Role and Admin Permissions

**Files:**
- Modify: `backend/src/scripts/init-db.sql`
- Modify: `backend/src/config/ensureSchema.js`
- Modify: `backend/src/scripts/seed-data.sql`
- Modify: `backend/src/models/userModel.js`
- Modify: `backend/src/controllers/authController.js`
- Create: `backend/src/middlewares/adminMiddleware.js`
- Modify: `backend/src/controllers/disputesController.js`
- Modify: `backend/src/routes/disputes.js`
- Test: `backend/src/test/integration/api.test.js`

Steps:
- [ ] Add failing tests proving `role` is returned by auth/me, participant `/resolve` is forbidden, non-admin third-party `/resolve` is forbidden, admin `/resolve` succeeds, and `/simulate-resolution` no longer exists.
- [ ] Add `users.role ENUM('user','admin') DEFAULT 'user'` to init/runtime schema and seed admin account.
- [ ] Include `role` in user model, auth response, and JWT.
- [ ] Add `adminMiddleware` and require it for dispute resolution.
- [ ] Remove `simulateResolution` route/controller export.
- [ ] Run targeted dispute/admin tests and full backend lint/test.

### Task 2: Admin Product Moderation API

**Files:**
- Modify: `backend/src/models/productModel.js`
- Create: `backend/src/controllers/adminController.js`
- Create: `backend/src/routes/admin.js`
- Modify: `backend/src/app.js`
- Test: `backend/src/test/integration/api.test.js`

Steps:
- [ ] Add failing tests for `GET /api/admin/products`, non-admin rejection, and admin `DELETE /api/admin/products/:id` soft-removing another user's product.
- [ ] Add admin product list query that can include all non-removed products.
- [ ] Add admin routes guarded by `authMiddleware` + `adminMiddleware`.
- [ ] Return product/seller fields needed by the admin console.
- [ ] Run targeted admin tests and full backend lint/test.

### Task 3: Frontend Admin Console

**Files:**
- Modify: `frontend/src/api/index.js`
- Modify: `frontend/src/router/index.js`
- Modify: `frontend/src/components/AppHeader.vue`
- Modify: `frontend/src/views/OrderDetailView.vue`
- Create: `frontend/src/views/AdminView.vue`

Steps:
- [ ] Remove participant-side mock platform processing from order detail.
- [ ] Add admin API helpers for listing disputes/products, resolving disputes, and removing products.
- [ ] Add `/admin` route requiring auth and admin role check.
- [ ] Add admin-only header menu entry.
- [ ] Build `AdminView.vue` with dispute cards and product moderation table.
- [ ] Run frontend lint/build.

### Task 4: Runtime and Browser Verification

**Files:**
- No expected source changes.

Steps:
- [ ] Run `docker compose up -d --build mysql backend frontend`.
- [ ] Confirm mysql/backend/frontend are healthy.
- [ ] Browser E2E on `http://localhost`: admin login can resolve refund/release disputes; normal user cannot open admin console; admin can remove违规商品 and product disappears from public detail/list.
- [ ] Run mojibake scan.
