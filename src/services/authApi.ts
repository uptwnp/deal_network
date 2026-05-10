import { supabase } from './supabase';

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  firm_name?: string;
  area_covers?: string;
  city_covers?: string;
  type?: string;
  default_area?: string;
  default_city?: string;
  default_type?: string;
  default_unit?: string;
  default_privacy?: string;
  token: string;
  created_on?: string;
}

export interface LoginResponse {
  status: boolean;
  message: string;
  user?: AuthUser;
  token?: string;
  user_id?: number;
}

export interface SignupResponse {
  status: boolean;
  message: string;
  token?: string;
  user_id?: number;
}

export interface ProfileResponse {
  status: boolean;
  message: string;
  user?: AuthUser;
}

const TOKEN_KEY = 'propnetwork_auth_token';
const TOKEN_EXPIRY_KEY = 'propnetwork_auth_token_expiry';
const USER_ID_KEY = 'propnetwork_user_id';
const USER_ID_EXPIRY_KEY = 'propnetwork_user_id_expiry';
const REMEMBER_DAYS = 30;
const REMEMBER_MS = REMEMBER_DAYS * 24 * 60 * 60 * 1000;

export function getStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!token || !expiry) return null;

    if (Date.now() > parseInt(expiry, 10)) {
      clearStoredToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + REMEMBER_MS).toString());
  } catch (err) {
    console.error('Failed to store token:', err);
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_ID_EXPIRY_KEY);
  } catch (err) {
    console.error('Failed to clear token:', err);
  }
}

export function getStoredUserId(): number | null {
  try {
    const stored = localStorage.getItem(USER_ID_KEY);
    const expiry = localStorage.getItem(USER_ID_EXPIRY_KEY);

    if (!stored || !expiry) return null;

    if (Date.now() > parseInt(expiry, 10)) {
      clearStoredToken();
      return null;
    }
    return parseInt(stored, 10);
  } catch {
    return null;
  }
}

export function setStoredUserId(userId: number): void {
  try {
    localStorage.setItem(USER_ID_KEY, userId.toString());
    localStorage.setItem(USER_ID_EXPIRY_KEY, (Date.now() + REMEMBER_MS).toString());
  } catch (err) {
    console.error('Failed to store user ID:', err);
  }
}

// Generates a simple random token for pseudo-authentication
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const authApi = {
  async signup(name: string, phone: string, password: string): Promise<SignupResponse> {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase.from('network_users').select('id').eq('phone', phone).single();
      if (existingUser) {
        return { status: false, message: 'Phone number already registered' };
      }

      const token = generateToken();
      const { data, error } = await supabase.from('network_users').insert([{
        name,
        phone,
        password, // Changed from pin to password. Note: hashing should be handled via a trigger or RPC
        token
      }]).select('id, token').single();

      if (error) throw error;
      if (data) {
        setStoredToken(data.token);
        setStoredUserId(data.id);
        return { status: true, message: 'Signup successful', token: data.token, user_id: data.id };
      }
      return { status: false, message: 'Failed to create user' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      console.error('Signup error:', message);
      return { status: false, message };
    }
  },

  async login(phone: string, password: string): Promise<LoginResponse> {
    try {
      // Use RPC to verify password securely on the server (handles BCrypt)
      const { data: users, error } = await supabase.rpc('verify_user_password', {
        p_phone: phone,
        p_password: password
      });

      if (error || !users || users.length === 0) {
        return { status: false, message: 'Invalid phone number or password' };
      }

      const user = users[0];

      // Generate a new token on each login
      const newToken = generateToken();
      const { error: updateError } = await supabase.from('network_users').update({ token: newToken }).eq('id', user.id);
      if (updateError) throw updateError;

      setStoredToken(newToken);
      setStoredUserId(user.id);

      return {
        status: true,
        message: 'Login successful',
        user: { id: user.id, name: user.name, phone: user.phone, token: newToken },
        token: newToken,
        user_id: user.id
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      console.error('Login error:', message);
      return { status: false, message: 'Login failed. Please try again.' };
    }
  },

  async getProfile(): Promise<ProfileResponse> {
    const userId = getStoredUserId();
    const token = getStoredToken();
    if (!userId || !token) return { status: false, message: 'No token or user id found' };

    try {
      const { data: user, error, status } = await supabase.from('network_users').select('*').eq('id', userId).eq('token', token).single();
      
      if (error) {
        // Only treat as "Session expired" if the record definitely wasn't found (PGRST116)
        // or it's a 406 (Not Acceptable) which sometimes happens with .single() on empty results
        if (error.code === 'PGRST116' || status === 406 || status === 404) {
          return { status: false, message: 'Session expired or invalid user' };
        }
        
        // For other errors (network, 500, etc.), we don't want to log the user out.
        // Return a special status or just throw to be caught by the block below
        throw error;
      }

      if (!user) {
        return { status: false, message: 'User data not found' };
      }

      return { status: true, message: 'Success', user };
    } catch (error) {
      const err = error as { code?: string; message?: string; status?: number };
      console.warn('Profile fetch handled as background error:', err.message || err);
      // Return a status that indicates "don't know", so AuthContext doesn't log out
      return { status: false, message: 'network_error' };
    }
  },

  async updateProfile(updates: Partial<AuthUser>): Promise<{ status: boolean; message: string }> {
    const userId = getStoredUserId();
    const token = getStoredToken();
    if (!userId || !token) return { status: false, message: 'No session' };

    try {
      // First verify the user matches the token
      const { data: user, error: userError } = await supabase.from('network_users').select('id').eq('id', userId).eq('token', token).single();
      if (userError || !user) return { status: false, message: 'Invalid session' };

      const { error } = await supabase.from('network_users').update(updates).eq('id', userId);
      if (error) throw error;
      
      return { status: true, message: 'Profile updated successfully' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      return { status: false, message };
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ status: boolean; message: string }> {
    const userId = getStoredUserId();
    const token = getStoredToken();
    if (!userId || !token) return { status: false, message: 'No session' };

    try {
      const { data: user, error: userError } = await supabase.from('network_users').select('id, phone').eq('id', userId).eq('token', token).single();
      if (userError || !user) return { status: false, message: 'Invalid session' };
      
      // Use RPC to verify and update password securely on the server
      const { data: matches, error: verifyError } = await supabase.rpc('verify_user_password', {
        p_phone: user.phone,
        p_password: oldPassword
      });

      if (verifyError || !matches || matches.length === 0) {
        return { status: false, message: 'Incorrect old password' };
      }

      // Use RPC to update and hash new password
      const { data: success, error: updateError } = await supabase.rpc('update_user_password', {
        p_user_id: userId,
        p_new_password: newPassword
      });

      if (updateError || !success) throw updateError;

      return { status: true, message: 'Password changed successfully' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      return { status: false, message };
    }
  },

  logout(): void {
    clearStoredToken();
  },

  async verifyToken(token: string): Promise<{ status: boolean; message: string; user?: { phone: string } }> {
    try {
      const { data: user, error } = await supabase.from('network_users').select('phone').eq('token', token).single();
      if (error || !user) return { status: false, message: 'Invalid or expired token' };
      return { status: true, message: 'Token Valid', user: { phone: user.phone } };
    } catch {
      return { status: false, message: 'Invalid or expired token' };
    }
  },

  async resetPassword(token: string, newPin: string): Promise<{ status: boolean; message: string }> {
    try {
      // Find the user by token
      const { data: user, error: findError } = await supabase.from('network_users').select('id').eq('token', token).single();
      if (findError || !user) return { status: false, message: 'Invalid reset token' };

      // Generate a new token alongside so the old reset token doesn't work again
      const newToken = generateToken();
      
      // Use RPC to update and hash new password
      const { data: success, error: updateError } = await supabase.rpc('update_user_password', {
        p_user_id: user.id,
        p_new_password: newPin
      });
      
      if (updateError || !success) throw updateError;
      
      // Also update the token to invalidate the reset session
      await supabase.from('network_users').update({ token: newToken }).eq('id', user.id);

      return { status: true, message: 'Password reset successfully' };
    } catch {
      return { status: false, message: 'Failed to reset password' };
    }
  },

  async sendResetOtp(phone: string): Promise<{ status: boolean; message: string; verification_id?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone }
      });

      if (error || !data.status) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      return { 
        status: true, 
        message: data.message, 
        verification_id: data.verification_id 
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send OTP';
      return { status: false, message };
    }
  },

  async verifyResetOtp(phone: string, otp: string, verificationId: string): Promise<{
    status: boolean;
    message: string;
    user?: {
      id: number;
      name: string;
      phone: string;
      token: string;
      status: string;
    };
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, otp, verificationId }
      });

      if (error || !data.status) {
        throw new Error(data.message || 'Failed to verify OTP');
      }

      if (data.user) {
        setStoredToken(data.user.token);
        setStoredUserId(data.user.id);
      }

      return {
        status: true,
        message: data.message,
        user: data.user
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify OTP';
      return { status: false, message };
    }
  },
};
