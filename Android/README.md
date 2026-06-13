# QRVault Android App

A native Android application for creating, managing, and scanning QR codes. Built with Kotlin and Jetpack Compose.

## Features

- 📱 **QR Code Generation**: Create QR codes for various content types (Text, URL, Email, Phone, SMS, WiFi, vCard, Location)
- 📷 **QR Code Scanner**: Scan QR codes using CameraX and ML Kit
- 📚 **QR Library**: Save and manage your QR codes with cloud sync
- 🔐 **Authentication**: Secure user authentication with JWT tokens
- 🎨 **Modern UI**: Material 3 design with Jetpack Compose
- 🌙 **Dark Mode**: System-aware theme support

## Tech Stack

- **Language**: Kotlin
- **UI**: Jetpack Compose with Material 3
- **Navigation**: Compose Navigation
- **Networking**: Retrofit + OkHttp
- **QR Generation**: ZXing
- **QR Scanning**: CameraX + ML Kit Barcode Scanning
- **Local Storage**: DataStore Preferences
- **Image Loading**: Coil
- **Async**: Kotlin Coroutines

## Project Structure

```
app/
├── src/main/
│   ├── java/com/qrvault/app/
│   │   ├── data/
│   │   │   ├── model/          # Data classes
│   │   │   ├── network/        # Retrofit API service
│   │   │   └── repository/     # Data repositories
│   │   ├── ui/
│   │   │   ├── navigation/     # Navigation setup
│   │   │   ├── screens/        # Composable screens
│   │   │   └── theme/          # Material theme
│   │   ├── MainActivity.kt
│   │   └── QRVaultApplication.kt
│   └── res/
│       ├── drawable/           # Vector drawables
│       ├── mipmap-*/           # App icons
│       ├── values/             # Strings, colors, themes
│       └── xml/                # Config files
```

## Setup

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34

### Backend Configuration

1. Open `app/src/main/java/com/qrvault/app/data/network/RetrofitClient.kt`
2. Update the `BASE_URL` to point to your backend:

```kotlin
// For Android Emulator (localhost)
private const val BASE_URL = "http://10.0.2.2:5000/"

// For physical device on same network
private const val BASE_URL = "http://YOUR_LOCAL_IP:5000/"

// For production
private const val BASE_URL = "https://your-deployed-backend.com/"
```

### Building

1. Open the project in Android Studio
2. Sync Gradle files
3. Run on an emulator or physical device

```bash
# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease
```

## API Integration

The app connects to the QRVault backend API with the following endpoints:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### QR Codes
- `GET /api/qrcodes` - Get user's QR codes
- `GET /api/qrcodes/:id` - Get single QR code
- `POST /api/qrcodes` - Create QR code
- `PUT /api/qrcodes/:id` - Update QR code
- `DELETE /api/qrcodes/:id` - Delete QR code

## Permissions

The app requires the following permissions:

- `INTERNET` - For API communication
- `CAMERA` - For QR code scanning
- `READ/WRITE_EXTERNAL_STORAGE` - For saving QR code images

## License

MIT License - See LICENSE file for details.
