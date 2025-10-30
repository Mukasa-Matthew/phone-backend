# Phone Backend API

A Node.js backend application with PostgreSQL database, built with best practices in mind.

## Features

- ✅ Express.js RESTful API
- ✅ PostgreSQL database with Sequelize ORM
- ✅ Complete authentication system (JWT-based)
- ✅ User registration and login
- ✅ Superadmin login
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ Automatic table creation on server start
- ✅ Automatic superadmin seeding
- ✅ Request validation using express-validator
- ✅ Error handling middleware
- ✅ Security middleware (Helmet, CORS)
- ✅ Async/await error handling
- ✅ Environment-based configuration
- ✅ Clean project structure

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. Clone the repository and navigate to the project directory:
```bash
cd phone
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (copy from `.env.example`):
```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=phone_db
DB_USER=postgres
DB_PASSWORD=your_password_here

JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

SUPERADMIN_NAME=Super Admin
SUPERADMIN_EMAIL=superadmin@example.com
SUPERADMIN_PASSWORD=admin123456
```

4. Make sure PostgreSQL is running and create the database:
```sql
CREATE DATABASE phone_db;
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will automatically:
- Connect to the PostgreSQL database
- Create all tables if they don't exist
- Seed a superadmin account (if it doesn't exist)
- Start listening on the specified port (default: 3000)

**Default Superadmin Credentials:**
- Email: `superadmin@example.com` (or from `SUPERADMIN_EMAIL`)
- Password: `admin123456` (or from `SUPERADMIN_PASSWORD`)

⚠️ **Important**: Change the default superadmin password after first login!

## Project Structure

```
phone/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── controllers/
│   │   ├── authController.js    # Authentication handlers
│   │   └── userController.js    # User route handlers
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── errorHandler.js      # Global error handler
│   │   ├── asyncHandler.js   # Async wrapper
│   │   └── validation.js        # Validation middleware
│   ├── models/
│   │   ├── User.js              # User model
│   │   └── index.js             # Models index
│   ├── routes/
│   │   ├── authRoutes.js        # Authentication routes
│   │   ├── userRoutes.js        # User routes
│   │   └── index.js             # Routes index
│   ├── scripts/
│   │   └── seedSuperadmin.js    # Superadmin seeder
│   ├── utils/
│   │   └── jwt.js               # JWT utilities
│   └── server.js                # Application entry point
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## API Endpoints

### Health Check
- `GET /api/health` - Check server status

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/superadmin/login` - Login as superadmin
- `GET /api/auth/me` - Get current user (Protected)
- `PUT /api/auth/update-password` - Update password (Protected)

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Example API Usage

### Authentication Examples

#### Register a New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+1234567890"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### Get Current User (Protected)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Superadmin Login
```bash
curl -X POST http://localhost:3000/api/auth/superadmin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "admin123456"
  }'
```

### User Management Examples

#### Get All Users
```bash
curl http://localhost:3000/api/users
```

#### Get Single User
```bash
curl http://localhost:3000/api/users/1
```

> 📖 **For detailed authentication documentation, see [AUTHENTICATION.md](./AUTHENTICATION.md)**

## Best Practices Implemented

1. **Environment Variables**: All sensitive data stored in `.env` file
2. **Error Handling**: Centralized error handling middleware
3. **Validation**: Request validation using express-validator
4. **Security**: Helmet for security headers, CORS configuration
5. **Code Organization**: Separation of concerns (routes, controllers, models)
6. **Async Handling**: Proper async/await with error catching
7. **Database**: ORM with Sequelize for type safety and migrations
8. **Logging**: Morgan for request logging
9. **Compression**: Response compression for better performance
10. **Database Sync**: Automatic table creation on startup

## Adding New Models

1. Create a new model file in `src/models/`:
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const YourModel = sequelize.define('YourModel', {
  // Define your fields here
}, {
  tableName: 'your_table',
  timestamps: true
});

module.exports = YourModel;
```

2. Export it from `src/models/index.js`
3. The table will be created automatically on next server start

## Deployment Notes

When deploying to a server:

1. Set `NODE_ENV=production` in your environment variables
2. Make sure PostgreSQL is accessible from your server
3. Update database credentials in `.env`
4. Run `npm install --production` on the server
5. Start the server with `npm start` or use a process manager like PM2

The application will automatically create all tables when it starts.

## License

ISC
# phone-backend

