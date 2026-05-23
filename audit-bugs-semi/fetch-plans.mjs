import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const sa = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/serviceAccountKey.json', 'utf-8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const ids = ['1779291643754', '1779291819180', '1779292771055', '1779296358366'];
const out = {};
for (const id of ids) {
  const snap = await db.collection('plans').doc(id).get();
  if (!snap.exists) { console.log(`NOT FOUND: ${id}`); continue; }
  const plan = snap.data();
  out[id] = { plan };
  writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-bugs-semi/plan-${id}.json`, JSON.stringify(plan, null, 2));
  const uid = plan.userId;
  if (uid) {
    const usnap = await db.collection('users').doc(uid).get();
    if (usnap.exists) {
      const user = usnap.data();
      out[id].user = user;
      writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-bugs-semi/user-${id}.json`, JSON.stringify(user, null, 2));
      console.log(`OK ${id} userId=${uid} email=${user.email}`);
    } else {
      console.log(`OK ${id} userId=${uid} USER NOT FOUND`);
    }
  } else {
    console.log(`OK ${id} NO userId`);
  }
}
process.exit(0);
