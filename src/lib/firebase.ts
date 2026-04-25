import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

let db: any = null;
let auth: any = null;

const initialize = async () => {
  try {
    // @ts-ignore
    const config = await import('../../firebase-applet-config.json').then(m => m.default).catch(() => null);
    
    if (config) {
      const app = initializeApp(config);
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      }, (config as any).firestoreDatabaseId || '');
      auth = getAuth(app);
    }
  } catch (e) {
    console.warn("FIREBASE_HANDSHAKE_ERROR");
  }
};

initialize();

export { db, auth };
