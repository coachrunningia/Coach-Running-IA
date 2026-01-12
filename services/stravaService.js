
// Identifiants fournis par l'utilisateur ou via .env
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || '186557';
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || 'ed1a08c5feb4939e7e0c5fac04857efc1a18b9e7';

const getAuthUrl = (redirectUri) => {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'activity:read_all'
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
};

const exchangeToken = async (code) => {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Strava Token Error: ${response.statusText}`);
  }
  
  return await response.json();
};

const refreshToken = async (refreshToken) => {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error(`Strava Refresh Error: ${response.statusText}`);
  }

  return await response.json();
};

const getActivities = async (accessToken, after, before) => {
  const params = new URLSearchParams({
    after,
    before,
    per_page: 100
  });

  const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Strava Activities Error: ${response.statusText}`);
  }

  return await response.json();
};

module.exports = {
  getAuthUrl,
  exchangeToken,
  refreshToken,
  getActivities
};
