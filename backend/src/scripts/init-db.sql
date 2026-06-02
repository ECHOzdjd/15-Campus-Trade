-- =====================================================
-- 校园二手交易平台 - 数据库初始化脚本
-- =====================================================
-- 项目：Campus Trade
-- 数据库：MySQL 8.0
-- 版本：v1.0.0
-- 创建时间：2026-04-13
-- =====================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS campus_trade
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE campus_trade;

-- =====================
-- 用户表
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id         INT           NOT NULL AUTO_INCREMENT,
  username   VARCHAR(50)   NOT NULL,
  email      VARCHAR(100)  NOT NULL,
  password   VARCHAR(255)  NOT NULL,
  phone      VARCHAR(20)   NULL,
  avatar     VARCHAR(500)  NULL,
  role       ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email    (email),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- 商品表
-- =====================
CREATE TABLE IF NOT EXISTS products (
  id          INT             NOT NULL AUTO_INCREMENT,
  user_id     INT             NOT NULL,
  title       VARCHAR(100)    NOT NULL,
  description TEXT            NULL,
  price       DECIMAL(10, 2)  NOT NULL,
  category    VARCHAR(50)     NOT NULL,
  `condition` ENUM('new', 'like_new', 'good', 'fair') NOT NULL,
  images      JSON            NULL,
  status      ENUM('available', 'sold', 'removed') NOT NULL DEFAULT 'available',
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_user_id  (user_id),
  KEY idx_products_status   (status),
  KEY idx_products_category (category),
  CONSTRAINT fk_products_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- 订单表
-- =====================
CREATE TABLE IF NOT EXISTS orders (
  id         INT  NOT NULL AUTO_INCREMENT,
  buyer_id   INT  NOT NULL,
  seller_id  INT  NOT NULL,
  product_id INT  NOT NULL,
  status     ENUM('pending_payment', 'paid_escrow', 'meeting_confirmed', 'completed', 'cancelled', 'disputed', 'refunded') NOT NULL DEFAULT 'pending_payment',
  payment_expires_at TIMESTAMP NULL,
  buyer_handoff_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  seller_handoff_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_buyer_id   (buyer_id),
  KEY idx_orders_seller_id  (seller_id),
  KEY idx_orders_product_id (product_id),
  CONSTRAINT fk_orders_buyer   FOREIGN KEY (buyer_id)   REFERENCES users    (id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_seller  FOREIGN KEY (seller_id)  REFERENCES users    (id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_wallet_transactions_type (type),
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
  KEY idx_payment_escrows_status (status),
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
  KEY idx_disputes_status (status),
  CONSTRAINT fk_disputes_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT,
  CONSTRAINT fk_disputes_opened_by FOREIGN KEY (opened_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Conversations
-- =====================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Messages
-- =====================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Favorites
-- =====================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
