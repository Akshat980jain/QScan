# QRVault (QScan) — Full-Stack QR Code Ecosystem

🌐 **Live Hosted Frontend**: [https://qscan-2q1l.onrender.com](https://qscan-2q1l.onrender.com)

QRVault (QScan) is a modern, multi-platform QR code management ecosystem. It consists of a secure Node.js backend API, a dynamic React + TypeScript web application, and a native Kotlin + Jetpack Compose Android client.

With QRVault, users can generate custom QR codes, scan them using their mobile device cameras or web browsers, track scan history, view analytics, and manage their QR vaults seamlessly across platforms.

---

## Repository Structure

The repository is structured as a monorepo containing three main modules:

```text
QScan/
├── Android/                 # Native Android App (Kotlin + Jetpack Compose)
├── backend/                 # Backend REST API (Node.js + Express + MongoDB)
└── frontend/                # Web Frontend Application (Vite + React + TS + Tailwind)
```

- **[Android App](file:///e:/QScan/Android)**: Native mobile app utilizing CameraX, ML Kit Barcode Scanning, and Retrofit to scan and store QR codes.
- **[Backend API](file:///e:/QScan/backend)**: RESTful API powered by Express and MongoDB/Mongoose, handling user authentication, analytics, scan-tracking, and storage.
- **[Frontend Web App](file:///e:/QScan/frontend)**: A sleek web portal for managing, building, and scanning QR codes from the desktop or web.

---

## Component Details

### 1. Backend REST API
- **Location**: `[backend/](file:///e:/QScan/backend)`
- **Tech Stack**: Node.js, Express, MongoDB (Mongoose), Jest (Testing), JWT (Auth).
- **Core Capabilities**:
  - Secure signup, login, profile management, and password hashing (bcrypt).
  - QR Code CRUD operations with type validations (Text, URL, WiFi, Contact, Email, Phone, SMS).
  - Scan analytics tracking (automatically counts scans and tracks metadata).
  - Rate limiting and security headers (Helmet, CORS validation).
- **Sub-documentation**: See [backend/README.md](file:///e:/QScan/backend/README.md) for endpoint details and API usage.

### 2. Frontend Web App
- **Location**: `[frontend/](file:///e:/QScan/frontend)`
- **Live URL**: [https://qscan-2q1l.onrender.com](https://qscan-2q1l.onrender.com)
- **Tech Stack**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, ZXing Browser.
- **Core Capabilities**:
  - Interactive QR Code Generator with download option.
  - Webcam-based QR Scanner and image file dropzone decoder.
  - Account Dashboard showing scan history, statistics, and saved QR codes.
  - Synchronized state management and API integration.

### 3. Android Mobile Application
- **Location**: `[Android/](file:///e:/QScan/Android)`
- **Tech Stack**: Kotlin, Jetpack Compose, Material 3, Retrofit + OkHttp, CameraX, ML Kit.
- **Core Capabilities**:
  - High-performance scanning using the device's camera via Google ML Kit.
  - Native ZXing QR code generator.
  - Offline compatibility with remote synchronization when connected.
- **Sub-documentation**: See [Android/README.md](file:///e:/QScan/Android/README.md) for build options and emulator setups.

---

## Getting Started

### Prerequisites
Before running any component of QRVault, ensure you have:
- **Node.js** (v16.0.0 or higher)
- **MongoDB** (running locally or a cloud database instance on MongoDB Atlas)
- **Android Studio** (Hedgehog or later) with **JDK 17** (for mobile building)

---

### Step-by-Step Installation & Run Guide

#### Step 1: Spin up the Backend API
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Set up your environment variables by copying the template file:
   ```bash
   cp .env.example .env
   ```
   Open the newly created [backend/.env](file:///e:/QScan/backend/.env) and populate it with your local or Atlas MongoDB URI, port selection, and JWT secret key:
   - `MONGODB_URI`: Connection string (default: `mongodb://localhost:27017/qrvault`)
   - `JWT_SECRET`: Random hash key (at least 64 chars long)
4. (Optional) Populate the database with test data:
   ```bash
   npm run seed
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   The backend API will run by default on `http://localhost:5000`. You can test it by requesting the health status at `http://localhost:5000/health`.

---

#### Step 2: Spin up the Web Frontend
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Configure the frontend api URL in [frontend/.env](file:///e:/QScan/frontend/.env):
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run by default on `http://localhost:5173`. Open this URL in your browser to interact with the application UI.

---

#### Step 3: Run the Android App
1. Open the **[Android](file:///e:/QScan/Android)** folder in Android Studio.
2. Ensure you have Android SDK 34 installed and Gradle synched.
3. Configure the backend connection in `app/src/main/java/com/qrvault/app/data/network/RetrofitClient.kt`:
   - Set `BASE_URL` to `http://10.0.2.2:5000/` if testing on the Android Emulator.
   - Set `BASE_URL` to your local IP address (e.g. `http://192.168.x.x:5000/`) if testing on a physical device.
4. Run the app on your connected device or emulator by clicking **Run** in Android Studio, or compile it via CLI:
   ```bash
   # From the Android directory
   ./gradlew assembleDebug
   ```

---

## Running Tests

You can run automated integration and unit tests for the backend API to ensure that features like JWT authentication, middlewares, and CRUD operations function correctly:

```bash
cd backend
npm test
```

Tests use Jest and `mongodb-memory-server` to execute against an in-memory database instance so that your local database is untouched.

---

## License

This project is licensed under the MIT License. See individual directories for details.
