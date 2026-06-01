# Payment Chat AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete demo-grade campus trade flow with simulated escrow payment, buyer/seller handoff confirmation, dispute/refund handling, image chat messages, order system messages, and mock AI assistants.

**Architecture:** Keep the existing Express + MySQL + Vue architecture. Add small backend models/controllers for money, disputes, AI, and order expiration; extend the current conversation model instead of replacing chat. Frontend changes stay page-level and reuse the existing API wrapper, router, Element Plus components, image upload, and SSE flow.

**Tech Stack:** Node.js, Express, mysql2, Jest, Supertest, Vue 3, Vue Router, Pinia, Element Plus, Vite, Docker Compose, Playwright for browser smoke tests.

---

## Assumptions And Tradeoffs

- The payment flow uses simulated platform wallet balance. It does not connect to WeChat Pay, Alipay, Stripe, or banks because real payment requires merchant identity, callbacks, signature verification, settlement, refunds, and compliance work.
- Existing `products.status` stays `available | sold | removed`. A pending unpaid order locks the product by setting it to `sold`; cancellation, expiration, or refund restores `available`.
- Pending-payment expiration uses lazy cleanup triggered by API requests. This avoids adding cron/queue infrastructure and is enough for this course project.
- System messages are stored in the existing `messages` table with `type = 'system'` and `sender_id = NULL`.
- AI starts as rule-based mock service. External model integration can be added behind the same `aiService` interface later.
- No git commit is part of this plan. After each task, inspect `git status --short` and keep changes unstaged unless the user asks to commit.

## Scope Check

The work touches three subsystems:

- Payment and disputes: order states, wallet balance, escrow, refund/release.
- Chat: image messages, system messages, SSE delivery.
- AI: product draft, price suggestion, and risk check.

They share the same order/conversation workflow, so they should be implemented in one ordered plan. The payment task must land first because chat system messages and order-detail UI depend on the new states.

## File Structure

Backend files:

- Modify `backend/src/scripts/init-db.sql`: permanent schema for new statuses, wallet, escrow, disputes, and message types.
- Modify `backend/src/config/ensureSchema.js`: runtime schema guard for existing databases and Docker startup.
- Modify `backend/src/scripts/seed-data.sql`: seed wallet balances and sample transactions for demo users.
- Create `backend/src/models/paymentModel.js`: wallet, transaction, escrow, release, and refund data operations.
- Create `backend/src/models/disputeModel.js`: create/respond/resolve dispute records.
- Modify `backend/src/models/orderModel.js`: new status fields, handoff flags, payment expiration, and order mapping.
- Modify `backend/src/models/conversationModel.js`: message `type`, `metadata`, nullable system sender, and system message helpers.
- Create `backend/src/services/orderExpiryService.js`: cancel expired unpaid orders and restore products.
- Create `backend/src/services/conversationEvents.js`: shared SSE client registry used by conversation and order controllers.
- Create `backend/src/services/aiService.js`: mock AI product draft, price suggestion, and risk checks.
- Create `backend/src/controllers/walletController.js`: wallet read and demo recharge.
- Modify `backend/src/controllers/ordersController.js`: create pending-payment order, pay, confirm handoff, request release, cancel, and dispute entry points.
- Modify `backend/src/controllers/conversationsController.js`: support image/system messages and use shared SSE service.
- Create `backend/src/controllers/disputesController.js`: respond and resolve dispute.
- Create `backend/src/controllers/aiController.js`: expose mock AI APIs.
- Create `backend/src/routes/wallet.js`: wallet routes.
- Modify `backend/src/routes/orders.js`: payment, handoff, cancellation, and dispute routes.
- Modify `backend/src/routes/conversations.js`: unchanged paths, updated controller behavior.
- Create `backend/src/routes/disputes.js`: dispute response and resolution routes.
- Create `backend/src/routes/ai.js`: AI routes.
- Modify `backend/src/app.js`: register wallet, dispute, and AI routes.
- Modify `backend/src/test/integration/api.test.js`: end-to-end tests for payment, chat images, system messages, dispute, and AI.
- Create `backend/src/test/unit/paymentModel.test.js`: focused wallet/escrow unit behavior.

Frontend files:

- Modify `frontend/src/api/index.js`: add wallet, dispute, AI APIs; extend order and conversation methods.
- Modify `frontend/src/router/index.js`: add `/wallet`.
- Modify `frontend/src/components/AppHeader.vue`: add wallet entry and keep messages/orders reachable.
- Create `frontend/src/views/WalletView.vue`: balance, recharge, and transaction list.
- Modify `frontend/src/views/ProductDetailView.vue`: buying creates pending-payment order and routes to payment action.
- Modify `frontend/src/views/OrderDetailView.vue`: status timeline, payment button, handoff buttons, dispute/refund UI.
- Modify `frontend/src/views/OrderListView.vue`: new status text and filters.
- Modify `frontend/src/views/ConversationDetailView.vue`: image upload/send/preview, system message display, risk hint.
- Modify `frontend/src/views/PublishView.vue`: AI draft and price suggestion controls.

## Task 0: Baseline Verification

**Files:**
- Read only: project root, `backend/package.json`, `frontend/package.json`, `compose.yaml`

- [ ] **Step 0.1: Confirm workspace branch and dirty state**

Run:

```powershell
git status --short --branch
```

Expected:

```text
## develop-clean...origin/develop-clean
```

Also expect existing uncommitted files from the previous feature work. Do not revert them.

- [ ] **Step 0.2: Start database only for backend tests**

Run:

```powershell
docker compose up -d mysql
```

Expected: MySQL container is running and healthy.

- [ ] **Step 0.3: Run current backend tests once**

Run:

```powershell
cd backend
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3307'
$env:DB_USER='root'
$env:DB_PASSWORD='devpass'
$env:DB_NAME='campus_trade'
npm test
```

Expected: current test suite passes before feature changes.

## Task 1: Database Schema For Escrow, Disputes, And Message Types

**Files:**
- Modify: `backend/src/scripts/init-db.sql`
- Modify: `backend/src/config/ensureSchema.js`
- Modify: `backend/src/scripts/seed-data.sql`
- Test through: `backend/src/test/integration/api.test.js`

- [ ] **Step 1.1: Extend permanent schema**

In `backend/src/scripts/init-db.sql`, update the `orders` table and add the new tables. Use these column definitions:

```sql
status ENUM(
  'pending_payment',
  'paid_escrow',
  'meeting_confirmed',
  'completed',
  'cancelled',
  'disputed',
  'refunded'
) NOT NULL DEFAULT 'pending_payment',
payment_expires_at TIMESTAMP NULL,
buyer_handoff_confirmed TINYINT(1) NOT NULL DEFAULT 0,
seller_handoff_confirmed TINYINT(1) NOT NULL DEFAULT 0
```

Add this schema after `orders`:

```sql
CREATE TABLE IF NOT EXISTS wallets (
  id             INT            NOT NULL AUTO_INCREMENT,
  user_id        INT            NOT NULL,
  balance        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  frozen_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallets_user_id (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            INT            NOT NULL AUTO_INCREMENT,
  user_id       INT            NOT NULL,
  order_id      INT            NULL,
  type          ENUM('recharge', 'escrow_pay', 'escrow_release', 'refund', 'adjustment') NOT NULL,
  direction     ENUM('in', 'out') NOT NULL,
  amount        DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  note          VARCHAR(255)   NULL,
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wallet_transactions_user_id (user_id),
  KEY idx_wallet_transactions_order_id (order_id),
  CONSTRAINT fk_wallet_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_wallet_transactions_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_escrows (
  id          INT            NOT NULL AUTO_INCREMENT,
  order_id    INT            NOT NULL,
  buyer_id    INT            NOT NULL,
  seller_id   INT            NOT NULL,
  amount      DECIMAL(10, 2) NOT NULL,
  status      ENUM('held', 'released', 'refunded', 'disputed') NOT NULL DEFAULT 'held',
  paid_at     TIMESTAMP      NULL,
  released_at TIMESTAMP      NULL,
  refunded_at TIMESTAMP      NULL,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_escrows_order_id (order_id),
  KEY idx_payment_escrows_buyer_id (buyer_id),
  KEY idx_payment_escrows_seller_id (seller_id),
  CONSTRAINT fk_payment_escrows_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_escrows_buyer FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_escrows_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disputes (
  id              INT       NOT NULL AUTO_INCREMENT,
  order_id        INT       NOT NULL,
  opened_by       INT       NOT NULL,
  reason          TEXT      NOT NULL,
  response        TEXT      NULL,
  status          ENUM('open', 'responded', 'resolved_refund', 'resolved_release') NOT NULL DEFAULT 'open',
  resolution_note TEXT      NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at    TIMESTAMP NULL,
  resolved_at     TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_disputes_order_id (order_id),
  KEY idx_disputes_opened_by (opened_by),
  CONSTRAINT fk_disputes_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT,
  CONSTRAINT fk_disputes_opened_by FOREIGN KEY (opened_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Update `messages`:

```sql
sender_id INT NULL,
type ENUM('text', 'image', 'system') NOT NULL DEFAULT 'text',
metadata JSON NULL,
```

- [ ] **Step 1.2: Add runtime schema guard**

In `backend/src/config/ensureSchema.js`, add idempotent guards:

```js
async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )
  return rows[0].count > 0
}

async function ensureColumn(tableName, columnName, definition) {
  if (await columnExists(tableName, columnName)) return
  await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`)
}
```

Add the migration order for `orders.status` exactly in this order:

```js
await pool.query(`
  ALTER TABLE orders MODIFY status ENUM(
    'pending',
    'confirmed',
    'pending_payment',
    'paid_escrow',
    'meeting_confirmed',
    'completed',
    'cancelled',
    'disputed',
    'refunded'
  ) NOT NULL DEFAULT 'pending_payment'
`)

await pool.query(`
  UPDATE orders
  SET status = CASE status
    WHEN 'pending' THEN 'pending_payment'
    WHEN 'confirmed' THEN 'completed'
    ELSE status
  END
`)

await pool.query(`
  ALTER TABLE orders MODIFY status ENUM(
    'pending_payment',
    'paid_escrow',
    'meeting_confirmed',
    'completed',
    'cancelled',
    'disputed',
    'refunded'
  ) NOT NULL DEFAULT 'pending_payment'
`)
```

Add `CREATE TABLE IF NOT EXISTS` statements from Step 1.1 and `ensureColumn` calls for:

```js
await ensureColumn('orders', 'payment_expires_at', 'payment_expires_at TIMESTAMP NULL')
await ensureColumn('orders', 'buyer_handoff_confirmed', 'buyer_handoff_confirmed TINYINT(1) NOT NULL DEFAULT 0')
await ensureColumn('orders', 'seller_handoff_confirmed', 'seller_handoff_confirmed TINYINT(1) NOT NULL DEFAULT 0')
await ensureColumn('messages', 'type', "type ENUM('text', 'image', 'system') NOT NULL DEFAULT 'text'")
await ensureColumn('messages', 'metadata', 'metadata JSON NULL')
```

Change `messages.sender_id` to nullable:

```js
await pool.query('ALTER TABLE messages MODIFY sender_id INT NULL')
```

- [ ] **Step 1.3: Seed demo wallets**

In `backend/src/scripts/seed-data.sql`, add wallet rows after users are created:

```sql
INSERT IGNORE INTO wallets (user_id, balance, frozen_balance)
SELECT id, 1000.00, 0.00 FROM users WHERE email IN (
  'user1@campustrade.com',
  'user2@campustrade.com',
  'seller@campustrade.com'
);
```

- [ ] **Step 1.4: Verify schema boot**

Run:

```powershell
docker compose up -d --build mysql backend
Invoke-WebRequest http://localhost:3001/api/health
```

Expected:

```text
StatusCode        : 200
```

## Task 2: Payment Model And Order Expiration

**Files:**
- Create: `backend/src/models/paymentModel.js`
- Create: `backend/src/services/orderExpiryService.js`
- Modify: `backend/src/models/orderModel.js`
- Test: `backend/src/test/unit/paymentModel.test.js`

- [ ] **Step 2.1: Write payment model unit tests**

Create `backend/src/test/unit/paymentModel.test.js` with tests for balance checks and escrow transitions. Use mocked `db.query` calls so this remains fast:

```js
const paymentModel = require('../../models/paymentModel')

describe('paymentModel', () => {
  test('formatMoney normalizes decimal values', () => {
    expect(paymentModel.formatMoney('12.345')).toBe(12.35)
    expect(paymentModel.formatMoney(12)).toBe(12)
  })

  test('assertSufficientBalance throws when balance is too low', () => {
    expect(() => paymentModel.assertSufficientBalance(9.99, 10)).toThrow('INSUFFICIENT_BALANCE')
  })

  test('assertSufficientBalance allows exact balance', () => {
    expect(() => paymentModel.assertSufficientBalance(10, 10)).not.toThrow()
  })
})
```

- [ ] **Step 2.2: Run failing unit test**

Run:

```powershell
cd backend
npm test -- src/test/unit/paymentModel.test.js
```

Expected: fail because `backend/src/models/paymentModel.js` does not exist.

- [ ] **Step 2.3: Create payment model**

Create `backend/src/models/paymentModel.js` with these exported functions:

```js
const pool = require('../config/db')

function formatMoney(value) {
  return Math.round(Number(value) * 100) / 100
}

function assertSufficientBalance(balance, amount) {
  if (formatMoney(balance) < formatMoney(amount)) {
    throw new Error('INSUFFICIENT_BALANCE')
  }
}

async function ensureWallet(userId, connection = null) {
  const db = connection || pool
  await db.query('INSERT IGNORE INTO wallets (user_id, balance, frozen_balance) VALUES (?, 0.00, 0.00)', [userId])
}

async function findWalletForUpdate(userId, connection) {
  await ensureWallet(userId, connection)
  const [rows] = await connection.query('SELECT * FROM wallets WHERE user_id = ? FOR UPDATE', [userId])
  return rows[0]
}

async function getWallet(userId) {
  await ensureWallet(userId)
  const [walletRows] = await pool.query('SELECT user_id, balance, frozen_balance, updated_at FROM wallets WHERE user_id = ?', [userId])
  const [transactionRows] = await pool.query(
    `SELECT id, order_id, type, direction, amount, balance_after, note, created_at
     FROM wallet_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 30`,
    [userId]
  )
  return {
    balance: formatMoney(walletRows[0].balance),
    frozenBalance: formatMoney(walletRows[0].frozen_balance),
    transactions: transactionRows.map(row => ({
      id: row.id,
      orderId: row.order_id,
      type: row.type,
      direction: row.direction,
      amount: formatMoney(row.amount),
      balanceAfter: formatMoney(row.balance_after),
      note: row.note,
      createdAt: row.created_at
    }))
  }
}

async function addTransaction(connection, { userId, orderId = null, type, direction, amount, balanceAfter, note }) {
  await connection.query(
    `INSERT INTO wallet_transactions
      (user_id, order_id, type, direction, amount, balance_after, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, orderId, type, direction, formatMoney(amount), formatMoney(balanceAfter), note]
  )
}

async function recharge(userId, amount, connection = null) {
  const db = connection || pool
  const wallet = await findWalletForUpdate(userId, db)
  const newBalance = formatMoney(wallet.balance + amount)
  await db.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBalance, userId])
  await addTransaction(db, {
    userId,
    type: 'recharge',
    direction: 'in',
    amount,
    balanceAfter: newBalance,
    note: '模拟充值'
  })
  return getWallet(userId)
}

async function payToEscrow(connection, order) {
  const amount = formatMoney(order.product.price)
  const wallet = await findWalletForUpdate(order.buyer.id, connection)
  assertSufficientBalance(wallet.balance, amount)
  const newBuyerBalance = formatMoney(wallet.balance - amount)

  await connection.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBuyerBalance, order.buyer.id])
  await addTransaction(connection, {
    userId: order.buyer.id,
    orderId: order.id,
    type: 'escrow_pay',
    direction: 'out',
    amount,
    balanceAfter: newBuyerBalance,
    note: '支付到平台托管'
  })
  await connection.query(
    `INSERT INTO payment_escrows (order_id, buyer_id, seller_id, amount, status, paid_at)
     VALUES (?, ?, ?, ?, 'held', CURRENT_TIMESTAMP)`,
    [order.id, order.buyer.id, order.seller.id, amount]
  )
}

async function releaseEscrow(connection, order) {
  const [escrowRows] = await connection.query(
    "SELECT * FROM payment_escrows WHERE order_id = ? AND status IN ('held', 'disputed') FOR UPDATE",
    [order.id]
  )
  if (escrowRows.length === 0) throw new Error('ESCROW_NOT_FOUND')
  const escrow = escrowRows[0]
  const wallet = await findWalletForUpdate(order.seller.id, connection)
  const newSellerBalance = formatMoney(wallet.balance + escrow.amount)

  await connection.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newSellerBalance, order.seller.id])
  await addTransaction(connection, {
    userId: order.seller.id,
    orderId: order.id,
    type: 'escrow_release',
    direction: 'in',
    amount: escrow.amount,
    balanceAfter: newSellerBalance,
    note: '平台托管放款'
  })
  await connection.query(
    "UPDATE payment_escrows SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE order_id = ?",
    [order.id]
  )
}

async function refundEscrow(connection, order) {
  const [escrowRows] = await connection.query(
    "SELECT * FROM payment_escrows WHERE order_id = ? AND status IN ('held', 'disputed') FOR UPDATE",
    [order.id]
  )
  if (escrowRows.length === 0) throw new Error('ESCROW_NOT_FOUND')
  const escrow = escrowRows[0]
  const wallet = await findWalletForUpdate(order.buyer.id, connection)
  const newBuyerBalance = formatMoney(wallet.balance + escrow.amount)

  await connection.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBuyerBalance, order.buyer.id])
  await addTransaction(connection, {
    userId: order.buyer.id,
    orderId: order.id,
    type: 'refund',
    direction: 'in',
    amount: escrow.amount,
    balanceAfter: newBuyerBalance,
    note: '平台托管退款'
  })
  await connection.query(
    "UPDATE payment_escrows SET status = 'refunded', refunded_at = CURRENT_TIMESTAMP WHERE order_id = ?",
    [order.id]
  )
}

module.exports = {
  formatMoney,
  assertSufficientBalance,
  ensureWallet,
  getWallet,
  recharge,
  payToEscrow,
  releaseEscrow,
  refundEscrow
}
```

- [ ] **Step 2.4: Extend order model mapping**

In `backend/src/models/orderModel.js`:

```js
async function create(orderData, connection = null) {
  const { buyerId, sellerId, productId } = orderData
  const db = connection || pool

  const [result] = await db.query(
    `INSERT INTO orders
      (buyer_id, seller_id, product_id, status, payment_expires_at)
     VALUES (?, ?, ?, 'pending_payment', DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
    [buyerId, sellerId, productId]
  )

  return result.insertId
}
```

Update order selects to include:

```sql
o.payment_expires_at,
o.buyer_handoff_confirmed,
o.seller_handoff_confirmed,
escrow.amount as escrow_amount,
escrow.status as escrow_status,
escrow.paid_at as escrow_paid_at
```

Map those fields:

```js
paymentExpiresAt: row.payment_expires_at,
buyerHandoffConfirmed: Boolean(row.buyer_handoff_confirmed),
sellerHandoffConfirmed: Boolean(row.seller_handoff_confirmed),
escrow: row.escrow_amount ? {
  amount: parseFloat(row.escrow_amount),
  status: row.escrow_status,
  paidAt: row.escrow_paid_at
} : null,
```

Add helpers:

```js
async function markBuyerHandoffConfirmed(id, connection = null) {
  const db = connection || pool
  const [result] = await db.query('UPDATE orders SET buyer_handoff_confirmed = 1 WHERE id = ?', [id])
  return result.affectedRows > 0
}

async function markSellerHandoffConfirmed(id, connection = null) {
  const db = connection || pool
  const [result] = await db.query('UPDATE orders SET seller_handoff_confirmed = 1 WHERE id = ?', [id])
  return result.affectedRows > 0
}

async function findExpiredPendingPayments(connection = null) {
  const db = connection || pool
  const [rows] = await db.query(
    `SELECT id, product_id
     FROM orders
     WHERE status = 'pending_payment'
       AND payment_expires_at IS NOT NULL
       AND payment_expires_at < NOW()`
  )
  return rows
}
```

Export the new helpers.

- [ ] **Step 2.5: Add lazy expiration service**

Create `backend/src/services/orderExpiryService.js`:

```js
const pool = require('../config/db')
const orderModel = require('../models/orderModel')
const productModel = require('../models/productModel')
const conversationModel = require('../models/conversationModel')
const conversationEvents = require('./conversationEvents')

async function expirePendingPaymentOrders(connection = null) {
  const ownConnection = !connection
  const db = connection || await pool.getConnection()

  try {
    if (ownConnection) await db.beginTransaction()

    const expiredOrders = await orderModel.findExpiredPendingPayments(db)
    for (const order of expiredOrders) {
      await orderModel.updateStatus(order.id, 'cancelled', db)
      await productModel.updateStatus(order.product_id, 'available', db)
      const conversationId = await conversationModel.findConversationIdByOrderId(order.id, db)
      if (conversationId) {
        const messageId = await conversationModel.createMessage({
          conversationId,
          senderId: null,
          type: 'system',
          content: '订单超时未付款，商品已恢复在售。',
          metadata: null
        }, db)
        const message = await conversationModel.findMessageById(messageId)
        conversationEvents.notifyClients(conversationId, message)
      }
    }

    if (ownConnection) await db.commit()
    return expiredOrders.length
  } catch (error) {
    if (ownConnection) await db.rollback()
    throw error
  } finally {
    if (ownConnection) db.release()
  }
}

module.exports = {
  expirePendingPaymentOrders
}
```

- [ ] **Step 2.6: Run payment unit tests**

Run:

```powershell
cd backend
npm test -- src/test/unit/paymentModel.test.js
```

Expected: payment model unit tests pass.

## Task 3: Shared Conversation Events And Image/System Messages

**Files:**
- Create: `backend/src/services/conversationEvents.js`
- Modify: `backend/src/models/conversationModel.js`
- Modify: `backend/src/controllers/conversationsController.js`
- Test: `backend/src/test/integration/api.test.js`

- [ ] **Step 3.1: Move SSE registry to a service**

Create `backend/src/services/conversationEvents.js`:

```js
const clients = new Map()

function addClient(conversationId, res) {
  const key = String(conversationId)
  if (!clients.has(key)) {
    clients.set(key, new Set())
  }
  clients.get(key).add(res)
}

function removeClient(conversationId, res) {
  const key = String(conversationId)
  const set = clients.get(key)
  if (!set) return
  set.delete(res)
  if (set.size === 0) {
    clients.delete(key)
  }
}

function notifyClients(conversationId, payload) {
  const set = clients.get(String(conversationId))
  if (!set) return

  set.forEach((res) => {
    res.write('event: message\n')
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  })
}

module.exports = {
  addClient,
  removeClient,
  notifyClients
}
```

- [ ] **Step 3.2: Extend conversation model**

In `backend/src/models/conversationModel.js`, update `mapMessage`:

```js
function mapMessage(row) {
  const isSystem = row.type === 'system'
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type: row.type || 'text',
    content: normalizeText(row.content),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || null),
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
    sender: isSystem
      ? { id: null, username: '系统', avatar: null }
      : mapUser(row.sender_id, row.sender_username, row.sender_avatar)
  }
}
```

Update message queries to select `m.type, m.metadata`.

Replace `createMessage`:

```js
async function createMessage({ conversationId, senderId, content, type = 'text', metadata = null }, connection = null) {
  const db = connection || pool
  const lastMessage = type === 'image' ? '[图片]' : content

  const [result] = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content, type, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [conversationId, senderId, content, type, metadata ? JSON.stringify(metadata) : null]
  )

  await db.query(
    'UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
    [lastMessage, conversationId]
  )

  return result.insertId
}
```

Add:

```js
async function findConversationIdByOrderId(orderId, connection = null) {
  const db = connection || pool
  const [rows] = await db.query(
    `SELECT c.id
     FROM orders o
     INNER JOIN conversations c
       ON c.buyer_id = o.buyer_id
      AND c.seller_id = o.seller_id
      AND c.product_id = o.product_id
     WHERE o.id = ?
     LIMIT 1`,
    [orderId]
  )
  return rows[0] ? rows[0].id : null
}
```

- [ ] **Step 3.3: Update conversation controller validation**

In `backend/src/controllers/conversationsController.js`, import the shared event service and replace local client functions.

Use this message validation:

```js
const allowedTypes = new Set(['text', 'image'])

async function sendMessage(req, res, next) {
  try {
    const conversationId = parseInt(req.params.id)
    const type = req.body.type || 'text'
    const content = String(req.body.content || '').trim()
    const metadata = req.body.metadata || null

    if (!allowedTypes.has(type)) {
      return res.status(400).json({ code: 400, message: '消息类型不支持', data: null })
    }

    if (!content) {
      return res.status(400).json({ code: 400, message: '消息内容不能为空', data: null })
    }

    if (type === 'image' && !content.startsWith('/uploads/')) {
      return res.status(400).json({ code: 400, message: '图片消息必须来自上传接口', data: null })
    }

    const conversation = await conversationModel.findByIdForUser(conversationId, req.user.id)
    if (!conversation) {
      return res.status(404).json({ code: 404, message: '会话不存在', data: null })
    }

    const messageId = await conversationModel.createMessage({
      conversationId,
      senderId: req.user.id,
      type,
      content,
      metadata
    })
    const message = await conversationModel.findMessageById(messageId)

    conversationEvents.notifyClients(conversationId, message)
    res.status(201).json({ code: 201, message: 'success', data: message })
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Step 3.4: Add integration tests for image and system message shape**

Append to `backend/src/test/integration/api.test.js`:

```js
test('POST /api/conversations/:id/messages - should send image message', async () => {
  const response = await request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({
      type: 'image',
      content: '/uploads/test-chat-proof.png',
      metadata: { filename: 'test-chat-proof.png' }
    })

  expect(response.status).toBe(201)
  expect(response.body.data.type).toBe('image')
  expect(response.body.data.content).toBe('/uploads/test-chat-proof.png')
  expect(response.body.data.metadata.filename).toBe('test-chat-proof.png')
})
```

- [ ] **Step 3.5: Run conversation tests**

Run:

```powershell
cd backend
npm test -- src/test/integration/api.test.js
```

Expected: integration tests pass after code changes.

## Task 4: Payment And Dispute APIs

**Files:**
- Modify: `backend/src/controllers/ordersController.js`
- Create: `backend/src/models/disputeModel.js`
- Create: `backend/src/controllers/disputesController.js`
- Modify: `backend/src/routes/orders.js`
- Create: `backend/src/routes/disputes.js`
- Create: `backend/src/controllers/walletController.js`
- Create: `backend/src/routes/wallet.js`
- Modify: `backend/src/app.js`
- Test: `backend/src/test/integration/api.test.js`

- [ ] **Step 4.1: Create dispute model**

Create `backend/src/models/disputeModel.js`:

```js
const pool = require('../config/db')

async function create({ orderId, openedBy, reason }, connection = null) {
  const db = connection || pool
  const [result] = await db.query(
    'INSERT INTO disputes (order_id, opened_by, reason) VALUES (?, ?, ?)',
    [orderId, openedBy, reason]
  )
  return result.insertId
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM disputes WHERE id = ? LIMIT 1', [id])
  return rows[0] || null
}

async function findByOrderId(orderId) {
  const [rows] = await pool.query(
    'SELECT * FROM disputes WHERE order_id = ? ORDER BY created_at DESC, id DESC',
    [orderId]
  )
  return rows
}

async function respond(id, response, connection = null) {
  const db = connection || pool
  await db.query(
    "UPDATE disputes SET response = ?, status = 'responded', responded_at = CURRENT_TIMESTAMP WHERE id = ?",
    [response, id]
  )
}

async function resolve(id, status, resolutionNote, connection = null) {
  const db = connection || pool
  await db.query(
    'UPDATE disputes SET status = ?, resolution_note = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, resolutionNote, id]
  )
}

module.exports = {
  create,
  findById,
  findByOrderId,
  respond,
  resolve
}
```

- [ ] **Step 4.2: Add wallet controller and routes**

Create `backend/src/controllers/walletController.js`:

```js
const pool = require('../config/db')
const paymentModel = require('../models/paymentModel')

async function getWallet(req, res, next) {
  try {
    const wallet = await paymentModel.getWallet(req.user.id)
    res.json({ code: 200, message: 'success', data: wallet })
  } catch (error) {
    next(error)
  }
}

async function recharge(req, res, next) {
  const connection = await pool.getConnection()
  try {
    const amount = Number(req.body.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      return res.status(400).json({ code: 400, message: '充值金额必须在 0 到 10000 之间', data: null })
    }

    await connection.beginTransaction()
    await paymentModel.recharge(req.user.id, amount, connection)
    await connection.commit()

    const wallet = await paymentModel.getWallet(req.user.id)
    res.json({ code: 200, message: 'success', data: wallet })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

module.exports = {
  getWallet,
  recharge
}
```

Create `backend/src/routes/wallet.js`:

```js
const express = require('express')
const walletController = require('../controllers/walletController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/', authMiddleware, walletController.getWallet)
router.post('/recharge', authMiddleware, walletController.recharge)

module.exports = router
```

- [ ] **Step 4.3: Add payment actions to order controller**

In `backend/src/controllers/ordersController.js`, import:

```js
const paymentModel = require('../models/paymentModel')
const disputeModel = require('../models/disputeModel')
const conversationEvents = require('../services/conversationEvents')
const { expirePendingPaymentOrders } = require('../services/orderExpiryService')
```

Add helper:

```js
async function addOrderSystemMessage(connection, orderId, content) {
  const conversationId = await conversationModel.findConversationIdByOrderId(orderId, connection)
  if (!conversationId) return

  const messageId = await conversationModel.createMessage({
    conversationId,
    senderId: null,
    type: 'system',
    content,
    metadata: null
  }, connection)
  const message = await conversationModel.findMessageById(messageId)
  conversationEvents.notifyClients(conversationId, message)
}
```

Change create response behavior:

```js
await productModel.updateStatus(parseInt(productId), 'sold', connection)
await addOrderSystemMessage(connection, orderId, '买家已下单，请在 30 分钟内支付到平台托管。')
```

Add `pay`:

```js
async function pay(req, res, next) {
  const connection = await pool.getConnection()
  try {
    await expirePendingPaymentOrders(connection)
    const order = await orderModel.findById(parseInt(req.params.id))
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在', data: null })
    if (order.buyer.id !== req.user.id) return res.status(403).json({ code: 403, message: '无权支付此订单', data: null })
    if (order.status !== 'pending_payment') return res.status(400).json({ code: 400, message: '订单状态不允许支付', data: null })

    await connection.beginTransaction()
    await paymentModel.payToEscrow(connection, order)
    await orderModel.updateStatus(order.id, 'paid_escrow', connection)
    await addOrderSystemMessage(connection, order.id, '买家已付款到平台托管，双方可以约定校园面交。')
    await connection.commit()

    const updatedOrder = await orderModel.findById(order.id)
    res.json({ code: 200, message: 'success', data: updatedOrder })
  } catch (error) {
    await connection.rollback()
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ code: 400, message: '钱包余额不足，请先模拟充值', data: null })
    }
    next(error)
  } finally {
    connection.release()
  }
}
```

Add `confirmReceived` and `confirmHandoff` using the same finalization helper:

```js
async function completeIfBothConfirmed(connection, orderId) {
  const order = await orderModel.findById(orderId)
  if (!order.buyerHandoffConfirmed || !order.sellerHandoffConfirmed) {
    await orderModel.updateStatus(orderId, 'meeting_confirmed', connection)
    return
  }

  await paymentModel.releaseEscrow(connection, order)
  await orderModel.updateStatus(orderId, 'completed', connection)
  await addOrderSystemMessage(connection, orderId, '双方已确认面交，平台托管金额已放款给卖家。')
}
```

The buyer endpoint sets buyer flag; the seller endpoint sets seller flag. Both require `order.status` in `paid_escrow | meeting_confirmed`.

Add `createDispute`:

```js
async function createDispute(req, res, next) {
  const connection = await pool.getConnection()
  try {
    const order = await orderModel.findById(parseInt(req.params.id))
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在', data: null })
    if (order.buyer.id !== req.user.id && order.seller.id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权处理此订单', data: null })
    }

    const reason = String(req.body.reason || '').trim()
    if (reason.length < 5) {
      return res.status(400).json({ code: 400, message: '争议原因至少 5 个字', data: null })
    }

    await connection.beginTransaction()
    const disputeId = await disputeModel.create({ orderId: order.id, openedBy: req.user.id, reason }, connection)
    await orderModel.updateStatus(order.id, 'disputed', connection)
    await connection.query("UPDATE payment_escrows SET status = 'disputed' WHERE order_id = ? AND status = 'held'", [order.id])
    await addOrderSystemMessage(connection, order.id, '交易已进入争议处理，托管金额暂不放款。')
    await connection.commit()

    const dispute = await disputeModel.findById(disputeId)
    res.status(201).json({ code: 201, message: 'success', data: dispute })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}
```

- [ ] **Step 4.4: Add dispute resolve controller**

Create `backend/src/controllers/disputesController.js`:

```js
const pool = require('../config/db')
const disputeModel = require('../models/disputeModel')
const orderModel = require('../models/orderModel')
const productModel = require('../models/productModel')
const paymentModel = require('../models/paymentModel')

async function respond(req, res, next) {
  try {
    const dispute = await disputeModel.findById(parseInt(req.params.id))
    if (!dispute) return res.status(404).json({ code: 404, message: '争议不存在', data: null })
    const order = await orderModel.findById(dispute.order_id)
    if (order.buyer.id !== req.user.id && order.seller.id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权回应此争议', data: null })
    }

    const response = String(req.body.response || '').trim()
    if (response.length < 5) {
      return res.status(400).json({ code: 400, message: '回应内容至少 5 个字', data: null })
    }

    await disputeModel.respond(dispute.id, response)
    const updated = await disputeModel.findById(dispute.id)
    res.json({ code: 200, message: 'success', data: updated })
  } catch (error) {
    next(error)
  }
}

async function resolve(req, res, next) {
  const connection = await pool.getConnection()
  try {
    const dispute = await disputeModel.findById(parseInt(req.params.id))
    if (!dispute) return res.status(404).json({ code: 404, message: '争议不存在', data: null })
    const order = await orderModel.findById(dispute.order_id)
    if (order.buyer.id !== req.user.id && order.seller.id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权处理此争议', data: null })
    }

    const result = req.body.result
    const resolutionNote = String(req.body.resolutionNote || '').trim() || '模拟仲裁处理'

    await connection.beginTransaction()
    if (result === 'refund') {
      await paymentModel.refundEscrow(connection, order)
      await orderModel.updateStatus(order.id, 'refunded', connection)
      await productModel.updateStatus(order.product.id, 'available', connection)
      await disputeModel.resolve(dispute.id, 'resolved_refund', resolutionNote, connection)
    } else if (result === 'release') {
      await paymentModel.releaseEscrow(connection, order)
      await orderModel.updateStatus(order.id, 'completed', connection)
      await disputeModel.resolve(dispute.id, 'resolved_release', resolutionNote, connection)
    } else {
      return res.status(400).json({ code: 400, message: '处理结果只能是 refund 或 release', data: null })
    }
    await connection.commit()

    const updated = await disputeModel.findById(dispute.id)
    res.json({ code: 200, message: 'success', data: updated })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

module.exports = {
  respond,
  resolve
}
```

- [ ] **Step 4.5: Wire routes**

In `backend/src/routes/orders.js` add:

```js
router.post('/:id/pay', authMiddleware, ordersController.pay)
router.post('/:id/confirm-received', authMiddleware, ordersController.confirmReceived)
router.post('/:id/confirm-handoff', authMiddleware, ordersController.confirmHandoff)
router.post('/:id/request-release', authMiddleware, ordersController.createDispute)
router.post('/:id/disputes', authMiddleware, ordersController.createDispute)
```

Create `backend/src/routes/disputes.js`:

```js
const express = require('express')
const disputesController = require('../controllers/disputesController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/:id/respond', authMiddleware, disputesController.respond)
router.post('/:id/resolve', authMiddleware, disputesController.resolve)

module.exports = router
```

In `backend/src/app.js` register:

```js
const walletRoutes = require('./routes/wallet')
const disputeRoutes = require('./routes/disputes')

app.use('/api/wallet', walletRoutes)
app.use('/api/disputes', disputeRoutes)
```

- [ ] **Step 4.6: Add integration tests**

Append tests that cover:

```js
test('escrow payment flow should move buyer balance into escrow and release to seller after both confirmations', async () => {
  const seller = await registerUser('pay-seller')
  const buyer = await registerUser('pay-buyer')
  await request(app).post('/api/wallet/recharge').set('Authorization', `Bearer ${buyer.token}`).send({ amount: 500 })

  const productResponse = await createProduct(seller.token, { title: `Test API Escrow ${Date.now()}`, price: 120 })
  const orderResponse = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${buyer.token}`)
    .send({ productId: productResponse.body.data.id })

  expect(orderResponse.status).toBe(201)
  expect(orderResponse.body.data.status).toBe('pending_payment')

  const payResponse = await request(app)
    .post(`/api/orders/${orderResponse.body.data.id}/pay`)
    .set('Authorization', `Bearer ${buyer.token}`)

  expect(payResponse.status).toBe(200)
  expect(payResponse.body.data.status).toBe('paid_escrow')

  const sellerConfirm = await request(app)
    .post(`/api/orders/${orderResponse.body.data.id}/confirm-handoff`)
    .set('Authorization', `Bearer ${seller.token}`)
  expect(sellerConfirm.body.data.status).toBe('meeting_confirmed')

  const buyerConfirm = await request(app)
    .post(`/api/orders/${orderResponse.body.data.id}/confirm-received`)
    .set('Authorization', `Bearer ${buyer.token}`)
  expect(buyerConfirm.body.data.status).toBe('completed')
})
```

Before adding this exact test, add local helper functions in the same test file:

```js
async function registerUser(prefix) {
  const now = Date.now()
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      username: `${prefix}${now}`,
      email: `${prefix}${now}@example.com`,
      password: 'Password123!'
    })
  return {
    token: response.body.data.token,
    user: response.body.data.user
  }
}

async function createProduct(token, overrides = {}) {
  return request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: overrides.title || `Test API Product ${Date.now()}`,
      price: overrides.price || 99,
      category: overrides.category || 'Books',
      condition: overrides.condition || 'good',
      description: overrides.description || '',
      images: overrides.images || []
    })
}
```

- [ ] **Step 4.7: Run backend verification**

Run:

```powershell
cd backend
npm run lint
npm test
```

Expected:

```text
Test Suites: all passed
```

## Task 5: Mock AI APIs

**Files:**
- Create: `backend/src/services/aiService.js`
- Create: `backend/src/controllers/aiController.js`
- Create: `backend/src/routes/ai.js`
- Modify: `backend/src/app.js`
- Test: `backend/src/test/integration/api.test.js`

- [ ] **Step 5.1: Create AI service**

Create `backend/src/services/aiService.js`:

```js
const riskKeywords = ['先转账', '不走平台', '押金', '校外', '私下付款', '扫码付款']

function buildProductDraft(input) {
  const title = String(input.title || '').trim()
  const category = String(input.category || '').trim() || '二手好物'
  const condition = String(input.condition || '').trim() || 'good'
  const conditionText = {
    new: '全新未拆',
    like_new: '几乎全新',
    good: '轻微使用痕迹',
    fair: '有明显使用痕迹'
  }[condition] || '成色正常'

  return {
    title: title ? `${title} 校园面交` : `${category} 校园面交`,
    description: `${conditionText}，适合校内同学当面验货后交易。建议写清购买时间、配件情况和使用问题。`,
    category,
    condition
  }
}

function suggestPrice(input) {
  const originalPrice = Number(input.originalPrice || input.price || 0)
  const condition = input.condition || 'good'
  const ratio = {
    new: 0.85,
    like_new: 0.75,
    good: 0.6,
    fair: 0.45
  }[condition] || 0.6

  const fair = Math.max(1, Math.round(originalPrice * ratio))
  return {
    quickSalePrice: Math.max(1, Math.round(fair * 0.9)),
    fairPrice: fair,
    highDisplayPrice: Math.round(fair * 1.1),
    reason: '根据成色和原价给出校内二手交易参考价。'
  }
}

function riskCheck(content) {
  const text = String(content || '')
  const hits = riskKeywords.filter(keyword => text.includes(keyword))
  return {
    risky: hits.length > 0,
    keywords: hits,
    message: hits.length > 0
      ? '这条消息可能涉及平台外付款或高风险交易，建议确认订单已付款到托管后再面交。'
      : ''
  }
}

module.exports = {
  buildProductDraft,
  suggestPrice,
  riskCheck
}
```

- [ ] **Step 5.2: Add AI controller and routes**

Create `backend/src/controllers/aiController.js`:

```js
const aiService = require('../services/aiService')

async function productDraft(req, res, next) {
  try {
    res.json({ code: 200, message: 'success', data: aiService.buildProductDraft(req.body) })
  } catch (error) {
    next(error)
  }
}

async function priceSuggestion(req, res, next) {
  try {
    res.json({ code: 200, message: 'success', data: aiService.suggestPrice(req.body) })
  } catch (error) {
    next(error)
  }
}

async function riskCheck(req, res, next) {
  try {
    res.json({ code: 200, message: 'success', data: aiService.riskCheck(req.body.content) })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  productDraft,
  priceSuggestion,
  riskCheck
}
```

Create `backend/src/routes/ai.js`:

```js
const express = require('express')
const aiController = require('../controllers/aiController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/product-draft', authMiddleware, aiController.productDraft)
router.post('/price-suggestion', authMiddleware, aiController.priceSuggestion)
router.post('/risk-check', authMiddleware, aiController.riskCheck)

module.exports = router
```

Register in `backend/src/app.js`:

```js
const aiRoutes = require('./routes/ai')
app.use('/api/ai', aiRoutes)
```

- [ ] **Step 5.3: Add AI integration tests**

Append:

```js
test('POST /api/ai/risk-check - should detect off-platform payment words', async () => {
  const response = await request(app)
    .post('/api/ai/risk-check')
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({ content: '我们不走平台，扫码付款可以吗' })

  expect(response.status).toBe(200)
  expect(response.body.data.risky).toBe(true)
  expect(response.body.data.keywords.length).toBeGreaterThan(0)
})
```

- [ ] **Step 5.4: Run backend verification**

Run:

```powershell
cd backend
npm run lint
npm test
```

Expected: lint and tests pass.

## Task 6: Frontend API, Wallet Page, And Order Payment UI

**Files:**
- Modify: `frontend/src/api/index.js`
- Modify: `frontend/src/router/index.js`
- Modify: `frontend/src/components/AppHeader.vue`
- Create: `frontend/src/views/WalletView.vue`
- Modify: `frontend/src/views/ProductDetailView.vue`
- Modify: `frontend/src/views/OrderDetailView.vue`
- Modify: `frontend/src/views/OrderListView.vue`

- [ ] **Step 6.1: Extend frontend API wrapper**

In `frontend/src/api/index.js`, add:

```js
export const wallet = {
  get: () => request.get('/wallet'),
  recharge: (data) => request.post('/wallet/recharge', data),
}

export const disputes = {
  respond: (id, data) => request.post(`/disputes/${id}/respond`, data),
  resolve: (id, data) => request.post(`/disputes/${id}/resolve`, data),
}

export const ai = {
  productDraft: (data) => request.post('/ai/product-draft', data),
  priceSuggestion: (data) => request.post('/ai/price-suggestion', data),
  riskCheck: (data) => request.post('/ai/risk-check', data),
}
```

Extend `orders`:

```js
pay: (id) => request.post(`/orders/${id}/pay`),
confirmReceived: (id) => request.post(`/orders/${id}/confirm-received`),
confirmHandoff: (id) => request.post(`/orders/${id}/confirm-handoff`),
requestRelease: (id, data) => request.post(`/orders/${id}/request-release`, data),
createDispute: (id, data) => request.post(`/orders/${id}/disputes`, data),
```

Extend `conversations.sendMessage` usage to accept:

```js
{ type: 'text' | 'image', content: string, metadata?: object }
```

- [ ] **Step 6.2: Add wallet route and nav entry**

In `frontend/src/router/index.js` add:

```js
{ path: '/wallet', component: () => import('../views/WalletView.vue'), meta: { requiresAuth: true } },
```

In `frontend/src/components/AppHeader.vue`, add a wallet link near orders/messages:

```vue
<router-link to="/wallet">钱包</router-link>
```

- [ ] **Step 6.3: Create wallet page**

Create `frontend/src/views/WalletView.vue`:

```vue
<template>
  <div class="wallet-page">
    <AppHeader />
    <div class="page-wrapper">
      <div class="container">
        <div class="page-content wallet-layout">
          <section class="balance-panel">
            <h1>我的钱包</h1>
            <div class="balance">￥{{ walletInfo.balance.toFixed(2) }}</div>
            <div class="recharge-row">
              <el-input-number v-model="rechargeAmount" :min="1" :max="10000" />
              <el-button type="primary" :loading="loading" @click="handleRecharge">模拟充值</el-button>
            </div>
          </section>

          <section class="transactions-panel">
            <h2>交易流水</h2>
            <el-table :data="walletInfo.transactions" empty-text="暂无流水">
              <el-table-column prop="type" label="类型" width="140" />
              <el-table-column prop="direction" label="方向" width="100" />
              <el-table-column label="金额" width="120">
                <template #default="{ row }">￥{{ Number(row.amount).toFixed(2) }}</template>
              </el-table-column>
              <el-table-column prop="note" label="说明" />
              <el-table-column label="时间" width="180">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
            </el-table>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { wallet } from '../api/index.js'
import AppHeader from '../components/AppHeader.vue'

const loading = ref(false)
const rechargeAmount = ref(100)
const walletInfo = reactive({
  balance: 0,
  frozenBalance: 0,
  transactions: []
})

const formatDate = (value) => value ? new Date(value).toLocaleString('zh-CN') : ''

const fetchWallet = async () => {
  const res = await wallet.get()
  Object.assign(walletInfo, res.data)
}

const handleRecharge = async () => {
  loading.value = true
  try {
    const res = await wallet.recharge({ amount: rechargeAmount.value })
    Object.assign(walletInfo, res.data)
    ElMessage.success('充值成功')
  } catch (error) {
    ElMessage.error(error.message || '充值失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchWallet)
</script>

<style scoped>
.wallet-layout {
  display: grid;
  gap: var(--spacing-xl);
}

.balance-panel,
.transactions-panel {
  border: 1px solid var(--border-standard);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  background: var(--bg-panel);
}

.balance {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-semibold);
  margin: var(--spacing-lg) 0;
  color: var(--brand-indigo);
}

.recharge-row {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}
</style>
```

- [ ] **Step 6.4: Update order detail actions**

In `frontend/src/views/OrderDetailView.vue`, replace old `pending/confirmed` status maps with:

```js
const statusText = (status) => {
  const map = {
    pending_payment: '待付款',
    paid_escrow: '已托管',
    meeting_confirmed: '面交确认中',
    completed: '已完成',
    cancelled: '已取消',
    disputed: '争议中',
    refunded: '已退款'
  }
  return map[status] || status
}
```

Add computed helpers:

```js
const isBuyer = computed(() => order.value?.buyer?.id === userStore.userInfo?.id)
const isSeller = computed(() => order.value?.seller?.id === userStore.userInfo?.id)
const canPay = computed(() => isBuyer.value && order.value?.status === 'pending_payment')
const canConfirmReceived = computed(() => isBuyer.value && ['paid_escrow', 'meeting_confirmed'].includes(order.value?.status))
const canConfirmHandoff = computed(() => isSeller.value && ['paid_escrow', 'meeting_confirmed'].includes(order.value?.status))
```

Add action handlers:

```js
const handlePay = async () => {
  actionLoading.value = true
  try {
    await orders.pay(order.value.id)
    ElMessage.success('已付款到平台托管')
    await fetchOrder()
  } catch (error) {
    ElMessage.error(error.message || '支付失败')
  } finally {
    actionLoading.value = false
  }
}

const handleConfirmReceived = async () => {
  actionLoading.value = true
  try {
    await orders.confirmReceived(order.value.id)
    ElMessage.success('已确认收到商品')
    await fetchOrder()
  } finally {
    actionLoading.value = false
  }
}

const handleConfirmHandoff = async () => {
  actionLoading.value = true
  try {
    await orders.confirmHandoff(order.value.id)
    ElMessage.success('已确认完成面交')
    await fetchOrder()
  } finally {
    actionLoading.value = false
  }
}
```

Add buttons:

```vue
<el-button v-if="canPay" type="primary" :loading="actionLoading" @click="handlePay">
  付款到平台托管
</el-button>
<el-button v-if="canConfirmReceived" type="success" :loading="actionLoading" @click="handleConfirmReceived">
  我已收到商品
</el-button>
<el-button v-if="canConfirmHandoff" type="success" :loading="actionLoading" @click="handleConfirmHandoff">
  我已完成面交
</el-button>
```

- [ ] **Step 6.5: Run frontend lint/build**

Run:

```powershell
cd frontend
npm run lint
npm run build
```

Expected: both commands pass.

## Task 7: Frontend Chat Images And AI UI

**Files:**
- Modify: `frontend/src/views/ConversationDetailView.vue`
- Modify: `frontend/src/views/PublishView.vue`
- Modify: `frontend/src/api/index.js`

- [ ] **Step 7.1: Add image send UI in chat**

In `ConversationDetailView.vue`, import:

```js
import { ai, conversations, upload } from '../api/index.js'
```

Add refs:

```js
const imageInputRef = ref(null)
const imageUploading = ref(false)
const riskHint = ref('')
```

Add image handler:

```js
const handleImageSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  imageUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const uploadRes = await upload.image(formData)
    const imageUrl = uploadRes.data.url
    const res = await conversations.sendMessage(route.params.id, {
      type: 'image',
      content: imageUrl,
      metadata: { filename: file.name }
    })
    appendMessage(res.data)
  } catch (error) {
    ElMessage.error(error.message || '图片发送失败')
  } finally {
    imageUploading.value = false
    event.target.value = ''
  }
}
```

Update message rendering:

```vue
<div v-if="message.type === 'system'" class="system-message">{{ message.content }}</div>
<div v-else class="bubble">
  <div class="sender">{{ message.sender.username }}</div>
  <img
    v-if="message.type === 'image'"
    class="message-image"
    :src="resolveAssetUrl(message.content)"
    :alt="message.metadata?.filename || '聊天图片'"
  >
  <p v-else>{{ message.content }}</p>
  <span>{{ formatDate(message.createdAt) }}</span>
</div>
```

Add composer controls:

```vue
<input ref="imageInputRef" type="file" accept="image/*" hidden @change="handleImageSelected">
<el-button :loading="imageUploading" @click="imageInputRef?.click()">图片</el-button>
```

- [ ] **Step 7.2: Add chat risk check before sending text**

In `handleSend`, before sending:

```js
const riskRes = await ai.riskCheck({ content })
riskHint.value = riskRes.data.risky ? riskRes.data.message : ''
```

Display:

```vue
<div v-if="riskHint" class="risk-hint">{{ riskHint }}</div>
```

- [ ] **Step 7.3: Add AI product draft and price suggestion to publish page**

In `PublishView.vue`, import `ai`:

```js
import { ai, products } from '../api/index.js'
```

Add handlers:

```js
const aiLoading = ref(false)

const handleAiDraft = async () => {
  aiLoading.value = true
  try {
    const res = await ai.productDraft(form)
    form.title = res.data.title
    form.description = res.data.description
    form.category = res.data.category
    form.condition = res.data.condition
    ElMessage.success('已生成发布文案')
  } catch (error) {
    ElMessage.error(error.message || 'AI 文案生成失败')
  } finally {
    aiLoading.value = false
  }
}

const handlePriceSuggestion = async () => {
  aiLoading.value = true
  try {
    const res = await ai.priceSuggestion({
      price: form.price,
      category: form.category,
      condition: form.condition,
      description: form.description
    })
    form.price = res.data.fairPrice
    ElMessage.success(`建议成交价 ￥${res.data.fairPrice}`)
  } catch (error) {
    ElMessage.error(error.message || 'AI 定价失败')
  } finally {
    aiLoading.value = false
  }
}
```

Add buttons near submit controls:

```vue
<el-button :loading="aiLoading" @click="handleAiDraft">生成文案</el-button>
<el-button :loading="aiLoading" @click="handlePriceSuggestion">建议定价</el-button>
```

- [ ] **Step 7.4: Run frontend verification**

Run:

```powershell
cd frontend
npm run lint
npm run build
```

Expected: both commands pass.

## Task 8: Full Docker And Browser Smoke Verification

**Files:**
- No source changes unless verification exposes a defect.

- [ ] **Step 8.1: Start full stack**

Run:

```powershell
docker compose up -d --build
docker compose ps
```

Expected:

```text
backend   running
frontend  running
mysql     running
```

- [ ] **Step 8.2: Verify backend health**

Run:

```powershell
Invoke-WebRequest http://localhost:3001/api/health
```

Expected: HTTP 200 with JSON `{ code: 200, message: "OK" }`.

- [ ] **Step 8.3: Browser smoke test with Playwright**

Use `webapp-testing` Playwright flow against `http://localhost`.

Manual path to cover:

1. Login as `user1@campustrade.com / Password123!`.
2. Open `/wallet`, recharge 100 if balance is low.
3. Open `/`, choose an available product, create order.
4. Open order detail, pay to escrow.
5. Open `/messages`, enter the conversation, send text and image.
6. Send a message containing `不走平台` and confirm the risk hint appears.
7. Login as seller test account, open order, confirm handoff.
8. Login as buyer, confirm received.
9. Confirm order status becomes `已完成`.
10. Open wallet pages for buyer and seller and verify buyer has outgoing escrow payment and seller has incoming escrow release.

Expected:

- No mojibake text appears on newly edited pages.
- Product image previews load.
- Image chat message renders as an image.
- System messages appear centered or visually distinct.
- Payment and confirmation buttons disappear after status changes.

- [ ] **Step 8.4: Final commands**

Run:

```powershell
cd backend
npm run lint
npm test
cd ..\frontend
npm run lint
npm run build
```

Expected:

```text
backend lint passes
backend tests pass
frontend lint passes
frontend build passes
```

## Self-Review

- Spec coverage:
  - Payment money flow: Task 1, Task 2, Task 4, Task 6, Task 8.
  - Buyer nonpayment: Task 1, Task 2, Task 4, Task 8.
  - Buyer paid but does not confirm: Task 4 dispute/request-release path.
  - Image chat messages: Task 1, Task 3, Task 7, Task 8.
  - Order system messages in chat: Task 3 and Task 4.
  - AI product draft, price suggestion, and risk check: Task 5 and Task 7.
- Placeholder scan:
  - The plan contains no planned implementation placeholders. Each code-changing task names exact files and concrete code shape.
- Type consistency:
  - Order statuses are consistently `pending_payment`, `paid_escrow`, `meeting_confirmed`, `completed`, `cancelled`, `disputed`, `refunded`.
  - Message types are consistently `text`, `image`, `system`.
  - Dispute resolution values are consistently `refund` and `release`.

