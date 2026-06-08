-- =====================================================
-- 校园二手交易平台 - 测试数据脚本
-- =====================================================
-- 项目：Campus Trade
-- 说明：插入测试用户、商品和订单数据
-- 密码：所有测试用户密码均为 Password123!
-- =====================================================

USE campus_trade;

-- =====================
-- 插入测试用户（5个）
-- =====================
-- 密码哈希：Password123! -> $2a$10$iHgx0aHKAf1itg7OXtKMIe8KZfdnrBR03KOgH2eTwsbNMust9aOD.
INSERT INTO users (username, email, password, phone, avatar) VALUES
('王勇', 'user1@campustrade.com', '$2a$10$iHgx0aHKAf1itg7OXtKMIe8KZfdnrBR03KOgH2eTwsbNMust9aOD.', '13800138001', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1'),
('李明', 'user2@campustrade.com', '$2a$10$iHgx0aHKAf1itg7OXtKMIe8KZfdnrBR03KOgH2eTwsbNMust9aOD.', '13800138002', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2'),
('张华', 'user3@campustrade.com', '$2a$10$iHgx0aHKAf1itg7OXtKMIe8KZfdnrBR03KOgH2eTwsbNMust9aOD.', '13800138003', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3'),
('刘芳', 'user4@campustrade.com', '$2a$10$iHgx0aHKAf1itg7OXtKMIe8KZfdnrBR03KOgH2eTwsbNMust9aOD.', '13800138004', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4'),
('陈静', 'user5@campustrade.com', '$2a$10$iHgx0aHKAf1itg7OXtKMIe8KZfdnrBR03KOgH2eTwsbNMust9aOD.', '13800138005', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5');

INSERT IGNORE INTO users (username, email, password, phone, avatar) VALUES
('Seller', 'seller@campustrade.com', '$2a$10$iHgx0aHKAf1itg7OXtKMIe8KZfdnrBR03KOgH2eTwsbNMust9aOD.', '13800138006', 'https://api.dicebear.com/7.x/avataaars/svg?seed=seller');

INSERT IGNORE INTO users (username, email, password, phone, avatar, role) VALUES
('admin_seed_account', 'admin@campustrade.com', '$2a$10$iHgx0aHKAf1itg7OXtKMIe8KZfdnrBR03KOgH2eTwsbNMust9aOD.', NULL, NULL, 'admin');

INSERT IGNORE INTO wallets (user_id, balance, frozen_balance)
SELECT id, 1000.00, 0.00
FROM users
WHERE email IN ('user1@campustrade.com', 'user2@campustrade.com', 'seller@campustrade.com');

-- =====================
-- 插入测试商品（12个）
-- =====================

-- 书籍类（3个）
INSERT INTO products (user_id, title, description, price, category, `condition`, images, status) VALUES
(1, '高等数学教材（第七版）', '同济大学版高等数学教材，九成新，无笔记无划线，适合大一新生使用。', 35.00, '书籍', 'like_new', '["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400", "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400"]', 'available'),
(2, '英语四级真题集', '星火英语四级真题集，包含近10年真题，附赠听力音频，八成新。', 25.00, '书籍', 'good', '["https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400"]', 'available'),
(3, '数据结构与算法分析', 'C语言描述版本，经典教材，适合计算机专业学生，七成新。', 40.00, '书籍', 'good', '["https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400"]', 'available');

-- 数码类（3个）
INSERT INTO products (user_id, title, description, price, category, `condition`, images, status) VALUES
(1, 'AirPods Pro 2代', '使用半年，功能完好，配件齐全，包含充电盒和原装数据线。', 899.00, '数码', 'like_new', '["https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=400", "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=400"]', 'available'),
(2, 'iPad 2021款 64GB', '银色WiFi版，九成新，无磕碰，赠送保护壳和钢化膜。', 2200.00, '数码', 'like_new', '["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400"]', 'available'),
(4, '小米手环7', '黑色标准版，佩戴一个月，功能正常，包装配件齐全。', 150.00, '数码', 'like_new', '["https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400"]', 'available');

-- 交通工具类（2个）
INSERT INTO products (user_id, title, description, price, category, `condition`, images, status) VALUES
(3, '捷安特山地自行车', '21速变速，骑行流畅，适合校园代步和周末骑行，八成新。', 450.00, '交通工具', 'good', '["https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400", "https://images.unsplash.com/photo-1571333250630-f0230c320b6d?w=400"]', 'available'),
(5, '电动滑板车', '小米电动滑板车Pro2，续航30公里，九成新，充电器齐全。', 1500.00, '交通工具', 'like_new', '["https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400"]', 'available');

-- 生活用品类（2个）
INSERT INTO products (user_id, title, description, price, category, `condition`, images, status) VALUES
(2, '宿舍小风扇', 'USB充电小风扇，静音设计，适合宿舍使用，九成新。', 30.00, '生活用品', 'like_new', '["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"]', 'available'),
(4, '台灯护眼灯', '飞利浦护眼台灯，三档调光，适合学习使用，八成新。', 120.00, '生活用品', 'good', '["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400"]', 'available');

-- 服装类（2个）
INSERT INTO products (user_id, title, description, price, category, `condition`, images, status) VALUES
(3, '优衣库羽绒服（L码）', '黑色轻薄款羽绒服，保暖效果好，九成新，适合秋冬季节。', 280.00, '服装', 'like_new', '["https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400"]', 'available'),
(5, '耐克运动鞋（42码）', 'Air Max系列，黑白配色，穿过3次，几乎全新。', 350.00, '服装', 'new', '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400"]', 'available');

-- =====================
-- 插入测试订单（5个）
-- =====================

-- 订单1：pending_payment状态（用户2购买用户1的AirPods）
INSERT INTO orders (buyer_id, seller_id, product_id, status) VALUES
(2, 1, 4, 'pending_payment');

-- 更新商品4状态为sold
UPDATE products SET status = 'sold' WHERE id = 4;

-- 订单2：pending_payment状态（用户4购买用户3的自行车）
INSERT INTO orders (buyer_id, seller_id, product_id, status) VALUES
(4, 3, 7, 'pending_payment');

-- 更新商品7状态为sold
UPDATE products SET status = 'sold' WHERE id = 7;

-- 订单3：completed状态（用户5购买用户2的英语四级真题）
INSERT INTO orders (buyer_id, seller_id, product_id, status) VALUES
(5, 2, 2, 'completed');

-- 更新商品2状态为sold
UPDATE products SET status = 'sold' WHERE id = 2;

-- 订单4：completed状态（用户1购买用户4的小米手环）
INSERT INTO orders (buyer_id, seller_id, product_id, status) VALUES
(1, 4, 6, 'completed');

-- 更新商品6状态为sold
UPDATE products SET status = 'sold' WHERE id = 6;

-- 订单5：cancelled状态（用户3购买用户5的电动滑板车，但取消了）
INSERT INTO orders (buyer_id, seller_id, product_id, status) VALUES
(3, 5, 8, 'cancelled');

-- =====================
-- Sample conversations and favorites
-- =====================
INSERT IGNORE INTO conversations (buyer_id, seller_id, product_id, last_message, last_message_at) VALUES
(2, 1, 4, 'Tonight at the library gate?', NOW()),
(1, 3, 7, 'I can check the bike near the dorm this afternoon.', NOW());

INSERT INTO messages (conversation_id, sender_id, content, is_read)
SELECT c.id, 2, 'Hi, I want to buy this item.', 1
FROM conversations c
WHERE c.buyer_id = 2
  AND c.product_id = 4
  AND NOT EXISTS (
    SELECT 1 FROM messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id = 2
      AND m.content = 'Hi, I want to buy this item.'
  );

INSERT INTO messages (conversation_id, sender_id, content, is_read)
SELECT c.id, 1, 'Sure, we can meet at the library gate tonight.', 0
FROM conversations c
WHERE c.buyer_id = 2
  AND c.product_id = 4
  AND NOT EXISTS (
    SELECT 1 FROM messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id = 1
      AND m.content = 'Sure, we can meet at the library gate tonight.'
  );

INSERT INTO messages (conversation_id, sender_id, content, is_read)
SELECT c.id, 1, 'Can I test ride the bike?', 1
FROM conversations c
WHERE c.buyer_id = 1
  AND c.product_id = 7
  AND NOT EXISTS (
    SELECT 1 FROM messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id = 1
      AND m.content = 'Can I test ride the bike?'
  );

INSERT INTO messages (conversation_id, sender_id, content, is_read)
SELECT c.id, 3, 'Yes, see you near the dorm this afternoon.', 0
FROM conversations c
WHERE c.buyer_id = 1
  AND c.product_id = 7
  AND NOT EXISTS (
    SELECT 1 FROM messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id = 3
      AND m.content = 'Yes, see you near the dorm this afternoon.'
  );

INSERT IGNORE INTO favorites (user_id, product_id) VALUES
(1, 5),
(2, 9),
(3, 4);

-- 商品8保持available状态（订单取消后恢复）
