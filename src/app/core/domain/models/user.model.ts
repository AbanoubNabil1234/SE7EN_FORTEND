export interface User {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: 'Customer' | 'Admin';
  phone?: string | null;
  avatarUrl?: string;
  token?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: string;
    phone?: string | null;
    isActive: boolean;
  };
}
