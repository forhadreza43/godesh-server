# GoDesh Server

A comprehensive backend API server for GoDesh, a tour guide and travel package booking platform. Built with Node.js, Express.js, and MongoDB, following MVC architecture with ES6 modules.

## 🚀 Features

- **User Management**: Registration, authentication, and role-based access control (Tourist, Guide, Admin)
- **Tour Packages**: Create, browse, search, and manage travel packages
- **Bookings**: Complete booking system with status management
- **Stories**: Travel stories sharing platform with approval system
- **Guide Applications**: Tour guide application and approval workflow
- **Payment Integration**: Stripe payment processing for bookings
- **Admin Dashboard**: Administrative tools and statistics
- **JWT Authentication**: Secure token-based authentication
- **RESTful API**: Clean and organized REST API endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Payment**: Stripe
- **Module System**: ES6 Modules
- **Architecture**: MVC (Model-View-Controller)

## 📁 Project Structure

```
server/
├── config/
│   └── database.js          # Database connection configuration
├── models/                   # Data access layer (MongoDB models)
│   ├── User.js
│   ├── Package.js
│   ├── Story.js
│   ├── Booking.js
│   ├── Payment.js
│   └── GuideApplication.js
├── controllers/              # Business logic layer
│   ├── authController.js
│   ├── userController.js
│   ├── packageController.js
│   ├── storyController.js
│   ├── bookingController.js
│   ├── paymentController.js
│   ├── adminController.js
│   └── guideApplicationController.js
├── routes/                   # Route definitions
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── packageRoutes.js
│   ├── storyRoutes.js
│   ├── bookingRoutes.js
│   ├── paymentRoutes.js
│   ├── adminRoutes.js
│   └── guideApplicationRoutes.js
├── middleware/
│   └── auth.js              # Authentication & authorization middleware
├── index.js                 # Main application entry point
├── package.json
├── nodemon.json             # Nodemon configuration
└── .env                     # Environment variables (not committed)
```

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   ACCESS_TOKEN_SECRET=your_jwt_secret_key
   STRIPE_SK=your_stripe_secret_key
   ```

4. **Run the server**
   
   Development mode (with auto-reload):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port number | No (default: 3000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `ACCESS_TOKEN_SECRET` | JWT secret key for token signing | Yes |
| `STRIPE_SK` | Stripe secret key for payment processing | Yes |

## 📡 API Endpoints

### Authentication
- `POST /jwt` - Generate JWT token

### Users
- `PUT /users` - Create or update user
- `GET /users` - Get users (with optional email query)
- `GET /users/admin` - Get users with admin filters (search, pagination)
- `GET /users/role/guide` - Get tour guides
- `GET /users/:id` - Get user by ID
- `GET /users/role/:email` - Get user role by email
- `PATCH /users` - Update user information
- `PATCH /users/request-role` - Request role change
- `PATCH /users/approve-role` - Approve role change (admin)
- `PATCH /users/approve/:id` - Approve user application
- `PATCH /users/reject/:id` - Reject user application

### Packages
- `POST /packages` - Create new package
- `GET /packages` - Get packages (with filters: search, sort, category, pagination)
- `GET /packages/:id` - Get package by ID
- `GET /packages/categories` - Get all package categories
- `GET /random-packages` - Get random packages (backward compatibility)

### Stories
- `POST /stories` - Create new story
- `GET /stories` - Get stories (with filters: email, status, random)
- `GET /stories/all-stories` - Get all stories with pagination
- `GET /stories/:id` - Get story by ID
- `PATCH /stories/:id` - Update story
- `PATCH /stories/:id/approve` - Approve/reject story (admin)
- `PATCH /stories/add-image/:id` - Add image to story
- `PATCH /stories/remove-image/:id` - Remove image from story
- `DELETE /stories/:id` - Delete story

### Bookings
- `POST /bookings` - Create new booking
- `GET /bookings` - Get bookings by tourist email
- `GET /bookings/:id` - Get booking by ID
- `GET /bookings/guide/:guideId` - Get bookings by guide ID
- `PATCH /bookings/:id/status` - Update booking status
- `DELETE /bookings/:id` - Delete booking

### Payments
- `POST /create-booking-payment-intent` - Create Stripe payment intent
- `POST /payments` - Store payment record

### Guide Applications
- `POST /guide-applications` - Submit guide application
- `GET /guide-applications` - Get application by email

### Admin
- `GET /admin/stats` - Get admin statistics (requires admin role)

## 🔒 Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Role-Based Access Control

- **Tourist**: Default role for registered users
- **Guide**: Approved tour guides
- **Admin**: Administrative access

## 🧪 Development

The project uses `nodemon` for development with automatic server restarts on file changes.

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## 📝 API Documentation

### Request/Response Examples

#### Generate JWT Token
```bash
POST /jwt
Content-Type: application/json

{
  "email": "user@example.com"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Create Package
```bash
POST /packages
Content-Type: application/json

{
  "tripTitle": "Beautiful Beach Tour",
  "price": 500,
  "tourType": "adventure",
  ...
}
```

#### Create Booking
```bash
POST /bookings
Content-Type: application/json

{
  "touristEmail": "tourist@example.com",
  "guideId": "guide123",
  "packageId": "package456",
  "price": 500,
  ...
}
```

## 🚢 Deployment

The project includes `vercel.json` for Vercel deployment configuration.

### Deployment Checklist
- [ ] Set environment variables in deployment platform
- [ ] Ensure MongoDB connection is accessible
- [ ] Configure CORS settings for production domain
- [ ] Set up Stripe keys for production

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request



## 👥 Authors

- Forhad Reza - Initial work

## 🙏 Acknowledgments

- Express.js community
- MongoDB for database solutions
- Stripe for payment processing

---

For more information, please contact [forhad.bimt@example.com]

