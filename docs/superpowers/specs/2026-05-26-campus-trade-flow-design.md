# Campus Trade Flow Design

## Goal

Complete the campus trading workflow on `develop-clean`: buyers contact sellers before buying, both sides coordinate offline pickup in a conversation, and the app exposes the product, favorite, message, and order features promised by README without adding delivery or shipping concepts.

## Assumptions

- Campus trades happen offline. The system records intent and status; it does not collect shipping addresses or delivery tracking.
- "Real-time" means a user can keep a conversation page open and receive new messages without refreshing.
- The current stack stays Vue 3 + Express + MySQL. Redis remains out of scope because it is listed in README but not wired into the current app.
- Existing product/order/auth patterns should be reused instead of introducing a large new framework.

## Scope

### In Scope

- Add conversations between buyer and seller around one product.
- Add messages with read/unread state.
- Add SSE stream endpoint for conversation updates.
- Let buyers open a conversation from the product detail page before creating an order.
- Keep order status focused on campus handoff: `pending`, `confirmed`, `cancelled`.
- Rename frontend order copy away from shipping/delivery wording.
- Add functional pages for conversations, conversation detail, my products, product editing, order list, order detail, and favorites.
- Add favorite APIs and UI entry points because README promises a favorite list.

### Out of Scope

- Online payment, escrow, delivery address, logistics, refund process.
- WebSocket infrastructure; SSE is sufficient and smaller for this project.
- Complex notification center; unread message count in the header is enough for this iteration.
- Redis integration.

## Backend Design

### Database

Add two new tables:

- `conversations`: one row per buyer/seller/product combination, with `buyer_id`, `seller_id`, `product_id`, `last_message`, `last_message_at`.
- `messages`: conversation messages with `conversation_id`, `sender_id`, `content`, `is_read`.

Add one favorite table:

- `favorites`: unique `(user_id, product_id)` rows.

Existing `orders` remains unchanged at the schema level. Frontend text will describe confirmation as "完成面交".

### APIs

Conversations:

- `POST /api/conversations` with `productId`: create or return the buyer/seller conversation for the product.
- `GET /api/conversations`: list current user's conversations.
- `GET /api/conversations/:id`: load conversation detail and messages.
- `POST /api/conversations/:id/messages`: send a message.
- `GET /api/conversations/:id/stream`: SSE stream for new messages.
- `PUT /api/conversations/:id/read`: mark messages from the other side as read.

Favorites:

- `GET /api/favorites`: list current user's favorite products.
- `POST /api/favorites/:productId`: add favorite.
- `DELETE /api/favorites/:productId`: remove favorite.
- `GET /api/favorites/:productId`: check whether current user has favorited a product.

Authorization rules:

- Only the buyer or seller can read/send messages in a conversation.
- Buyers cannot create conversations for their own products.
- Favorites require login.

## Frontend Design

Routes:

- `/messages`: conversation list.
- `/messages/:id`: conversation detail.
- `/favorites`: favorite product list.
- Existing empty routes become functional: `/my-products`, `/product/:id/edit`, `/orders`, `/orders/:id`.

Product detail:

- Seller sees edit/delete actions.
- Buyer sees "联系卖家" and "收藏".
- "立即购买" stays available but the page nudges the buyer to contact the seller first. Creating an order navigates to order detail, where the copy explains offline handoff.

Messages:

- Conversation detail has product summary, message timeline, input box, and a short campus handoff hint.
- SSE updates append new messages while the page stays open.

Orders:

- Order detail shows buyer/seller/product and status.
- Seller action text is "确认已完成面交".
- Cancel action text is "取消交易".
- No shipping address, delivery, or courier fields appear.

## Testing

Backend:

- Unit tests for conversation model and favorite model.
- Controller/API tests for create conversation, send/list messages, favorite toggle, and permission checks.

Frontend:

- Existing lint/build must pass.
- Manual Playwright smoke flow: login, open product detail, start conversation, send message, create order, open order pages, open my products/favorites.

## Acceptance Checklist

- Buyers can contact sellers before buying.
- Message page receives new messages without manual refresh via SSE.
- No delivery/shipping copy appears in trade or order pages.
- My products, edit product, order list, order detail, messages, and favorites are not placeholder pages.
- README-promised contact/favorites/instant-message basics exist.
- Code remains local; no push is performed.
