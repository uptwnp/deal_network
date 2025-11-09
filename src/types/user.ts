export interface User {
  id: number;
  name: string;
  phone: string;
  address?: string;
  firmName?: string;
  firm_name?: string;
  pin?: string;
  city?: string;
  area?: string;
  propertyType?: string;
  area_covers?: string;
  city_covers?: string;
  type?: string;
  default_area?: string;
  default_city?: string;
  default_type?: string;
  token?: string;
  createdAt?: number;
  created_on?: string;
}

const STORAGE_KEY = 'propnetwork_users';
const CURRENT_USER_KEY = 'propnetwork_current_user';
const CURRENT_USER_EXPIRY_KEY = 'propnetwork_current_user_expiry';
const NEXT_ID_KEY = 'propnetwork_next_user_id';
const REMEMBER_DAYS = 30;
const REMEMBER_MS = REMEMBER_DAYS * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Get all users from localStorage
export function getAllUsers(): User[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load users:', error);
  }
  return [];
}

// Save all users to localStorage
function saveAllUsers(users: User[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save users:', error);
  }
}

// Get current logged-in user
export function getCurrentUser(): User | null {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    const expiry = localStorage.getItem(CURRENT_USER_EXPIRY_KEY);
    
    if (!stored || !expiry) {
      return null;
    }
    
    // Check if user data has expired
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime) {
      // User data expired, clear it
      setCurrentUser(null);
      return null;
    }
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load current user:', error);
    return null;
  }
}

// Set current logged-in user
export function setCurrentUser(user: User | null): void {
  try {
    if (user) {
      // Normalize user data (handle both firmName and firm_name)
      const normalizedUser: User = {
        ...user,
        firmName: user.firmName || user.firm_name,
        firm_name: user.firm_name || user.firmName,
      };
      const expiryTime = Date.now() + REMEMBER_MS;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizedUser));
      localStorage.setItem(CURRENT_USER_EXPIRY_KEY, expiryTime.toString());
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(CURRENT_USER_EXPIRY_KEY);
    }
  } catch (error) {
    console.error('Failed to save current user:', error);
  }
}

// Get next user ID
function getNextUserId(): number {
  try {
    const stored = localStorage.getItem(NEXT_ID_KEY);
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch (error) {
    console.error('Failed to load next user ID:', error);
  }
  return 1;
}

// Save next user ID
function saveNextUserId(id: number): void {
  try {
    localStorage.setItem(NEXT_ID_KEY, id.toString());
  } catch (error) {
    console.error('Failed to save next user ID:', error);
  }
}

// Register a new user
export function registerUser(userData: Omit<User, 'id' | 'createdAt'>): User {
  const users = getAllUsers();
  const nextId = getNextUserId();
  
  // Check if phone already exists
  const existingUser = users.find(u => u.phone === userData.phone);
  if (existingUser) {
    throw new Error('Phone number already registered');
  }
  
  const newUser: User = {
    ...userData,
    id: nextId,
    createdAt: Date.now(),
  };
  
  users.push(newUser);
  saveAllUsers(users);
  saveNextUserId(nextId + 1);
  
  return newUser;
}

// Login with phone and PIN
export function loginUser(phone: string, pin: string): User | null {
  const users = getAllUsers();
  const user = users.find(u => u.phone === phone && u.pin === pin);
  
  if (user) {
    setCurrentUser(user);
    return user;
  }
  
  return null;
}

// Logout
export function logoutUser(): void {
  setCurrentUser(null);
}

