const { OAuth2Client } = require('google-auth-library');

// Google OAuth2 client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// Verify Google ID token
async function verifyGoogleToken(token) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      return payload;
    } catch (error) {
      throw new Error('Invalid Google token');
    }
}