# QuickShop — Blinkit/Zepto Clone

A premium, fast, local-only grocery storefront app built for shop owners and customers. 

## Features

### 🛒 Customer Storefront
- **Modern UI/UX**: Rich styling, smooth animations, and a fully responsive layout.
- **Search & Filter**: Search products by title or category in real-time.
- **Detailed Article View**: Open modals to read descriptions, review pricing/discount metrics, and discover related products.
- **Promo Coupon System**: Apply promo codes like `SAVE10` (10% off) or `FREE25` (25% off).
- **Checkout options**: Pay using Cash on Delivery (COD), UPI, or Card.
- **Order tracking**: Customers can track order status in their "My Orders" window.

### 📦 Shop Owner Console (Live Order System)
- **Real-time Order Feed**: Monitor incoming local orders categorized by status (Pending, Active, Completed, Cancelled).
- **Sidebar Notification Badge**: Highlights the count of active Pending orders.
- **Quick Status Transitions**: Accept or mark orders as delivered in a single click.
- **Direct Dialing**: Tap customer phone numbers to call them directly.
- **Catalog Management**: Add, edit, or delete articles with custom emojis, stock amounts, units, and descriptions.
- **Configuration Panel**: Edit store settings including Delivery Fees, Free Delivery Thresholds, and Delivery Times.

## Development & Testing

The app works completely locally and persists data using `LocalStorage`.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` (or the port specified by the server console output).

### Default Accounts

- **Customer Signup**: Create any new customer account directly from the signup page.
- **Shop Owner Credentials**:
  - **Email**: `admin@shop.com`
  - **Password**: `admin123`
