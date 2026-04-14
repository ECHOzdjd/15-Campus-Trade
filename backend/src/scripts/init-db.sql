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
  status     ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
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
