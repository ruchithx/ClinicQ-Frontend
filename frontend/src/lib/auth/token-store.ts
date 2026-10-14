export interface StoredToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp ms
  user: {
    id: string;
    username: string;
    fullName: string;
    roles: string[];
    mustChangePassword: boolean;
  };
}

let _stored: StoredToken | null = null;

export const tokenStore = {
  get(): StoredToken | null {
    return _stored;
  },
  set(token: StoredToken): void {
    _stored = token;
  },
  clear(): void {
    _stored = null;
  },
  isExpired(): boolean {
    if (!_stored) return true;
    return Date.now() >= _stored.expiresAt - 5000; // 5s buffer
  },
};
