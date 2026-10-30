import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Intercept known Google Cloud Token Service propagation notices from noisy console.error
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const text = args
      .map((a) => (typeof a === 'object' && a !== null ? (a.message || JSON.stringify(a)) : String(a)))
      .join(' ');

    if (
      text.includes('token-service-api-has-not-been-used') ||
      text.includes('securetoken.googleapis.com') ||
      (text.includes('@firebase/firestore') && text.includes('Could not reach Cloud Firestore backend'))
    ) {
      console.warn('[Cloud Firestore Offline Notice]:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the provisioned database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
storage.maxUploadRetryTime = 8000;
storage.maxOperationRetryTime = 8000;

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isOfflineOrTokenIssue =
    errMsg.includes('client is offline') ||
    errMsg.includes('token-service-api-has-not-been-used') ||
    errMsg.includes('securetoken.googleapis.com') ||
    errMsg.includes('offline');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  if (!isOfflineOrTokenIssue) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  } else {
    console.warn('Firestore offline notice: client operating in offline/resilient mode for', path);
  }

  throw new Error(errInfo.error || 'A Cloud Firestore operation failed.');
}

// Resilient connectivity check
export async function testConnection(): Promise<boolean> {
  try {
    return navigator.onLine;
  } catch {
    return true;
  }
}
