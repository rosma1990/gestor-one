export interface TokenData {
  id_empleado: number;
  token: string;
  used: boolean;
  createdAt: number;
  signedAt?: string;
  signatureData?: string; // Firma en formato base64 PNG
  ip?: string;
}

const globalForTokens = global as unknown as {
  tokenMap?: Map<string, TokenData>;
};

export const tokenMap = globalForTokens.tokenMap ?? new Map<string, TokenData>();

if (process.env.NODE_ENV !== "production") {
  globalForTokens.tokenMap = tokenMap;
}
