export interface UserMetaData {
  email_verified: boolean;
  source: string;
  token: string;
}

export interface AuthData {
  access_token: string;
  refresh_token: string;
  user: UserMetaData;
}

export interface AuthResponse {
  data: AuthData;
  error: any;
}
