import { OAuth2Client, TokenPayload } from 'google-auth-library';

// Google OAuth2 client
const client: OAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verify Google ID token
export async function verifyGoogleToken(token: string): Promise<TokenPayload | undefined> {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured');
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload: TokenPayload | undefined = ticket.getPayload();
    return payload;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Google token verification failed:', errorMessage);
    throw new Error('Invalid Google token');
  }
}

// Export as default for backward compatibility
export default { verifyGoogleToken }; 