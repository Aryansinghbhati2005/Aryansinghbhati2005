# ShopVerse (Flipkart/Amazon Inspired Full-Stack Demo)

This project is a lightweight **full-stack e-commerce website** inspired by the core shopping flow of Flipkart and Amazon.

## Features

- Homepage hero banner and categories
- Product listing with search + category filter
- Add-to-cart and remove-from-cart flow
- Live cart total updates
- Backend REST APIs for home data, products, and cart

## Tech Stack

- **Backend:** Node.js HTTP server (no external dependencies)
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Data:** In-memory product and cart store

## Run locally

```bash
node server.js
```

Then open:

- `http://localhost:3000`

## API Endpoints

- `GET /api/home`
- `GET /api/products?category=&q=`
- `GET /api/cart`
- `POST /api/cart` body: `{ "productId": number }`
- `DELETE /api/cart/:productId`

> Note: This is a starter/demo full-stack project. You can extend it with auth, payments, user accounts, and a real database.
