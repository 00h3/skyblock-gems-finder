import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { SESSION_KEY } from "./auth-context";

// ── Permanent ID generator ───────────────────────────────────────────────────
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusable chars (0/O, 1/I)

function randomId(): string {
  let s = "QB-";
  for (let i = 0; i < 6; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

async function uniqueCustomId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = randomId();
    const q = query(collection(db, "users"), where("customId", "==", id));
    const snap = await getDocs(q);
    if (snap.empty) return id;
  }
  throw new Error("Could not generate unique ID — retry.");
}

// ── Session ID ───────────────────────────────────────────────────────────────
function newSessionId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

// ── Resolve login identifier to email ───────────────────────────────────────
// Accepts: email | username | QB-XXXXX customId
export async function resolveToEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed; // already an email
  try {
    const field = trimmed.toUpperCase().startsWith("QB-") ? "customId" : "username";
    const q = query(collection(db, "users"), where(field, "==", trimmed));
    const snap = await getDocs(q);
    if (snap.empty)
      throw new Error(
        `No account found for "${trimmed}". If this is your first time, please use your email address.`,
      );
    const data = snap.docs[0].data();
    if (!data.email) throw new Error("Account has no email on record.");
    return data.email as string;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("permission") || msg.includes("No account found")) {
      throw new Error(`Please enter your email address to sign in.`);
    }
    throw err;
  }
}

// ── Sign in ──────────────────────────────────────────────────────────────────
export async function qbSignIn(identifier: string, password: string) {
  const email = await resolveToEmail(identifier);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  // Write fresh sessionId to Firestore + local storage
  const sid = newSessionId();
  localStorage.setItem(SESSION_KEY, sid);
  try {
    const userRef = doc(db, "users", cred.user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      await updateDoc(userRef, { sessionId: sid });
    } else {
      // Auto-provision user document if missing
      const customId = randomId();
      await setDoc(userRef, {
        uid: cred.user.uid,
        username: cred.user.displayName || email.split("@")[0] || "Player",
        email: cred.user.email || email,
        customId,
        displayName: cred.user.displayName || email.split("@")[0] || "Player",
        bio: "",
        profilePhoto: "",
        createdAt: new Date().toISOString(),
        onboardingCompleted: false,
        onboardingAnswers: {},
        avatarSnapshot: {
          color: "#facc15",
          skinId: null,
          faceId: 0,
          gender: "male",
          showBandana: false,
          equippedItemIds: [],
          equippedPants: "pants-classic",
        },
        currency: { gold: 500, gems: 50, pinkCube: 0 },
        sessionId: sid,
      });
    }
  } catch {
    // Non-blocking firestore session write failure
  }
  return cred;
}

// ── Sign up ──────────────────────────────────────────────────────────────────
export async function qbSignUp(email: string, password: string, username: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    // Firestore user reads require authentication. This check must happen
    // after Firebase creates the account, not before it.
    const uq = query(collection(db, "users"), where("username", "==", username));
    const uSnap = await getDocs(uq);
    if (!uSnap.empty) throw new Error("Username is already taken.");

    const customId = await uniqueCustomId();
    const sid = newSessionId();
    localStorage.setItem(SESSION_KEY, sid);

    const userDoc = {
      uid: cred.user.uid,
      username,
      email,
      customId,
      displayName: username,
      bio: "",
      profilePhoto: "",
      createdAt: new Date().toISOString(),
      onboardingCompleted: false,
      onboardingAnswers: {},
      avatarSnapshot: {
        color: "#facc15",
        skinId: null,
        faceId: 0,
        gender: "male",
        showBandana: false,
        equippedItemIds: [],
        equippedPants: "pants-classic",
      },
      currency: { gold: 0, gems: 0, pinkCube: 0 },
      sessionId: sid,
    };
    await setDoc(doc(db, "users", cred.user.uid), userDoc);

    // Send verification email (non-blocking)
    sendEmailVerification(cred.user).catch(() => {});

    return { cred, customId };
  } catch (error) {
    // Do not leave an auth account without a profile document. Without this
    // rollback, a temporary Firestore/network failure makes the email look
    // permanently registered and prevents the user from retrying signup.
    await deleteUser(cred.user).catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    throw error;
  }
}

// ── Forgot password ──────────────────────────────────────────────────────────
export async function qbResetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

// ── Save onboarding answers ──────────────────────────────────────────────────
export async function saveOnboardingAnswers(uid: string, answers: Record<string, unknown>) {
  const update: Record<string, unknown> = {
    onboardingAnswers: answers,
    onboardingCompleted: true,
  };
  // Part 3 saves displayName + gender directly on the user doc
  if (answers.displayName && typeof answers.displayName === "string") {
    update.displayName = answers.displayName.trim();
  }
  if (answers.gender) {
    update.gender = answers.gender;
  }
  // Merge so an authenticated account whose profile document was lost can
  // still finish onboarding instead of failing with "document not found".
  await setDoc(doc(db, "users", uid), update, { merge: true });
}
