import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  HelpCircle,
  ChevronRight,
  Volume2,
  Smartphone,
  LogOut,
  Search,
  Moon,
  X,
  MessageSquare,
  User,
  Pencil,
  Check,
  RefreshCw,
  Star,
  Download,
  FileText,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { setDark, useDark } from "@/lib/ui-bus";
import { useAuth } from "@/lib/auth-context";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CurrencyPills, PINK_GEM_ICON, GOLDEN_COINS_ICON } from "@/components/CurrencyPills";
import { MobileShell } from "@/components/MobileShell";
import { GlossyAvatar, isIraAccount } from "@/components/GlossyAvatar";
import { LegalBody, APP_VERSION } from "@/components/LegalDocs";
import { saveAccount } from "@/lib/saved-accounts";
import { BetaFeatures } from "@/components/BetaFeatures";
import { useCurrency } from "@/lib/currency";

import { FirstTimeSectionLoader } from "@/components/ui/FirstTimeSectionLoader";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — QBlock" }] }),
  component: () => (
    <FirstTimeSectionLoader id="settings">
      <SettingsPage />
    </FirstTimeSectionLoader>
  ),
});

function SettingsPage() {
  const nav = useNavigate();
  const { qbUser } = useAuth();
  const gems = useCurrency("gems");
  const gold = useCurrency("gold");

  return (
    <MobileShell>
      <div className="min-h-full bg-[#f8f9fa] dark:bg-[#121316] px-4 pb-8 pt-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => nav({ to: "/profile" as never })}
              className="qb-squircle press grid h-9 w-9 place-items-center text-[#141414] dark:text-white cursor-pointer"
              aria-label="Back to profile"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8b929d] dark:text-[#8e95a0]">
                Preferences
              </div>
              <h1 className="text-[22px] font-black tracking-tight text-[#141414] dark:text-white">Settings</h1>
            </div>
          </div>
        </div>

        {/* Profile area — NOT embedded in a card, clean squircle pfp like chat, Nickname, grey smaller Username: & ID:, and currency */}
        {qbUser && (
          <div className="flex items-center gap-3.5 px-1 py-1 mb-4">
            <div className="qb-squircle relative h-[62px] w-[62px] shrink-0 overflow-hidden rounded-[18px] bg-[#e2e6ec] dark:bg-[#1a1c22]">
              <GlossyAvatar
                snapshot={qbUser.avatarSnapshot}
                photoUrl={qbUser.profilePhoto}
                frame={qbUser.avatarSnapshot?.frameId}
                height={62}
                className="h-full w-full object-cover"
                autoRotate={false}
                focusZone="head"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-black text-[#141414] dark:text-white tracking-tight leading-tight truncate">
                {qbUser.displayName || "Player"}
              </h3>
              <div className="text-[11.5px] font-semibold text-[#8b929d] dark:text-[#8e95a0] mt-0.5 truncate leading-tight">
                Username:{" "}
                <span className="font-bold text-[#555d68] dark:text-[#bcc3cd]">
                  @{qbUser.username || "player"}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-[#8b929d] dark:text-[#8e95a0] leading-tight">
                ID:{" "}
                <span className="font-bold text-[#555d68] dark:text-[#bcc3cd]">
                  {qbUser.customId || "QB-001"}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1.5 text-[12px] font-black text-[#17181b] dark:text-white">
                <div className="flex items-center gap-1">
                  <img
                    src={PINK_GEM_ICON}
                    alt="Gems"
                    className="h-4 w-4 object-contain shrink-0"
                    draggable={false}
                  />
                  <span className="tabular-nums">{(gems ?? 0).toLocaleString()}</span>
                </div>
                <span className="text-black/25 dark:text-white/20 font-normal select-none">
                  |
                </span>
                <div className="flex items-center gap-1">
                  <img
                    src={GOLDEN_COINS_ICON}
                    alt="Coins"
                    className="h-4 w-4 object-contain shrink-0"
                    draggable={false}
                  />
                  <span className="tabular-nums">{(gold ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <SettingsBody />
      </div>
    </MobileShell>
  );
}

// ─── Shared settings body ──────────────────────────────────────────────────
export function SettingsBody() {
  const dark = useDark();
  const nav = useNavigate();
  const { qbUser, signOut } = useAuth();
  const isIra = isIraAccount(qbUser);
  const [push, setPush] = useState(true);
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [expanded, setExpanded] = useState<"account" | "help" | "download" | "terms" | null>(null);
  const [badgeSaving, setBadgeSaving] = useState(false);

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("bm-settings") || "{}");
    if (typeof s.push === "boolean") setPush(s.push);
    if (typeof s.sound === "boolean") setSound(s.sound);
    if (typeof s.haptics === "boolean") setHaptics(s.haptics);
  }, []);

  useEffect(() => {
    localStorage.setItem("bm-settings", JSON.stringify({ push, sound, haptics }));
  }, [push, sound, haptics]);

  async function handleSignOut() {
    if (qbUser) {
      saveAccount({
        uid: qbUser.uid,
        username: qbUser.username,
        displayName: qbUser.displayName,
        email: qbUser.email,
        customId: qbUser.customId,
        profilePhoto: qbUser.profilePhoto,
        avatarSnapshot: qbUser.avatarSnapshot,
        color: qbUser.color,
      });
    }
    await signOut();
    nav({ to: "/accounts" as never });
  }

  async function toggleBadge(v: boolean) {
    if (!qbUser || badgeSaving) return;
    setBadgeSaving(true);
    try {
      await updateDoc(doc(db, "users", qbUser.uid), { badgeEquipped: v });
    } finally {
      setBadgeSaving(false);
    }
  }

  function toggle(key: "account" | "help" | "download" | "terms") {
    setExpanded((e) => (e === key ? null : key));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* About & policies — kept up top so they're easy to find */}
      <section className="qb-squircle p-3">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div className="app-eyebrow">ABOUT &amp; POLICIES</div>
          <span className="rounded-full border border-black/10 px-2 py-0.5 text-[10.5px] font-extrabold text-text-secondary dark:border-white/10">
            {APP_VERSION}
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {/* Version */}
          <SubscriptionCard
            Icon={Info}
            iconColor="#22c55e"
            title="Version"
            content={
              <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                <Info className="h-4 w-4" /> QBLOCK {APP_VERSION}
              </div>
            }
            status={`Version ${APP_VERSION}`}
            statusColor="#22c55e"
          />

          {/* Download Project ZIP */}
          <SubscriptionCard
            Icon={Download}
            iconColor="#fa4616"
            title="Download Project ZIP"
            right={
              <a
                href="/QBLOCK-project.zip"
                download="QBLOCK-project.zip"
                onClick={(e) => e.stopPropagation()}
                className="press flex items-center gap-1.5 rounded-full bg-[#fa4616] px-3 py-1.5 text-[11px] font-black text-white shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            }
            onClick={() => {
              const link = document.createElement("a");
              link.href = "/QBLOCK-project.zip";
              link.download = "QBLOCK-project.zip";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            content={
              <div className="text-[12px] leading-relaxed text-text-secondary">
                Download the complete current project package (TS/TSX, components, screens, assets,
                routes, and configs) as <strong>QBLOCK-project.zip</strong>.
              </div>
            }
            status="Complete codebase (64 MB)"
            statusColor="#fa4616"
          />

          {/* Download Policy */}
          <SubscriptionCard
            Icon={Download}
            iconColor="#0ea5e9"
            title="Download Policy"
            right={
              <ChevronRight
                className={`h-4 w-4 text-text-muted transition-transform ${expanded === "download" ? "rotate-90" : ""}`}
              />
            }
            onClick={() => toggle("download")}
            content={expanded === "download" ? <LegalBody /> : null}
            status="Updated Aug 29, 2026"
            statusColor="#0ea5e9"
          />

          {/* Terms of Service */}
          <SubscriptionCard
            Icon={FileText}
            iconColor="#64748b"
            title="Terms of Service"
            right={
              <ChevronRight
                className={`h-4 w-4 text-text-muted transition-transform ${expanded === "terms" ? "rotate-90" : ""}`}
              />
            }
            onClick={() => toggle("terms")}
            content={expanded === "terms" ? <LegalBody /> : null}
            status="Updated Aug 29, 2026"
            statusColor="#64748b"
          />
        </div>
      </section>

      <BetaFeatures />

      {/* Wallet Card */}
      <SubscriptionCard
        Icon={Star}
        iconColor="#f59e0b"
        title="Wallet"
        right={<ChevronRight className="h-4 w-4 text-text-muted" />}
        content={<CurrencyPills maxItems={2} />}
        status="Active"
        statusColor="#64748b"
      />

      {/* Account Info */}
      <SubscriptionCard
        Icon={User}
        iconColor="#64748b"
        title="Account Info"
        right={
          <ChevronRight
            className={`h-4 w-4 text-text-muted transition-transform ${expanded === "account" ? "rotate-90" : ""}`}
          />
        }
        onClick={() => toggle("account")}
        content={expanded === "account" ? <AccountInfoSection /> : null}
        status="Verified"
        statusColor="#22c55e"
      />

      {/* Push Notifications */}
      <SubscriptionCard
        Icon={Bell}
        iconColor="#3b82f6"
        title="Push notifications"
        content={
          <div className="text-[13px] text-text-secondary flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Applies to this device
          </div>
        }
        status={push ? "Active" : "Disabled"}
        statusColor={push ? "#16a34a" : "#9ca3af"}
        right={<Switch value={push} onChange={setPush} />}
      />

      {/* Sound */}
      <SubscriptionCard
        Icon={Volume2}
        iconColor="#10b981"
        title="Sound effects"
        content={
          <div className="text-[13px] text-text-secondary flex items-center gap-2">
            <Volume2 className="h-4 w-4" /> In-game and UI sounds
          </div>
        }
        status={sound ? "Active" : "Disabled"}
        statusColor={sound ? "#16a34a" : "#9ca3af"}
        right={<Switch value={sound} onChange={setSound} />}
      />

      {/* Dark Mode */}
      <SubscriptionCard
        Icon={Moon}
        iconColor="#6366f1"
        title="Dark mode"
        content={
          <div className="text-[13px] text-text-secondary flex items-center gap-2">
            <Moon className="h-4 w-4" /> App theme
          </div>
        }
        status={dark ? "On" : "Off"}
        statusColor={dark ? "#16a34a" : "#9ca3af"}
        right={<Switch value={dark} onChange={setDark} />}
      />

      {/* Help */}
      <SubscriptionCard
        Icon={HelpCircle}
        iconColor="#8b5cf6"
        title="Help & support"
        right={
          <ChevronRight
            className={`h-4 w-4 text-text-muted transition-transform ${expanded === "help" ? "rotate-90" : ""}`}
          />
        }
        onClick={() => toggle("help")}
        content={expanded === "help" ? <HelpSection /> : null}
        status="Online"
        statusColor="#22c55e"
      />

      {/* Level 10 Badge */}
      {qbUser && qbUser.level >= 10 && (
        <SubscriptionCard
          Icon={Star}
          iconColor="#f59e0b"
          title="Level 10 Badge"
          content={
            <div className="text-[13px] text-text-secondary flex items-center gap-2">
              <User className="h-4 w-4" /> Show on profile
            </div>
          }
          status={qbUser.badgeEquipped ? "Equipped" : "Hidden"}
          statusColor={qbUser.badgeEquipped ? "#16a34a" : "#9ca3af"}
          right={
            <Switch
              value={qbUser.badgeEquipped}
              onChange={() => toggleBadge(!qbUser.badgeEquipped)}
              disabled={badgeSaving}
            />
          }
        />
      )}

      <button
        onClick={handleSignOut}
        className="press qb-squircle mt-2 inline-flex h-[52px] w-full items-center justify-center gap-2 text-[14.5px] font-bold text-danger"
      >
        <img
          src="/icons/login-3-svgrepo-com.svg"
          alt=""
          className="h-[18px] w-[18px] dark:invert"
        />{" "}
        Sign out
      </button>
    </div>
  );
}

function getCardGradient(color?: string) {
  return "bg-white border border-black/[0.07] dark:bg-[#17191e] dark:border-white/[0.10]";
}

// ─── Subscription Card Component (New UI) ──────────────────────────────────
function SubscriptionCard({
  Icon,
  title,
  iconColor,
  right,
  content,
  status,
  statusColor,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  iconColor?: string;
  right?: React.ReactNode;
  content?: React.ReactNode;
  status: string;
  statusColor: string;
  onClick?: () => void;
}) {
  return (
    <div className="qb-squircle flex flex-col p-4">
      <div className="mb-4 flex cursor-pointer items-center justify-between" onClick={onClick}>
        <div className="flex items-center gap-3">
          <div
            className={`grid h-9 w-9 place-items-center rounded-[10px] ${getCardGradient(iconColor)} shadow-none`}
          >
            <Icon
              className="h-4.5 w-4.5"
              style={{ color: iconColor || "#59616d" }}
              strokeWidth={2.2}
            />
          </div>
          <span className="text-[15px] font-extrabold tracking-tight text-foreground">{title}</span>
        </div>
        {right && <div>{right}</div>}
      </div>

      {content && <div className="mb-4">{content}</div>}

      <div className="mb-3 h-px w-full bg-black/8 dark:bg-white/10" />
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
        <span className="text-[13px] font-semibold text-foreground">{status}</span>
      </div>
    </div>
  );
}

function Switch({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange(!value);
      }}
      disabled={disabled}
      className={`relative h-[26px] w-[44px] rounded-full transition-colors duration-200 disabled:opacity-50 ${value ? "bg-black" : "bg-gray-200"}`}
      aria-pressed={value}
    >
      <span
        className={`absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-all duration-200 ${value ? "left-[20px]" : "left-[2px]"}`}
      />
    </button>
  );
}

// ─── Account Info — inline section ─────────────────────────────────────────
function AccountInfoSection() {
  const { qbUser } = useAuth();
  const nav = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(qbUser?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);

  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(qbUser?.bio ?? "");
  const [savingBio, setSavingBio] = useState(false);
  const [savedBio, setSavedBio] = useState(false);

  const joinedDate = qbUser?.createdAt
    ? new Date(qbUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  async function saveName() {
    if (!qbUser || !nameDraft.trim()) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, "users", qbUser.uid), { displayName: nameDraft.trim() });
      setSavedName(true);
      setEditingName(false);
      setTimeout(() => setSavedName(false), 2000);
    } finally {
      setSavingName(false);
    }
  }

  async function saveBio() {
    if (!qbUser) return;
    setSavingBio(true);
    try {
      await updateDoc(doc(db, "users", qbUser.uid), { bio: bioDraft.trim() });
      setSavedBio(true);
      setEditingBio(false);
      setTimeout(() => setSavedBio(false), 2000);
    } finally {
      setSavingBio(false);
    }
  }

  return (
    <div className="px-3.5 pt-1 pb-4 space-y-4">
      {/* ── Display Name ── */}
      <div>
        <SectionLabel>Display Name</SectionLabel>
        {savedName && <SavedBanner text="Name saved!" />}
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              className="flex-1 h-9 px-3 rounded-[11px] text-[13px] font-semibold outline-none"
              style={{ background: "rgba(0,0,0,0.05)", border: "1.5px solid rgba(15,23,42,0.12)" }}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setEditingName(false);
              }}
              autoFocus
              maxLength={24}
              placeholder="New display name…"
            />
            <button
              onClick={saveName}
              disabled={savingName}
              className="press bg-slate-200 text-slate-800 shadow-sm border border-slate-300 h-9 px-3.5 rounded-[11px] text-[12px] font-extrabold shrink-0 disabled:opacity-60"
            >
              {savingName ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save"}
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="press close-button h-9 w-9 grid place-items-center shrink-0"
              style={{ background: "rgba(0,0,0,0.06)" }}
            >
              <X className="h-4 w-4 text-foreground/50" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14.5px] font-extrabold tracking-tight">
              {qbUser?.displayName ?? "—"}
            </span>
            <button
              onClick={() => {
                setNameDraft(qbUser?.displayName ?? "");
                setEditingName(true);
              }}
              className="press liquid-button liquid-button-ghost flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold shrink-0"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
        )}
      </div>

      {/* ── Bio ── */}
      <div>
        <SectionLabel>Bio</SectionLabel>
        {savedBio && <SavedBanner text="Bio saved!" />}
        {editingBio ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              maxLength={180}
              rows={3}
              className="w-full px-3 py-2.5 rounded-[11px] text-[13px] outline-none resize-none"
              style={{ background: "rgba(0,0,0,0.05)", border: "1.5px solid rgba(15,23,42,0.12)" }}
              placeholder="Tell the world about yourself…"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={saveBio}
                disabled={savingBio}
                className="press flex-1 h-8 rounded-full text-white text-[12px] font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-60"
                style={{ background: "#1e293b" }}
              >
                {savingBio ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                )}
                Save
              </button>
              <button
                onClick={() => setEditingBio(false)}
                className="press close-button h-8 w-8 grid place-items-center"
                style={{ background: "rgba(0,0,0,0.06)" }}
              >
                <X className="h-4 w-4 text-foreground/50" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line flex-1">
              {qbUser?.bio ? (
                qbUser.bio
              ) : (
                <span className="text-text-muted/60 italic text-[12.5px]">No bio yet…</span>
              )}
            </p>
            <button
              onClick={() => {
                setBioDraft(qbUser?.bio ?? "");
                setEditingBio(true);
              }}
              className="press flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold shrink-0"
              style={{ background: "rgba(0,0,0,0.06)", color: "#374151" }}
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
        )}
      </div>

      {/* ── Account Details ── */}
      <div>
        <SectionLabel>Account Details</SectionLabel>
        <div className="rounded-[12px] overflow-hidden" style={{ background: "rgba(0,0,0,0.03)" }}>
          {[
            { label: "QBlock ID", value: qbUser?.customId ?? "—" },
            { label: "Username", value: `@${qbUser?.username ?? "—"}` },
            { label: "Member since", value: joinedDate },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between px-3 py-2.5 border-b border-black/[0.04] last:border-0"
            >
              <span className="text-[12.5px] text-text-muted">{label}</span>
              <span className="text-[12.5px] font-semibold truncate max-w-[55%] text-right">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => nav({ to: "/profile" as never })}
        className="press liquid-button liquid-button-ghost flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-extrabold"
      >
        View full profile
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Help — inline section ──────────────────────────────────────────────────
function HelpSection() {
  return (
    <div className="px-3.5 pt-1 pb-4">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="h-8 w-8 rounded-full grid place-items-center shrink-0"
          style={{ background: "#16a34a1a" }}
        >
          <MessageSquare
            className="h-[15px] w-[15px]"
            strokeWidth={2.2}
            style={{ color: "#16a34a" }}
          />
        </div>
        <p className="text-[13px] text-text-secondary leading-relaxed pt-0.5">
          Join our Discord server — our team is there for bugs, feedback, and questions.
        </p>
      </div>
      <button className="press-flat w-full h-10 rounded-[12px] bg-slate-200 text-slate-800 border border-slate-300 shadow-sm font-bold text-[13px]">
        Join Discord
      </button>
    </div>
  );
}

// ─── ExpandRow — chevron row that toggles an inline section ─────────────────
function ExpandRow({
  I,
  title,
  tint,
  open,
  onToggle,
  hasBorderBottom,
}: {
  I: LucideIcon;
  title: string;
  tint: string;
  open: boolean;
  onToggle: () => void;
  hasBorderBottom?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`press-flat w-full min-h-[52px] flex items-center gap-3 px-3.5 py-3 text-left ${hasBorderBottom ? "border-b border-border-soft" : ""}`}
    >
      <IconTile I={I} tint={tint} />
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-semibold leading-tight">{title}</div>
      </div>
      <ChevronRight
        className="h-[18px] w-[18px] text-text-muted transition-transform duration-200"
        style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
      />
    </button>
  );
}

// ─── Sub-section label ───────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-extrabold text-text-muted uppercase tracking-[0.12em] mb-1.5">
      {children}
    </div>
  );
}

// ─── Saved confirmation banner ───────────────────────────────────────────────
function SavedBanner({ text }: { text: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] mb-2"
      style={{ background: "rgba(34,197,94,0.08)" }}
    >
      <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#16a34a" }} strokeWidth={2.5} />
      <span className="text-[12px] font-semibold" style={{ color: "#16a34a" }}>
        {text}
      </span>
    </div>
  );
}

// ─── Shared UI components ──────────────────────────────────────────────────
export function Group({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="qb-gloss-panel rounded-[20px] overflow-hidden"
      style={{
        border: "1.5px solid rgba(20,28,38,0.12)",
        background: "#ffffff",
        boxShadow: "none",
      }}
    >
      {children}
    </div>
  );
}

export function Row({
  I,
  title,
  sub,
  tint,
  onClick,
}: {
  I: LucideIcon;
  title: string;
  sub?: string;
  tint: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="press-flat w-full min-h-[52px] flex items-center gap-3 px-3.5 py-3 text-left border-b border-border-soft last:border-0"
    >
      <IconTile I={I} tint={tint} />
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-semibold leading-tight">{title}</div>
        {sub && <div className="text-[11px] text-text-muted leading-tight mt-0.5">{sub}</div>}
      </div>
      <ChevronRight className="h-[18px] w-[18px] text-text-muted" />
    </button>
  );
}

export function Toggle({
  I,
  title,
  tint,
  value,
  onChange,
}: {
  I: LucideIcon;
  title: string;
  tint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="w-full min-h-[52px] flex items-center gap-3 px-3.5 py-3 border-b border-border-soft last:border-0">
      <IconTile I={I} tint={tint} />
      <div className="flex-1 min-w-0 text-[14.5px] font-semibold">{title}</div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-[30px] w-[50px] rounded-full transition-colors duration-200 ${value ? "bg-primary" : "bg-surface-2"}`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-[3px] h-[24px] w-[24px] rounded-full bg-white shadow-md transition-all duration-200 ${value ? "left-[23px]" : "left-[3px]"}`}
        />
      </button>
    </div>
  );
}

function IconTile({ I, tint }: { I: LucideIcon; tint: string }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-black/[0.07] bg-white text-[#59616d] shadow-none dark:border-white/[0.10] dark:bg-[#17191e]">
      <I className="h-4.5 w-4.5" style={{ color: tint || "#59616d" }} strokeWidth={2.2} />
    </div>
  );
}
