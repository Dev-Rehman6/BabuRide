# Rider System API Documentation

## Overview
This API provides a complete rider management system with the following features:
- Rider registration and authentication
- Active/Offline status management
- Real-time location tracking
- Vehicle-type based ride filtering
- Admin dashboard for rider monitoring

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require JWT token authentication. Include the token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Rider Endpoints

### 1. Register Rider
**POST** `/riders/register`

Register a new rider with vehicle details.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.rider@example.com",
  "phone": "+92300123456",
  "password": "password123",
  "vehicleId": "KHI-123",
  "vehicleType": "bike",
  "vehicleMake": "Honda",
  "vehicleModel": "CD 70",
  "vehicleColor": "Red",
  "licenseNumber": "LIC-12345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rider registered successfully",
  "token": "jwt_token_here",
  "rider": {
    "id": "rider_id",
    "name": "John Doe",
    "email": "john.rider@example.com",
    "phone": "+92300123456",
    "vehicleType": "bike",
    "isActive": false
  }
}
```

### 2. Login Rider
**POST** `/riders/login`

Authenticate rider and get JWT token.

**Request Body:**
```json
{
  "email": "john.rider@example.com",
  "password": "password123"
}
```

### 3. Toggle Active/Offline Status
**PUT** `/riders/toggle-status` 🔒

Toggle rider between active and offline status.

**Request Body:**
```json
{
  "isActive": true,
  "latitude": 24.8607,
  "longitude": 67.0011
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rider status updated to active",
  "rider": {
    "id": "rider_id",
    "isActive": true,
    "currentLocation": {
      "latitude": 24.8607,
      "longitude": 67.0011,
      "lastUpdated": "2024-01-01T10:00:00.000Z"
    }
  }
}
```

### 4. Update Location
**PUT** `/riders/update-location` 🔒

Update rider's current location.

**Request Body:**
```json
{
  "latitude": 24.8615,
  "longitude": 67.0020
}
```

### 5. Get Available Rides
**GET** `/riders/available-rides` 🔒

Get rides that match the rider's vehicle type and are available for acceptance.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "rides": [
    {
      "_id": "ride_id",
      "passenger": {
        "name": "Jane Smith",
        "phone": "+92300987654"
      },
      "pickup": {
        "address": "Saddar, Karachi",
        "latitude": 24.8607,
        "longitude": 67.0011
      },
      "dropoff": {
        "address": "DHA Phase 2, Karachi",
        "latitude": 24.8397,
        "longitude": 67.0353
      },
      "vehicleType": "bike",
      "fare": 150,
      "status": "requested"
    }
  ]
}
```

### 6. Accept Ride
**PUT** `/riders/accept-ride/:rideId` 🔒

Accept a specific ride request.

**Response:**
```json
{
  "success": true,
  "message": "Ride accepted successfully",
  "ride": {
    "_id": "ride_id",
    "status": "accepted",
    "acceptedAt": "2024-01-01T10:05:00.000Z",
    "passenger": {
      "name": "Jane Smith",
      "phone": "+92300987654"
    }
  }
}
```

### 7. Start Ride
**PUT** `/riders/start-ride/:rideId` 🔒

Mark ride as started when rider picks up passenger.

### 8. Complete Ride
**PUT** `/riders/complete-ride/:rideId` 🔒

Mark ride as completed and update earnings.

**Request Body:**
```json
{
  "actualDuration": 15,
  "passengerRating": 5
}
```

### 9. Get Ride History
**GET** `/riders/ride-history` 🔒

Get rider's completed rides with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

### 10. Get Rider Profile
**GET** `/riders/profile` 🔒

Get complete rider profile information.

---

## Admin Endpoints

### 1. Get All Riders
**GET** `/admin/riders` 🔒

Get all riders with filtering options.

**Query Parameters:**
- `isActive` (optional): Filter by active status (true/false)
- `vehicleType` (optional): Filter by vehicle type (bike/car)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "rider_id",
      "name": "John Doe",
      "email": "john.rider@example.com",
      "phone": "+92300123456",
      "vehicleType": "bike",
      "vehicleMake": "Honda",
      "vehicleModel": "CD 70",
      "isActive": true,
      "currentLocation": {
        "latitude": 24.8607,
        "longitude": 67.0011,
        "lastUpdated": "2024-01-01T10:00:00.000Z"
      },
      "statusText": "Active",
      "locationStatus": "Available"
    }
  ]
}
```

### 2. Get Active Riders Only
**GET** `/admin/riders/active` 🔒

Get only active riders with their current locations.

### 3. Get Rider by ID
**GET** `/admin/riders/:riderId` 🔒

Get detailed information about a specific rider including recent rides.

### 4. Get Rider Statistics
**GET** `/admin/riders/statistics` 🔒

Get comprehensive rider statistics.

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalRiders": 50,
    "activeRiders": 15,
    "offlineRiders": 35,
    "verifiedRiders": 45,
    "unverifiedRiders": 5,
    "bikeRiders": 30,
    "carRiders": 20,
    "ridersWithLocation": 15
  }
}
```

### 5. Update Rider Verification
**PATCH** `/admin/riders/:riderId/verification` 🔒

Update rider verification status.

**Request Body:**
```json
{
  "isVerified": true
}
```

### 6. Add Rider Bonus
**POST** `/admin/riders/bonus` 🔒

Add bonus earnings to a rider.

**Request Body:**
```json
{
  "riderId": "rider_id_here",
  "bonusAmount": 500
}
```

### 7. Get All Rides
**GET** `/admin/rides` 🔒

Get all rides with rider and passenger details.

**Query Parameters:**
- `status` (optional): Filter by ride status
- `vehicleType` (optional): Filter by vehicle type
- `riderId` (optional): Filter by specific rider

### 8. Get Ride Statistics
**GET** `/admin/rides/statistics` 🔒

Get comprehensive ride statistics.

---

## Key Features

### 1. Vehicle Type Filtering
- Riders only see ride requests that match their vehicle type
- Admin can filter riders and rides by vehicle type
- Prevents mismatched ride assignments

### 2. Real-time Status Tracking
- Riders can toggle between active and offline
- Location is updated in real-time when active
- Admin dashboard shows current status of all riders

### 3. Location Management
- Riders must provide location when going active
- Location is cleared when going offline
- Admin can see current location of active riders

### 4. Comprehensive Admin Dashboard
- View all riders with their status and location
- Filter and search functionality
- Detailed statistics and analytics
- Rider verification management

### 5. Earnings Tracking
- Automatic earnings calculation when rides are completed
- Daily, monthly, and total earnings tracking
- Admin can add bonus earnings

---

## Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request / Validation error
- `401` - Unauthorized / Invalid token
- `403` - Forbidden / Access denied
- `404` - Not found
- `500` - Internal server error

---

## Usage Flow

1. **Rider Registration**: Rider registers with vehicle details
2. **Authentication**: Rider logs in and receives JWT token
3. **Go Active**: Rider toggles status to active and provides location
4. **Receive Rides**: System shows available rides matching vehicle type
5. **Accept Ride**: Rider accepts a ride request
6. **Complete Ride**: Rider completes the ride and earnings are updated
7. **Admin Monitoring**: Admin can monitor all active riders and their locations

🔒 = Requires Authentication