import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { Interaction } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firebaseConfig.firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google Sign In via popup
export async function signInWithGoogle(): Promise<User> {
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Sign Out
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// Test initial connection as required by Firebase skill
export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase network check: offline or initial warm-up pending.');
    }
  }
}
testFirestoreConnection();

// Zero-crash payload hygiene: strip all undefined values before passing to Firestore
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        sanitized[key] = stripUndefined(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

// Structured error handling as specified in the Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Firestore operations isolated to user: /users/{userId}/interactions/{interactionId}
export function subscribeToUserInteractions(
  userId: string,
  onData: (interactions: Interaction[]) => void,
  onError: (err: any) => void
) {
  const path = `users/${userId}/interactions`;
  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const q = query(interactionsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Interaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Interaction, 'id'>),
        });
      });
      onData(list);
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveUserInteraction(
  userId: string,
  entryData: Omit<Interaction, 'id'>
): Promise<string> {
  const path = `users/${userId}/interactions`;
  try {
    const cleanData = stripUndefined({
      ...entryData,
      userId,
      createdAt: entryData.createdAt || new Date().toISOString(),
    });
    const colRef = collection(db, 'users', userId, 'interactions');
    const docRef = await addDoc(colRef, cleanData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleTakeawayCompleted(
  userId: string,
  interactionId: string,
  completed: boolean
): Promise<void> {
  const path = `users/${userId}/interactions/${interactionId}`;
  try {
    const docRef = doc(db, 'users', userId, 'interactions', interactionId);
    await updateDoc(docRef, { completedTakeaway: completed });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserInteraction(
  userId: string,
  interactionId: string
): Promise<void> {
  const path = `users/${userId}/interactions/${interactionId}`;
  try {
    const docRef = doc(db, 'users', userId, 'interactions', interactionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
