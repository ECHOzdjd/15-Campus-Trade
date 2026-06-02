const pool = require('./db')

async function ensureRuntimeSchema() {
  async function columnExists(tableName, columnName) {
    const [rows] = await pool.query(
      `
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        LIMIT 1
      `,
      [tableName, columnName]
    )

    return rows.length > 0
  }

  async function ensureColumn(tableName, columnName, definition) {
    if (await columnExists(tableName, columnName)) {
      return
    }

    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
  }

  await ensureColumn('users', 'role', "ENUM('user', 'admin') NOT NULL DEFAULT 'user'")

  await pool.query(
    `INSERT INTO users (username, email, password, phone, avatar, role)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE role = VALUES(role)`,
    [
      'admin_seed_account',
      'admin@campustrade.com',
      '$2a$10$iHgx0aHKAf1itg7OXtKMIe8KZfdnrBR03KOgH2eTwsbNMust9aOD.',
      null,
      null,
      'admin'
    ]
  )

  await pool.query(`
    ALTER TABLE orders
    MODIFY status ENUM('pending', 'confirmed', 'pending_payment', 'paid_escrow', 'meeting_confirmed', 'completed', 'cancelled', 'disputed', 'refunded') NOT NULL DEFAULT 'pending_payment'
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
    ALTER TABLE orders
    MODIFY status ENUM('pending_payment', 'paid_escrow', 'meeting_confirmed', 'completed', 'cancelled', 'disputed', 'refunded') NOT NULL DEFAULT 'pending_payment'
  `)

  await ensureColumn('orders', 'payment_expires_at', 'TIMESTAMP NULL')
  await ensureColumn('orders', 'buyer_handoff_confirmed', 'TINYINT(1) NOT NULL DEFAULT 0')
  await ensureColumn('orders', 'seller_handoff_confirmed', 'TINYINT(1) NOT NULL DEFAULT 0')

  await pool.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
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
      KEY idx_wallet_transactions_type (type),
      CONSTRAINT fk_wallet_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_wallet_transactions_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
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
      KEY idx_payment_escrows_status (status),
      CONSTRAINT fk_payment_escrows_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT,
      CONSTRAINT fk_payment_escrows_buyer FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT fk_payment_escrows_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
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
      KEY idx_disputes_status (status),
      CONSTRAINT fk_disputes_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT,
      CONSTRAINT fk_disputes_opened_by FOREIGN KEY (opened_by) REFERENCES users (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id              INT       NOT NULL AUTO_INCREMENT,
      buyer_id        INT       NOT NULL,
      seller_id       INT       NOT NULL,
      product_id      INT       NOT NULL,
      last_message    TEXT      NULL,
      last_message_at TIMESTAMP NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_conversations_buyer_product (buyer_id, product_id),
      KEY idx_conversations_buyer_id  (buyer_id),
      KEY idx_conversations_seller_id (seller_id),
      KEY idx_conversations_product_id (product_id),
      CONSTRAINT fk_conversations_buyer   FOREIGN KEY (buyer_id)   REFERENCES users    (id) ON DELETE CASCADE,
      CONSTRAINT fk_conversations_seller  FOREIGN KEY (seller_id)  REFERENCES users    (id) ON DELETE CASCADE,
      CONSTRAINT fk_conversations_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id              INT        NOT NULL AUTO_INCREMENT,
      conversation_id INT        NOT NULL,
      sender_id       INT        NULL,
      type            ENUM('text', 'image', 'system') NOT NULL DEFAULT 'text',
      content         TEXT       NOT NULL,
      metadata        JSON       NULL,
      is_read         TINYINT(1) NOT NULL DEFAULT 0,
      created_at      TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_messages_conversation_id (conversation_id),
      KEY idx_messages_sender_id       (sender_id),
      CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
      CONSTRAINT fk_messages_sender       FOREIGN KEY (sender_id)       REFERENCES users         (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query('ALTER TABLE messages MODIFY sender_id INT NULL')
  await ensureColumn('messages', 'type', "ENUM('text', 'image', 'system') NOT NULL DEFAULT 'text'")
  await ensureColumn('messages', 'metadata', 'JSON NULL')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id         INT       NOT NULL AUTO_INCREMENT,
      user_id    INT       NOT NULL,
      product_id INT       NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_favorites_user_product (user_id, product_id),
      KEY idx_favorites_user_id    (user_id),
      KEY idx_favorites_product_id (product_id),
      CONSTRAINT fk_favorites_user    FOREIGN KEY (user_id)    REFERENCES users    (id) ON DELETE CASCADE,
      CONSTRAINT fk_favorites_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    INSERT IGNORE INTO conversations (buyer_id, seller_id, product_id, created_at, updated_at)
    SELECT o.buyer_id, o.seller_id, o.product_id, o.created_at, o.updated_at
    FROM orders o
    INNER JOIN users buyer ON o.buyer_id = buyer.id
    INNER JOIN users seller ON o.seller_id = seller.id
    INNER JOIN products p ON o.product_id = p.id
    WHERE o.buyer_id <> o.seller_id
  `)
}

module.exports = ensureRuntimeSchema
