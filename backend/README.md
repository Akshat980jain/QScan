# QRVault Backend API

A comprehensive backend API for QRVault - QR Code Storage and Builder application.

## Features

- **User Authentication**: Registration, login, profile management
- **QR Code Management**: Create, read, update, delete QR codes
- **Multiple QR Types**: Text, URL, WiFi, Contact, Email, Phone, SMS
- **Advanced Search**: Filter by type, search content, pagination
- **Statistics**: User dashboard with QR code analytics
- **Security**: JWT authentication, rate limiting, input validation
- **Database**: MongoDB with Mongoose ODM

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

5. Start MongoDB service:
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community

   # On Ubuntu/Debian
   sudo systemctl start mongod

   # On Windows
   net start MongoDB
   ```

6. Seed the database (optional):
   ```bash
   npm run seed
   ```

7. Start the server:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### QR Codes
- `POST /api/qr-codes` - Create QR code
- `GET /api/qr-codes` - Get user's QR codes (with pagination)
- `GET /api/qr-codes/:id` - Get specific QR code
- `PUT /api/qr-codes/:id` - Update QR code
- `DELETE /api/qr-codes/:id` - Delete QR code
- `POST /api/qr-codes/:id/scan` - Increment scan count
- `GET /api/qr-codes/stats/summary` - Get user statistics

### Health Check
- `GET /health` - Server health status

## Database Schema

### User Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  avatar: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### QRCode Model
```javascript
{
  userId: ObjectId (required),
  name: String (required),
  type: String (required, enum),
  content: String (required),
  image: String (required),
  metadata: Object,
  scanCount: Number,
  lastScanned: Date,
  isPublic: Boolean,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/qrvault
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Input Validation**: Express-validator for request validation
- **CORS**: Configured for frontend integration
- **Helmet**: Security headers middleware
- **Error Handling**: Comprehensive error management

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create QR Code
```bash
curl -X POST http://localhost:5000/api/qr-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Website",
    "type": "url",
    "content": "https://example.com",
    "image": "data:image/png;base64,..."
  }'
```

### Get QR Codes with Pagination
```bash
curl -X GET "http://localhost:5000/api/qr-codes?page=1&limit=10&type=url" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Development

### Running Tests
```bash
npm test
```

### Code Structure
```
server/
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── config/          # Configuration files
├── utils/           # Utility functions
├── scripts/         # Database scripts
├── app.js           # Express app setup
└── server.js        # Server entry point
```

### Adding New Features

1. Create model in `models/`
2. Add routes in `routes/`
3. Implement middleware if needed
4. Add validation rules
5. Update documentation

## Production Deployment

1. Set `NODE_ENV=production`
2. Use process manager (PM2)
3. Set up reverse proxy (Nginx)
4. Configure SSL certificates
5. Set up monitoring and logging
6. Use MongoDB Atlas for database

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check connection string
   - Verify network access

2. **JWT Token Invalid**
   - Check JWT_SECRET configuration
   - Verify token format
   - Check token expiration

3. **Rate Limit Exceeded**
   - Wait for rate limit window to reset
   - Adjust rate limit settings if needed

### Logs

The application uses Morgan for HTTP request logging:
- Development: Detailed colored logs
- Production: Combined format logs

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License - see LICENSE file for details