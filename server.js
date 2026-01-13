
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Charge le fichier .env en local
try {
  require('dotenv').config();
} catch (e) {
  // En production, les variables sont injectées par l'hébergeur
}

const { getAuthUrl, exchangeToken } = require('./services/stravaService');

const app = express();
const port = parseInt(process.env.PORT) || 8080;

// Initialisation Firebase Admin (pour la persistance Strava)
let admin = null;
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (error) {
  console.warn('[Init] Firebase Admin non configuré. Les fonctions Strava seront limitées.');
}

// Initialisation Stripe avec la clé fournie
const stripeKey = process.env.STRIPE_SECRET_KEY;;
const stripe = require('stripe')(stripeKey.trim());

app.set('trust proxy', true);
app.use(cors({ origin: true }));
app.use(express.json());

// API Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    stripe: !!stripe,
    strava: !!(process.env.STRAVA_CLIENT_ID || '186557'),
    env: process.env.NODE_ENV || 'production'
  });
});

// Create Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, userId, userEmail, successUrl, cancelUrl } = req.body;
  
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      client_reference_id: userId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId }
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// Strava Routes
app.get('/api/strava/auth', (req, res) => {
  const redirectUri = `${req.headers.origin}/api/strava/callback`;
  res.json({ url: getAuthUrl(redirectUri) });
});

app.get('/api/strava/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    const tokenData = await exchangeToken(code);
    if (admin && state) {
      await admin.firestore().collection('users').doc(state).update({
        stravaToken: tokenData,
        stravaConnected: true
      });
    }
    res.redirect('/#/dashboard?strava=connected');
  } catch (error) {
    console.error('[Strava Callback Error]', error);
    res.redirect('/#/dashboard?error=strava_failed');
  }
});

// Frontend Static Files
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.url.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Coach Running IA opérationnel sur le port ${port}`);
});
