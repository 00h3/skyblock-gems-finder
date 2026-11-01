import { useCallback, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GameAudio } from "@/lib/game-audio";
import {
  useSkyblockEconomy,
  getPurseCoins,
  setPurseCoins,
  type DailyQuest,
} from "@/lib/skyblock-economy";
import { useCurrency, spendCurrency, addCurrency } from "@/lib/currency";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import {
  subscribeFriends,
  type Friend,
} from "@/lib/friends-utils";
import { getSavedAccounts } from "@/lib/saved-accounts";
import {
  subscribeToSkyblockChat,
  sendSkyblockChatMessage,
  getOrCreateIsland,
  type SkyblockChatMessage,
  type PersistentIsland,
} from "@/lib/skyblock-multiplayer";
import { getPermanentPlayerId } from "@/lib/skyblock-profile";

export interface IslandFriendPlayer {
  uid: string;
  name: string;
  username: string;
  profilePhoto?: string;
  islandName?: string;
  isOnline: boolean;
  isFriend: boolean;
  level?: number;
}

export interface IslandTierDef {
  tier: number;
  name: string;
  image: string;
  cost: number;
  boundary: number;
  hpBonus: number;
  buildSlots: number;
  perk: string;
  description: string;
}

export const ISLAND_TIERS: IslandTierDef[] = [
  {
    tier: 1,
    name: "Frost Shelf",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-snow-1.png",
    cost: 0,
    boundary: 40,
    hpBonus: 250,
    buildSlots: 2,
    perk: "Starter sanctuary with basic generator",
    description: "Compact floating island with pure glacial stone and starter oak tree.",
  },
  {
    tier: 2,
    name: "Meadow Shelf",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-grass-1.png",
    cost: 800,
    boundary: 50,
    hpBonus: 500,
    buildSlots: 4,
    perk: "Unlocks Wheat & Oak auto-growth",
    description: "Lush green grass island with nutrient-rich topsoil for expanding farms.",
  },
  {
    tier: 3,
    name: "Cliff Garden",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-mixed-1.png",
    cost: 1800,
    boundary: 60,
    hpBonus: 750,
    buildSlots: 6,
    perk: "Deepstone ore vein yield +25%",
    description: "Terraced mountain outcrop rich in iron and coal deposits.",
  },
  {
    tier: 4,
    name: "Green Isle",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-grass-2.png",
    cost: 3500,
    boundary: 70,
    hpBonus: 1000,
    buildSlots: 8,
    perk: "Cobblestone generator speed +50%",
    description: "Expanded dual-tier platform with twin ancient willow trees.",
  },
  {
    tier: 5,
    name: "Snowy Isle",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-snow-2.png",
    cost: 6000,
    boundary: 80,
    hpBonus: 1500,
    buildSlots: 10,
    perk: "Mining Fortune II & rare mob spawn bonus",
    description: "Alpine plateau shrouded in crystalline mist and diamond geodes.",
  },
  {
    tier: 6,
    name: "Forest Isle",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-forest.png",
    cost: 10000,
    boundary: 90,
    hpBonus: 2000,
    buildSlots: 12,
    perk: "Netherite & Amethyst deep vein access",
    description: "Vast canopy woodland sanctuary with emerald-rich root systems.",
  },
  {
    tier: 7,
    name: "Lake Isle",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-lake.png",
    cost: 20000,
    boundary: 100,
    hpBonus: 3000,
    buildSlots: 16,
    perk: "Infinite water core & 2x Island XP multiplier",
    description: "The pinnacle realm: a floating freshwater lake with mystical aurora aura.",
  },
];

export interface ShopItem {
  id: string;
  name: string;
  tab: "blocks" | "tools" | "decor";
  cost: number;
  icon: string;
  blockType?: number | string;
  desc: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Real Voxel Blocks ──────────────────────────────────────────────────────
  { id: "grass", name: "Grass Block", tab: "blocks", cost: 20, icon: "/textures/blocks/grass_block_side.png", blockType: 1, desc: "Fresh topsoil for flowers, saplings, and expanding your island." },
  { id: "dirt", name: "Dirt Block", tab: "blocks", cost: 10, icon: "/textures/blocks/dirt.png", blockType: 2, desc: "Standard building earth for farming terraces." },
  { id: "stone", name: "Smooth Stone", tab: "blocks", cost: 30, icon: "/textures/blocks/stone.png", blockType: 3, desc: "Solid quarried bedrock stone for sturdy structures." },
  { id: "cobble", name: "Cobblestone", tab: "blocks", cost: 25, icon: "/textures/blocks/cobblestone.png", blockType: 4, desc: "Classic masonry stone for bridges and walls." },
  { id: "bricks", name: "Stone Bricks", tab: "blocks", cost: 60, icon: "/textures/blocks/stone_bricks.png", blockType: 5, desc: "Reinforced fortress bricks." },
  { id: "sand", name: "Desert Sand", tab: "blocks", cost: 25, icon: "/textures/blocks/sand.png", blockType: 6, desc: "Fine yellow sand for smelting into glass." },
  { id: "oak_log", name: "Oak Wood Log", tab: "blocks", cost: 45, icon: "/textures/blocks/oak_log.png", blockType: 7, desc: "Heavy hardwood timber for structural beams." },
  { id: "oak_planks", name: "Oak Planks", tab: "blocks", cost: 35, icon: "/textures/blocks/oak_planks.png", blockType: 13, desc: "Polished wooden planks for manor floors and ceilings." },
  { id: "glass", name: "Clear Glass", tab: "blocks", cost: 50, icon: "/textures/blocks/glass.png", blockType: 10, desc: "Crystal transparent architectural glass." },
  { id: "ice", name: "Glacial Ice", tab: "blocks", cost: 80, icon: "/textures/blocks/ice.png", blockType: 17, desc: "Slick mountain ice block for water flows." },
  { id: "glowstone", name: "Glowstone", tab: "blocks", cost: 200, icon: "/textures/blocks/glowstone.png", blockType: 18, desc: "Luminous crystalline block radiating permanent golden light." },
  { id: "gold_block", name: "Gold Block", tab: "blocks", cost: 600, icon: "/textures/blocks/gold_block.png", blockType: 19, desc: "Pure solid gilded bullion block for royal builds." },
  { id: "diamond_block", name: "Diamond Block", tab: "blocks", cost: 1800, icon: "/textures/blocks/diamond_block.png", blockType: 20, desc: "Gleaming condensed diamond block of ultimate status." },
  { id: "emerald_block", name: "Emerald Block", tab: "blocks", cost: 1400, icon: "/textures/blocks/emerald_block.png", blockType: 21, desc: "Vibrant emerald block for high-tier island beacons." },
  { id: "lapis_block", name: "Lapis Lazuli Block", tab: "blocks", cost: 400, icon: "/textures/blocks/lapis_block.png", blockType: 22, desc: "Deep mystical azure mineral block." },
  { id: "amethyst", name: "Amethyst Block", tab: "blocks", cost: 500, icon: "/textures/blocks/amethyst_block.png", blockType: 23, desc: "Resonant purple crystal geode block." },
  { id: "obsidian", name: "Obsidian", tab: "blocks", cost: 1500, icon: "/textures/blocks/obsidian.png", blockType: 11, desc: "Blast-resistant volcanic glass of supreme density." },

  // ── Authentic Tools & Weapons ──────────────────────────────────────────────
  { id: "short_sword", name: "Hunter Short Sword", tab: "tools", cost: 150, icon: "/public/short-sword.svg", blockType: "short_sword", desc: "Reliable starting blade for mob defense." },
  { id: "iron_sword", name: "Iron Broadsword", tab: "tools", cost: 800, icon: "/items/diamond_axe.png", blockType: "iron_sword", desc: "Forged iron blade dealing +8 combat damage." },
  { id: "diamond_sword", name: "Diamond Katana", tab: "tools", cost: 3500, icon: "/items/netherite_axe.png", blockType: "diamond_sword", desc: "High-grade tempered diamond blade with swift critical strike." },
  { id: "staff_dark", name: "Dark Magic Sickle Staff", tab: "tools", cost: 15000, icon: "/textures/blocks/amethyst_block.png", blockType: "dark_magic_staff", desc: "LEGENDARY: Mythic WoW-inspired celestial weapon that shoots piercing fireball bursts!" },
  { id: "pick_iron", name: "Iron Pickaxe", tab: "tools", cost: 350, icon: "/public/items/diamond_axe.png", blockType: "iron_pickaxe", desc: "Mines stone, coal, and iron ore at 2x baseline speed." },
  { id: "pick_diamond", name: "Diamond Pickaxe", tab: "tools", cost: 1200, icon: "/public/items/netherite_axe.png", blockType: "diamond_pickaxe", desc: "High-durability pickaxe capable of fracturing deep obsidian." },
  { id: "axe_diamond", name: "Diamond Great Axe", tab: "tools", cost: 700, icon: "/public/items/diamond_axe.png", blockType: "iron_axe", desc: "Instantly fells ancient oak and birch trees." },
  { id: "shovel_diamond", name: "Diamond Spade", tab: "tools", cost: 400, icon: "/public/items/diamond_shovel.png", blockType: "diamond_shovel", desc: "Rapidly excavates topsoil, sand, and gravel deposits." },

  // ── Real Decor & Sky Relics ───────────────────────────────────────────────
  { id: "lucky_block", name: "Lucky Cat Block", tab: "decor", cost: 350, icon: "/lucky-block-cat.png", blockType: "lucky_block", desc: "Break to unleash surprising rare island rewards!" },
  { id: "ancient_chest", name: "Golden Treasure Chest", tab: "decor", cost: 2200, icon: "/public/chest_gold_1788909061642.png", desc: "Gilded chest containing ancient Skyblock relics and gemstones." },
  { id: "dragon_trophy", name: "Red Dragon Crest", tab: "decor", cost: 6500, icon: "/public/3d-trophy.png", desc: "Gilded victory trophy forged from the fiery breath of the Red Dragon." },
  { id: "sky_crown", name: "Golden Sky Crown", tab: "decor", cost: 10000, icon: "/public/assets/ui/icon-crown.svg", desc: "The ultimate crown worn only by sovereign island lords." },
];

interface Props {
  onEquipHotbar?: (blockType: number | string) => void;
  hotbar?: (number | string)[];
  tileUrls?: Record<number | string, string>;
  onOpenSettings?: () => void;
  currentVisitingId?: string | null;
  currentVisitingName?: string | null;
  onVisitIsland?: (islandId: string, hostName?: string) => void;
  onReturnHome?: () => void;
  hideHudButtons?: boolean;
}

export function BlockfortSkyblockUi({
  onEquipHotbar,
  hotbar = [],
  tileUrls = {},
  currentVisitingId = null,
  currentVisitingName = null,
  onVisitIsland,
  onReturnHome,
  hideHudButtons = false,
}: Props) {
  const { qbUser } = useAuth();
  const econ = useSkyblockEconomy();
  const globalGold = useCurrency("gold");
  const starCoins = useCurrency("starCoins");

  // Keep in-sync real balance (highest of purse or global gold, sync changes)
  const realBalance = Math.max(econ.purse, globalGold);

  // Buttons collapsible state - naturally minimized on load to maximize screen visibility
  const [buttonsExpanded, setButtonsExpanded] = useState(false);

  // Active modals
  const [manorOpen, setManorOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  // Multiplayer Friends & Online Islands state
  const [friendsList, setFriendsList] = useState<IslandFriendPlayer[]>([]);
  const [friendsTab, setFriendsTab] = useState<"friends" | "all">("friends");
  const [friendSearch, setFriendSearch] = useState("");

  // In-Game Live Chat Preview state - minimized on initial load
  const [chatPreviewOpen, setChatPreviewOpen] = useState(false);
  const [chatPreviewMinimized, setChatPreviewMinimized] = useState(true);
  const [chatMessages, setChatMessages] = useState<SkyblockChatMessage[]>([]);
  const [quickInput, setQuickInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Active island ID
  const effectiveIslandId =
    currentVisitingId || qbUser?.islandId || qbUser?.uid || getPermanentPlayerId(qbUser);

  // Manor Upgrade state
  const [selectedTierIdx, setSelectedTierIdx] = useState<number>(() => {
    return Math.min(ISLAND_TIERS.length - 1, Math.max(0, econ.islandInfo.level - 1));
  });

  // Shop state
  const [shopTab, setShopTab] = useState<"blocks" | "tools" | "decor">("blocks");
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem>(SHOP_ITEMS[0]);

  const closeAllModals = useCallback(() => {
    setManorOpen(false);
    setShopOpen(false);
    setDailyOpen(false);
    setQuestsOpen(false);
    setFriendsOpen(false);
  }, []);

  const isAnyModalOpen = manorOpen || shopOpen || dailyOpen || questsOpen || friendsOpen;
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("bm-modal-active", { detail: { open: isAnyModalOpen } }),
    );
  }, [isAnyModalOpen]);

  // Responsive modal fit scaling so windows always fit viewport compactly
  const [bfFit, setBfFit] = useState<number>(1);
  useEffect(() => {
    const updateFit = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.min(1, (w - 24) / 580, (h - 24) / 360);
      setBfFit(Math.max(0.68, Math.min(1, scale)));
    };
    updateFit();
    window.addEventListener("resize", updateFit);
    return () => window.removeEventListener("resize", updateFit);
  }, []);

  // Esc key closes any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeAllModals]);

  // Open Island Manor / Island Upgrade interface when clicking the island or island badge
  useEffect(() => {
    const handleOpenIsland = () => {
      closeAllModals();
      setManorOpen(true);
      GameAudio.playPop?.();
    };
    window.addEventListener("qb-open-island", handleOpenIsland);
    window.addEventListener("bm-open-island", handleOpenIsland);
    window.addEventListener("qb-open-manor", handleOpenIsland);
    return () => {
      window.removeEventListener("qb-open-island", handleOpenIsland);
      window.removeEventListener("bm-open-island", handleOpenIsland);
      window.removeEventListener("qb-open-manor", handleOpenIsland);
    };
  }, [closeAllModals]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

  // ── Real Friends, Platform Users & Island Multiplayer Sync ────────────────
  useEffect(() => {
    const currentMyUid = qbUser?.uid || getPermanentPlayerId(qbUser);
    const currentMyName = qbUser?.displayName || qbUser?.username || "Player";

    // Ensure our own island is created in Firestore so visitors can visit us
    getOrCreateIsland(currentMyUid, currentMyName).catch((err) => {
      console.warn("Could not ensure own island in Firestore:", err);
    });

    let friendsData: Friend[] = [];
    let usersData: IslandFriendPlayer[] = [];
    let activePlayersData: { uid: string; lastSeen: number; photo?: string }[] = [];
    let islandsMeta: Record<string, { islandName?: string; likesCount?: number }> = {};

    function recomputeList() {
      const now = Date.now();
      const activeUids = new Set(
        activePlayersData
          .filter((p) => now - (p.lastSeen || 0) < 600000)
          .map((p) => p.uid),
      );

      const friendUids = new Set(friendsData.map((f) => f.uid));
      const combined = new Map<string, IslandFriendPlayer>();

      // 1. Process accepted real friends from Firestore friendRequests
      for (const f of friendsData) {
        if (!f.uid || f.uid === currentMyUid) continue;
        const name = f.displayName || f.username || "Friend";
        const meta = islandsMeta[f.uid];
        combined.set(f.uid, {
          uid: f.uid,
          name,
          username: f.username || name.toLowerCase().replace(/\s+/g, "_"),
          profilePhoto: f.profilePhoto || "/icons/player-icon-custom.png",
          islandName: meta?.islandName || `${name}'s Island`,
          likesCount: meta?.likesCount ?? 0,
          isOnline: activeUids.has(f.uid) || Boolean(f.online),
          isFriend: true,
          level: 5,
        });
        // Guarantee everyone has an island created in Firestore
        getOrCreateIsland(f.uid, name).catch(() => {});
      }

      // 2. Process real registered users from Firestore users collection
      for (const u of usersData) {
        if (!u.uid || u.uid === currentMyUid) continue;
        const meta = islandsMeta[u.uid];
        const isFr = friendUids.has(u.uid);
        const existing = combined.get(u.uid);
        if (existing) {
          if (meta?.islandName) existing.islandName = meta.islandName;
          if (meta?.likesCount !== undefined) existing.likesCount = meta.likesCount;
          if (activeUids.has(u.uid)) existing.isOnline = true;
          existing.isFriend = isFr;
        } else {
          combined.set(u.uid, {
            uid: u.uid,
            name: u.name,
            username: u.username,
            profilePhoto: u.profilePhoto || "/icons/player-icon-custom.png",
            islandName: meta?.islandName || `${u.name}'s Island`,
            likesCount: meta?.likesCount ?? 0,
            isOnline: activeUids.has(u.uid) || u.isOnline,
            isFriend: isFr,
            level: u.level || 5,
          });
          // Guarantee everyone has an island created in Firestore
          getOrCreateIsland(u.uid, u.name).catch(() => {});
        }
      }

      // 3. Process local saved accounts (if any exist on browser)
      try {
        const saved = getSavedAccounts();
        for (const s of saved) {
          if (!s.uid || s.uid === currentMyUid) continue;
          if (!combined.has(s.uid)) {
            const meta = islandsMeta[s.uid];
            const name = s.displayName || s.username || "Player";
            combined.set(s.uid, {
              uid: s.uid,
              name,
              username: s.username || name.toLowerCase().replace(/\s+/g, "_"),
              profilePhoto: s.profilePhoto || "/icons/player-icon-custom.png",
              islandName: meta?.islandName || `${name}'s Island`,
              likesCount: meta?.likesCount ?? 0,
              isOnline: activeUids.has(s.uid),
              isFriend: friendUids.has(s.uid),
              level: 5,
            });
            getOrCreateIsland(s.uid, name).catch(() => {});
          }
        }
      } catch {}

      setFriendsList(Array.from(combined.values()));
    }

    // Subscribe to real accepted friends from Firestore friendRequests
    const unsubFriends = subscribeFriends(currentMyUid, (friends) => {
      friendsData = friends || [];
      recomputeList();
    });

    // Subscribe to real registered users from Firestore users collection
    const unsubUsers = onSnapshot(
      query(collection(db, "users"), limit(60)),
      (snap) => {
        const list: IslandFriendPlayer[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const uid = d.id;
          if (uid !== currentMyUid) {
            const name = (data.displayName as string) || (data.username as string) || "Player";
            list.push({
              uid,
              name,
              username: (data.username as string) || name.toLowerCase().replace(/\s+/g, "_"),
              profilePhoto: (data.profilePhoto as string) || "/icons/player-icon-custom.png",
              islandName: `${name}'s Island`,
              isOnline: Boolean(data.online) || Date.now() - (data.lastActive || 0) < 600000,
              isFriend: false,
              level: typeof data.level === "number" ? data.level : 5,
            });
          }
        });
        usersData = list;
        recomputeList();
      },
      (err) => {
        console.warn("Could not query users collection:", err);
      },
    );

    // Subscribe to active players in skyblock_players
    const unsubActive = onSnapshot(
      collection(db, "skyblock_players"),
      (snap) => {
        const active: { uid: string; lastSeen: number; photo?: string }[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.uid) {
            active.push({
              uid: data.uid,
              lastSeen: data.lastSeen || 0,
              photo: data.profilePhoto,
            });
          }
        });
        activePlayersData = active;
        recomputeList();
      },
      (err) => {
        console.warn("Could not query skyblock_players:", err);
      },
    );

    // Subscribe to islands in islands collection
    const unsubIslands = onSnapshot(
      collection(db, "islands"),
      (snap) => {
        const meta: Record<string, { islandName?: string; likesCount?: number }> = {};
        snap.forEach((d) => {
          const data = d.data() as PersistentIsland;
          meta[d.id] = {
            islandName: data.islandName,
            likesCount: data.likesCount || data.likedBy?.length || 0,
          };
        });
        islandsMeta = meta;
        recomputeList();
      },
      (err) => {
        console.warn("Could not query islands:", err);
      },
    );

    return () => {
      unsubFriends();
      unsubUsers();
      unsubActive();
      unsubIslands();
    };
  }, [qbUser]);

  // ── In-Game Live Island Chat Real-time Subscription ──────────────────────
  useEffect(() => {
    const unsubChat = subscribeToSkyblockChat(
      effectiveIslandId,
      (newMsg) => {
        setChatMessages((prev) => {
          if (
            prev.some(
              (m) =>
                m.id === newMsg.id ||
                (m.createdAt === newMsg.createdAt &&
                  m.senderName === newMsg.senderName &&
                  m.text === newMsg.text),
            )
          ) {
            return prev;
          }
          return [...prev, newMsg];
        });
      },
      (allMsgs) => {
        if (allMsgs && allMsgs.length > 0) {
          setChatMessages(allMsgs);
        }
      },
    );

    return () => unsubChat();
  }, [effectiveIslandId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendChat = async (textToSend?: string) => {
    const raw = (textToSend || quickInput).trim();
    if (!raw) return;
    setQuickInput("");
    const senderName = qbUser?.displayName || qbUser?.username || "Player";
    const senderId = qbUser?.uid || getPermanentPlayerId(qbUser);
    const isOwner = !currentVisitingId || currentVisitingId === senderId;

    const newMsg: SkyblockChatMessage = {
      id: "local_" + Date.now(),
      senderId,
      senderName,
      senderTag: isOwner ? "OWNER" : "PLAYER",
      senderColor: isOwner ? "#fbbf24" : "#38bdf8",
      text: raw,
      createdAt: Date.now(),
    };
    setChatMessages((prev) => [...prev, newMsg]);
    GameAudio.playChatChime();

    await sendSkyblockChatMessage(effectiveIslandId, {
      senderId,
      senderName,
      senderTag: isOwner ? "OWNER" : "PLAYER",
      senderColor: isOwner ? "#fbbf24" : "#38bdf8",
      text: raw,
    });
  };

  const handleVisit = (player: IslandFriendPlayer) => {
    GameAudio.playPop();
    showToast(`Visiting ${player.name}'s Island! Connecting multiplayer...`);
    closeAllModals();
    if (onVisitIsland) {
      onVisitIsland(player.uid, player.name);
    } else if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("visit", player.uid);
      window.location.href = url.toString();
    }
  };

  const handleReturnHome = () => {
    GameAudio.playPop();
    showToast("Returning to your home island!");
    closeAllModals();
    if (onReturnHome) {
      onReturnHome();
    } else if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("visit");
      window.location.href = url.toString();
    }
  };

  const spendRealCoins = async (amount: number): Promise<boolean> => {
    if (realBalance < amount) return false;
    const ok = await spendCurrency("gold", amount);
    if (ok) {
      setPurseCoins(Math.max(0, econ.purse - amount));
      return true;
    }
    return false;
  };

  const addRealCoins = (amount: number) => {
    addCurrency("gold", amount);
    setPurseCoins(econ.purse + amount);
  };

  // ── Manor Upgrade Action ───────────────────────────────────────────────────
  const handleUpgradeIsland = async (targetTier: IslandTierDef) => {
    if (econ.islandInfo.level >= targetTier.tier) {
      showToast(`${targetTier.name} is already unlocked!`);
      return;
    }
    if (targetTier.tier !== econ.islandInfo.level + 1) {
      showToast(`Upgrade to Level ${econ.islandInfo.level + 1} first!`);
      return;
    }
    if (realBalance < targetTier.cost) {
      showToast(`Need ${targetTier.cost.toLocaleString()} Star Coins!`);
      return;
    }

    const ok = await spendRealCoins(targetTier.cost);
    if (!ok) {
      showToast("Transaction failed. Try again.");
      return;
    }

    econ.upgradeIslandBoundary();
    GameAudio.playLevelUp?.();
    showToast(`Island upgraded to ${targetTier.name}! (+${targetTier.hpBonus} HP, +${targetTier.buildSlots} Slots)`);
  };

  // ── Shop Buy Action ────────────────────────────────────────────────────────
  const handleBuyShopItem = async (item: ShopItem) => {
    if (realBalance < item.cost) {
      showToast(`Need ${item.cost.toLocaleString()} Star Coins!`);
      return;
    }

    const ok = await spendRealCoins(item.cost);
    if (!ok) {
      showToast("Purchase failed. Insufficient funds.");
      return;
    }

    GameAudio.playCashRegister?.();
    if (item.blockType !== undefined && onEquipHotbar) {
      onEquipHotbar(item.blockType);
    }
    showToast(`Bought ${item.name}! Added to hotbar.`);
  };

  // ── Claim Daily Reward ─────────────────────────────────────────────────────
  const dailyStreakRewards = [50, 75, 100, 150, 200, 300, 500];
  const currentDayIndex = Math.min(6, Math.max(0, econ.streak.currentDay - 1));

  const handleClaimDaily = () => {
    if (!econ.streak.canClaim) {
      showToast("Come back tomorrow for your next reward!");
      return;
    }
    const res = econ.claimDailyStreak();
    if (res.success) {
      addRealCoins(res.reward);
      showToast(`+${res.reward} Star Coins claimed!`);
    } else {
      showToast(res.message);
    }
  };

  // ── Claim Quest ────────────────────────────────────────────────────────────
  const handleClaimQuest = (q: DailyQuest) => {
    const res = econ.claimDailyQuest(q.id);
    if (res.success) {
      addRealCoins(res.reward);
      showToast(`+${res.reward} Star Coins! Quest complete.`);
    } else {
      showToast(res.message);
    }
  };

  const selectedTier = ISLAND_TIERS[selectedTierIdx] || ISLAND_TIERS[0];
  const isSelectedTierUnlocked = econ.islandInfo.level >= selectedTier.tier;
  const isSelectedTierNext = selectedTier.tier === econ.islandInfo.level + 1;

  return (
    <>
      {/* ── RIGHT-TOP: Small Grey Inventory-Style Currency + Sleek Menu Toggle ─── */}
      {!hideHudButtons && (
        <div
          className="fixed right-3 top-3 z-40 pointer-events-auto flex flex-col items-end gap-1 select-none"
          style={{ transformOrigin: "top right" }}
        >
          {/* Top row: Small grey inventory currency + Toggle button */}
          <div className="flex items-center gap-1.5 mb-0.5">
            {/* Small Grey Inventory Style Currency (Gold & Star Coins) */}
            <div
              onClick={() => setShopOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer select-none transition-transform active:scale-95 hover:brightness-105"
              style={{
                background: "rgba(28, 28, 32, 0.88)",
                border: "2px solid rgba(12, 12, 14, 0.95)",
                fontFamily:
                  '"InterDisplay", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
              title="Gold & Star Coins (Click to open shop)"
            >
              {/* Gold */}
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src="https://file.garden/alGOOylwpAfCa6qP/file_000000008f8481f49405d6c7b6fcbb5a.png"
                    alt="Gold"
                    className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
                  />
                </div>
                <span
                  className="text-[11px] font-bold text-amber-400 font-mono tracking-tight leading-none"
                  style={{
                    textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                  }}
                >
                  {(globalGold || econ.purse || 0).toLocaleString()}
                </span>
              </div>

              <div className="w-[1px] h-3 bg-white/10 shrink-0" />

              {/* Star Coins */}
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src="https://file.garden/alGOOylwpAfCa6qP/IMG_7269.png"
                    alt="Star Coins"
                    className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
                  />
                </div>
                <span
                  className="text-[11px] font-bold text-pink-400 font-mono tracking-tight leading-none"
                  style={{
                    textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                  }}
                >
                  {(starCoins || realBalance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Toggle button in Blockfort style: X to close, Menu to open */}
            {buttonsExpanded ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => setButtonsExpanded(false)}
                className="bf-close bf-close--sm"
                aria-label="Close buttons menu"
                title="Close buttons menu (✕)"
              />
            ) : (
              <motion.button
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={() => setButtonsExpanded(true)}
                className="bf-toggle-btn"
                aria-label="Open buttons menu"
                title="Open Skyblock buttons"
              >
                <i className="bf-icon bf-icon--cube" style={{ transform: "scale(0.75)" }} />
                <span>Menu</span>
              </motion.button>
            )}
          </div>

          {/* Collapsible buttons list with welcome-page blur & spring animation */}
          <AnimatePresence>
            {buttonsExpanded && (
              <motion.div
                initial={{ opacity: 0, filter: "blur(12px)", x: 22, scale: 0.88 }}
                animate={{ opacity: 1, filter: "blur(0px)", x: 0, scale: 1 }}
                exit={{ opacity: 0, filter: "blur(12px)", x: 22, scale: 0.88 }}
                transition={{ type: "spring", damping: 24, stiffness: 380, mass: 0.4 }}
                className="flex flex-col gap-1 items-end"
              >
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  type="button"
                  className="bf-btn bf-btn--build !min-w-0 !w-[78px] !h-[28px] !text-[11px] cursor-pointer touch-manipulation shadow-sm"
                  onClick={() => setManorOpen(true)}
                  title="Island Upgrades"
                >
                  <span className="bf-btn__label !px-2 !py-0 !pl-5">Upgrades</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  type="button"
                  className="bf-btn bf-btn--build !min-w-0 !w-[78px] !h-[28px] !text-[11px] cursor-pointer touch-manipulation shadow-sm"
                  onClick={() => setShopOpen(true)}
                  title="Island Store"
                >
                  <span className="bf-btn__label !px-2 !py-0 !pl-5">Shop</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  type="button"
                  className="bf-btn bf-btn--mail !min-w-0 !w-[78px] !h-[28px] !text-[11px] cursor-pointer touch-manipulation shadow-sm"
                  onClick={() => setDailyOpen(true)}
                  title="Daily Rewards"
                >
                  <span className="bf-btn__label !px-2 !py-0 !pl-5">Rewards</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  type="button"
                  className="bf-btn bf-btn--home !min-w-0 !w-[78px] !h-[28px] !text-[11px] cursor-pointer touch-manipulation shadow-sm"
                  onClick={() => setFriendsOpen(true)}
                  title="Friends & Online Islands"
                >
                  <span className="bf-btn__label !px-2 !py-0 !pl-5">Friends</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  type="button"
                  className="bf-btn bf-btn--plain !min-w-0 !w-[78px] !h-[28px] !text-[11px] cursor-pointer touch-manipulation shadow-sm active:scale-95"
                  onClick={() => setQuestsOpen(true)}
                  title="Daily Quests"
                >
                  <span className="bf-btn__label !px-2 !py-0 !pl-5">Quests</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── TOAST NOTIFICATION WITH LUXURY BLUR ────────────────────────────── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(14px)", y: 20, scale: 0.92 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0, scale: 1 }}
            exit={{ opacity: 0, filter: "blur(14px)", y: 20, scale: 0.92 }}
            transition={{ type: "spring", damping: 24, stiffness: 360 }}
            className="fixed left-1/2 bottom-20 -translate-x-1/2 z-[2000] pointer-events-none"
          >
            <div className="bf-toast">{toastMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MANOR / ISLAND UPGRADE MODAL ────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {manorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap bf-modal-wrap--board"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
                className="bf-modal bf-panel bf-panel--board"
                role="dialog"
                aria-modal="true"
                aria-labelledby="manor-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bf-panel__title" style={{ top: -72, height: 86 }}>
                  <div className="bf-banner-crown" aria-hidden="true" />
                </div>
                <h2 className="bf-sr" id="manor-title">
                  Island Upgrade
                </h2>
                <button
                  type="button"
                  className="bf-close bf-panel__close"
                  aria-label="Close"
                  onClick={closeAllModals}
                >
                  ✕
                </button>

                {/* 7 Island Selection Shelf - compact & balanced */}
                <div className="manor-islands mt-1" data-bf-selectable>
                  {ISLAND_TIERS.map((tier, idx) => {
                    const unlocked = econ.islandInfo.level >= tier.tier;
                    const isSelected = selectedTierIdx === idx;
                    return (
                      <button
                        key={tier.name}
                        type="button"
                        onClick={() => setSelectedTierIdx(idx)}
                        className={`bf-island ${isSelected ? "is-selected" : ""} ${!unlocked ? "is-locked" : ""}`}
                        title={`${tier.name} (Level ${tier.tier})`}
                        style={{ ["--h" as string]: `${46 + idx * 3}px` }}
                      >
                        <img src={tier.image} alt={tier.name} draggable={false} />
                      </button>
                    );
                  })}
                </div>

                {/* Island Details & Stats - compact 2-column layout */}
                <div className="flex gap-3 justify-center items-center mt-2">
                  <div className="bf-note">
                    <img
                      src={selectedTier.image}
                      alt={selectedTier.name}
                      style={{ maxHeight: 85 }}
                      draggable={false}
                    />
                  </div>
                  <div className="w-[290px] flex flex-col gap-0.5">
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--up" />
                      <span className="bf-row__grow text-[14.5px] font-semibold">{selectedTier.name}</span>
                      <b className="text-amber-700 font-semibold">Lv {selectedTier.tier}</b>
                    </div>
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--heart" />
                      <span className="bf-row__grow text-[13.5px]">Health Bonus</span>
                      <b className="font-semibold">+{selectedTier.hpBonus} HP</b>
                    </div>
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--cube" />
                      <span className="bf-row__grow text-[13.5px]">Build Slots / Minions</span>
                      <b className="font-semibold">+{selectedTier.buildSlots}</b>
                    </div>
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--chevron" style={{ transform: "rotate(-90deg)" }} />
                      <span className="bf-row__grow text-[13.5px]">Boundary Size</span>
                      <b className="font-semibold">{selectedTier.boundary}x{selectedTier.boundary}</b>
                    </div>
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--coin" />
                      <span className="bf-row__grow text-[13.5px]">Upgrade Cost</span>
                      <b className={`font-semibold ${realBalance < selectedTier.cost && isSelectedTierNext ? "text-red-600" : ""}`}>
                        {selectedTier.cost === 0 ? "Unlocked" : `${selectedTier.cost.toLocaleString()} Coins`}
                      </b>
                    </div>

                    <div className="mt-2 flex justify-center gap-2">
                      {isSelectedTierUnlocked ? (
                        <button type="button" className="bf-btn bf-btn--plain" disabled>
                          <span className="bf-btn__label">Unlocked</span>
                        </button>
                      ) : isSelectedTierNext ? (
                        <button
                          type="button"
                          className="bf-btn bf-btn--build"
                          onClick={() => handleUpgradeIsland(selectedTier)}
                        >
                          <span className="bf-btn__label">Upgrade</span>
                        </button>
                      ) : (
                        <button type="button" className="bf-btn bf-btn--plain" disabled>
                          <span className="bf-btn__label">Requires Lv {selectedTier.tier - 1}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="bf-btn bf-btn--plain"
                        onClick={closeAllModals}
                      >
                        <span className="bf-btn__label">Close</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── STORE / SHOP MODAL ──────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {shopOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
                className="bf-modal bf-panel bf-panel--store"
                role="dialog"
                aria-modal="true"
                aria-labelledby="shop-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bf-panel__title" style={{ left: -118 }}>
                  <span className="bf-plate bf-plate--title" id="shop-title">
                    Shop
                  </span>
                </div>
                <div className="bf-panel__side" style={{ top: -14 }}>
                  <div style={{ height: 20 }} />
                  <button
                    type="button"
                    className={`bf-tab ${shopTab === "blocks" ? "is-active" : ""}`}
                    onClick={() => setShopTab("blocks")}
                  >
                    Blocks
                  </button>
                  <button
                    type="button"
                    className={`bf-tab ${shopTab === "tools" ? "is-active" : ""}`}
                    onClick={() => setShopTab("tools")}
                  >
                    Tools
                  </button>
                  <button
                    type="button"
                    className={`bf-tab ${shopTab === "decor" ? "is-active" : ""}`}
                    onClick={() => setShopTab("decor")}
                  >
                    Decor
                  </button>
                </div>
                <button
                  type="button"
                  className="bf-close bf-panel__close"
                  aria-label="Close"
                  onClick={closeAllModals}
                >
                  ✕
                </button>

                <div className="flex gap-5 items-start">
                  <div className="flex-1">
                    <div className="bf-slot-grid" style={{ ["--cols" as string]: 4 }}>
                      {SHOP_ITEMS.filter((item) => item.tab === shopTab).map((item) => {
                        const isSelected = selectedShopItem.id === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedShopItem(item)}
                            className={`bf-slot ${isSelected ? "is-selected" : ""}`}
                            aria-label={item.name}
                          >
                            <img
                              src={item.icon}
                              alt={item.name}
                              className="[image-rendering:pixelated]"
                              draggable={false}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detail column */}
                  <div className="bf-panel bf-panel--scroll text-center flex flex-col items-center justify-between p-2">
                    <div className="flex flex-col items-center">
                      <div className="h-28 w-28 grid place-items-center mt-2">
                        <img
                          src={selectedShopItem.icon}
                          alt={selectedShopItem.name}
                          className="max-h-20 max-w-20 object-contain [image-rendering:pixelated] drop-shadow-md"
                          draggable={false}
                        />
                      </div>
                      <h3 className="bf-ink text-[19px] font-black">{selectedShopItem.name}</h3>
                      <p className="text-[13px] text-amber-800 leading-snug px-2 mt-1">
                        {selectedShopItem.desc}
                      </p>
                    </div>

                    <div className="flex flex-col items-center mb-2 gap-1.5">
                      <div className="inline-flex items-center gap-1.5 text-[18px] font-black text-amber-900">
                        <i className="bf-icon bf-icon--coin" />
                        <span className={realBalance < selectedShopItem.cost ? "text-red-600" : ""}>
                          {selectedShopItem.cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="bf-btn bf-btn--plain"
                          onClick={() => handleBuyShopItem(selectedShopItem)}
                          disabled={realBalance < selectedShopItem.cost}
                        >
                          <span className="bf-btn__label">Buy</span>
                        </button>
                        <button
                          type="button"
                          className="bf-btn bf-btn--plain"
                          onClick={closeAllModals}
                        >
                          <span className="bf-btn__label">Close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── DAILY REWARDS MODAL ─────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {dailyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap bf-modal-wrap--board"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
                className="bf-modal bf-dialog"
                style={{ minWidth: 380, maxWidth: 540 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="daily-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bf-dialog__title">
                  <span className="bf-plate bf-plate--title" id="daily-title">
                    Daily Rewards
                  </span>
                </div>
                <button
                  type="button"
                  className="bf-close bf-panel__close"
                  aria-label="Close"
                  onClick={closeAllModals}
                >
                  ✕
                </button>

                <div className="bf-dialog__body">
                  <p className="text-[14px] text-amber-900 mb-3 font-semibold">
                    Log in daily to claim escalating Star Coin bounties!
                  </p>
                  <div className="grid grid-cols-7 gap-1.5 justify-center mt-2">
                    {dailyStreakRewards.map((reward, i) => {
                      const isDone = i < currentDayIndex;
                      const isToday = i === currentDayIndex;
                      return (
                        <div
                          key={i}
                          className={`bf-slot flex flex-col items-center justify-center text-[12px] font-black !w-[56px] !h-[62px] ${
                            isDone ? "opacity-60 grayscale" : ""
                          } ${isToday ? "is-selected" : ""}`}
                        >
                          <i className="bf-icon bf-icon--coin" />
                          <span className="text-[11px] tabular-nums mt-0.5">+{reward}</span>
                          <span className="text-[9px] text-amber-200">Day {i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bf-dialog__actions gap-2">
                  <button
                    type="button"
                    className="bf-btn bf-btn--plain"
                    onClick={handleClaimDaily}
                    disabled={!econ.streak.canClaim}
                  >
                    <span className="bf-btn__label">
                      {econ.streak.canClaim ? "Claim Today" : "Claimed Today"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="bf-btn bf-btn--plain"
                    onClick={closeAllModals}
                  >
                    <span className="bf-btn__label">Close</span>
                  </button>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── QUESTS MODAL ────────────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {questsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap bf-modal-wrap--board"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
                className="bf-modal bf-panel bf-panel--board"
                style={{ width: 620, minHeight: 380 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="quests-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bf-panel__title">
                  <span className="bf-plate bf-plate--title" id="quests-title">
                    Daily Quests
                  </span>
                </div>
                <button
                  type="button"
                  className="bf-close bf-panel__close"
                  aria-label="Close"
                  onClick={closeAllModals}
                >
                  ✕
                </button>

                <div className="flex flex-col gap-2.5 mt-4 px-2 max-h-[380px] overflow-y-auto pr-1">
                  {econ.dailyQuests.map((q) => {
                    const pct = Math.min(100, Math.round((q.current / q.target) * 100));
                    const isDone = q.current >= q.target;
                    const isClaimed = Boolean(q.claimed);

                    const handleQuestAction = () => {
                      if (isDone && !isClaimed) {
                        handleClaimQuest(q);
                      } else if (!isDone) {
                        showToast(`In progress: ${q.title} (${q.current}/${q.target}). ${q.desc}`);
                      } else {
                        showToast(`Quest already claimed today! +${q.reward} Star Coins received.`);
                      }
                    };

                    return (
                      <div
                        key={q.id}
                        onClick={handleQuestAction}
                        className={`bf-row flex items-center justify-between gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                          isDone && !isClaimed
                            ? "ring-2 ring-amber-500 bg-amber-50/90 shadow-md"
                            : isClaimed
                              ? "opacity-75"
                              : "hover:brightness-105"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-black text-[15px] truncate text-amber-950 flex items-center gap-1.5">
                              {isDone && !isClaimed && <span className="text-amber-500 animate-pulse">⭐</span>}
                              {q.title}
                            </span>
                            <span className="text-[12px] font-bold text-amber-800 shrink-0 ml-2">
                              {q.current} / {q.target}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-amber-900/85 leading-tight">{q.desc}</p>
                          <div className="w-full bg-[#3d2716] h-2.5 rounded-full overflow-hidden mt-2 border border-[#5a3f23]">
                            <div
                              className={`h-full transition-[width] duration-300 ${
                                isDone
                                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                  : "bg-gradient-to-r from-amber-400 to-amber-600"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-1 font-black text-amber-900 text-[14px]">
                            <i className="bf-icon bf-icon--coin" />
                            +{q.reward}
                          </span>
                          <button
                            type="button"
                            className={`bf-btn bf-btn--plain !min-w-[96px] !h-9 text-[13px] font-black cursor-pointer touch-manipulation active:scale-95 ${
                              isDone && !isClaimed
                                ? "!brightness-110 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                                : isClaimed
                                  ? "opacity-60"
                                  : ""
                            }`}
                            onClick={handleQuestAction}
                          >
                            <span className="bf-btn__label">
                              {isClaimed ? "✓ Done" : isDone ? "Claim!" : `${q.current}/${q.target}`}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center mt-3">
                  <button
                    type="button"
                    className="bf-btn bf-btn--plain !min-w-[100px] !h-9"
                    onClick={closeAllModals}
                  >
                    <span className="bf-btn__label">Close</span>
                  </button>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── BACKPACK INVENTORY MODAL ────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ===== FRIENDS & ISLAND VISITORS MODAL (Multiplayer Realm Visit) ===== */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {friendsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap bf-modal-wrap--board"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
                className="bf-modal bf-panel bf-panel--board"
                style={{ width: "min(640px, 94vw)", minHeight: 420 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="friends-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bf-panel__title" style={{ top: -86, height: 101 }}>
                  <div className="bf-banner-crown" aria-hidden="true" />
                  <span className="bf-plate bf-plate--title" id="friends-title">
                    Friends & Islands
                  </span>
                </div>
                <button
                  type="button"
                  className="bf-close bf-panel__close"
                  aria-label="Close"
                  onClick={closeAllModals}
                >
                  ✕
                </button>

                {/* Visiting banner if currently exploring someone else's realm */}
                {currentVisitingId && (
                  <div className="mt-2 mb-3 px-3 py-2 rounded-[8px] bg-[#1a0e05]/95 border-2 border-amber-500/50 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[18px]">🏝️</span>
                      <div className="min-w-0 text-left">
                        <p className="text-[13px] font-bold text-amber-200 truncate leading-tight">
                          Currently visiting: {currentVisitingName || "Player's Island"}
                        </p>
                        <p className="text-[10px] text-emerald-400 font-semibold">
                          ● Multiplayer sync active • Both characters visible
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="bf-btn bf-btn--plain !min-w-[96px] !h-8 !text-[12px] active:scale-95 cursor-pointer"
                      onClick={handleReturnHome}
                    >
                      <span className="bf-btn__label">Return Home</span>
                    </button>
                  </div>
                )}

                <div className="mt-2">
                  <p className="text-[12px] text-amber-950 font-bold text-center mb-2">
                    Visit other players&apos; islands, build together, and play in real-time!
                  </p>

                  {/* Friends & All Islands Tabs */}
                  <div className="flex items-center justify-center gap-2 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setFriendsTab("friends")}
                      className={`px-3 py-1 rounded-[4px] text-[12px] font-bold transition-all cursor-pointer ${
                        friendsTab === "friends"
                          ? "bg-[rgba(50,45,40,0.95)] text-amber-300 border-2 border-amber-500/70 shadow-sm"
                          : "bg-[rgba(30,24,18,0.7)] text-amber-200/60 border border-white/10 hover:text-white"
                      }`}
                      style={{
                        textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                      }}
                    >
                      My Friends ({friendsList.filter((p) => p.isFriend).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFriendsTab("all")}
                      className={`px-3 py-1 rounded-[4px] text-[12px] font-bold transition-all cursor-pointer ${
                        friendsTab === "all"
                          ? "bg-[rgba(50,45,40,0.95)] text-amber-300 border-2 border-amber-500/70 shadow-sm"
                          : "bg-[rgba(30,24,18,0.7)] text-amber-200/60 border border-white/10 hover:text-white"
                      }`}
                      style={{
                        textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                      }}
                    >
                      All Islands ({friendsList.length})
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="mb-2.5 px-0.5">
                    <input
                      type="text"
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      placeholder="Search players or islands..."
                      className="w-full h-8 bg-[rgba(24,16,10,0.85)] border-2 border-[#160c04] rounded-[5px] px-3 text-[12px] text-amber-100 placeholder-amber-200/40 outline-none focus:border-amber-400/80 shadow-inner"
                      style={{
                        fontFamily: '"InterDisplay", "Inter", sans-serif',
                        textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                      }}
                    />
                  </div>

                  {/* Players / Islands Feed */}
                  <div className="max-h-[280px] overflow-y-auto pr-1 flex flex-col gap-2 [scrollbar-width:thin]">
                    {(() => {
                      const displayedPlayers = friendsList.filter((p) => {
                        if (friendsTab === "friends" && !p.isFriend) return false;
                        if (!friendSearch.trim()) return true;
                        const q = friendSearch.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          p.username.toLowerCase().includes(q) ||
                          (p.islandName && p.islandName.toLowerCase().includes(q))
                        );
                      });

                      if (displayedPlayers.length === 0) {
                        return (
                          <div className="py-6 px-4 text-center rounded-[8px] bg-[rgba(28,20,12,0.85)] border border-amber-900/40">
                            {friendsTab === "friends" ? (
                              <>
                                <p className="text-[13px] font-bold text-amber-200">
                                  No Friends Added Yet
                                </p>
                                <p className="text-[11.5px] text-amber-200/60 mt-1 max-w-xs mx-auto">
                                  You haven&apos;t added any friends yet. Explore all player islands to visit and play together!
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setFriendsTab("all")}
                                  className="bf-btn bf-btn--plain !min-w-[120px] !h-8 mt-3 cursor-pointer"
                                >
                                  <span className="bf-btn__label">Explore All Islands</span>
                                </button>
                              </>
                            ) : (
                              <p className="text-[12px] text-amber-200/70">
                                No player islands found matching &quot;{friendSearch}&quot;.
                              </p>
                            )}
                          </div>
                        );
                      }

                      return displayedPlayers.map((player) => {
                        const isVisitingThis = currentVisitingId === player.uid;
                        return (
                          <div
                            key={player.uid}
                            className="w-full rounded-[6px] p-2 sm:p-2.5 flex items-center justify-between gap-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.5)] transition-all hover:brightness-105"
                            style={{
                              background: isVisitingThis
                                ? "rgba(45, 38, 28, 0.95)"
                                : "rgba(28, 28, 32, 0.88)",
                              border: isVisitingThis
                                ? "2px solid #f59e0b"
                                : "2px solid rgba(12, 12, 14, 0.95)",
                              fontFamily:
                                '"InterDisplay", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            }}
                          >
                            {/* Left: Square Profile Photo with 2px grey border */}
                            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-[4px] border-2 border-[rgba(15,15,18,0.95)] bg-[rgba(38,38,42,0.8)] overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                              <img
                                src={player.profilePhoto || "/icons/player-icon-custom.png"}
                                alt={player.name}
                                className="w-full h-full object-cover [image-rendering:pixelated]"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/icons/player-icon-custom.png";
                                }}
                              />
                              <span
                                className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-[rgba(12,12,14,0.95)] shadow-sm ${
                                  player.isOnline ? "bg-emerald-400" : "bg-zinc-500"
                                }`}
                                title={player.isOnline ? "Online" : "Offline"}
                              />
                            </div>

                            {/* Center info */}
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="font-black text-[13px] sm:text-[14px] text-white leading-tight truncate"
                                  style={{
                                    textShadow:
                                      "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 2px rgba(0,0,0,0.85)",
                                  }}
                                >
                                  {player.name}
                                </span>
                                {player.isFriend && (
                                  <span className="px-1.5 py-0.2 rounded-[3px] bg-amber-500/20 text-amber-300 text-[9.5px] font-bold border border-amber-500/40">
                                    Friend
                                  </span>
                                )}
                                {player.isOnline && (
                                  <span className="px-1.5 py-0.2 rounded-[3px] bg-emerald-500/20 text-emerald-400 text-[9.5px] font-bold border border-emerald-500/40">
                                    ● Online
                                  </span>
                                )}
                                {isVisitingThis && (
                                  <span className="px-1.5 py-0.2 rounded-[3px] bg-amber-500/30 text-amber-300 text-[9.5px] font-bold border border-amber-400/50">
                                    Current Realm
                                  </span>
                                )}
                              </div>
                              <p
                                className="text-[10.5px] text-zinc-400 font-mono truncate"
                                style={{
                                  textShadow:
                                    "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                                }}
                              >
                                @{player.username}
                              </p>
                              <p
                                className="text-[11px] text-amber-200/90 truncate mt-0.5 font-medium"
                                style={{
                                  textShadow:
                                    "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                                }}
                              >
                                🏝️ {player.islandName || "Skyblock Realm"}
                              </p>
                            </div>

                            {/* Right: Grey Button called 'Visit' */}
                            <div>
                              {isVisitingThis ? (
                                <button
                                  type="button"
                                  className="bf-btn bf-btn--plain !min-w-[76px] !h-8 !text-[12px] opacity-80 cursor-default"
                                  disabled
                                >
                                  <span className="bf-btn__label">Visiting</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="bf-btn bf-btn--plain !min-w-[76px] !h-8 !text-[13px] active:scale-95 transition-transform cursor-pointer"
                                  onClick={() => handleVisit(player)}
                                >
                                  <span className="bf-btn__label">Visit</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="flex justify-center mt-3">
                  <button
                    type="button"
                    className="bf-btn bf-btn--plain"
                    onClick={closeAllModals}
                  >
                    <span className="bf-btn__label">Done</span>
                  </button>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── IN-GAME LIVE CHAT PREVIEW ON THE LEFT (Grey Inventory Style) ──── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {chatPreviewOpen && (
        <aside
          aria-label="Island live chat"
          className="fixed left-3.5 top-[54px] sm:top-[60px] z-[90] w-[270px] sm:w-[320px] pointer-events-auto rounded-[6px] p-2 sm:p-2.5 flex flex-col gap-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur-md transition-all select-none"
          style={{
            background: "rgba(28, 28, 32, 0.88)",
            border: "2px solid rgba(12, 12, 14, 0.95)",
            boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.5)",
            fontFamily: '"InterDisplay", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-black uppercase tracking-wider text-zinc-300"
                style={{
                  textShadow:
                    "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 2px rgba(0,0,0,0.85)",
                }}
              >
                Island Chat
              </span>
              <span className="px-1.5 py-0.2 rounded-[3px] bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/40">
                ● Live
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setChatPreviewMinimized(!chatPreviewMinimized)}
                className="w-5 h-5 rounded-[3px] bg-[rgba(40,40,44,0.62)] border border-[rgba(20,20,22,0.8)] text-zinc-400 hover:text-white flex items-center justify-center text-[10px] active:scale-95 cursor-pointer"
                title={chatPreviewMinimized ? "Expand Chat" : "Minimize Chat"}
              >
                {chatPreviewMinimized ? "▲" : "▼"}
              </button>
            </div>
          </div>

          {/* Minimized teaser */}
          {chatPreviewMinimized ? (
            <div
              className="py-1 text-center cursor-pointer"
              onClick={() => setChatPreviewMinimized(false)}
            >
              <p
                className="text-[10px] text-zinc-400 hover:text-zinc-200 transition"
                style={{
                  textShadow:
                    "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                }}
              >
                {chatMessages.length > 0
                  ? `Latest: ${chatMessages[chatMessages.length - 1].senderName}: ${chatMessages[chatMessages.length - 1].text.slice(0, 24)}...`
                  : "Tap to expand chat"}
              </p>
            </div>
          ) : (
            <>
              {/* Message Feed */}
              <div
                ref={chatScrollRef}
                className="max-h-[140px] sm:max-h-[160px] overflow-y-auto flex flex-col gap-1.5 pr-1 [scrollbar-width:thin]"
              >
                {chatMessages.length === 0 ? (
                  <div className="py-3 text-center">
                    <p
                      className="text-[11px] text-zinc-400 italic"
                      style={{
                        textShadow:
                          "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                      }}
                    >
                      🏝️ Welcome to Skyblock Multiplayer! Type below to chat with players on this realm.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={msg.id || idx} className="flex items-start gap-1.5 w-full">
                      {/* Square Profile Photo */}
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] border-2 border-[rgba(20,20,22,0.85)] bg-[rgba(40,40,44,0.7)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={
                            msg.senderId === qbUser?.uid && qbUser?.profilePhoto
                              ? qbUser.profilePhoto
                              : "/icons/player-icon-custom.png"
                          }
                          alt=""
                          className="w-full h-full object-cover [image-rendering:pixelated]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/icons/player-icon-custom.png";
                          }}
                        />
                      </div>

                      {/* Chat text box */}
                      <div className="flex-1 min-w-0 bg-[rgba(40,40,44,0.62)] border border-[rgba(20,20,22,0.85)] rounded-[4px] px-2 py-1 shadow-sm">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="text-[11px] font-black leading-none truncate"
                            style={{
                              color: msg.senderColor || "#38bdf8",
                              textShadow:
                                "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 2px rgba(0,0,0,0.85)",
                            }}
                          >
                            {msg.senderName}
                          </span>
                          <span className="text-[8.5px] text-zinc-400 font-mono shrink-0">
                            {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p
                          className="text-[11px] font-medium text-white/95 leading-snug break-words mt-0.5"
                          style={{
                            textShadow:
                              "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 2px rgba(0,0,0,0.85)",
                          }}
                        >
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-1.5 pt-1 border-t border-white/10"
              >
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Chat with players..."
                  maxLength={120}
                  className="flex-1 min-w-0 h-7 bg-[rgba(40,40,44,0.62)] border-2 border-[rgba(20,20,22,0.85)] rounded-[4px] px-2 text-[11px] text-white placeholder-zinc-400 outline-none focus:border-amber-400/80"
                  style={{
                    fontFamily: '"InterDisplay", "Inter", sans-serif',
                    textShadow:
                      "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 2px rgba(0,0,0,0.85)",
                  }}
                />
                <button
                  type="submit"
                  className="bf-btn bf-btn--plain !min-w-[48px] !h-7 !text-[11px] cursor-pointer"
                >
                  <span className="bf-btn__label">Send</span>
                </button>
              </form>

              {/* Quick Reaction Chips */}
              <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
                {["👋 Hello!", "⚔️ Let's fight", "💎 Found gems!", "🏝️ Nice island!"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSendChat(chip)}
                    className="shrink-0 px-1.5 py-0.5 bg-[rgba(40,40,44,0.5)] hover:bg-[rgba(60,60,66,0.7)] border border-white/10 rounded-[3px] text-[9.5px] text-zinc-300 font-bold active:scale-95 cursor-pointer"
                    style={{
                      textShadow:
                        "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      )}
    </>
  );
}
