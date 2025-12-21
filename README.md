# Dealer Network - Real Estate Property Management System

A comprehensive Progressive Web Application (PWA) for real estate dealers to manage, share, and discover property deals. Built with React, TypeScript, and modern web technologies.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Installation & Setup](#installation--setup)
6. [Database Schema](#database-schema)
7. [Backend API](#backend-api)
8. [Frontend Architecture](#frontend-architecture)
9. [Key Components](#key-components)
10. [State Management](#state-management)
11. [Authentication System](#authentication-system)
12. [Property Management](#property-management)
13. [Map Integration](#map-integration)
14. [Search & Filter System](#search--filter-system)
15. [PWA Configuration](#pwa-configuration)
16. [Styling & Design](#styling--design)
17. [Utils & Helpers](#utils--helpers)
18. [Mobile Optimization](#mobile-optimization)
19. [Error Handling](#error-handling)
20. [Testing](#testing)
21. [Deployment](#deployment)
22. [Troubleshooting](#troubleshooting)

---

## Overview

**Dealer Network** is a real estate property management platform designed for dealers to:
- Add and manage property listings (own properties)
- Browse and discover properties from other dealers (public properties)
- View properties on an interactive map
- Filter and search properties by multiple criteria
- Share property details via WhatsApp, SMS, and social media
- Track favorite properties and add personal notes
- Work offline with PWA capabilities

The application supports both **PC and mobile devices** with a fully responsive design and can be installed as a Progressive Web App on iOS and Android.

---

## Features

### Core Features
- ✅ **User Authentication**: Secure login/registration with PIN-based authentication
- ✅ **Property Management**: Add, edit, delete, and manage property listings
- ✅ **Interactive Map**: Leaflet-based map with marker clustering and GPS location
- ✅ **Advanced Search & Filters**: Filter by city, area, type, price, size, location, and more
- ✅ **Favorites & Notes**: Mark properties as favorites and add personal notes
- ✅ **Public/Private Sharing**: Control property visibility (public or private)
- ✅ **Property Sharing**: Share via WhatsApp, SMS, copy link, or download details
- ✅ **Ratings**: Rate properties with public and private ratings
- ✅ **Offline Support**: PWA with offline caching and service workers
- ✅ **Responsive Design**: Optimized for mobile, tablet, and desktop

### Advanced Features
- ✅ **Clickable Text**: Auto-detect and make phone numbers and URLs clickable
- ✅ **Line Break Support**: Preserve line breaks in descriptions and notes
- ✅ **GPS Integration**: Get current location and navigate to properties
- ✅ **Map Rendering Fixes**: Intelligent map size invalidation and visibility detection
- ✅ **Font Consistency**: Unified fonts across all devices with anti-aliasing
- ✅ **Offline Logout Fix**: Prevent logout on network errors
- ✅ **Property Icons**: Custom icons for 20+ property types
- ✅ **Size Unit Conversion**: Automatic conversion between Gaj, SqFt, Marla, Kanal, Acre
- ✅ **Price Formatting**: Display in Lakhs, Crores, and Thousands (k)

---

## Technology Stack

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript
- **Build Tool**: Vite 5.4.2
- **Routing**: React Router DOM 7.9.5
- **Styling**: Tailwind CSS 3.4.1
- **Icons**: Lucide React 0.344.0, React Icons 5.5.0, Font Awesome 6.4.0
- **Map**: Leaflet 1.9.4, React Leaflet 4.2.1, React Leaflet Cluster 3.0.0
- **HTTP Client**: Axios 1.13.1
- **PWA**: vite-plugin-pwa 0.20.5

### Backend
- **Server**: PHP
- **Database**: MySQL
- **API**: RESTful API
- **Hosting**: https://prop.digiheadway.in/api/dealer_network/

### Development Tools
- **Linting**: ESLint 9.9.1
- **Type Checking**: TypeScript 5.5.3
- **CSS Processing**: PostCSS 8.4.35, Autoprefixer 10.4.18
- **Image Processing**: Sharp 0.34.5

---

## System Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │   Auth   │  │Properties│  │   Map    │  │ Profile ││
│  │  Pages   │  │  Pages   │  │  View    │  │  Page   ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘│
│       │             │              │              │      │
│  ┌────┴─────────────┴──────────────┴──────────────┴───┐│
│  │          Components Layer (26 components)          ││
│  └──────────────────────┬─────────────────────────────┘│
│                         │                               │
│  ┌──────────────────────┴─────────────────────────────┐│
│  │         Services Layer (API, Auth API)             ││
│  └──────────────────────┬─────────────────────────────┘│
└─────────────────────────┼─────────────────────────────┘
                          │ HTTP (Axios)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend (PHP + MySQL)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │ auth.php │  │fetch.php │  │action.php│  │area.php ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘│
│       │             │              │              │      │
│  ┌────┴─────────────┴──────────────┴──────────────┴───┐│
│  │              MySQL Database                        ││
│  │  ┌───────────────┐  ┌──────────────────┐          ││
│  │  │network_users  │  │network_properties│          ││
│  │  └───────────────┘  └──────────────────┘          ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction** → React Component
2. **Component** → Service Layer (API calls)
3. **Service** → Backend PHP APIs (Axios HTTP)
4. **PHP Backend** → MySQL Database
5. **Database Response** → PHP Backend
6. **Backend Response** → Service Layer
7. **Service Layer** → Component State Update
8. **State Update** → UI Re-render

---

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PHP 7.4+ (for backend)
- MySQL 5.7+ (for database)
- Git

### Frontend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/deal_network.git
   cd deal_network
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

### Backend Setup

1. **Upload PHP files** to your server:
   - `auth.php` - Authentication endpoints
   - `fetch.php` - Property fetching with filters
   - `action.php` - Property CRUD operations
   - `area.php` - Area and city options

2. **Configure database** (see [Database Schema](#database-schema))

3. **Update API endpoint** in frontend:
   Edit `src/services/api.ts`:
   ```typescript
   const API_BASE_URL = 'https://your-domain.com/api/dealer_network';
   ```

### Environment Configuration

Create a `.env` file (if needed):
```env
VITE_API_BASE_URL=https://prop.digiheadway.in/api/dealer_network
```

---

## Database Schema

### 1. `network_users` Table

Stores user account information.

```sql
CREATE TABLE `network_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(15) UNIQUE NOT NULL,
  `pin` VARCHAR(255) NOT NULL,
  `address` TEXT,
  `firm_name` VARCHAR(255),
  `city` VARCHAR(100),
  `area` VARCHAR(100),
  `city_covers` TEXT, -- JSON array of cities covered
  `area_covers` TEXT, -- JSON array of areas covered
  `default_city` VARCHAR(100),
  `default_area` VARCHAR(100),
  `default_type` VARCHAR(50),
  `default_unit` VARCHAR(20) DEFAULT 'Gaj',
  `default_privacy` ENUM('public', 'private') DEFAULT 'public',
  `token` VARCHAR(255) UNIQUE,
  `created_on` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_phone` (`phone`),
  INDEX `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. `network_properties` Table

Stores property listings.

```sql
CREATE TABLE `network_properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `owner_id` INT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `area` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `note_private` TEXT, -- Owner's private notes
  `size_min` DECIMAL(10,2),
  `size_max` DECIMAL(10,2),
  `size_unit` VARCHAR(20) DEFAULT 'Gaj',
  `price_min` DECIMAL(15,2),
  `price_max` DECIMAL(15,2),
  `location` VARCHAR(255), -- GPS coordinates (lat,lng)
  `location_accuracy` VARCHAR(50),
  `landmark_location` VARCHAR(255), -- Approximate landmark coordinates
  `landmark_location_distance` INT, -- Distance from landmark in meters
  `is_public` TINYINT(1) DEFAULT 1,
  `tags` TEXT, -- Comma-separated tags
  `highlights` TEXT, -- Comma-separated highlights
  `public_rating` DECIMAL(2,1) DEFAULT 0,
  `my_rating` DECIMAL(2,1) DEFAULT 0,
  `created_on` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_on` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_id`) REFERENCES `network_users`(`id`) ON DELETE CASCADE,
  INDEX `idx_owner` (`owner_id`),
  INDEX `idx_city` (`city`),
  INDEX `idx_area` (`area`),
  INDEX `idx_type` (`type`),
  INDEX `idx_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. `network_properties_view` (View)

A joined view combining property and owner information.

```sql
CREATE VIEW `network_properties_view` AS
SELECT 
  p.*,
  u.name AS owner_name,
  u.phone AS owner_phone,
  u.firm_name AS owner_firm_name
FROM network_properties p
LEFT JOIN network_users u ON p.owner_id = u.id;
```

### 4. `network_favorites` Table (Optional)

Stores user favorites and notes.

```sql
CREATE TABLE `network_favorites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `property_id` INT NOT NULL,
  `user_note` TEXT,
  `is_favourite` TINYINT(1) DEFAULT 1,
  `created_on` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_property` (`user_id`, `property_id`),
  FOREIGN KEY (`user_id`) REFERENCES `network_users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `network_properties`(`id`) ON DELETE CASCADE,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_property` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Backend API

All APIs are located at: `https://prop.digiheadway.in/api/dealer_network/`

### Authentication APIs (`auth.php`)

#### 1. Register User
```
POST /auth.php?action=register
Content-Type: application/json

Body:
{
  "name": "John Doe",
  "phone": "9876543210",
  "pin": "1234",
  "firm_name": "ABC Realty",
  "address": "123 Street, City",
  "city": "Chandigarh",
  "area": "Sector 17"
}

Response:
{
  "status": true,
  "message": "Registration successful",
  "data": {
    "id": 1,
    "name": "John Doe",
    "phone": "9876543210",
    "token": "abc123xyz..."
  }
}
```

#### 2. Login
```
POST /auth.php?action=login
Content-Type: application/json

Body:
{
  "phone": "9876543210",
  "pin": "1234"
}

Response:
{
  "status": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "name": "John Doe",
    "token": "abc123xyz..."
  }
}
```

#### 3. Get Profile
```
GET /auth.php?action=profile
Authorization: Bearer {token}

Response:
{
  "status": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "phone": "9876543210",
    "firm_name": "ABC Realty"
  }
}
```

#### 4. Update Profile
```
POST /auth.php?action=update_profile
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "name": "John Doe Updated",
  "firm_name": "New Firm Name"
}
```

#### 5. Change PIN
```
POST /auth.php?action=change_pin
Authorization: Bearer {token}

Body:
{
  "old_pin": "1234",
  "new_pin": "5678"
}
```

#### 6. Request OTP (Password Reset)
```
POST /auth.php?action=request_otp

Body:
{
  "phone": "9876543210"
}
```

#### 7. Verify OTP
```
POST /auth.php?action=verify_otp

Body:
{
  "phone": "9876543210",
  "otp": "123456"
}
```

### Property Fetch APIs (`fetch.php`)

#### 1. Get Properties List
```
GET /fetch.php?list={mine|both|others}&page=1&limit=20

Query Parameters:
- list: mine|both|others (required)
- page: page number (default: 1)
- limit: items per page (default: 20, max: 100)
- search: search text
- city: filter by city
- area: filter by area
- type: filter by property type
- min_price: minimum price
- max_price: maximum price
- min_size: minimum size
- max_size: maximum size
- size_unit: unit for size filter (Gaj, SqFt, Marla, Kanal, Acre)
- filter_size_unit: filter by specific size unit
- has_location: true|false
- has_landmark: true|false
- sortby: id|price|size|updated_on|created_on
- order: ASC|DESC
- for: map (returns only properties with location/landmark)

Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Properties fetched successfully",
  "data": [
    {
      "id": 1,
      "city": "Chandigarh",
      "area": "Sector 17",
      "type": "Residential Plot",
      "price_min": 5000000,
      "price_max": 7000000,
      "size_min": 100,
      "size_max": 150,
      "size_unit": "Gaj",
      "location": "30.7333,76.7794",
      "is_public": 1,
      "owner_name": "John Doe",
      "owner_phone": "9876543210"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total_records": 45,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false,
    "filters_applied": {...},
    "sorting": {
      "sortby": "id",
      "order": "DESC"
    }
  }
}
```

#### 2. Get Single Property
```
GET /fetch.php?action=get_property&id=1

Response:
{
  "success": true,
  "message": "Property fetched",
  "data": {
    "id": 1,
    "heading": "Beautiful 3 BHK",
    "description": "Spacious apartment...",
    ...
  }
}
```

### Property Action APIs (`action.php`)

#### 1. Add Property
```
POST /action.php?action=add_property
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "owner_id": 1,
  "city": "Chandigarh",
  "area": "Sector 17",
  "type": "Residential Plot",
  "description": "Beautiful plot...",
  "note_private": "Owner wants quick sale",
  "size_min": 100,
  "size_max": 150,
  "size_unit": "Gaj",
  "price_min": 5000000,
  "price_max": 7000000,
  "location": "30.7333,76.7794",
  "location_accuracy": "high",
  "landmark_location": "30.7335,76.7795",
  "landmark_location_distance": 500,
  "is_public": 1,
  "tags": "corner,park-facing",
  "highlights": "Park View,Corner Plot",
  "public_rating": 4.5,
  "my_rating": 5
}

Response:
{
  "success": true,
  "id": 123
}
```

#### 2. Update Property
```
POST /action.php?action=update_property
Authorization: Bearer {token}

Body:
{
  "id": 123,
  "owner_id": 1,
  "price_min": 5500000,
  "description": "Updated description..."
}
```

#### 3. Delete Property
```
GET /action.php?action=delete_property&id=123&owner_id=1
Authorization: Bearer {token}
```

### Options APIs (`area.php`)

#### Get Areas by City
```
GET /area.php?city=Chandigarh

Response:
{
  "status": true,
  "data": ["Sector 17", "Sector 22", "Sector 35", ...]
}
```

---

## Frontend Architecture

### Directory Structure

```
deal_network/
├── public/                    # Static assets
│   ├── icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── apple-touch-icon.png
│   └── manifest.webmanifest
├── src/
│   ├── components/            # React components (26 files)
│   │   ├── AuthPage.tsx       # Login/Register
│   │   ├── HomePage.tsx       # Landing page
│   │   ├── ProfilePage.tsx    # User profile
│   │   ├── PropertyCard.tsx   # Property list card
│   │   ├── PropertyDetailsContent.tsx
│   │   ├── PropertyDetailsModal.tsx
│   │   ├── PropertyModal.tsx  # Add/Edit property
│   │   ├── PropertyMap.tsx    # Map view
│   │   ├── SearchFilter.tsx   # Search & filter
│   │   ├── ShareModal.tsx     # Share dialog
│   │   ├── LocationModal.tsx  # Location picker
│   │   ├── ClickableText.tsx  # Auto-detect links/phones
│   │   └── ... (20 more)
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx    # Auth state management
│   ├── services/              # API services
│   │   ├── api.ts             # Main API client
│   │   └── authApi.ts         # Auth API methods
│   ├── types/                 # TypeScript types
│   │   ├── property.ts
│   │   ├── user.ts
│   │   └── userSettings.ts
│   ├── utils/                 # Utility functions
│   │   ├── areaCityApi.ts
│   │   ├── cacheUtils.ts
│   │   ├── filterOptions.ts
│   │   ├── leafletIcons.ts
│   │   ├── linkDetector.ts
│   │   ├── priceFormatter.ts
│   │   ├── rateFormatter.ts
│   │   ├── scrollLock.ts
│   │   ├── sizeFormatter.ts
│   │   └── textFormatter.ts
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # App entry point
│   ├── index.css              # Global styles
│   └── vite-env.d.ts
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## Key Components

### 1. **App.tsx** (Main Application)

The root component that handles:
- Routing with React Router
- Global state management
- Property list/map view toggle
- Add/Edit property modal
- Search and filter state

Key features:
- Dashboard view with property list
- Map view with Leaflet integration
- Public property sharing pages
- Property type test page
- Route persistence (remembers last page)

### 2. **AuthPage.tsx** (Authentication)

Handles user login and registration with:
- Phone number validation (10 digits)
- PIN-based authentication
- Remember me functionality (30 days)
- Forgot password flow
- Input validation and error handling

### 3. **PropertyCard.tsx** (Property List Item)

Displays property in list view with:
- Property icon based on type
- Price and size range
- Description with clickable links/phones
- Tags, highlights, and user notes
- Favorite indicator
- Public/Private visibility icon
- Owner information (for others' properties)

Features:
- Truncated description (2 lines max)
- Auto-capitalization fix for descriptions
- Line break support
- Click to view details

### 4. **PropertyDetailsContent.tsx** (Property Details)

Full property details view with:
- Complete property information
- Owner contact details (for public properties)
- Location map or landmark map
- Editable user notes
- Favorite toggle
- Public and private ratings
- Action buttons (Edit, Delete, Share)

Features:
- Clickable phone numbers and URLs
- Line break preservation
- GPS navigation
- WhatsApp contact
- Copy owner details

### 5. **PropertyModal.tsx** (Add/Edit Property)

Form to create or edit properties:
- City and area selection
- Property type dropdown
- Price range (min/max)
- Size range with unit selection
- Description with textarea
- Private notes (owner only)
- Location picker (GPS or manual)
- Landmark location (approximate)
- Public/Private visibility toggle
- Tags and highlights (multi-select)
- Ratings

Validation:
- Required fields check
- Numeric validation for price/size
- GPS coordinate validation

### 6. **PropertyMap.tsx** (Map View)

Interactive Leaflet map with:
- Marker clustering for multiple properties
- Custom icons for each property type
- User location marker
- GPS button (go to current location)
- Property popup on marker click
- Landmark vs exact location display
- Automatic map resizing

Features:
- **UserLocationFocuser**: Smoothly navigates to user location
- **MapSizeInvalidator**: Fixes map rendering after modals
- Performance optimizations with useMemo

### 7. **SearchFilter.tsx** (Search & Filters)

Advanced filtering system:
- **City filter**: Dropdown with all cities
- **Area filter**: Dynamic areas based on city
- **Property type**: Multi-select dropdown
- **Price range**: Min/Max with Lakh/Crore formatting
- **Size range**: Slider with unit selection (Gaj, SqFt, etc.)
- **Location filters**: Has location, Has landmark
- **Sort options**: By ID, Price, Size, Date
- **Active filter count**: Shows number of applied filters

Mobile vs Desktop:
- Mobile: Bottom sheet modal
- Desktop: Sidebar panel

### 8. **LocationModal.tsx** (Location Picker)

Interactive location selection:
- Search by address (geocoding)
- Click on map to set location
- GPS current location
- Nearby landmarks detection
- Accuracy indicator
- Save as exact or landmark location

### 9. **ShareModal.tsx** (Share Property)

Multiple sharing options:
- WhatsApp (with pre-formatted message)
- SMS
- Copy link
- Download as text/image
- Social media share

Generates shareable public URL for properties.

### 10. **ClickableText.tsx** (Auto-detect Links)

Utility component that:
- Detects phone numbers (Indian formats)
- Detects URLs (www and http/https)
- Makes them clickable
- Shows context menu (Copy, Call, Open)
- Preserves line breaks

---

## State Management

### Global State (Context API)

**AuthContext** (`src/contexts/AuthContext.tsx`):
- Current user information
- Login/Logout functions
- Token management
- Profile updates
- Session persistence (localStorage)

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}
```

### Local State (Component State)

Each component manages its own:
- Form inputs
- Modal visibility
- Loading states
- Error messages
- Validation errors

### URL State (React Router)

Route parameters:
- `/property/:id` - Property details page
- `/share/:id` - Public sharing page

### Persistent State (localStorage)

Stored data:
- Auth token
- Current user
- Last visited route
- Filter preferences (optional)

---

## Authentication System

### Flow Diagram

```
Registration Flow:
User → Enter Details → authApi.register() → Backend → Create User
     → Generate Token → Store in Context → Redirect to Dashboard

Login Flow:
User → Enter Phone/PIN → authApi.login() → Backend → Validate
     → Return Token → Store in Context → Redirect to Dashboard

Logout Flow:
User → Click Logout → authApi.logout() → Clear Token → Clear Context
     → Redirect to Login

Token Verification:
App Load → Check localStorage → authApi.getProfile() → Verify Token
        → Valid: Keep logged in | Invalid: Logout
```

### Security Features

1. **PIN-based Authentication**: 4-6 digit PIN (hashed on backend)
2. **Bearer Token**: JWT-like token for API authentication
3. **Token Expiry**: 30 days session timeout
4. **Secure Storage**: Token stored in localStorage (HTTPS required in production)
5. **Offline Handling**: Prevents logout on network errors
6. **Auto-logout**: On 401/403 responses
7. **OTP Reset**: Forgot password with OTP verification

### Authentication Interceptor

Axios interceptor in `api.ts`:
```typescript
// Automatically adds token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Logout on auth error
      authApi.logout();
    }
    return Promise.reject(error);
  }
);
```

---

## Property Management

### Property Lifecycle

```
Create:
User → Click "Add Property" → Fill Form → Submit → API POST
    → Save to DB → Refresh List → Show Success Toast

Edit:
User → Click "Edit" → Pre-fill Form → Modify → Submit → API PUT
    → Update DB → Refresh List → Show Success Toast

Delete:
User → Click "Delete" → Confirm → API DELETE → Remove from DB
    → Refresh List → Show Success Toast

View:
User → Click Property Card → Open Details Modal → Fetch Full Data
    → Display with Map/Owner Info → Allow Actions
```

### Property Visibility

**Private Properties** (`is_public: 0`):
- Only visible to owner
- Not shown in "Others" or "Both" lists
- Cannot be shared publicly
- Location and notes remain private

**Public Properties** (`is_public: 1`):
- Visible to all authenticated users
- Can be favorited and noted by others
- Shareable via public URL
- Landmark location visible (exact location hidden)

### Property Types

20+ supported property types with custom icons:

**Residential**:
- Residential Plot
- Residential House
- Independent Floor
- Flat/Apartment

**Commercial**:
- Commercial Plot
- Shop
- Showroom
- Commercial Builtup

**SCO**:
- SCO Plot
- SCO Builtup

**Industrial**:
- Industrial Land
- Factory
- Warehouse

**Agricultural**:
- Agriculture Land
- Farm House
- Ploting Land

**Others**:
- Labour Quarter
- Other

---

## Map Integration

### Leaflet Configuration

**Libraries Used**:
- `leaflet`: Core mapping library
- `react-leaflet`: React bindings
- `react-leaflet-cluster`: Marker clustering

**Map Features**:
1. **Tile Layer**: OpenStreetMap tiles
2. **Marker Clustering**: Groups nearby markers
3. **Custom Icons**: Property type-specific icons
4. **User Location**: GPS-based current location
5. **Landmark Markers**: Approximate locations
6. **Popups**: Property preview on marker click
7. **Auto-zoom**: Fits bounds to show all markers

### Custom Icons

Icons defined in `utils/leafletIcons.ts`:

```typescript
export function getPropertyIcon(type: string, isLandmark = false) {
  // Returns Leaflet DivIcon with:
  // - Property type color
  // - Lucide icon embedded
  // - Pin-shaped marker
  // - Drop shadow
}
```

Icon colors:
- Residential: Blue/Purple shades
- Commercial: Green shades
- SCO: Orange shades
- Industrial: Gray shades
- Agricultural: Green/Brown shades

### GPS Integration

**Get Current Location**:
```typescript
navigator.geolocation.getCurrentPosition(
  (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    setUserLocation([lat, lng]);
    map.flyTo([lat, lng], 16); // Smooth animation
  },
  (error) => {
    console.error('GPS error:', error);
  },
  { enableHighAccuracy: true }
);
```

**Features**:
- High accuracy GPS
- Permission handling
- Error messages for denied/unavailable GPS
- Smooth fly-to animation
- User location marker with blue dot

### Map Fixes

**Issue 1: Map not rendering after modal close**
- **Solution**: `MapSizeInvalidator` component
- Uses IntersectionObserver to detect visibility
- Calls `map.invalidateSize()` when visible
- Periodic checks every 500ms

**Issue 2: GPS button not focusing**
- **Solution**: `UserLocationFocuser` component
- Uses `map.flyTo()` instead of `setCenter`
- Smooth animation to user location
- Zoom level 16 for optimal view

---

## Search & Filter System

### Filter Types

1. **Text Search**: Searches in city, area, type, description, highlights, heading
2. **City**: Dropdown with all available cities
3. **Area**: Dynamic dropdown based on selected city
4. **Property Type**: Multi-select checkbox dropdown
5. **Price Range**: Min/Max with auto-formatting (Lakhs/Crores)
6. **Size Range**: Slider with unit selection
7. **Size Unit Filter**: Filter by specific unit (Gaj, SqFt, etc.)
8. **Location Filters**: Has Location, Has Landmark
9. **Tags**: Filter by custom tags (owner properties only)
10. **Sort**: By ID, Price, Size, Updated Date, Created Date
11. **Order**: Ascending or Descending

### Size Unit Conversion

Backend automatically converts between units:

```
Conversion Factors:
- 1 Gaj = 1 Gaj
- 1 SqFt = 1/9 Gaj
- 1 Marla = 24-33 Gaj (range)
- 1 Kanal = 450-650 Gaj (range)
- 1 Acre = 4500-5100 Gaj (range)
```

When filtering by size:
- User selects unit (e.g., "100-200 Gaj")
- Backend converts all properties to Gaj for comparison
- Returns properties that overlap with the range

### Filter Persistence

Filters are maintained in App.tsx state:
```typescript
const [filters, setFilters] = useState<FilterOptions>({
  city: '',
  area: '',
  type: [],
  min_price: undefined,
  max_price: undefined,
  // ... etc
});
```

**Clear Filters**: Resets all filters to default values.

---

## PWA Configuration

### Service Worker

Using `vite-plugin-pwa` for automatic service worker generation.

**Features**:
- ✅ Offline asset caching
- ✅ API response caching
- ✅ Auto-update on new versions
- ✅ Install prompt for users
- ✅ Background sync (future)

**Configuration** (`vite.config.ts`):
```typescript
VitePWA({
  registerType: 'prompt',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
  manifest: {
    name: 'Dealer Network',
    short_name: 'Dealer Network',
    description: 'Network for real estate dealers',
    theme_color: '#ffffff',
    display: 'standalone',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192' },
      { src: 'pwa-512x512.png', sizes: '512x512' }
    ]
  }
})
```

### Manifest File

`public/manifest.webmanifest`:
```json
{
  "name": "Dealer Network",
  "short_name": "Dealer Network",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "icons": [...]
}
```

### Install Prompt

Custom install prompt in `InstallPrompt.tsx`:
- Detects `beforeinstallprompt` event
- Shows custom UI to install app
- Handles installation flow
- Shows success message

**iOS Installation**:
- Manual: Safari → Share → Add to Home Screen
- Shows custom icon and splash screen

---

## Styling & Design

### Design System

**Fonts**:
- **Body**: Inter (weights: 300, 400, 500, 600, 700)
- **Headings**: Outfit (weights: 500, 600, 700)

**Font Loading**:
- Google Fonts with `display=swap`
- Preload for faster rendering
- Fallback chain: `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto`

**Font Rendering**:
```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'kern' 1, 'liga' 1;
}
```

### Color Scheme

**Primary Colors**:
- Blue: `#3b82f6` (primary actions, links)
- Red: `#ef4444` (delete, errors)
- Green: `#10b981` (success, save)
- Gray: `#6b7280` (text, borders)

**Property Type Colors**:
See [Property Icons Reference](#property-types)

### Responsive Design

**Breakpoints** (Tailwind):
- `sm`: 640px (mobile)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)

**Mobile-First Approach**:
- Base styles for mobile
- `md:` prefix for tablet+
- `lg:` prefix for desktop+

**Mobile Optimizations**:
- Bottom sheets for modals
- Touch-friendly buttons (min 44px)
- No zoom on input focus (font-size: 16px)
- Fixed headers with safe areas
- Scroll lock on modals

### Tailwind Configuration

`tailwind.config.js`:
```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Arial', 'sans-serif'],
        display: ['Outfit', '-apple-system', 'Arial', 'sans-serif'],
      },
    },
  },
}
```

---

## Utils & Helpers

### 1. **priceFormatter.ts**

Formats prices in Indian numbering system:

```typescript
formatPrice(5000000) → "₹50 L"
formatPrice(10000000) → "₹1 Cr"
formatPrice(75000) → "₹75 k"
formatPriceRange(5000000, 7000000) → "₹50 L - ₹70 L"
```

### 2. **sizeFormatter.ts**

Formats sizes with units:

```typescript
formatSize(100, 'Gaj') → "100 Gaj"
formatSizeRange(100, 150, 'Gaj') → "100-150 Gaj"
```

### 3. **textFormatter.ts**

Text utilities:

```typescript
// Auto-capitalize words with >50% uppercase letters
normalizeCapitalization("BEAUTIFUL HOUSE") → "Beautiful House"
```

### 4. **linkDetector.ts**

Detects phone numbers and URLs in text:

```typescript
detectLinksAndPhones(text) → [
  { type: 'text', content: 'Call me at ' },
  { type: 'phone', content: '9876543210' },
  { type: 'text', content: ' or visit ' },
  { type: 'url', content: 'www.example.com' }
]
```

**Supported Phone Formats**:
- `9876543210`
- `+919876543210`
- `91-9876543210`
- `+91 98765 43210`

**Supported URL Formats**:
- `https://example.com`
- `http://example.com`
- `www.example.com`

### 5. **leafletIcons.ts**

Custom Leaflet marker icons:

```typescript
getPropertyIcon(type: string, isLandmark: boolean)
getUserLocationIcon()
```

### 6. **cacheUtils.ts**

Cache management for areas and cities:

```typescript
getCachedAreas(city: string)
setCachedAreas(city: string, areas: string[])
clearCache()
```

### 7. **scrollLock.ts**

Prevents body scroll when modals are open:

```typescript
lockScroll() // Disable body scroll
unlockScroll() // Re-enable body scroll
```

Fixes iOS scroll issues and prevents background scrolling.

---

## Mobile Optimization

### iOS-Specific Fixes

1. **Auto-zoom Prevention**:
   ```html
   <meta name="viewport" content="maximum-scale=1.0, user-scalable=no" />
   ```
   All inputs have `font-size: 16px` to prevent auto-zoom.

2. **Safe Area Handling**:
   ```css
   padding-top: env(safe-area-inset-top);
   padding-bottom: env(safe-area-inset-bottom);
   ```

3. **Scroll Lock Fix**:
   Custom `scrollLock.ts` prevents background scrolling on modals.
   Checks for touch events to distinguish mobile vs desktop.

4. **PWA Status Bar**:
   ```html
   <meta name="apple-mobile-web-app-status-bar-style" content="default" />
   ```

### Android-Specific Fixes

1. **Theme Color**:
   ```html
   <meta name="theme-color" content="#ffffff" />
   ```

2. **Standalone Mode**:
   ```json
   "display": "standalone"
   ```

### Touch Optimizations

- Minimum touch target: 44x44px
- Swipe gestures for modals
- Touch feedback on buttons
- Smooth scrolling
- No hover states on mobile (uses `:active` instead)

---

## Error Handling

### Network Error Handling

**Offline Detection**:
```typescript
if (!error.response) {
  // Network error (offline, timeout)
  if (error.code === 'ECONNABORTED') {
    return 'Request timeout. Please check your connection.';
  } else if (error.code === 'ERR_NETWORK') {
    return 'Network error. Please check your internet connection.';
  }
}
```

**Prevents Logout on Offline**:
The app will NOT log out users when they go offline. Only actual auth errors (401/403) trigger logout.

### API Error Handling

All API calls return standardized responses:

```typescript
interface ApiResponse {
  status: boolean;
  message: string;
  data?: any;
  error?: string;
}
```

**Error Display**:
- Toast notifications for user-facing errors
- Console logs for debugging
- Fallback error messages

### Form Validation

**Client-side validation**:
- Required fields check
- Phone number format (10 digits)
- PIN length (4-6 digits)
- Email format (if applicable)
- Numeric validation for price/size
- GPS coordinate format

**Server-side validation**:
- Duplicate phone number check
- Token validation
- Owner verification for updates/deletes
- SQL injection prevention

---

## Testing

### Manual Testing Checklist

**Authentication**:
- [ ] Register new user
- [ ] Login with correct credentials
- [ ] Login with wrong credentials
- [ ] Logout and re-login
- [ ] Forgot password flow
- [ ] Change PIN

**Property Management**:
- [ ] Add new property
- [ ] Edit existing property
- [ ] Delete property
- [ ] View property details
- [ ] Mark as favorite
- [ ] Add user note

**Search & Filters**:
- [ ] Search by text
- [ ] Filter by city
- [ ] Filter by area
- [ ] Filter by property type
- [ ] Filter by price range
- [ ] Filter by size range
- [ ] Sort by different criteria
- [ ] Clear all filters

**Map View**:
- [ ] View properties on map
- [ ] Click marker to view popup
- [ ] Use GPS to get current location
- [ ] Zoom in/out
- [ ] Marker clustering

**Mobile**:
- [ ] Install as PWA on iOS
- [ ] Install as PWA on Android
- [ ] Test offline functionality
- [ ] Test touch gestures
- [ ] Test orientation changes

**Sharing**:
- [ ] Share via WhatsApp
- [ ] Share via SMS
- [ ] Copy public link
- [ ] Download property details

### Unit Testing

Currently, the project includes:
- `textFormatter.test.ts` - Tests for text formatting utilities

To add more tests:
```bash
npm install --save-dev vitest @testing-library/react
```

---

## Deployment

### Frontend Deployment

**Build the app**:
```bash
npm run build
```

This creates a `dist` folder with optimized production files.

**Deploy to**:
- **Netlify**: Drag & drop `dist` folder
- **Vercel**: Connect GitHub repo
- **GitHub Pages**: Use `gh-pages` package
- **Cloudflare Pages**: Connect repository

**Environment Variables**:
Set `VITE_API_BASE_URL` in your hosting platform.

### Backend Deployment

1. **Upload PHP files** to web server:
   ```
   /api/dealer_network/
   ├── auth.php
   ├── fetch.php
   ├── action.php
   ├── area.php
   └── config.php
   ```

2. **Configure database** in `config.php`:
   ```php
   $host = 'localhost';
   $user = 'db_user';
   $pass = 'db_password';
   $dbname = 'dealer_network_db';
   ```

3. **Set permissions**:
   ```bash
   chmod 644 *.php
   ```

4. **Enable CORS** (if needed):
   ```php
   header('Access-Control-Allow-Origin: *');
   header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
   header('Access-Control-Allow-Headers: Content-Type, Authorization');
   ```

### Database Deployment

1. **Create database**:
   ```sql
   CREATE DATABASE dealer_network_db;
   ```

2. **Import schema**:
   ```bash
   mysql -u user -p dealer_network_db < schema.sql
   ```

3. **Create indexes** (if not already):
   ```sql
   CREATE INDEX idx_owner ON network_properties(owner_id);
   CREATE INDEX idx_city ON network_properties(city);
   CREATE INDEX idx_area ON network_properties(area);
   ```

### SSL/HTTPS

**Required for**:
- PWA installation
- Geolocation API
- Secure token storage

**Setup**:
- Use Let's Encrypt for free SSL
- Configure server to redirect HTTP → HTTPS
- Update API URLs to use HTTPS

---

## Troubleshooting

### Common Issues

#### 1. **Map not rendering**
**Symptoms**: Blank map or gray tiles
**Solutions**:
- Check if Leaflet CSS is loaded in `index.html`
- Verify internet connection (map tiles require network)
- Use `MapSizeInvalidator` component (already implemented)
- Call `map.invalidateSize()` after container resize

#### 2. **GPS not working**
**Symptoms**: Location not detected
**Solutions**:
- Ensure HTTPS (geolocation requires secure context)
- Check browser permissions for location access
- Test on device with GPS capabilities
- Use high accuracy mode: `{ enableHighAccuracy: true }`

#### 3. **Logout on offline**
**Symptoms**: User logged out when internet disconnects
**Solution**:
- Already fixed in `OFFLINE_LOGOUT_FIX.md`
- Axios interceptor only logs out on 401/403, not network errors

#### 4. **Fonts different on mobile**
**Symptoms**: Fonts look different on iPhone/Android
**Solution**:
- Already fixed in `FONT_FIXES.md`
- Uses comprehensive font stack with fallbacks
- Anti-aliasing and font smoothing enabled

#### 5. **Description line breaks not showing**
**Symptoms**: New lines in descriptions appear as spaces
**Solution**:
- Already fixed in `LINE_BREAK_SUPPORT.md`
- Use `ClickableText` component which renders `\n` as `<br>`

#### 6. **Filter not working**
**Symptoms**: Properties not filtered correctly
**Solutions**:
- Check filter state in `App.tsx`
- Verify API parameters in network tab
- Ensure backend supports the filter
- Check if "Clear Filters" resets properly

#### 7. **PWA not installable**
**Symptoms**: No install prompt
**Solutions**:
- Must be HTTPS (except localhost)
- All icons must exist (192x192, 512x512)
- manifest.webmanifest must be valid
- Service worker must be registered

#### 8. **Property types missing icons**
**Symptoms**: Default icon instead of custom icon
**Solution**:
- Check `leafletIcons.ts` for type mapping
- Ensure exact type name match (case-sensitive)
- Add missing type to `getPropertyIcon()` function

### Debug Mode

Enable debug logging:
```typescript
// In src/services/api.ts
const DEBUG = true;

api.interceptors.request.use((config) => {
  if (DEBUG) console.log('API Request:', config);
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (DEBUG) console.log('API Response:', response);
    return response;
  },
  (error) => {
    if (DEBUG) console.error('API Error:', error);
    return Promise.reject(error);
  }
);
```

### Performance Issues

**Slow loading**:
- Enable code splitting (already configured in Vite)
- Lazy load components with `React.lazy()`
- Use pagination for property lists
- Optimize images (use WebP format)
- Enable service worker caching

**Map performance**:
- Use marker clustering (already implemented)
- Limit properties shown on map
- Reduce marker complexity
- Disable animations on low-end devices

---

## Summary

This README provides complete documentation for recreating the **Dealer Network** application from scratch. It covers:

✅ **Complete architecture** and system design  
✅ **Full database schema** with all tables and relationships  
✅ **Complete API documentation** with request/response examples  
✅ **Frontend structure** with all components explained  
✅ **Authentication system** flow and security  
✅ **Property management** lifecycle  
✅ **Map integration** with Leaflet and custom icons  
✅ **Search and filter** system with unit conversion  
✅ **PWA setup** for offline support and installation  
✅ **Styling system** with Tailwind and custom fonts  
✅ **Mobile optimizations** for iOS and Android  
✅ **Error handling** and network resilience  
✅ **Deployment guide** for frontend and backend  
✅ **Troubleshooting** common issues  

With this documentation, a developer can recreate the exact same system with all features, fixes, and optimizations.

---

## License

This project is proprietary software. All rights reserved.

---

## Contact

For support or questions, contact the development team.

---

**Last Updated**: December 2025  
**Version**: 1.0.0  
**Author**: Dealer Network Team
