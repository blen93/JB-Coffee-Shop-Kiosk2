# JB Coffee Shop — Self-Service Ordering System

A responsive, offline-friendly starter system for an Android tablet or touchscreen computer. It includes a customer kiosk, configurable drinks, a cart, order numbers, order tracking, payment selection (cashier or GCash/QR), and a staff dashboard.

## Run it

### Quick test
1. Extract the ZIP file.
2. Open `index.html` in a modern browser.
3. Tap **Start your order** and try a sample order.
4. Tap **Staff** and use the default PIN `1234`.
5. In the staff dashboard, change the staff PIN and test order status/payment updates.

Some browser configurations restrict parts of web-app functionality when opening a file directly. For the most consistent experience, serve the folder locally.

### Run on a computer
If Python is installed, open a terminal in this folder and run:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` in Chrome, Edge, or Firefox.

### Run on Android tablet
- Copy the extracted folder to the tablet and open `index.html` in a browser, or serve the folder using a local web server app.
- For a tablet and computer to share orders, they must use a shared backend/server. This starter version stores data locally in each browser, so devices do **not** synchronize with one another.
- To package as an Android APK, the web UI can be wrapped with Capacitor, but multi-device order sharing still needs a server/database.

## Included features
- Touch-friendly responsive menu with sample coffee and pastry products.
- Customization: size, hot/iced, sweetness, milk, extras, quantity.
- Cart, order total, checkout, and unique order number.
- Cash at cashier or GCash/QR selection. GCash is **not automatically charged or verified**; the customer pays using the shop's official QR and staff confirms payment.
- Order tracking by order number.
- Staff dashboard with order filters, status updates, payment confirmation, sales tally for paid orders, and CSV export.
- Menu management (add, hide/show, delete) with image upload for new or existing products. Uploaded images are resized/compressed and stored with local menu data.
- JSON backup download and deletion of completed orders.
- Browser-local storage so the app can keep working without internet after its files are available locally.

## Uploading your own coffee photos

1. Open **Staff** and unlock the dashboard.
2. In **Menu management**, choose a photo under the new-drink form before tapping **Add menu item**. The image will appear on the customer menu.
3. To add a photo to a drink already listed, use **Upload image** beside that drink in the menu list. Use **Change image** to replace it later.
4. Select an image from the tablet/computer. The app resizes it before saving it in this browser. Use reasonably sized photos and export backups regularly because browser storage is limited.

## Important limitations before real shop use
1. **Local-only storage:** orders are stored in this browser's `localStorage`. Clearing browser data or changing device/browser can lose access to them. Download backups regularly.
2. **No multi-device sync:** the tablet and computer will not share orders yet. A backend is needed for a shared kitchen/staff dashboard.
3. **Demo staff PIN:** default PIN is `1234`. Change it immediately. This simple PIN check is not secure authentication and the data is not encrypted.
4. **Payment:** no online payment is processed. GCash QR payment must be configured with your official merchant QR and confirmed by staff.
5. **Receipts/printers:** no automatic receipt printer integration yet.
6. **Installability:** a full PWA requires HTTPS or localhost for service workers. This starter includes a manifest, but does not yet include a service worker/offline cache.

## Recommended next production steps
- Add a backend API and SQLite database on a shop computer or local server.
- Sync all kiosk devices and the staff screen over the shop's local Wi-Fi.
- Add secure staff accounts, audit logs, and automated backups.
- Integrate a supported payment provider if automatic payment confirmation is required.
- Add kitchen display, receipt printer support, and a tested kiosk/locked-down mode.
