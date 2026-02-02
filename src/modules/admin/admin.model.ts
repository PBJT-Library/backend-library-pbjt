// Model utama Admin (representasi data di database)
export interface Admin {
  id: string;
  username: string;
  password: string; // hashed
  token_version: number; // for token revocation
  role?: string; // for future RBAC
  createdAt?: Date;
  updated_at?: Date;
}

// DTO untuk register / create admin baru (password plain dulu)
export interface CreateAdminDTO {
  username: string;
  password: string;
}

// DTO untuk login
export interface LoginAdminDTO {
  username: string;
  password: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// Response yang aman dikirim ke client (tanpa password)
export interface AdminResponse {
  id: string;
  username: string;
  token_version: number;
  role?: string;
  created_at?: Date;
}

// Payload JWT - NEVER trust this for authorization, always verify against DB
export interface AdminJwtPayload {
  sub: string;
  username: string;
  role: 'admin';
  jti: string; // JWT ID for tracking/revocation
  version: number; // Token version for bulk revocation
}
