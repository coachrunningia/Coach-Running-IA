// Fetch 10 profiles for cascade volumes investigation
import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TARGET_EMAILS = [
  'georgeslor1@gmail.com',
  'jeremy.charriere@live.fr',
  'rija.rajohnson@gmail.com',
  'vincenthamel935@gmail.com',
  'lafleur666@yahoo.fr',
  'antoineg.gde@outlook.fr',
  'arenaarmando@hotmail.com',
  'sebastien.sailly@outlook.fr',
  'alanwentzel74@gmail.com',
  'nabou57@hotmail.fr',
];

async function findUserByEmail(email) {
  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) {
    // also try profiles
    const snap2 = await db.collection('profiles').where('email', '==', email).limit(1).get();
    if (snap2.empty) return null;
    return { id: snap2.docs[0].id, data: snap2.docs[0].data(), col: 'profiles' };
  }
  return { id: snap.docs[0].id, data: snap.docs[0].data(), col: 'users' };
}

async function getPlanForUser(userId) {
  // try plans collection
  const snap = await db.collection('plans').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(3).get();
  if (snap.empty) return [];
  return snap.docs.map(d => ({ id: d.id, data: d.data() }));
}

(async () => {
  const out = {};
  for (const email of TARGET_EMAILS) {
    try {
      const user = await findUserByEmail(email);
      if (!user) { out[email] = { error: 'NOT_FOUND' }; continue; }
      const plans = await getPlanForUser(user.id);
      out[email] = {
        userId: user.id,
        userCol: user.col,
        userData: user.data,
        plansCount: plans.length,
        plans: plans.map(p => ({
          planId: p.id,
          createdAt: p.data?.createdAt?.toMillis ? p.data.createdAt.toMillis() : (p.data?.createdAt || null),
          questionnaireData: p.data?.questionnaireData || p.data?.questionnaire || null,
          generationContext: p.data?.generationContext || null,
          weeklyVolumes: p.data?.generationContext?.periodizationPlan?.weeklyVolumes ||
                         p.data?.weeklyVolumes || null,
          weeklyPhases: p.data?.generationContext?.periodizationPlan?.weeklyPhases || null,
          vmaSource: p.data?.generationContext?.vmaSource || null,
          vma: p.data?.generationContext?.vma || null,
          subGoal: p.data?.questionnaireData?.subGoal || p.data?.questionnaire?.subGoal || null,
          goal: p.data?.questionnaireData?.goal || p.data?.questionnaire?.goal || null,
          weeks: Array.isArray(p.data?.weeks) ? p.data.weeks.length : null,
        }))
      };
      console.log(`OK ${email}: ${plans.length} plans`);
    } catch (e) {
      out[email] = { error: e.message };
      console.error(`ERR ${email}:`, e.message);
    }
  }
  fs.writeFileSync('./10-profiles-cascade.json', JSON.stringify(out, null, 2));
  console.log('Done → 10-profiles-cascade.json');
  process.exit(0);
})();
