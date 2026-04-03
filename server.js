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
  'STRIPE_WEBHOOK_SECRET',
  'VITE_GEMINI_API_KEY',
  'VITE_STRAVA_CLIENT_ID',
  'VITE_STRAVA_CLIENT_SECRET',
  'VITE_FIREBASE_PROJECT_ID'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error('🚨 CRITICAL: Variables d\'environnement manquantes:', missingEnvVars.join(', '));
  console.error('   Les paiements Stripe NE FONCTIONNERONT PAS sans STRIPE_WEBHOOK_SECRET !');
  // En production, on refuse de démarrer sans les vars critiques pour les paiements
  if (process.env.NODE_ENV === 'production') {
    console.error('   🛑 Arrêt du serveur — corrigez les variables manquantes avant de redéployer.');
    process.exit(1);
  }
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

// Configuration Meta Conversions API (Server-Side)
const META_PIXEL_ID = process.env.META_PIXEL_ID || '1434110431562090';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const crypto = require('crypto');

const sendMetaConversionEvent = async (eventName, eventData) => {
  if (!META_ACCESS_TOKEN) {
    console.warn('[Meta CAPI] Access token not configured, skipping...');
    return null;
  }

  try {
    const hashedEmail = eventData.email
      ? crypto.createHash('sha256').update(eventData.email.trim().toLowerCase()).digest('hex')
      : undefined;

    const payload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventData.event_id || `${eventName}_${Date.now()}`,
        action_source: 'website',
        user_data: {
          em: hashedEmail ? [hashedEmail] : undefined,
          client_ip_address: eventData.ip || undefined,
          client_user_agent: eventData.userAgent || undefined,
        },
        custom_data: {
          currency: eventData.currency || 'EUR',
          value: eventData.value || 0,
          content_name: eventData.contentName || '',
          content_ids: eventData.contentIds || [],
          content_type: 'product',
        }
      }]
    };

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();
    if (response.ok) {
      console.log(`[Meta CAPI] ${eventName} sent successfully:`, result);
    } else {
      console.error(`[Meta CAPI] ${eventName} error:`, result);
    }
    return result;
  } catch (error) {
    console.error(`[Meta CAPI] ${eventName} failed:`, error.message);
    return null;
  }
};

// Configuration Brevo (Email Marketing)
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_SUBSCRIBERS = parseInt(process.env.BREVO_LIST_SUBSCRIBERS) || 5;
const BREVO_LIST_NON_SUBSCRIBERS = parseInt(process.env.BREVO_LIST_NON_SUBSCRIBERS) || 6;
const BREVO_LIST_UNSUBSCRIBED = parseInt(process.env.BREVO_LIST_UNSUBSCRIBED) || 10;

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

// Move cancelled subscriber to "désabonnés" list (#10) and remove from "abonnés" (#5)
const brevoMoveToUnsubscribed = async (email) => {
  if (!email) return null;
  const emailLower = email.toLowerCase();

  // Add to désabonnés list (#10) — triggers Brevo re-engagement automation
  await brevoApiCall('contacts', 'POST', {
    email: emailLower,
    attributes: { IS_PREMIUM: false },
    listIds: [BREVO_LIST_UNSUBSCRIBED],
    updateEnabled: true
  });

  // Remove from abonnés list (#5) AND non-abonnés list (#6)
  await brevoApiCall(`contacts/lists/${BREVO_LIST_SUBSCRIBERS}/contacts/remove`, 'POST', {
    emails: [emailLower]
  });
  await brevoApiCall(`contacts/lists/${BREVO_LIST_NON_SUBSCRIBERS}/contacts/remove`, 'POST', {
    emails: [emailLower]
  });

  console.log(`[Brevo] ${email} moved to désabonnés list (#${BREVO_LIST_UNSUBSCRIBED})`);
};

app.set('trust proxy', true);

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get(['/health', '/api/health'], (req, res) => {
  const checks = {
    stripeKey: !!process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    firebaseAdmin: !!admin,
    nodeEnv: process.env.NODE_ENV || 'NOT SET',
  };
  const allOk = checks.stripeKey && checks.stripeWebhookSecret && checks.firebaseAdmin && checks.nodeEnv === 'production';

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    ...(allOk ? {} : { warning: 'Paiements Stripe potentiellement non fonctionnels !' })
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
      const email = customerEmail || userData.email;

      // Determine if this is a Plan Unique (one-time payment) or subscription
      const purchaseType = session.metadata?.purchaseType || (session.mode === 'payment' ? 'plan_unique' : 'subscription');

      if (purchaseType === 'plan_unique') {
        // Plan Unique: one-time payment
        const planUniqueUpdate = {
          hasPurchasedPlan: true,
          planPurchaseDate: new Date().toISOString(),
        };
        if (session.customer) planUniqueUpdate.stripeCustomerId = session.customer;
        await admin.firestore().collection('users').doc(userId).set(planUniqueUpdate, { merge: true });
        console.log(`[Stripe] Utilisateur ${userId} a acheté le Plan Unique`);

        // Add to Brevo list #9 (Plan Unique buyers)
        if (email) {
          const BREVO_LIST_PLAN_UNIQUE = parseInt(process.env.BREVO_LIST_PLAN_UNIQUE) || 9;
          await brevoApiCall('contacts', 'POST', {
            email: email.toLowerCase(),
            attributes: { PRENOM: userData.firstName || 'Coureur', IS_PREMIUM: false },
            listIds: [BREVO_LIST_PLAN_UNIQUE],
            updateEnabled: true
          });
          console.log(`[Brevo] ${email} added to Plan Unique list #${BREVO_LIST_PLAN_UNIQUE}`);
        }
      } else {
        // Subscription (Mensuel / Annuel)
        await admin.firestore().collection('users').doc(userId).set({
          isPremium: true,
          premiumSince: new Date().toISOString(),
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription
        }, { merge: true });
        console.log(`[Stripe] Utilisateur ${userId} passé Premium !`);

        // Move to Brevo subscribers list
        if (email) {
          await brevoMoveToSubscribers(email);
          console.log(`[Brevo] ${email} moved to subscribers list`);
        }
      }
      // Meta CAPI: Track Purchase server-side (fiable, indépendant du navigateur)
      const purchaseValue = purchaseType === 'plan_unique' ? 3.90
        : (session.amount_total ? session.amount_total / 100 : 4.90);
      const contentName = purchaseType === 'plan_unique' ? 'Plan Unique'
        : (purchaseValue > 10 ? 'Premium Annuel' : 'Premium Mensuel');

      await sendMetaConversionEvent('Purchase', {
        email: email,
        value: purchaseValue,
        currency: 'EUR',
        contentName: contentName,
        contentIds: [purchaseType === 'plan_unique' ? 'plan_unique' : 'premium'],
        event_id: `purchase_${session.id}`,
      });

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

          // Move to Brevo désabonnés list (#10) — triggers re-engagement automation
          if (userData.email) {
            await brevoMoveToUnsubscribed(userData.email);
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

            // Move to Brevo désabonnés list (#10)
            const userData = userDoc.data();
            if (userData.email) {
              await brevoMoveToUnsubscribed(userData.email);
            }
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
    process.env.STRIPE_PRICE_PLAN_UNIQUE,
    'price_1T67g41WQbIX14t09MD5FAhl', // Plan Unique (ancien)
    'price_1TGEMl1WQbIX14t0KTcx7NdV', // Plan Unique 9,90€
    'price_1T67fR1WQbIX14t0eCWWtc68', // Monthly
    'price_1T1pl41WQbIX14t0QycLzNjF', // Yearly
    'price_1S2W601WQbIX14t0rkHRcJLG', // Monthly fallback (legacy)
    'price_1S2W7I1WQbIX14t0qJvbXMgT'  // Yearly fallback (legacy)
  ].filter(Boolean);

  if (validPriceIds.length > 0 && !validPriceIds.includes(priceId)) {
    console.warn(`[Stripe] PriceId inconnu tenté: ${priceId}`);
  }

  // Determine mode: 'payment' for Plan Unique, 'subscription' for Mensuel/Annuel
  const PLAN_UNIQUE_PRICE_IDS = [
    'price_1T67g41WQbIX14t09MD5FAhl',
    'price_1TGEMl1WQbIX14t0KTcx7NdV',
    process.env.STRIPE_PRICE_PLAN_UNIQUE
  ].filter(Boolean);

  const checkoutMode = (req.body.mode === 'payment' || PLAN_UNIQUE_PRICE_IDS.includes(priceId))
    ? 'payment'
    : 'subscription';

  try {
    const sessionParams = {
      mode: checkoutMode,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      client_reference_id: userId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, purchaseType: checkoutMode === 'payment' ? 'plan_unique' : 'subscription' }
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
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

// Strava Token Refresh - Proxy to keep client_secret server-side
app.post('/api/strava/refresh-token', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token requis' });
  }

  const clientId = process.env.VITE_STRAVA_CLIENT_ID;
  const clientSecret = process.env.VITE_STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[Strava Refresh] Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET');
    return res.status(500).json({ error: 'Configuration Strava manquante côté serveur' });
  }

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Strava Refresh] Error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Strava token refresh failed', details: errorText });
    }

    const tokenData = await response.json();
    console.log('[Strava Refresh] Token refreshed successfully');
    res.json(tokenData);
  } catch (err) {
    console.error('[Strava Refresh] Error:', err.message);
    res.status(500).json({ error: err.message });
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
        const wasEverPremium = !!(userData.premiumSince || userData.premiumCancelledAt || userData.stripeSubscriptionId);

        if (isPremium) {
          // Actif → liste 5 (abonnés)
          await brevoUpsertContact(userData.email, userData.firstName, true);
        } else if (wasEverPremium) {
          // Ex-premium → liste 10 (désabonnés), pas liste 6
          await brevoMoveToUnsubscribed(userData.email);
        } else {
          // Jamais premium → liste 6 (non-abonnés)
          await brevoUpsertContact(userData.email, userData.firstName, false);
        }
        synced++;
        results.push({ email: userData.email, isPremium, wasEverPremium, status: 'synced' });
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
    const emailLower = email.toLowerCase();

    // Vérifier si l'utilisateur est premium (via Firestore users collection)
    const usersRef = admin.firestore().collection('users');
    const userSnap = await usersRef.where('email', '==', emailLower).limit(1).get();
    const userData = userSnap.empty ? null : userSnap.docs[0].data();
    const isPremium = userData?.isPremium || false;
    const hasPurchasedPlan = userData?.hasPurchasedPlan || false;

    // Chercher plans existants avec cet email (champ userEmail dans Firestore)
    const plansRef = admin.firestore().collection('plans');
    const snapshot = await plansRef
      .where('userEmail', '==', emailLower)
      .get();

    // Ne compter que les plans actifs (date de fin non dépassée)
    const now = new Date();
    const activePlans = snapshot.docs.filter(doc => {
      const data = doc.data();
      if (!data.endDate) return true;
      return new Date(data.endDate) >= now;
    });

    // Limites par type d'utilisateur
    const maxPlans = (isPremium || hasPurchasedPlan) ? 2 : 1;

    if (activePlans.length >= maxPlans) {
      return res.json({
        allowed: false,
        reason: isPremium ? 'premium_limit' : 'email_limit_reached',
        message: isPremium
          ? 'Vous avez déjà 2 plans actifs (limite premium). Supprimez un plan pour en créer un nouveau.'
          : 'Cet email a déjà un plan actif. Connectez-vous pour y accéder.'
      });
    }

    res.json({ allowed: true });

  } catch (error) {
    console.error('[Check Plan Limit Error]', error);
    // En cas d'erreur, autoriser pour ne pas bloquer l'utilisateur
    res.json({ allowed: true, reason: 'check_failed' });
  }
});

// Debug endpoint - Admin only
app.post('/api/admin/debug-user', async (req, res) => {
  const { email, adminPassword } = req.body;
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  if (!admin) {
    return res.json({ error: 'Firebase Admin not configured' });
  }
  try {
    const emailLower = email.toLowerCase();
    // Find all user docs with this email
    const usersSnap = await admin.firestore().collection('users').where('email', '==', emailLower).get();
    const users = [];
    usersSnap.forEach(doc => {
      const d = doc.data();
      users.push({
        id: doc.id,
        email: d.email,
        isPremium: d.isPremium,
        hasPurchasedPlan: d.hasPurchasedPlan,
        isAnonymous: d.isAnonymous,
        stripeCustomerId: d.stripeCustomerId,
        stripeSubscriptionId: d.stripeSubscriptionId,
        stripeSubscriptionStatus: d.stripeSubscriptionStatus,
        premiumSince: d.premiumSince,
        createdAt: d.createdAt,
        firstName: d.firstName,
      });
    });

    // Find plans for this email
    const plansSnap = await admin.firestore().collection('plans').where('userEmail', '==', emailLower).get();
    const plans = [];
    plansSnap.forEach(doc => {
      const d = doc.data();
      plans.push({
        id: doc.id,
        name: d.name,
        userId: d.userId,
        userEmail: d.userEmail,
        createdAt: d.createdAt,
        isFreePreview: d.isFreePreview,
        isPreview: d.isPreview,
        fullPlanGenerated: d.fullPlanGenerated,
        hasGenerationContext: !!d.generationContext,
        hasPeriodizationPlan: !!d.generationContext?.periodizationPlan,
        totalWeeksPlanned: d.generationContext?.periodizationPlan?.totalWeeks || null,
        weeksCount: d.weeks?.length || 0,
        endDate: d.endDate,
      });
    });

    // Also find plans by userId(s)
    const plansByUid = [];
    for (const u of users) {
      const ps = await admin.firestore().collection('plans').where('userId', '==', u.id).get();
      ps.forEach(doc => {
        const d = doc.data();
        if (!plans.find(p => p.id === doc.id)) {
          plansByUid.push({
            id: doc.id,
            name: d.name,
            userId: d.userId,
            userEmail: d.userEmail,
            createdAt: d.createdAt,
            isFreePreview: d.isFreePreview,
            isPreview: d.isPreview,
            fullPlanGenerated: d.fullPlanGenerated,
            hasGenerationContext: !!d.generationContext,
            hasPeriodizationPlan: !!d.generationContext?.periodizationPlan,
            totalWeeksPlanned: d.generationContext?.periodizationPlan?.totalWeeks || null,
            weeksCount: d.weeks?.length || 0,
            endDate: d.endDate,
          });
        }
      });
    }

    // Simulate both plan limit checks
    const limitChecks = {};

    // 1. Server-side check (by email) — same as check-plan-limit endpoint
    const allPlansByEmail = await admin.firestore().collection('plans')
      .where('userEmail', '==', emailLower).get();
    const now = new Date();
    const activePlansByEmail = allPlansByEmail.docs.filter(doc => {
      const d = doc.data();
      if (!d.endDate) return true;
      return new Date(d.endDate) >= now;
    });
    const isPremiumUser = users.length > 0 && users[0].isPremium;
    const maxPlans = isPremiumUser ? 2 : 1;
    limitChecks.serverSide = {
      totalPlansFound: allPlansByEmail.size,
      activePlansCount: activePlansByEmail.length,
      activePlanIds: activePlansByEmail.map(d => ({ id: d.id, name: d.data().name, endDate: d.data().endDate, isPreview: d.data().isPreview, fullPlanGenerated: d.data().fullPlanGenerated })),
      maxAllowed: maxPlans,
      allowed: activePlansByEmail.length < maxPlans,
    };

    // 2. Client-side check (by userId) — same as checkCanGeneratePlan
    for (const u of users) {
      const plansByUidAll = await admin.firestore().collection('plans')
        .where('userId', '==', u.id).get();
      const activePlansByUid = plansByUidAll.docs.filter(doc => {
        const d = doc.data();
        if (!d.endDate) return true;
        return new Date(d.endDate) >= now;
      });
      limitChecks['clientSide_' + u.id] = {
        totalPlansFound: plansByUidAll.size,
        activePlansCount: activePlansByUid.length,
        activePlanIds: activePlansByUid.map(d => ({ id: d.id, name: d.data().name, endDate: d.data().endDate, isPreview: d.data().isPreview, fullPlanGenerated: d.data().fullPlanGenerated })),
        maxAllowed: u.isPremium ? 2 : 1,
        allowed: activePlansByUid.length < (u.isPremium ? 2 : 1),
      };
    }

    // 3. Check verify-subscription result
    let subscriptionCheck = {};
    for (const u of users) {
      if (u.stripeCustomerId) {
        try {
          const subs = await stripe.subscriptions.list({ customer: u.stripeCustomerId, status: 'all', limit: 3 });
          subscriptionCheck = {
            stripeCustomerId: u.stripeCustomerId,
            subscriptions: subs.data.map(s => ({ id: s.id, status: s.status, currentPeriodEnd: new Date(s.current_period_end * 1000).toISOString() }))
          };
        } catch (e) {
          subscriptionCheck = { error: e.message };
        }
      }
    }

    res.json({ users, limitChecks, subscriptionCheck, plansByEmail: plans, plansByUserId: plansByUid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: search plans
app.post('/api/admin/search-plans', async (req, res) => {
  const { adminPassword, limit: maxResults = 50 } = req.body;
  if (adminPassword !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Unauthorized' });
  if (!admin) return res.json({ error: 'Firebase Admin not configured' });
  try {
    const plansSnap = await admin.firestore().collection('plans').orderBy('createdAt', 'desc').limit(maxResults).get();
    const plans = [];
    plansSnap.forEach(doc => {
      const d = doc.data();
      plans.push({
        id: doc.id,
        name: d.name,
        goal: d.goal,
        distance: d.distance,
        level: d.generationContext?.questionnaireSnapshot?.level,
        sessionsPerWeek: d.generationContext?.questionnaireSnapshot?.trainingDays?.length,
        weeksCount: d.weeks?.length || 0,
        isPreview: d.isPreview,
        fullPlanGenerated: d.fullPlanGenerated,
        createdAt: d.createdAt,
        userEmail: d.userEmail,
        confidenceScore: d.confidenceScore,
      });
    });
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: merge duplicate user accounts
app.post('/api/admin/merge-user', async (req, res) => {
  const { adminPassword, keepUserId, deleteUserId } = req.body;
  if (adminPassword !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Unauthorized' });
  if (!admin || !keepUserId || !deleteUserId) return res.json({ error: 'Missing params' });
  try {
    const keepRef = admin.firestore().collection('users').doc(keepUserId);
    const deleteRef = admin.firestore().collection('users').doc(deleteUserId);
    const keepSnap = await keepRef.get();
    const deleteSnap = await deleteRef.get();
    if (!keepSnap.exists || !deleteSnap.exists) return res.json({ error: 'One or both users not found' });

    // Transfer plans from deleteUserId to keepUserId
    const plansSnap = await admin.firestore().collection('plans').where('userId', '==', deleteUserId).get();
    const transferred = [];
    for (const doc of plansSnap.docs) {
      await doc.ref.update({ userId: keepUserId });
      transferred.push(doc.id);
    }

    // Copy premium fields if the deleted account had them
    const deleteData = deleteSnap.data();
    const keepData = keepSnap.data();
    if (deleteData.isPremium && !keepData.isPremium) {
      await keepRef.update({
        isPremium: true,
        stripeCustomerId: deleteData.stripeCustomerId || null,
        stripeSubscriptionId: deleteData.stripeSubscriptionId || null,
        stripeSubscriptionStatus: deleteData.stripeSubscriptionStatus || null,
        premiumSince: deleteData.premiumSince || null,
      });
    }

    // Delete the duplicate Firestore user doc
    await deleteRef.delete();

    res.json({ success: true, keptUser: keepUserId, deletedUser: deleteUserId, plansTransferred: transferred });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    // Brevo: contact ajouté seulement après vérification email (dans /api/verify-email)

    console.log(`[Verification Email] Email envoyé à ${email}`);
    res.json({ success: true, message: 'Email de vérification envoyé', messageId: data.messageId });

  } catch (error) {
    console.error('[Verification Email Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// QUESTION AU COACH — Envoi email à l'équipe
// ============================================
app.post('/api/ask-coach', async (req, res) => {
  const { question, userEmail, userName, planName, sessionTitle, weekNumber } = req.body;

  if (!question || !userEmail) {
    return res.status(400).json({ error: 'Question et email requis' });
  }

  if (!BREVO_API_KEY) {
    return res.status(500).json({ error: 'Service email non disponible' });
  }

  try {
    const safeName = userName ? String(userName).slice(0, 50).replace(/[<>]/g, '') : 'Utilisateur';
    const safeQuestion = String(question).slice(0, 2000).replace(/[<>]/g, '');
    const context = [
      planName ? `Plan : ${planName}` : '',
      weekNumber ? `Semaine : ${weekNumber}` : '',
      sessionTitle ? `Séance : ${sessionTitle}` : '',
    ].filter(Boolean).join(' | ');

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', sans-serif; background: #f7fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #F97316, #EA580C); padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">💬 Question d'un coureur</h1>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; color: #64748b; margin: 0 0 4px;">De : <strong>${safeName}</strong> (${userEmail})</p>
      ${context ? `<p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px;">📋 ${context}</p>` : ''}
      <div style="background: #FFF7ED; border-left: 4px solid #F97316; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
        <p style="margin: 0; font-size: 15px; color: #1e293b; white-space: pre-wrap;">${safeQuestion}</p>
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">Répondre directement à cet email pour contacter ${safeName}.</p>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: "Coach Running IA", email: "programme@coachrunningia.fr" },
        to: [{ email: "programme@coachrunningia.fr", name: "Coach Running IA" }],
        replyTo: { email: userEmail, name: safeName },
        subject: `💬 Question de ${safeName} — ${planName || 'Coach Running IA'}`,
        htmlContent,
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[ask-coach] Brevo error:', data);
      return res.status(500).json({ error: 'Échec de l\'envoi' });
    }

    console.log(`[ask-coach] Question de ${userEmail}: "${safeQuestion.substring(0, 80)}..."`);
    res.json({ success: true });
  } catch (error) {
    console.error('[ask-coach] Error:', error);
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

    // 6. Ajouter à Brevo maintenant que l'email est vérifié
    const userDoc = await admin.firestore().collection('users').doc(tokenData.userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const isPremium = userData.isPremium === true;
    await brevoUpsertContact(tokenData.email, userData.firstName || 'Coureur', isPremium);
    console.log(`[Brevo] Contact ${tokenData.email} ajouté après vérification email (isPremium=${isPremium})`);

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
    // Try frontend token first, but refresh server-side if expired
    let accessToken = stravaAccessToken;

    // Load user's token from Firestore to check expiry
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const tokenData = userData?.stravaToken;
      if (tokenData?.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        if (tokenData.expires_at < now + 300) {
          console.log('[Strava Analysis] Token expired, refreshing server-side...');
          const clientId = process.env.VITE_STRAVA_CLIENT_ID;
          const clientSecret = process.env.VITE_STRAVA_CLIENT_SECRET;
          if (clientId && clientSecret && tokenData.refresh_token) {
            const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
                refresh_token: tokenData.refresh_token
              })
            });
            if (refreshResponse.ok) {
              const newTokenData = await refreshResponse.json();
              accessToken = newTokenData.access_token;
              // Save refreshed token to Firestore (preserve athlete info)
              const mergedToken = {
                ...newTokenData,
                ...(tokenData.athlete ? { athlete: tokenData.athlete } : {})
              };
              await db.collection('users').doc(userId).update({
                stravaToken: mergedToken,
                lastStravaSync: new Date().toISOString()
              });
              console.log('[Strava Analysis] Token refreshed and saved');
            } else {
              console.error('[Strava Analysis] Refresh failed:', await refreshResponse.text());
            }
          }
        }
      }
    }

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
    const GEMINI_API_KEY = process.env.GEMINI_SERVER_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
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

// ============================================
// POST /api/generate-preview-plan
// Generates a preview (week 1 only) training plan using Gemini
// ============================================

// --- Utility functions for pace/VMA calculations ---

function timeToSeconds(time) {
  if (!time) return 0;
  const t = time.trim().toLowerCase();

  // Format "Xh" ou "XhYY" ou "Xh:YY"
  const hMatch = t.match(/^(\d+)h:?(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1]);
    const mins = hMatch[2] ? parseInt(hMatch[2]) : 0;
    return hours * 3600 + mins * 60;
  }

  // Format "XX min" ou "XXmin"
  const minMatch = t.match(/^(\d+)\s*min/);
  if (minMatch) {
    return parseInt(minMatch[1]) * 60;
  }

  // Format "mm:ss" ou "hh:mm:ss"
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return 0;
}

function secondsToPace(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function calculateVMAFromTime(distance, timeSeconds) {
  const avgSpeed = (distance / timeSeconds) * 3600;
  let vmaFactor;
  if (distance <= 5) {
    vmaFactor = 0.95;
  } else if (distance <= 10) {
    vmaFactor = 0.90;
  } else if (distance <= 21.1) {
    vmaFactor = 0.85;
  } else {
    vmaFactor = 0.80;
  }
  return avgSpeed / vmaFactor;
}

function calculateAllPaces(vma) {
  const vmaPaceSeconds = 3600 / vma;
  const seuilSpeed = vma * 0.87;
  const eaSpeed = vma * 0.77;
  const efSpeed = vma * 0.67;
  const recoverySpeed = vma * 0.60;
  const specific5kSpeed = vma * 0.95;
  const specific10kSpeed = vma * 0.90;
  const specificSemiSpeed = vma * 0.85;
  const specificMarathonSpeed = vma * 0.80;

  return {
    vma,
    vmaKmh: vma.toFixed(1),
    vmaPace: secondsToPace(vmaPaceSeconds),
    seuilPace: secondsToPace(3600 / seuilSpeed),
    eaPace: secondsToPace(3600 / eaSpeed),
    efPace: secondsToPace(3600 / efSpeed),
    recoveryPace: secondsToPace(3600 / recoverySpeed),
    allureSpecifique5k: secondsToPace(3600 / specific5kSpeed),
    allureSpecifique10k: secondsToPace(3600 / specific10kSpeed),
    allureSpecifiqueSemi: secondsToPace(3600 / specificSemiSpeed),
    allureSpecifiqueMarathon: secondsToPace(3600 / specificMarathonSpeed),
  };
}

function getBestVMAEstimate(raceTimes) {
  if (!raceTimes) return null;

  const estimates = [];

  if (raceTimes.distance5km) {
    const seconds = timeToSeconds(raceTimes.distance5km);
    if (seconds > 0) {
      estimates.push({ vma: calculateVMAFromTime(5, seconds), source: `5km en ${raceTimes.distance5km}`, priority: 1 });
    }
  }

  if (raceTimes.distance10km) {
    const seconds = timeToSeconds(raceTimes.distance10km);
    if (seconds > 0) {
      estimates.push({ vma: calculateVMAFromTime(10, seconds), source: `10km en ${raceTimes.distance10km}`, priority: 2 });
    }
  }

  if (raceTimes.distanceHalfMarathon) {
    const seconds = timeToSeconds(raceTimes.distanceHalfMarathon);
    if (seconds > 0) {
      estimates.push({ vma: calculateVMAFromTime(21.1, seconds), source: `Semi en ${raceTimes.distanceHalfMarathon}`, priority: 3 });
    }
  }

  if (raceTimes.distanceMarathon) {
    const seconds = timeToSeconds(raceTimes.distanceMarathon);
    if (seconds > 0) {
      estimates.push({ vma: calculateVMAFromTime(42.195, seconds), source: `Marathon en ${raceTimes.distanceMarathon}`, priority: 4 });
    }
  }

  if (estimates.length === 0) return null;

  estimates.sort((a, b) => a.priority - b.priority);

  if (estimates.length >= 2) {
    const weighted = estimates.slice(0, 2);
    const avgVma = (weighted[0].vma * 0.6 + weighted[1].vma * 0.4);
    return { vma: avgVma, source: `Moyenne ${weighted[0].source} et ${weighted[1].source}` };
  }

  return estimates[0];
}

function calculatePeriodizationPlan(totalWeeks, currentVolume, level, goal) {
  const progressionRate = level === 'Débutant (0-1 an)' ? 0.05 :
                          level === 'Intermédiaire (Régulier)' ? 0.08 :
                          level === 'Confirmé (Compétition)' ? 0.10 : 0.12;

  const phases = [];
  const fondamentalWeeks = Math.max(2, Math.floor(totalWeeks * 0.30));
  const developpementWeeks = Math.max(2, Math.floor(totalWeeks * 0.35));
  const specifiqueWeeks = Math.max(2, Math.floor(totalWeeks * 0.25));
  const affutageWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - specifiqueWeeks);

  for (let i = 0; i < totalWeeks; i++) {
    if (i < fondamentalWeeks) {
      phases.push('fondamental');
    } else if (i < fondamentalWeeks + developpementWeeks) {
      phases.push('developpement');
    } else if (i < fondamentalWeeks + developpementWeeks + specifiqueWeeks) {
      phases.push('specifique');
    } else {
      phases.push('affutage');
    }
  }

  const recoveryWeeks = [];
  const recoveryInterval = level === 'Débutant (0-1 an)' ? 3 : 4;
  for (let i = recoveryInterval; i <= totalWeeks - 2; i += recoveryInterval) {
    recoveryWeeks.push(i);
    phases[i - 1] = 'recuperation';
  }

  const weeklyVolumes = [];
  let currentVol = currentVolume;

  for (let i = 0; i < totalWeeks; i++) {
    const weekNum = i + 1;
    if (recoveryWeeks.includes(weekNum)) {
      weeklyVolumes.push(Math.round(currentVol * 0.7));
    } else if (phases[i] === 'affutage') {
      const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
      const reductionFactor = 1 - (0.25 + affutageProgress * 0.25);
      weeklyVolumes.push(Math.round(currentVol * reductionFactor));
    } else {
      weeklyVolumes.push(Math.round(currentVol));
      currentVol = currentVol * (1 + progressionRate);
    }
  }

  return { weeklyVolumes, weeklyPhases: phases, recoveryWeeks };
}

function createGenerationContext(data, paces, vma, vmaSource, totalWeeks) {
  const currentVolume = data.currentWeeklyVolume || (
    data.level === 'Débutant (0-1 an)' ? 15 :
    data.level === 'Intermédiaire (Régulier)' ? 30 :
    data.level === 'Confirmé (Compétition)' ? 45 : 60
  );

  const periodizationPlan = calculatePeriodizationPlan(
    totalWeeks,
    currentVolume,
    data.level || 'Intermédiaire (Régulier)',
    data.goal || ''
  );

  return {
    vma,
    vmaSource,
    paces: {
      efPace: paces.efPace,
      eaPace: paces.eaPace,
      seuilPace: paces.seuilPace,
      vmaPace: paces.vmaPace,
      recoveryPace: paces.recoveryPace,
      allureSpecifique5k: paces.allureSpecifique5k,
      allureSpecifique10k: paces.allureSpecifique10k,
      allureSpecifiqueSemi: paces.allureSpecifiqueSemi,
      allureSpecifiqueMarathon: paces.allureSpecifiqueMarathon,
    },
    periodizationPlan: {
      totalWeeks,
      ...periodizationPlan,
    },
    questionnaireSnapshot: { ...data },
    generatedAt: new Date().toISOString(),
    modelUsed: 'gemini-2.0-flash',
  };
}

app.post('/api/generate-preview-plan', async (req, res) => {
  console.log('[Preview Plan] Received request');
  const startTime = Date.now();

  try {
    const data = req.body;

    // Input validation
    if (!data || !data.goal || !data.level) {
      return res.status(400).json({ error: 'Les champs "goal" et "level" sont requis.' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_SERVER_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Clé API Gemini non configurée sur le serveur.' });
    }

    // === VMA & PACES CALCULATION ===
    let vmaEstimate = getBestVMAEstimate(data.recentRaceTimes);
    let paces;
    let vmaSource;

    if (vmaEstimate) {
      paces = calculateAllPaces(vmaEstimate.vma);
      vmaSource = vmaEstimate.source;
    } else {
      let defaultVma;
      switch (data.level) {
        case 'Débutant (0-1 an)': defaultVma = 11.0; break;
        case 'Intermédiaire (Régulier)': defaultVma = 13.5; break;
        case 'Confirmé (Compétition)': defaultVma = 15.5; break;
        case 'Expert (Performance)': defaultVma = 17.5; break;
        default: defaultVma = 12.5;
      }
      paces = calculateAllPaces(defaultVma);
      vmaSource = `Estimation niveau ${data.level}`;
      vmaEstimate = { vma: defaultVma, source: vmaSource };
    }

    // Plan duration
    let planDurationWeeks = 12;
    if (data.raceDate) {
      const raceDate = new Date(data.raceDate);
      const startDate = data.startDate ? new Date(data.startDate) : new Date();
      const diffTime = raceDate.getTime() - startDate.getTime();
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      planDurationWeeks = Math.max(4, Math.min(20, diffWeeks));
    }

    // === GENERATION CONTEXT ===
    const generationContext = createGenerationContext(
      data, paces, vmaEstimate.vma, vmaSource, planDurationWeeks
    );

    // Paces section
    const pacesSection = `
VMA : ${paces.vmaKmh} km/h (${vmaSource})
- EF (Endurance) : ${paces.efPace} min/km
- Seuil : ${paces.seuilPace} min/km
- VMA : ${paces.vmaPace} min/km
- Récupération : ${paces.recoveryPace} min/km
`;

    // Preferred days instruction
    const preferredDaysInstruction = data.preferredDays && data.preferredDays.length > 0
      ? `Séances UNIQUEMENT sur : ${data.preferredDays.join(', ')}`
      : 'Répartition équilibrée (ex: Mardi, Jeudi, Dimanche)';

    // Injury instruction
    let injuryInstruction = '';
    if (data.injuries && data.injuries.hasInjury && data.injuries.description) {
      injuryInstruction = `⚠️ BLESSURE : ${data.injuries.description} - Adapter les séances !`;
    }

    // Beginner instruction
    const isBeginnerLevel = data.level === 'Débutant (0-1 an)';
    const frequency = data.frequency || 3;
    const beginnerInstructionPreview = isBeginnerLevel ? `

🚶‍♂️🏃 IMPORTANT - NIVEAU DÉBUTANT DÉTECTÉ 🚶‍♀️🏃‍♀️
Pour la SEMAINE 1 d'un débutant, tu DOIS utiliser l'ALTERNANCE MARCHE/COURSE :
- Type de séance : "Marche/Course" (OBLIGATOIRE pour au moins 2 séances sur ${frequency})
- Format semaine 1 : 8-10 x (1 min course légère + 2 min marche active)
- Allure course : très aisée, pouvoir parler facilement
- Durée totale : 25-35 min (échauffement marche inclus)
- Pas de VMA, pas de fractionné intense !
- Conseils encourageants : "La marche fait partie du programme, ce n'est pas de la triche !"
` : '';

    // City-based location instructions
    const cityInstructions = data.city ? `
📍 LIEUX D'ENTRAÎNEMENT (suggestedLocations) :
Tu DOIS proposer 2-3 lieux RÉELS à ${data.city} ou dans ses environs proches :
- Recherche des parcs, pistes d'athlétisme, forêts ou sentiers CONNUS de cette ville
- Exemples pour Paris : Bois de Vincennes, Parc Montsouris, Jardin du Luxembourg
- Exemples pour Lyon : Parc de la Tête d'Or, Berges du Rhône
- Pour chaque lieu, indique le type (PARK, TRACK, NATURE, HILL) et pour quel type de séance il convient

📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE :
Chaque séance DOIT avoir un "locationSuggestion" avec un lieu RÉEL de ${data.city} adapté aux EXIGENCES de la séance :
- Fractionné VMA/vitesse → PISTE D'ATHLÉTISME (surface plane, distances balisées)
- Fractionné seuil/tempo → chemin plat, berges, voie verte
- Séance avec D+ (elevationGain > 0) → colline, forêt pentue, parc vallonné (lieu avec VRAI dénivelé !)
- Sortie Longue route → grand parc, boucle longue, berges
- Sortie Longue Trail → forêt/montagne avec sentiers
- Footing/Récup → parc agréable, sol souple, berges calmes
- Renforcement → "À la maison" ou "Salle de sport"
` : '';

    // === BUILD PROMPT ===
    const previewPrompt = `
Tu es un Coach Running Expert. Génère UNIQUEMENT la SEMAINE 1 d'un plan d'entraînement.

═══════════════════════════════════════════════════════════════
                    PROFIL DU COUREUR
═══════════════════════════════════════════════════════════════
- Niveau : ${data.level}
- Objectif : ${data.goal} ${data.subGoal ? `(${data.subGoal})` : ''}
- Temps visé : ${data.targetTime || 'Finisher'}
- Date de course : ${data.raceDate || 'Non définie'}
- Fréquence : ${frequency} séances/semaine
- Jours : ${preferredDaysInstruction}
- Localisation : ${data.city || 'Non renseignée'}
${injuryInstruction}
${beginnerInstructionPreview}
${cityInstructions}

═══════════════════════════════════════════════════════════════
              ALLURES CALCULÉES (OBLIGATOIRES)
═══════════════════════════════════════════════════════════════
${pacesSection}

⚠️ UTILISE CES ALLURES EXACTES dans chaque séance !

═══════════════════════════════════════════════════════════════
              PLAN DE PÉRIODISATION PRÉ-CALCULÉ
═══════════════════════════════════════════════════════════════
Durée totale : ${planDurationWeeks} semaines
Semaine 1 : Phase "${generationContext.periodizationPlan.weeklyPhases[0]}"
Volume semaine 1 : ${generationContext.periodizationPlan.weeklyVolumes[0]} km

Phases du plan :
${generationContext.periodizationPlan.weeklyPhases.map((p, i) => `S${i + 1}: ${p} (${generationContext.periodizationPlan.weeklyVolumes[i]}km)`).join('\n')}

═══════════════════════════════════════════════════════════════
                    INSTRUCTIONS
═══════════════════════════════════════════════════════════════
1. Génère SEULEMENT la semaine 1 (pas les autres !)
2. ${frequency} séances sur ${frequency} jours DIFFÉRENTS
3. Allures EXACTES dans chaque mainSet
4. Message de bienvenue orienté OBJECTIF et STRUCTURE (PAS de VMA ni allures)
5. Évaluation de faisabilité HONNÊTE avec chiffres
6. OBLIGATOIRE : 1 séance de type "Renforcement" par semaine (comptée dans les ${frequency} séances)
   - Répartition : ${frequency} séances = ${frequency - 1} running + 1 renfo
   - La séance renfo doit être SPÉCIFIQUE course à pied : squats, fentes, gainage, proprioception, mollets
   - Durée : 30-45 min
   - Type dans le JSON : "Renforcement"
   - NE PAS mettre de séance "Repos" dans le plan

═══════════════════════════════════════════════════════════════
                    FORMAT JSON
═══════════════════════════════════════════════════════════════
{
  "name": "Nom du plan incluant objectif",
  "goal": "${data.goal}",
  "startDate": "${data.startDate || new Date().toISOString().split('T')[0]}",
  "durationWeeks": ${planDurationWeeks},
  "sessionsPerWeek": ${frequency},
  "targetTime": "${data.targetTime || ''}",
  "distance": "${data.subGoal || ''}",
  "location": "${data.city || ''}",
  "suggestedLocations": [
    { "name": "Nom réel du lieu", "type": "PARK|TRACK|NATURE|HILL", "description": "Pour quel type de séance" }
  ],
  "welcomeMessage": "Message personnalisé orienté OBJECTIF et STRUCTURE du plan (NE PAS mentionner VMA ni allures)",
  "confidenceScore": 75,
  "feasibility": {
    "status": "BON",
    "message": "Analyse avec chiffres VMA/temps théorique",
    "safetyWarning": "Conseil sécurité"
  },
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Thème de la semaine",
      "phase": "${generationContext.periodizationPlan.weeklyPhases[0]}",
      "sessions": [
        {
          "day": "Jour",
          "type": "Type",
          "title": "Titre unique",
          "duration": "durée",
          "distance": "distance",
          "intensity": "Facile|Modéré|Difficile",
          "targetPace": "allure",
          "elevationGain": 600,
          "locationSuggestion": "Lieu réel adapté à cette séance",
          "warmup": "échauffement avec allure",
          "mainSet": "corps détaillé avec allures EXACTES",
          "cooldown": "retour au calme",
          "advice": "conseil personnalisé"
        }
      ]
    }
  ]
}

RAPPEL : Génère UNIQUEMENT la semaine 1 !
`;

    // === CALL GEMINI ===
    console.log('[Preview Plan] Calling Gemini 2.0 Flash...');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: previewPrompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const response = await result.response;
    const text = response.text();
    const plan = JSON.parse(text);

    // === POST-PROCESSING ===
    plan.id = Date.now().toString();
    plan.createdAt = new Date().toISOString();
    plan.calculatedVMA = vmaEstimate.vma;
    plan.vma = paces.vma;
    plan.vmaSource = vmaSource;
    plan.paces = {
      efPace: paces.efPace,
      eaPace: paces.eaPace,
      seuilPace: paces.seuilPace,
      vmaPace: paces.vmaPace,
      recoveryPace: paces.recoveryPace,
      allureSpecifique5k: paces.allureSpecifique5k,
      allureSpecifique10k: paces.allureSpecifique10k,
      allureSpecifiqueSemi: paces.allureSpecifiqueSemi,
      allureSpecifiqueMarathon: paces.allureSpecifiqueMarathon,
    };

    // Mark as preview
    plan.isPreview = true;
    plan.fullPlanGenerated = false;

    // Store generation context
    plan.generationContext = generationContext;

    // Initialize adaptation log
    plan.adaptationLog = {
      weekNumber: 0,
      adaptationsThisWeek: 0,
      adaptationHistory: []
    };

    // Validate and fix days (deduplicate + sort)
    const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    if (plan.weeks && plan.weeks[0] && plan.weeks[0].sessions) {
      const usedDays = new Set();
      plan.weeks[0].sessions.forEach((session, idx) => {
        if (usedDays.has(session.day)) {
          const available = DAYS_ORDER.filter(d => !usedDays.has(d));
          if (available.length > 0) session.day = available[Math.min(idx, available.length - 1)];
        }
        usedDays.add(session.day);
        session.id = `w1-s${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      });
      plan.weeks[0].sessions.sort((a, b) =>
        DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Preview Plan] Completed in ${elapsed}ms`);

    res.json(plan);

  } catch (error) {
    console.error('[Preview Plan] Error:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la génération du plan preview.' });
  }
});

// ============================================
// CRON: Daily Report (midnight CET)
// ============================================
app.get('/api/cron/daily-report', async (req, res) => {
  // Auth: Cloud Scheduler OIDC header OR admin password
  const schedulerHeader = req.headers['x-cloudscheduler'] || req.headers['x-appengine-cron'];
  const authHeader = req.headers['authorization'];
  const adminPwd = req.query.adminPassword;

  const isScheduler = schedulerHeader === 'true';
  const isOIDC = authHeader && authHeader.startsWith('Bearer ');
  const isAdmin = adminPwd === process.env.ADMIN_PASSWORD;

  if (!isScheduler && !isOIDC && !isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!admin) {
    return res.status(500).json({ error: 'Firebase Admin not available' });
  }

  console.log('[CRON Daily Report] Starting...');
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // 1. Plans created in last 24h
    const allPlansSnap = await admin.firestore().collection('plans').get();
    const newPlans = [];
    const allPlansWithRPE = [];

    allPlansSnap.forEach(doc => {
      const d = doc.data();
      // Check if created in last 24h
      let createdAt = null;
      if (d.createdAt) {
        if (d.createdAt._seconds) createdAt = new Date(d.createdAt._seconds * 1000);
        else if (d.createdAt.toDate) createdAt = d.createdAt.toDate();
        else if (typeof d.createdAt === 'string') createdAt = new Date(d.createdAt);
      }

      if (createdAt && createdAt >= yesterday) {
        newPlans.push({
          id: doc.id,
          email: d.userEmail || 'N/A',
          isPreview: d.isPreview || false,
          fullPlanGenerated: d.fullPlanGenerated || false,
          createdAt: createdAt.toISOString(),
        });
      }

      // Collect RPE feedback from all plans
      if (d.weeks && Array.isArray(d.weeks)) {
        d.weeks.forEach((week, wi) => {
          if (week.sessions && Array.isArray(week.sessions)) {
            week.sessions.forEach((session, si) => {
              if (session.feedback && typeof session.feedback.rpe === 'number' && session.feedback.rpe !== 5) {
                allPlansWithRPE.push({
                  planId: doc.id,
                  email: d.userEmail || 'N/A',
                  userId: d.userId || null,
                  week: wi + 1,
                  sessionIndex: si + 1,
                  sessionTitle: session.title || 'Sans titre',
                  rpe: session.feedback.rpe,
                  notes: session.feedback.notes || '',
                  completed: session.feedback.completed || false,
                  completedAt: session.feedback.completedAt || null,
                });
              }
            });
          }
        });
      }
    });

    // 2. Identify abnormal RPE (< 4 or > 8)
    const abnormalRPE = allPlansWithRPE.filter(r => r.rpe < 4 || r.rpe > 8);

    // 3. Get premium users
    const premiumUsersSnap = await admin.firestore().collection('users').where('isPremium', '==', true).get();
    const premiumEmails = new Set();
    const premiumUserIds = new Set();
    premiumUsersSnap.forEach(doc => {
      const d = doc.data();
      if (d.email) premiumEmails.add(d.email.toLowerCase());
      premiumUserIds.add(doc.id);
    });

    // 4. Cross-reference RPE with premium
    const premiumAbnormal = abnormalRPE.filter(r =>
      premiumEmails.has((r.email || '').toLowerCase()) || premiumUserIds.has(r.userId)
    );
    const nonPremiumAbnormal = abnormalRPE.filter(r =>
      !premiumEmails.has((r.email || '').toLowerCase()) && !premiumUserIds.has(r.userId)
    );

    // 5. Build HTML email
    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const newPlansPreview = newPlans.filter(p => p.isPreview && !p.fullPlanGenerated);
    const newPlansFull = newPlans.filter(p => p.fullPlanGenerated);

    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; color: #333; }
  .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
  .section { padding: 20px 30px; border-bottom: 1px solid #eee; }
  .section h2 { font-size: 16px; color: #4a5568; margin: 0 0 12px; }
  .stat-row { display: flex; gap: 15px; margin-bottom: 15px; }
  .stat-box { flex: 1; background: #f7fafc; border-radius: 8px; padding: 15px; text-align: center; }
  .stat-box .number { font-size: 28px; font-weight: bold; color: #667eea; }
  .stat-box .label { font-size: 12px; color: #718096; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f7fafc; text-align: left; padding: 8px 10px; color: #4a5568; font-weight: 600; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  .badge-premium { background: #ffd700; color: #744210; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-alert { background: #fed7d7; color: #9b2c2c; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-easy { background: #c6f6d5; color: #276749; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .rpe-high { color: #e53e3e; font-weight: bold; }
  .rpe-low { color: #38a169; font-weight: bold; }
  .footer { padding: 15px 30px; text-align: center; color: #a0aec0; font-size: 12px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>📊 Rapport Quotidien — Coach Running IA</h1>
    <p>${dateStr}</p>
  </div>

  <div class="section">
    <h2>📋 Plans créés (dernières 24h)</h2>
    <div class="stat-row">
      <div class="stat-box"><div class="number">${newPlans.length}</div><div class="label">Total</div></div>
      <div class="stat-box"><div class="number">${newPlansFull.length}</div><div class="label">Plans complets</div></div>
      <div class="stat-box"><div class="number">${newPlansPreview.length}</div><div class="label">Preview seul</div></div>
    </div>
    ${newPlans.length > 0 ? `<table>
      <tr><th>ID</th><th>Email</th><th>Type</th><th>Heure</th></tr>
      ${newPlans.map(p => `<tr>
        <td><code>${p.id.substring(0, 12)}...</code></td>
        <td>${p.email}</td>
        <td>${p.fullPlanGenerated ? '✅ Complet' : '👁️ Preview'}</td>
        <td>${new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>`).join('')}
    </table>` : '<p style="color:#a0aec0;">Aucun plan créé.</p>'}
  </div>

  <div class="section">
    <h2>📈 RPE — Vue d'ensemble</h2>
    <div class="stat-row">
      <div class="stat-box"><div class="number">${allPlansWithRPE.length}</div><div class="label">RPE reçus (hors défaut)</div></div>
      <div class="stat-box"><div class="number">${abnormalRPE.length}</div><div class="label">RPE anormaux</div></div>
      <div class="stat-box"><div class="number">${premiumAbnormal.length}</div><div class="label">⚠️ Premium alertes</div></div>
    </div>
  </div>

  ${premiumAbnormal.length > 0 ? `<div class="section" style="background:#fffbeb;">
    <h2>🌟 ALERTE PREMIUM — RPE anormaux</h2>
    <table>
      <tr><th>Email</th><th>Plan ID</th><th>Séance</th><th>RPE</th><th>Commentaire</th></tr>
      ${premiumAbnormal.map(r => `<tr>
        <td><strong>${r.email}</strong> <span class="badge-premium">PREMIUM</span></td>
        <td><code>${r.planId.substring(0, 12)}...</code></td>
        <td>S${r.week} — ${r.sessionTitle}</td>
        <td class="${r.rpe > 8 ? 'rpe-high' : 'rpe-low'}">${r.rpe}/10 ${r.rpe > 8 ? '🔴' : '🟢'}</td>
        <td>${r.notes || '—'}</td>
      </tr>`).join('')}
    </table>
  </div>` : ''}

  ${nonPremiumAbnormal.length > 0 ? `<div class="section">
    <h2>⚠️ RPE anormaux (non-premium)</h2>
    <table>
      <tr><th>Email</th><th>Plan ID</th><th>Séance</th><th>RPE</th><th>Commentaire</th></tr>
      ${nonPremiumAbnormal.map(r => `<tr>
        <td>${r.email}</td>
        <td><code>${r.planId.substring(0, 12)}...</code></td>
        <td>S${r.week} — ${r.sessionTitle}</td>
        <td class="${r.rpe > 8 ? 'rpe-high' : 'rpe-low'}">${r.rpe}/10 ${r.rpe > 8 ? '🔴' : '🟢'}</td>
        <td>${r.notes || '—'}</td>
      </tr>`).join('')}
    </table>
  </div>` : ''}

  <div class="footer">
    <p>🤖 Rapport généré automatiquement — Coach Running IA CRON Agent</p>
    <p>Plans en base : ${allPlansSnap.size} | Premium actifs : ${premiumUsersSnap.size}</p>
  </div>
</div>
</body></html>`;

    // 6. Send via Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error('[CRON Daily Report] BREVO_API_KEY missing');
      return res.status(500).json({ error: 'BREVO_API_KEY not configured' });
    }

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: "Coach Running IA — CRON",
          email: "programme@coachrunningia.fr"
        },
        to: [{ email: "programme@coachrunningia.fr", name: "Coach Running IA" }],
        subject: `📊 Rapport quotidien — ${newPlans.length} plans, ${abnormalRPE.length} RPE anormaux — ${now.toLocaleDateString('fr-FR')}`,
        htmlContent: htmlContent
      })
    });

    const emailData = await emailResponse.json();
    console.log('[CRON Daily Report] Brevo response:', emailResponse.status, emailData);

    const summary = {
      date: dateStr,
      newPlans: newPlans.length,
      newPlansFull: newPlansFull.length,
      newPlansPreview: newPlansPreview.length,
      totalRPE: allPlansWithRPE.length,
      abnormalRPE: abnormalRPE.length,
      premiumAlerts: premiumAbnormal.length,
      emailSent: emailResponse.ok,
    };

    console.log('[CRON Daily Report] Summary:', JSON.stringify(summary));
    res.json({ success: true, summary });

  } catch (error) {
    console.error('[CRON Daily Report] Error:', error);
    res.status(500).json({ error: error.message });
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
