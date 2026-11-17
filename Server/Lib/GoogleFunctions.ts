import { OAuth2Client, TokenPayload } from 'google-auth-library';

// Verify Google ID token
export async function verifyGoogleToken(token: string): Promise<TokenPayload | undefined> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google Client ID not configured');
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
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