import crypto from 'crypto';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Generates an OAuth 2.0 access token using a Google Cloud Service Account
 * without needing any external SDKs.
 */
export async function getGoogleServiceAccountToken(
  clientEmail: string,
  privateKey: string,
  scopes: string[] = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly'
  ]
): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    const claim = {
      iss: clientEmail,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const base64UrlEncode = (str: string) => Buffer.from(str).toString('base64url');
    const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claim))}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    signer.end();

    const signature = signer.sign(privateKey, 'base64url');
    const jwt = `${unsignedToken}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Google OAuth Token Error]:', errText);
      return null;
    }

    const data: GoogleTokenResponse = await res.json();
    return data.access_token;
  } catch (err) {
    console.error('[Google Service Account Signing Error]:', err);
    return null;
  }
}

/**
 * Fetches real search telemetry directly from Google Search Console REST API
 */
export async function fetchLiveSearchConsoleAnalytics(
  siteUrl: string,
  accessToken: string,
  startDate: string,
  endDate: string
) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['date'],
          rowLimit: 1000
        })
      }
    );

    if (!res.ok) {
      console.warn('[GSC API Response Not OK]:', res.status, await res.text());
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('[GSC Live Query Error]:', err);
    return null;
  }
}

/**
 * Fetches top search queries from Google Search Console
 */
export async function fetchLiveSearchConsoleQueries(
  siteUrl: string,
  accessToken: string,
  startDate: string,
  endDate: string,
  limit: number = 25
) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: limit
        })
      }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[GSC Queries Query Error]:', err);
    return null;
  }
}

/**
 * Fetches real page-level search telemetry from Google Search Console REST API
 */
export async function fetchLiveSearchConsolePages(
  siteUrl: string,
  accessToken: string,
  startDate: string,
  endDate: string,
  limit: number = 100
) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: limit
        })
      }
    );

    if (!res.ok) {
      console.warn('[GSC Live Pages Query Not OK]:', res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('[GSC Live Pages Query Error]:', err);
    return null;
  }
}
