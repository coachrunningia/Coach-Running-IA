// Fetch plan 1779071910169 via Firebase Admin SDK
import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/serviceAccountKey.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const PLAN_ID = '1779071910169';

(async () => {
  try {
    // 1. Fetch plan
    const planDoc = await db.collection('plans').doc(PLAN_ID).get();
    if (!planDoc.exists) {
      console.log('Plan not found in /plans/' + PLAN_ID);
      // Try collectionGroup
      const groupSnap = await db.collectionGroup('plans').where(admin.firestore.FieldPath.documentId(), '==', PLAN_ID).get();
      console.log('CollectionGroup result:', groupSnap.size);
      if (groupSnap.size > 0) {
        const d = groupSnap.docs[0];
        console.log('Path:', d.ref.path);
        fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-1779071910169-plan.json', JSON.stringify(d.data(), null, 2));
      }
      process.exit(0);
    }
    const planData = planDoc.data();
    fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-1779071910169-plan.json', JSON.stringify(planData, null, 2));
    console.log('Plan saved.');
    console.log('userId:', planData.userId);
    console.log('userEmail:', planData.userEmail);
    console.log('planName:', planData.planName);
    console.log('createdAt:', planData.createdAt);

    // 2. Fetch user
    const uid = planData.userId;
    if (uid) {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-1779071910169-user.json', JSON.stringify(userDoc.data(), null, 2));
        console.log('User saved');
      } else {
        // try profiles
        const profileDoc = await db.collection('profiles').doc(uid).get();
        if (profileDoc.exists) {
          fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-1779071910169-user.json', JSON.stringify(profileDoc.data(), null, 2));
          console.log('User saved from profiles');
        } else {
          console.log('User not found in users or profiles for uid:', uid);
        }
      }
    }

    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
