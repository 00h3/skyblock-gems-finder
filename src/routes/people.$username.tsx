import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { normalizeAvatarSnapshot } from "@/lib/avatar";
import { ProfileSheet, type ProfileUser } from "@/components/ProfileSheet";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  getCountFromServer,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/people/$username")({
  head: () => ({ meta: [{ title: "Player profile — QBLOCK" }] }),
  component: PeopleProfilePage,
});

function PeopleProfilePage() {
  const nav = useNavigate();
  const { username } = useParams({ from: "/people/$username" });
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let uid = username;
      let data: Record<string, unknown> | null = null;

      // 1. First try direct UID lookup
      try {
        const directSnap = await Promise.race([
          getDoc(doc(db, "users", username)),
          new Promise<null>((r) => setTimeout(() => r(null), 2500)),
        ]);
        if (directSnap && directSnap.exists()) {
          uid = directSnap.id;
          data = directSnap.data() as Record<string, unknown>;
        }
      } catch {
        /* ignore error */
      }

      // 2. If not found, lookup by username query
      if (!data) {
        try {
          const userSnap = await Promise.race([
            getDocs(query(collection(db, "users"), where("username", "==", username), limit(1))),
            new Promise<null>((r) => setTimeout(() => r(null), 2500)),
          ]);
          if (userSnap && !userSnap.empty) {
            uid = userSnap.docs[0].id;
            data = userSnap.docs[0].data() as Record<string, unknown>;
          }
        } catch {
          /* ignore error */
        }
      }

      // 3. Try case-insensitive / lowercase username match
      if (!data) {
        try {
          const lowerSnap = await Promise.race([
            getDocs(
              query(
                collection(db, "users"),
                where("username", "==", username.toLowerCase()),
                limit(1),
              ),
            ),
            new Promise<null>((r) => setTimeout(() => r(null), 2500)),
          ]);
          if (lowerSnap && !lowerSnap.empty) {
            uid = lowerSnap.docs[0].id;
            data = lowerSnap.docs[0].data() as Record<string, unknown>;
          }
        } catch {
          /* ignore error */
        }
      }

      let friendCount =
        typeof data?.friendCount === "number" ? (data.friendCount as number) : undefined;
      if (friendCount === undefined && uid) {
        try {
          const countSnap = await Promise.race([
            getCountFromServer(
              query(collection(db, "friendships"), where("members", "array-contains", uid)),
            ),
            new Promise<null>((r) => setTimeout(() => r(null), 2000)),
          ]);
          if (countSnap) friendCount = countSnap.data().count;
        } catch {
          /* ignore error */
        }
      }
      if (!cancelled) {
        setProfile({
          id: uid,
          n: String(data?.displayName ?? data?.username ?? username),
          username: String(data?.username ?? username),
          customId: data?.customId ? String(data.customId) : undefined,
          bio: data?.bio ? String(data.bio) : undefined,
          color: "#f4c430",
          online: data?.online === true,
          friendCount,
          createdAt: data?.createdAt,
          avatarSnapshot: normalizeAvatarSnapshot(data) as ProfileUser["avatarSnapshot"],
          staff:
            String(data?.username ?? username).toLowerCase() === "ira" ||
            String(data?.username ?? username).toLowerCase() === "die" ||
            data?.staff === true,
        });
        setLoading(false);
      }
    })().catch(() => {
      if (!cancelled) {
        setLoading(false);
        const lower = username.toLowerCase();
        const isStaff = lower === "ira" || lower === "die";
        setProfile({
          id: username,
          n: lower === "ira" ? "IRA" : lower === "die" ? "Die" : username,
          username,
          color: "#f4c430",
          online: false,
          staff: isStaff,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username]);
  return (
    <MobileShell hideNav>
      <div className="qblock-profile-page min-h-full pb-8">
        <header className="qblock-profile-topbar">
          <button
            onClick={() => nav({ to: "/search" as never })}
            className="press profile-icon-button"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1>Profile</h1>
          <span className="w-[38px]" />
        </header>
        {loading ? (
          <div className="grid min-h-[70vh] place-items-center text-text-muted">
            Loading player profile…
          </div>
        ) : (
          profile && (
            <ProfileSheet
              variant="page"
              user={profile}
              onClose={() => nav({ to: "/search" as never })}
            />
          )
        )}
      </div>
    </MobileShell>
  );
}
