require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const { getAuthUrl, exchangeToken } = require('./src/services/stravaService');

const app = express();
const port = parseInt(process.env.PORT) || 8080;

// ============================================
// VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT
// ============================================
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'VITE_GEMINI_API_KEY',
  'VITE_STRAVA_CLIENT_ID',
  'VITE_STRAVA_CLIENT_SECRET',
  'VITE_FIREBASE_PROJECT_ID'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error('⚠️  Variables d\'environnement manquantes:', missingEnvVars.join(', '));
  console.error('   L\'application peut ne pas fonctionner correctement.');
}

// Vérification webhook Stripe (critique en production)
if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('🚨 CRITIQUE: STRIPE_WEBHOOK_SECRET non défini en production !');
}

// Initialisation Firebase Admin (pour webhooks Stripe en production)
// Sur Cloud Run (GCP), les Application Default Credentials sont disponibles automatiquement
// En local sans credentials, admin sera null et les fonctions seront limitées
let admin = null;

try {
  const firebaseAdmin = require('firebase-admin');
  if (!firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.applicationDefault(),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
    });
  }
  admin = firebaseAdmin;
  console.log('[Init] Firebase Admin initialisé avec succès');
} catch (error) {
  admin = null;
  console.warn('[Init] Firebase Admin non disponible:', error.message);
  console.warn('[Init] → Les webhooks Stripe ne pourront pas mettre à jour Firestore');
}

// Initialisation Stripe avec la clé fournie
const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;;
const stripe = require('stripe')(stripeKey.trim());

// Configuration Brevo (Email Marketing)
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_SUBSCRIBERS = parseInt(process.env.BREVO_LIST_SUBSCRIBERS) || 5;
const BREVO_LIST_NON_SUBSCRIBERS = parseInt(process.env.BREVO_LIST_NON_SUBSCRIBERS) || 6;

// Helper functions for Brevo API
const brevoApiCall = async (endpoint, method, body = null) => {
  if (!BREVO_API_KEY) {
    console.warn('[Brevo] API key not configured, skipping...');
    return null;
  }

  try {
    const options = {
      method,
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`https://api.brevo.com/v3/${endpoint}`, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Brevo] API error ${response.status}:`, errorText);
      return null;
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    return await response.json();
  } catch (error) {
    console.error('[Brevo] API call failed:', error.message);
    return null;
  }
};

// Add or update contact in Brevo
const brevoUpsertContact = async (email, firstName, isPremium) => {
  if (!email) return null;

  const listIds = isPremium ? [BREVO_LIST_SUBSCRIBERS] : [BREVO_LIST_NON_SUBSCRIBERS];
  const unlinkListIds = isPremium ? [BREVO_LIST_NON_SUBSCRIBERS] : [BREVO_LIST_SUBSCRIBERS];

  // First, try to create the contact
  const createResult = await brevoApiCall('contacts', 'POST', {
    email: email.toLowerCase(),
    attributes: {
      PRENOM: firstName || 'Coureur',
      IS_PREMIUM: isPremium
    },
    listIds: listIds,
    updateEnabled: true // Update if exists
  });

  if (createResult) {
    console.log(`[Brevo] Contact ${email} added/updated, isPremium=${isPremium}`);
  }

  // Remove from the opposite list
  await brevoApiCall(`contacts/lists/${unlinkListIds[0]}/contacts/remove`, 'POST', {
    emails: [email.toLowerCase()]
  });

  return createResult;
};

// Move contact between lists (for subscription changes)
const brevoMoveToSubscribers = async (email) => {
  return brevoUpsertContact(email, null, true);
};

const brevoMoveToNonSubscribers = async (email) => {
  return brevoUpsertContact(email, null, false);
};

app.set('trust proxy', true);

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Configuration CORS sécurisée
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://coachrunningia.fr', 'https://www.coachrunningia.fr', 'https://coach-running-ia.web.app', 'https://coach-running-ia.firebaseapp.com']
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (apps mobiles, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // En dev, être plus permissif
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(new Error('CORS non autorisé'));
  },
  credentials: true
}));

// ⚠️ WEBHOOK STRIPE - DOIT ÊTRE AVANT express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id || session.metadata?.userId;
    const customerEmail = session.customer_email;

    console.log(`[Stripe Webhook] checkout.session.completed - userId: ${userId}, customer: ${session.customer}, admin: ${!!admin}`);

    if (!admin) {
      console.error('[Stripe Webhook] CRITICAL: Firebase Admin non initialisé, impossible de mettre à jour Firestore !');
      return res.status(500).json({ error: 'Firebase Admin not available' });
    }

    if (!userId) {
      console.error('[Stripe Webhook] CRITICAL: Pas de userId (client_reference_id ni metadata.userId) !');
      return res.status(400).json({ error: 'Missing userId' });
    }

    try {
      // Get user data for firstName
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      await admin.firestore().collection('users').doc(userId).set({
        isPremium: true,
        premiumSince: new Date().toISOString(),
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription
      }, { merge: true });
      console.log(`[Stripe] Utilisateur ${userId} passé Premium !`);

      // Move to Brevo subscribers list
      const email = customerEmail || userData.email;
      if (email) {
        await brevoMoveToSubscribers(email);
        console.log(`[Brevo] ${email} moved to subscribers list`);
      }
    } catch (dbError) {
      console.error('[Stripe Webhook] Erreur Firestore:', dbError);
      return res.status(500).json({ error: 'Firestore update failed' });
    }
  }

  // Handle subscription cancellation (immediate or end of period)
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    if (admin && customerId) {
      try {
        // Find user by stripeCustomerId
        const usersRef = admin.firestore().collection('users');
        const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();

          await userDoc.ref.update({
            isPremium: false,
            premiumCancelledAt: new Date().toISOString(),
            stripeSubscriptionStatus: 'cancelled'
          });
          console.log(`[Stripe] Abonnement résilié pour l'utilisateur ${userDoc.id}`);

          // Move to Brevo non-subscribers list
          if (userData.email) {
            await brevoMoveToNonSubscribers(userData.email);
            console.log(`[Brevo] ${userData.email} moved to non-subscribers list`);
          }
        } else {
          console.warn(`[Stripe] Aucun utilisateur trouvé pour le customer ${customerId}`);
        }
      } catch (dbError) {
        console.error('[Stripe Webhook] Erreur Firestore (cancellation):', dbError);
      }
    }
  }

  // Handle subscription updates (e.g. cancel at period end, reactivation)
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    if (admin && customerId) {
      try {
        const usersRef = admin.firestore().collection('users');
        const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const updateData = {
            stripeSubscriptionStatus: subscription.status
          };

          // If user chose "cancel at end of period"
          if (subscription.cancel_at_period_end) {
            updateData.premiumCancelAt = new Date(subscription.current_period_end * 1000).toISOString();
            console.log(`[Stripe] Résiliation programmée pour ${userDoc.id} à la fin de la période`);
          } else if (!subscription.cancel_at_period_end && subscription.status === 'active') {
            // User reactivated their subscription
            updateData.premiumCancelAt = null;
            console.log(`[Stripe] Abonnement réactivé pour ${userDoc.id}`);
          }

          // If subscription became inactive (past_due, unpaid, etc.)
          if (['past_due', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
            updateData.isPremium = false;
            console.log(`[Stripe] Abonnement ${subscription.status} pour ${userDoc.id}, Premium désactivé`);
          }

          await userDoc.ref.update(updateData);
        }
      } catch (dbError) {
        console.error('[Stripe Webhook] Erreur Firestore (update):', dbError);
      }
    }
  }

  res.json({ received: true });
});

app.use(express.json());

// API Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    stripe: !!stripe,
    strava: !!(process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID || '186557'),
    env: process.env.NODE_ENV || 'production'
  });
});

// Create Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, userId, userEmail, successUrl, cancelUrl } = req.body;

  // Validation des entrées
  if (!priceId || !userId || !userEmail) {
    return res.status(400).json({ error: 'Paramètres manquants: priceId, userId, userEmail requis' });
  }

  // Validation format email basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  // Validation que priceId correspond à un prix connu (sécurité)
  const validPriceIds = [
    process.env.STRIPE_PRICE_MONTHLY,
    process.env.STRIPE_PRICE_YEARLY,
    'price_1S2W601WQbIX14t0rkHRcJLG', // Monthly fallback
    'price_1S2W7I1WQbIX14t0qJvbXMgT'  // Yearly fallback
  ].filter(Boolean);

  if (validPriceIds.length > 0 && !validPriceIds.includes(priceId)) {
    console.warn(`[Stripe] PriceId inconnu tenté: ${priceId}`);
    // On laisse passer pour ne pas bloquer si les IDs changent, mais on log
  }

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
  // Dynamically determine the callback URL based on environment
  // In production, use APP_URL; in development, use localhost with server port
  const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
  const redirectUri = `${baseUrl}/api/strava/callback`;
  console.log('[Strava Auth] Redirect URI:', redirectUri);

  res.json({ url: getAuthUrl(redirectUri) });
});

app.get('/api/strava/callback', async (req, res) => {
  console.log('[Strava] Callback received');
  console.log('[Strava] Query:', req.query);

  // En production: APP_URL, en dev: le port Vite (5173 ou 5174)
  // Note: Le callback OAuth arrive sur le serveur (port 8080), mais on redirige vers le frontend Vite
  const baseUrl = process.env.APP_URL || 'http://localhost:5174';

  const { code, state, error } = req.query;

  if (error) {
    console.error('[Strava] Error param:', error);
    return res.redirect(`${baseUrl}/strava-callback?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.error('[Strava] No code provided');
    return res.redirect(`${baseUrl}/strava-callback?error=no_code`);
  }

  try {
    console.log('[Strava] Exchanging code for tokens...');
    const tokenData = await exchangeToken(code);
    console.log('[Strava] Token received successfully');
    console.log('[Strava] Athlete:', tokenData.athlete?.firstname, '(ID:', tokenData.athlete?.id, ')');

    // Redirect to frontend with tokens
    // The client saves to Firestore via Client SDK
    const userId = state || '';

    // Encode data for URL
    const params = new URLSearchParams({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: String(tokenData.expires_at),
      athlete_id: String(tokenData.athlete?.id || ''),
      athlete_name: tokenData.athlete?.firstname || '',
      user_id: userId
    });

    console.log('[Strava] Redirecting to:', `${baseUrl}/strava-callback`);
    res.redirect(`${baseUrl}/strava-callback?${params.toString()}`);

  } catch (err) {
    console.error('[Strava Callback Error]', err.message);
    res.redirect(`${baseUrl}/strava-callback?error=${encodeURIComponent(err.message)}`);
  }
});

// Verify Subscription Status - Called on each page load/auth to sync Stripe status
app.post('/api/verify-subscription', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId requis' });
  }

  // En développement local sans Firebase Admin, retourner une réponse neutre
  // au lieu de 500 pour ne pas bloquer l'application
  if (!admin) {
    console.warn('[Verify] Firebase Admin non configuré, returning default response');
    return res.json({
      isPremium: false,
      status: 'unconfigured',
      verified: false,
      message: 'Firebase Admin not configured, using client-side data only'
    });
  }

  try {
    // Get user from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.json({ isPremium: false, status: 'no_user' });
    }

    const userData = userDoc.data();
    const { stripeCustomerId, stripeSubscriptionId } = userData;

    // If no Stripe customer ID, user is not premium
    if (!stripeCustomerId) {
      // Make sure isPremium is false in Firestore
      if (userData.isPremium) {
        await userDoc.ref.update({ isPremium: false });
        console.log(`[Verify] User ${userId} had isPremium=true but no stripeCustomerId, fixed.`);
      }
      return res.json({ isPremium: false, status: 'no_subscription' });
    }

    // Check subscription status with Stripe
    let subscription = null;

    // If we have a subscription ID, fetch it directly
    if (stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      } catch (stripeErr) {
        console.warn(`[Verify] Could not retrieve subscription ${stripeSubscriptionId}:`, stripeErr.message);
      }
    }

    // Fallback: list all subscriptions for this customer
    if (!subscription) {
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 1,
      });
      subscription = subscriptions.data[0] || null;
    }

    // Determine premium status based on Stripe subscription
    let isPremium = false;
    let updateData = {};

    if (subscription) {
      const activeStatuses = ['active', 'trialing'];
      isPremium = activeStatuses.includes(subscription.status);

      updateData = {
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
        isPremium: isPremium,
      };

      // Handle cancel_at_period_end
      if (subscription.cancel_at_period_end && subscription.current_period_end) {
        updateData.premiumCancelAt = new Date(subscription.current_period_end * 1000).toISOString();
      } else {
        updateData.premiumCancelAt = null;
      }

      // If subscription is cancelled/unpaid, record cancellation date
      if (['canceled', 'cancelled', 'unpaid', 'past_due', 'incomplete_expired'].includes(subscription.status)) {
        if (!userData.premiumCancelledAt) {
          updateData.premiumCancelledAt = new Date().toISOString();
        }
      }
    } else {
      // No subscription found at all
      isPremium = false;
      updateData = {
        isPremium: false,
        stripeSubscriptionStatus: 'none',
      };
    }

    // Update Firestore if needed
    const needsUpdate =
      userData.isPremium !== updateData.isPremium ||
      userData.stripeSubscriptionStatus !== updateData.stripeSubscriptionStatus ||
      userData.premiumCancelAt !== updateData.premiumCancelAt;

    if (needsUpdate) {
      await userDoc.ref.update(updateData);
      console.log(`[Verify] Updated user ${userId}: isPremium=${isPremium}, status=${subscription?.status || 'none'}`);
    }

    res.json({
      isPremium: isPremium,
      status: subscription?.status || 'none',
      cancelAt: updateData.premiumCancelAt || null,
      verified: true
    });

  } catch (error) {
    console.error('[Verify Subscription Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// Brevo Daily Sync - Synchronize all users with Brevo lists
// Can be called by a cron job or manually
app.post('/api/brevo/sync', async (req, res) => {
  // Optional: Add a secret key for security
  const { secret } = req.body;
  const expectedSecret = process.env.BREVO_SYNC_SECRET || 'coach-running-sync-2024';

  if (secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!admin) {
    return res.status(500).json({ error: 'Firebase Admin non configuré' });
  }

  if (!BREVO_API_KEY) {
    return res.status(500).json({ error: 'Brevo API key non configurée' });
  }

  try {
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.get();

    let synced = 0;
    let errors = 0;
    const results = [];

    for (const doc of snapshot.docs) {
      const userData = doc.data();

      // Skip users without email
      if (!userData.email) continue;

      try {
        const isPremium = userData.isPremium === true;
        await brevoUpsertContact(userData.email, userData.firstName, isPremium);
        synced++;
        results.push({ email: userData.email, isPremium, status: 'synced' });
      } catch (err) {
        errors++;
        results.push({ email: userData.email, status: 'error', error: err.message });
      }
    }

    console.log(`[Brevo Sync] Completed: ${synced} synced, ${errors} errors`);

    res.json({
      success: true,
      synced,
      errors,
      total: snapshot.docs.length,
      results: results.slice(0, 50) // Limit results in response
    });

  } catch (error) {
    console.error('[Brevo Sync Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// Brevo: Add contact on user registration (called from client)
app.post('/api/brevo/register', async (req, res) => {
  const { email, firstName } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  // Validation format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  // Sanitize firstName (éviter injection)
  const safeName = firstName ? String(firstName).slice(0, 50).replace(/[<>]/g, '') : 'Coureur';

  try {
    // New users are non-subscribers by default
    const result = await brevoUpsertContact(email, safeName, false);

    if (result) {
      res.json({ success: true, message: 'Contact added to Brevo' });
    } else {
      res.json({ success: false, message: 'Brevo not configured or error' });
    }
  } catch (error) {
    console.error('[Brevo Register Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Stripe Portal Session (for subscription management)
app.post('/api/create-portal-session', async (req, res) => {
  const { userId, stripeCustomerId: clientCustomerId, returnUrl } = req.body;

  try {
    let customerId = clientCustomerId;

    // Fallback: try to get from Firestore if not provided by client
    if (!customerId && admin && userId) {
      try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (userDoc.exists) {
          customerId = userDoc.data().stripeCustomerId;
        }
      } catch (dbErr) {
        console.warn('[Stripe Portal] Firestore lookup failed:', dbErr.message);
      }
    }

    if (!customerId) {
      return res.status(400).json({ error: 'Pas d\'abonnement Stripe trouvé. Veuillez d\'abord souscrire un abonnement.' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('[Stripe Portal Error]', error);
    res.status(500).json({ error: error.message });
  }
});
// Check Plan Limit - Verify if email already has a free plan
app.post('/api/check-plan-limit', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  // Validation format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  // Si Firebase Admin n'est pas configuré (dev local), autoriser
  if (!admin) {
    return res.json({ allowed: true, reason: 'dev_mode' });
  }

  try {
    // Chercher plans existants avec cet email
    const plansRef = admin.firestore().collection('plans');
    const snapshot = await plansRef
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return res.json({ 
        allowed: false, 
        reason: 'email_limit_reached',
        message: 'Cet email a déjà un plan. Connectez-vous pour y accéder.'
      });
    }

    res.json({ allowed: true });

  } catch (error) {
    console.error('[Check Plan Limit Error]', error);
    // En cas d'erreur, autoriser pour ne pas bloquer l'utilisateur
    res.json({ allowed: true, reason: 'check_failed' });
  }
});

// ============================================
// EMAIL VERIFICATION VIA BREVO
// ============================================

// Send verification email
// Le token est maintenant créé côté client (Questionnaire.tsx) via Firebase client SDK
// Le serveur reçoit le token et envoie simplement l'email via Brevo
app.post('/api/send-verification-email', async (req, res) => {
  const { token, email, firstName } = req.body;

  console.log('[send-verification-email] Request:', { token: token?.substring(0, 10) + '...', email, firstName });

  // Validation
  if (!token || !email) {
    return res.status(400).json({ error: 'token et email requis' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  if (!BREVO_API_KEY) {
    console.warn('[Verification Email] Brevo API key non configurée');
    return res.status(500).json({ error: 'Service email non disponible' });
  }

  try {
    // Le token a déjà été créé et stocké dans Firestore côté client
    console.log(`[Verification Email] Envoi email pour ${email}`);

    // 3. Build verification URL - Use production domain
    const baseUrl = process.env.APP_URL || 'https://coachrunningia.fr';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    // 4. Send email via Brevo Transactional API
    const safeName = firstName ? String(firstName).slice(0, 50).replace(/[<>]/g, '') : 'Coureur';

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f7fafc;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f7fafc; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 600px; width: 100%; overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #F97316, #EA580C); padding: 30px; text-align: center;">
                            <div style="font-size: 50px; margin-bottom: 10px;">🏃</div>
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Votre plan est prêt !</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h2 style="color: #2d3748; font-size: 22px; margin: 0 0 15px; font-weight: 600;">Bonjour ${safeName} ! 👋</h2>
                                <p style="color: #718096; font-size: 16px; line-height: 1.6; margin: 0;">
                                    Votre plan d'entraînement personnalisé a été généré avec succès.<br>
                                    Cliquez sur le bouton ci-dessous pour <strong>vérifier votre email</strong> et accéder à votre plan.
                                </p>
                            </div>
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${verificationUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #F97316, #EA580C); color: white; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 600; font-size: 18px; box-shadow: 0 10px 30px rgba(249, 115, 22, 0.4);">
                                    ✅ Voir mon plan d'entraînement
                                </a>
                            </div>
                            <div style="background: #FFF7ED; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #FDBA74;">
                                <p style="color: #9A3412; font-size: 14px; margin: 0;">⏰ Ce lien expire dans <strong>24 heures</strong></p>
                            </div>
                            <div style="margin-top: 30px; text-align: center;">
                                <p style="color: #A0AEC0; font-size: 12px; margin: 0 0 10px;">Si le bouton ne fonctionne pas, copiez ce lien :</p>
                                <p style="color: #718096; font-size: 11px; word-break: break-all; margin: 0;">${verificationUrl}</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #A0AEC0; font-size: 13px; margin: 0;">Coach Running IA — Votre coach personnel 🏅</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    // Direct Brevo API call with verified sender
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: "Coach Running IA",
          email: "programme@coachrunningia.fr"  // Adresse Brevo vérifiée
        },
        to: [{ email: email.toLowerCase(), name: safeName }],
        subject: "🏃 Votre plan d'entraînement est prêt !",
        htmlContent: htmlContent
      })
    });

    const data = await response.json();
    console.log('[send-verification-email] Brevo response:', response.status, data);

    if (!response.ok) {
      console.error('[send-verification-email] Brevo error:', data);
      return res.status(500).json({ error: 'Échec de l\'envoi de l\'email', details: data });
    }

    // Also add to Brevo contacts list (non-premium by default)
    await brevoUpsertContact(email, safeName, false);

    console.log(`[Verification Email] Email envoyé à ${email}`);
    res.json({ success: true, message: 'Email de vérification envoyé', messageId: data.messageId });

  } catch (error) {
    console.error('[Verification Email Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify email token
app.get('/api/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token manquant' });
  }

  if (!admin) {
    return res.status(500).json({ error: 'Service non disponible' });
  }

  try {
    // 1. Get token from Firestore
    const tokenDoc = await admin.firestore().collection('emailVerificationTokens').doc(token).get();

    if (!tokenDoc.exists) {
      return res.status(400).json({ error: 'Token invalide ou expiré', code: 'INVALID_TOKEN' });
    }

    const tokenData = tokenDoc.data();

    // 2. Check if already used
    if (tokenData.used) {
      return res.status(400).json({ error: 'Ce lien a déjà été utilisé', code: 'TOKEN_USED' });
    }

    // 3. Check expiration
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);
    if (now > expiresAt) {
      return res.status(400).json({ error: 'Ce lien a expiré', code: 'TOKEN_EXPIRED' });
    }

    // 4. Mark token as used
    await tokenDoc.ref.update({ used: true, usedAt: new Date().toISOString() });

    // 5. Mark user email as verified in Firestore
    await admin.firestore().collection('users').doc(tokenData.userId).update({
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString()
    });

    console.log(`[Verify Email] Email vérifié pour userId: ${tokenData.userId}`);

    res.json({
      success: true,
      message: 'Email vérifié avec succès',
      userId: tokenData.userId,
      email: tokenData.email,
      planId: tokenData.planId
    });

  } catch (error) {
    console.error('[Verify Email Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// Strava Weekly Analysis API
// Le frontend envoie le token Strava directement (récupéré via Firebase Client SDK)
app.post('/api/strava/analyze-week', async (req, res) => {
  const { userId, stravaAccessToken } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId requis' });
  }

  if (!stravaAccessToken) {
    return res.status(400).json({ error: 'Token Strava requis. Veuillez reconnecter votre compte Strava.' });
  }

  try {
    // Utiliser directement le token fourni par le frontend
    const accessToken = stravaAccessToken;

    // Fetch activities from last 7 days
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

    const stravaResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${sevenDaysAgo}&per_page=30`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!stravaResponse.ok) {
      const errorText = await stravaResponse.text();
      console.error('[Strava API Error]', errorText);
      throw new Error('Erreur API Strava');
    }

    const activities = await stravaResponse.json();
    console.log(`[Strava] Fetched ${activities.length} activities`);

    // Prepare summary for Gemini
    const summary = activities.map(a => ({
      type: a.type,
      name: a.name,
      distance: (a.distance / 1000).toFixed(2) + ' km',
      duration: Math.round(a.moving_time / 60) + ' min',
      date: new Date(a.start_date).toLocaleDateString('fr-FR'),
      elevation: a.total_elevation_gain ? a.total_elevation_gain + ' m' : null,
      avgHeartRate: a.average_heartrate || null,
      avgPace: a.type === 'Run' && a.distance > 0
        ? Math.floor((a.moving_time / 60) / (a.distance / 1000)) + ':' +
          String(Math.round(((a.moving_time / 60) / (a.distance / 1000) % 1) * 60)).padStart(2, '0') + ' min/km'
        : null
    }));

    // Analyze with Gemini
    const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.json({
        activities: summary,
        analysis: `${activities.length} activités trouvées cette semaine. Analyse IA non disponible (clé API manquante).`
      });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Tu es un coach running expert et bienveillant. Analyse ces activités Strava de la semaine :

${JSON.stringify(summary, null, 2)}

Fournis une analyse en français avec :
1. Un résumé du volume (distance totale, nombre de séances)
2. Points positifs observés
3. Points d'attention ou conseils
4. Une recommandation pour la semaine suivante

Sois encourageant et constructif. Réponds de manière concise (max 200 mots).`;

    const result = await model.generateContent(prompt);
    const analysisText = result.response.text();

    res.json({
      activities: summary,
      analysis: analysisText,
      weekSummary: {
        count: activities.length,
        totalDistance: activities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000,
        totalTime: activities.reduce((sum, a) => sum + (a.moving_time || 0), 0) / 60
      }
    });

  } catch (error) {
    console.error('[Strava Analysis Error]', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'analyse' });
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
