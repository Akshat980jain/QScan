# QRVault - QR Code Storage and Builder

A full-stack application for generating, storing, and managing QR codes with React frontend and Node.js/Express backend.

## 🛠️ Issues Fixed

### Backend Issues Fixed:
1. **✅ Incomplete `index.js` file** - Fixed truncated code and added complete API routes
2. **✅ Missing dependencies** - Installed all required packages
3. **✅ MongoDB deprecation warnings** - Removed deprecated connection options
4. **✅ Environment configuration** - Added `.env` file with default settings
5. **✅ Security vulnerabilities** - Fixed with `npm audit fix`

### Frontend Issues Fixed:
1. **✅ Missing dependencies** - Installed all required packages
2. **✅ Outdated browserslist database** - Updated to latest version
3. **✅ Build process** - Verified successful compilation

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (optional - backend has in-memory fallback)

### Backend Setup
```bash
cd backend
npm install
npm start
```
Server runs on: http://localhost:5000

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
App runs on: http://localhost:5173

### Run Both Together
```bash
cd frontend
npm run start:all
```

## 📁 Project Structure

```
├── backend/                 # Express.js API server
│   ├── config/             # Database configuration
│   ├── middleware/         # Authentication & security
│   ├── routes/             # API routes (auth, qrcodes)
│   ├── models/             # Database models
│   ├── app.js              # Main application (with MongoDB)
│   ├── index.js            # Simplified in-memory version
│   └── server.js           # Server entry point
└── frontend/               # React + Vite application
    ├── src/
    │   ├── components/     # React components
    │   ├── context/        # State management
    │   └── App.tsx         # Main app component
    └── dist/               # Built assets
```

## 🔧 Configuration

### Environment Variables
Backend `.env` file includes:
- `NODE_ENV=development`
- `PORT=5000`
- `FRONTEND_URL=http://localhost:5173`
- `MONGODB_URI=mongodb://localhost:27017/qrvault`
- `JWT_SECRET=your-super-secret-jwt-key-change-this-in-production`

## 🔐 Security Notes

- Change the JWT secret in production
- The backend has both MongoDB (app.js) and in-memory (index.js) versions
- CORS is configured for local development
- Rate limiting and security headers are enabled

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend build test
cd frontend
npm run build
```

## 📦 Features

- QR Code generation with customization
- User authentication (JWT)
- QR Code storage and management
- File upload support
- Responsive React UI with Tailwind CSS
- RESTful API with Express.js

## 🛡️ Security Features

- JWT authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- Password hashing with bcrypt

All critical issues have been resolved and the application is ready for development!