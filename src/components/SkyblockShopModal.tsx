import React, { useState, useEffect } from "react";
import { GameAudio } from "@/lib/game-audio";
import {
  useSkyblockEconomy,
  depositToBank,
  withdrawFromBank,
  claimDailyQuest,
  upgradeIslandBoundary,
  addPurseCoins,
} from "@/lib/skyblock-economy";

export type ShopTab = "buy" | "sell" | "upgrades" | "bank" | "quests";

interface ShopItem {
  id: string;
  name: string;
  category: "spawners" | "farming" | "blocks" | "automation";
  price: number;
  qty: number;
  desc: string;
}

const BUY_CATALOG: ShopItem[] = [
  {
    id: "spawner_zombie",
    name: "Zombie Spawner",
    category: "spawners",
    price: 2500,
    qty: 1,
    desc: "Spawns island zombies for mob bounties and rotten flesh.",
  },
  {
    id: "spawner_skeleton",
    name: "Skeleton Spawner",
    category: "spawners",
    price: 3500,
    qty: 1,
    desc: "Spawns island skeletons for bone bounties and arrows.",
  },
  {
    id: "auto_sell_chest",
    name: "Auto-Sell Chest",
    category: "automation",
    price: 1200,
    qty: 1,
    desc: "Auto-sells farmed crops and mob drops every 60 seconds into your purse.",
  },
  {
    id: "oak_sapling",
    name: "Oak Sapling x4",
    category: "farming",
    price: 50,
    qty: 4,
    desc: "Grow oak trees for timber and apples.",
  },
  {
    id: "birch_sapling",
    name: "Birch Sapling x4",
    category: "farming",
    price: 60,
    qty: 4,
    desc: "Fast growing decorative birch wood.",
  },
  {
    id: "wheat_seeds",
    name: "Wheat Seeds x16",
    category: "farming",
    price: 40,
    qty: 16,
    desc: "Plant on tilled soil for food and bulk selling.",
  },
  {
    id: "carrot",
    name: "Carrot x8",
    category: "farming",
    price: 60,
    qty: 8,
    desc: "Nutritious crop that can be replanted directly.",
  },
  {
    id: "potato",
    name: "Potato x8",
    category: "farming",
    price: 60,
    qty: 8,
    desc: "Versatile farm crop for selling and food.",
  },
  {
    id: "melon_seeds",
    name: "Melon Seeds x4",
    category: "farming",
    price: 80,
    qty: 4,
    desc: "Spreads melon blocks continuously once grown.",
  },
  {
    id: "water_bucket",
    name: "Water Bucket",
    category: "blocks",
    price: 150,
    qty: 1,
    desc: "Essential for infinite cobblestone generators and crops.",
  },
  {
    id: "lava_bucket",
    name: "Lava Bucket",
    category: "blocks",
    price: 300,
    qty: 1,
    desc: "Creates cobblestone generator when mixed with flowing water.",
  },
  {
    id: "packed_ice",
    name: "Packed Ice x4",
    category: "blocks",
    price: 100,
    qty: 4,
    desc: "Compact ice blocks for water streams and mob grinders.",
  },
];

interface BulkSellItem {
  id: string;
  name: string;
  qty: number;
  payout: number;
}

const BULK_SELL_ITEMS: BulkSellItem[] = [
  { id: "cobble_64", name: "Cobblestone x64", qty: 64, payout: 64 },
  { id: "coal_16", name: "Coal Ore / Lump x16", qty: 16, payout: 48 },
  { id: "iron_16", name: "Iron Ingot x16", qty: 16, payout: 96 },
  { id: "gold_8", name: "Gold Ingot x8", qty: 8, payout: 120 },
  { id: "diamond_4", name: "Diamond x4", qty: 4, payout: 200 },
  { id: "emerald_2", name: "Emerald x2", qty: 2, payout: 150 },
  { id: "wheat_32", name: "Fresh Wheat x32", qty: 32, payout: 80 },
  { id: "oak_log_32", name: "Oak Log x32", qty: 32, payout: 48 },
  { id: "rotten_flesh_16", name: "Rotten Flesh x16", qty: 16, payout: 64 },
  { id: "bones_16", name: "Skeleton Bones x16", qty: 16, payout: 80 },
];

export function SkyblockShopModal({
  initialTab = "buy",
  onClose,
}: {
  initialTab?: ShopTab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ShopTab>(initialTab);
  const [toast, setToast] = useState<string | null>(null);
  const [customBankAmount, setCustomBankAmount] = useState<string>("");
  const { purse, bank, dailyQuests, islandInfo } = useSkyblockEconomy();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        GameAudio.playChestClose?.();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Handle Buy
  const handleBuy = (item: ShopItem) => {
    if (purse < item.price) {
      showToast(`Insufficient purse coins. Need ${item.price.toLocaleString()} coins.`);
      return;
    }
    addPurseCoins(-item.price);
    GameAudio.playCashRegister?.();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("bm-item-collected", {
          detail: { name: item.name, qty: item.qty },
        }),
      );
    }

    showToast(`Purchased ${item.name} for ${item.price.toLocaleString()} coins.`);
  };

  // Handle Sell
  const handleSell = (item: BulkSellItem) => {
    addPurseCoins(item.payout);
    GameAudio.playCashRegister?.();
    showToast(`Sold ${item.name} for +${item.payout.toLocaleString()} coins!`);
  };

  // Handle Sell All Bulk
  const handleSellAll = () => {
    const total = BULK_SELL_ITEMS.reduce((sum, item) => sum + item.payout, 0);
    addPurseCoins(total);
    GameAudio.playCashRegister?.();
    showToast(`Sold bulk batches for +${total.toLocaleString()} coins!`);
  };

  // Handle Bank
  const handleDeposit = (amount: number | "all") => {
    const res = depositToBank(amount);
    showToast(res.message);
    if (res.success) setCustomBankAmount("");
  };

  const handleWithdraw = (amount: number | "all") => {
    const res = withdrawFromBank(amount);
    showToast(res.message);
    if (res.success) setCustomBankAmount("");
  };

  // Handle Quest
  const handleClaimQuest = (id: "stone" | "crops" | "mobs") => {
    const res = claimDailyQuest(id);
    showToast(res.message);
  };

  // Handle Island Upgrade
  const handleUpgradeIsland = () => {
    const res = upgradeIslandBoundary();
    showToast(res.message);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-2 sm:p-4 pointer-events-auto select-none"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          GameAudio.playChestClose?.();
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Server Shop"
        className="v2-anim-pop flex max-h-[86dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-[4px] p-2.5 sm:p-3.5 select-none shadow-[0_16px_40px_rgba(0,0,0,0.65)]"
        style={{
          backgroundColor: "#c6c6c6",
          borderTop: "3px solid #ffffff",
          borderLeft: "3px solid #ffffff",
          borderBottom: "3px solid #555555",
          borderRight: "3px solid #555555",
        }}
      >
        {/* Authentic Inventory Grey Header */}
        <header className="relative flex h-8 shrink-0 items-center justify-between pb-1.5 border-b border-[#a0a0a0]">
          <h2 className="font-lilita text-[15px] sm:text-[16px] tracking-wide text-[#2b2b2b] uppercase">
            SERVER SHOP & ECONOMY
          </h2>
          <button
            type="button"
            onClick={() => {
              GameAudio.playChestClose?.();
              onClose();
            }}
            aria-label="Close shop"
            className="font-lilita text-[15px] text-[#444444] hover:text-black px-1.5 py-0.5 active:scale-95 transition"
          >
            ✕
          </button>
        </header>

        {/* Real Count Currency Status Bar */}
        <div
          className="my-2 px-2.5 py-1.5 rounded-[2px] flex items-center justify-between font-lilita text-[11px] sm:text-[12px] uppercase text-[#1a1a1a]"
          style={{
            backgroundColor: "#a0a0a0",
            borderTop: "2px solid #373737",
            borderLeft: "2px solid #373737",
            borderBottom: "2px solid #ffffff",
            borderRight: "2px solid #ffffff",
          }}
        >
          <div className="flex items-center gap-2">
            <span>PURSE:</span>
            <span className="text-white [text-shadow:0_1px_2px_#000] tabular-nums font-mono font-bold text-[13px]">
              {purse.toLocaleString()} COINS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>BANK:</span>
            <span className="text-[#a0ffb0] [text-shadow:0_1px_2px_#000] tabular-nums font-mono font-bold text-[13px]">
              {bank.toLocaleString()} COINS
            </span>
          </div>
        </div>

        {/* Navigation Tabs — Iconless Minecraft Grey Bevel Buttons */}
        <div className="grid grid-cols-5 gap-1 mb-2">
          {(
            [
              { id: "buy", label: "BUY" },
              { id: "sell", label: "SELL" },
              { id: "upgrades", label: "EXPAND" },
              { id: "bank", label: "BANK" },
              { id: "quests", label: "QUESTS" },
            ] as const
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  GameAudio.playPop?.();
                  setTab(t.id);
                }}
                className="py-1.5 px-1 font-lilita text-[11px] sm:text-[12px] uppercase text-[#222222] transition active:scale-95"
                style={{
                  backgroundColor: active ? "#dfdfdf" : "#c6c6c6",
                  borderTop: active ? "2px solid #373737" : "2px solid #ffffff",
                  borderLeft: active ? "2px solid #373737" : "2px solid #ffffff",
                  borderBottom: active ? "2px solid #ffffff" : "2px solid #555555",
                  borderRight: active ? "2px solid #ffffff" : "2px solid #555555",
                  fontWeight: active ? "bold" : "normal",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Inset Main Viewport */}
        <div
          className="flex min-h-[220px] max-h-[46dvh] flex-1 flex-col overflow-y-auto p-2 rounded-[2px]"
          style={{
            backgroundColor: "#8b8b8b",
            borderTop: "2px solid #373737",
            borderLeft: "2px solid #373737",
            borderBottom: "2px solid #ffffff",
            borderRight: "2px solid #ffffff",
          }}
        >
          {/* TAB: BUY ITEMS */}
          {tab === "buy" && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-lilita text-white/80 uppercase pb-1 border-b border-white/20">
                PURCHASE ESSENTIALS, SEEDS & SPAWNERS (PURSE COINS)
              </div>
              {BUY_CATALOG.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-[2px]"
                  style={{
                    backgroundColor: "#9b9b9b",
                    borderTop: "1px solid #ffffff",
                    borderLeft: "1px solid #ffffff",
                    borderBottom: "1px solid #444444",
                    borderRight: "1px solid #444444",
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-lilita text-[12px] sm:text-[13px] text-white [text-shadow:0_1px_2px_#000] uppercase">
                      {item.name}
                    </span>
                    <span className="text-[10px] sm:text-[10.5px] text-[#222222] font-medium leading-tight max-w-[260px]">
                      {item.desc}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuy(item)}
                    className="px-2.5 py-1 font-lilita text-[11px] text-[#111111] uppercase active:scale-95 transition shrink-0"
                    style={{
                      backgroundColor: "#c6c6c6",
                      borderTop: "2px solid #ffffff",
                      borderLeft: "2px solid #ffffff",
                      borderBottom: "2px solid #555555",
                      borderRight: "2px solid #555555",
                    }}
                  >
                    BUY {item.price.toLocaleString()} C
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB: SELL BULK */}
          {tab === "sell" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-white/20">
                <span className="text-[11px] font-lilita text-white/80 uppercase">
                  SELL BULK CROPS & MINERALS DIRECTLY FOR PURSE COINS
                </span>
                <button
                  type="button"
                  onClick={handleSellAll}
                  className="px-2 py-0.5 font-lilita text-[10.5px] text-[#111111] uppercase active:scale-95 transition"
                  style={{
                    backgroundColor: "#c6c6c6",
                    borderTop: "2px solid #ffffff",
                    borderLeft: "2px solid #ffffff",
                    borderBottom: "2px solid #555555",
                    borderRight: "2px solid #555555",
                  }}
                >
                  SELL ALL
                </button>
              </div>
              {BULK_SELL_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-[2px]"
                  style={{
                    backgroundColor: "#9b9b9b",
                    borderTop: "1px solid #ffffff",
                    borderLeft: "1px solid #ffffff",
                    borderBottom: "1px solid #444444",
                    borderRight: "1px solid #444444",
                  }}
                >
                  <span className="font-lilita text-[12px] sm:text-[13px] text-white [text-shadow:0_1px_2px_#000] uppercase">
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSell(item)}
                    className="px-2.5 py-1 font-lilita text-[11px] text-[#111111] uppercase active:scale-95 transition"
                    style={{
                      backgroundColor: "#c6c6c6",
                      borderTop: "2px solid #ffffff",
                      borderLeft: "2px solid #ffffff",
                      borderBottom: "2px solid #555555",
                      borderRight: "2px solid #555555",
                    }}
                  >
                    SELL +{item.payout.toLocaleString()} C
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB: ISLAND UPGRADE */}
          {tab === "upgrades" && (
            <div className="flex flex-col gap-2.5">
              <div className="text-[11px] font-lilita text-white/80 uppercase pb-1 border-b border-white/20">
                ISLAND BOUNDARY & LEVEL PROGRESSION
              </div>
              <div
                className="p-3 rounded-[2px] flex flex-col gap-1.5"
                style={{
                  backgroundColor: "#9b9b9b",
                  borderTop: "1px solid #ffffff",
                  borderLeft: "1px solid #ffffff",
                  borderBottom: "1px solid #444444",
                  borderRight: "1px solid #444444",
                }}
              >
                <div className="flex items-center justify-between font-lilita text-[13px] text-white [text-shadow:0_1px_2px_#000]">
                  <span>CURRENT ISLAND LEVEL: {islandInfo.level} / {islandInfo.maxLevel}</span>
                  <span>{islandInfo.boundarySize}x{islandInfo.boundarySize} BLOCKS</span>
                </div>
                <div className="text-[11px] text-[#222222] font-medium leading-normal">
                  Each island level expands your construction boundary by +10 blocks in all directions, increases visitor capacity, and accelerates crop growth.
                </div>
                {islandInfo.level < islandInfo.maxLevel ? (
                  <button
                    type="button"
                    onClick={handleUpgradeIsland}
                    className="mt-2 py-2 px-3 font-lilita text-[12px] sm:text-[13px] text-[#111111] uppercase active:scale-95 transition"
                    style={{
                      backgroundColor: "#c6c6c6",
                      borderTop: "2px solid #ffffff",
                      borderLeft: "2px solid #ffffff",
                      borderBottom: "2px solid #555555",
                      borderRight: "2px solid #555555",
                    }}
                  >
                    UPGRADE TO LEVEL {islandInfo.level + 1} (+10 BLOCKS) — {islandInfo.nextCost.toLocaleString()} COINS
                  </button>
                ) : (
                  <div className="mt-2 py-1.5 text-center font-lilita text-[12px] text-white [text-shadow:0_1px_2px_#000] uppercase">
                    MAXIMUM ISLAND LEVEL REACHED
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: BANK VAULT */}
          {tab === "bank" && (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-lilita text-white/80 uppercase pb-1 border-b border-white/20">
                SAFE BANK STORAGE (0% LOSS ON VOID FALL OR PVE DEATH)
              </div>
              <div
                className="p-2.5 rounded-[2px] text-[11px] text-[#222222] font-medium leading-snug"
                style={{
                  backgroundColor: "#9b9b9b",
                  borderTop: "1px solid #ffffff",
                  borderLeft: "1px solid #ffffff",
                  borderBottom: "1px solid #444444",
                  borderRight: "1px solid #444444",
                }}
              >
                Coins kept in your purse lose 10% on PvE death and 20% on void fall. Coins deposited in your Bank Vault are 100% secure.
              </div>

              {/* Quick Deposit Actions */}
              <div className="flex flex-col gap-1">
                <span className="font-lilita text-[11px] text-white [text-shadow:0_1px_2px_#000] uppercase">
                  DEPOSIT PURSE TO BANK:
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[100, 500, 1000].map((amt) => (
                    <button
                      key={`dep_${amt}`}
                      type="button"
                      onClick={() => handleDeposit(amt)}
                      className="py-1 font-lilita text-[11px] text-[#111111] uppercase active:scale-95 transition"
                      style={{
                        backgroundColor: "#c6c6c6",
                        borderTop: "2px solid #ffffff",
                        borderLeft: "2px solid #ffffff",
                        borderBottom: "2px solid #555555",
                        borderRight: "2px solid #555555",
                      }}
                    >
                      +{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleDeposit("all")}
                    className="py-1 font-lilita text-[11px] text-[#111111] uppercase active:scale-95 transition"
                    style={{
                      backgroundColor: "#c6c6c6",
                      borderTop: "2px solid #ffffff",
                      borderLeft: "2px solid #ffffff",
                      borderBottom: "2px solid #555555",
                      borderRight: "2px solid #555555",
                    }}
                  >
                    DEP ALL
                  </button>
                </div>
              </div>

              {/* Quick Withdraw Actions */}
              <div className="flex flex-col gap-1 mt-1">
                <span className="font-lilita text-[11px] text-white [text-shadow:0_1px_2px_#000] uppercase">
                  WITHDRAW BANK TO PURSE:
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[100, 500, 1000].map((amt) => (
                    <button
                      key={`wdr_${amt}`}
                      type="button"
                      onClick={() => handleWithdraw(amt)}
                      className="py-1 font-lilita text-[11px] text-[#111111] uppercase active:scale-95 transition"
                      style={{
                        backgroundColor: "#c6c6c6",
                        borderTop: "2px solid #ffffff",
                        borderLeft: "2px solid #ffffff",
                        borderBottom: "2px solid #555555",
                        borderRight: "2px solid #555555",
                      }}
                    >
                      -{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleWithdraw("all")}
                    className="py-1 font-lilita text-[11px] text-[#111111] uppercase active:scale-95 transition"
                    style={{
                      backgroundColor: "#c6c6c6",
                      borderTop: "2px solid #ffffff",
                      borderLeft: "2px solid #ffffff",
                      borderBottom: "2px solid #555555",
                      borderRight: "2px solid #555555",
                    }}
                  >
                    WDR ALL
                  </button>
                </div>
              </div>

              {/* Custom amount field */}
              <div className="flex items-center gap-1.5 mt-2">
                <input
                  type="number"
                  placeholder="Custom coin amount..."
                  value={customBankAmount}
                  onChange={(e) => setCustomBankAmount(e.target.value)}
                  className="flex-1 px-2 py-1 font-lilita text-[12px] bg-[#373737] text-white border border-[#555555] rounded-[2px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleDeposit(Number(customBankAmount))}
                  className="px-2 py-1 font-lilita text-[11px] text-[#111111] uppercase active:scale-95 transition"
                  style={{
                    backgroundColor: "#c6c6c6",
                    borderTop: "2px solid #ffffff",
                    borderLeft: "2px solid #ffffff",
                    borderBottom: "2px solid #555555",
                    borderRight: "2px solid #555555",
                  }}
                >
                  DEP
                </button>
                <button
                  type="button"
                  onClick={() => handleWithdraw(Number(customBankAmount))}
                  className="px-2 py-1 font-lilita text-[11px] text-[#111111] uppercase active:scale-95 transition"
                  style={{
                    backgroundColor: "#c6c6c6",
                    borderTop: "2px solid #ffffff",
                    borderLeft: "2px solid #ffffff",
                    borderBottom: "2px solid #555555",
                    borderRight: "2px solid #555555",
                  }}
                >
                  WDR
                </button>
              </div>
            </div>
          )}

          {/* TAB: DAILY QUESTS */}
          {tab === "quests" && (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-lilita text-white/80 uppercase pb-1 border-b border-white/20">
                DAILY QUESTS (CLAIM LUMP SUM PURSE REWARDS)
              </div>
              {dailyQuests.map((quest) => {
                const complete = quest.current >= quest.target;
                const pct = Math.min(100, Math.floor((quest.current / quest.target) * 100));
                return (
                  <div
                    key={quest.id}
                    className="p-2.5 rounded-[2px] flex flex-col gap-1.5"
                    style={{
                      backgroundColor: "#9b9b9b",
                      borderTop: "1px solid #ffffff",
                      borderLeft: "1px solid #ffffff",
                      borderBottom: "1px solid #444444",
                      borderRight: "1px solid #444444",
                    }}
                  >
                    <div className="flex items-center justify-between font-lilita text-[12px] sm:text-[13px] text-white [text-shadow:0_1px_2px_#000] uppercase">
                      <span>{quest.title}</span>
                      <span>+{quest.reward.toLocaleString()} COINS</span>
                    </div>
                    <div className="text-[10.5px] text-[#222222] font-medium leading-tight">
                      {quest.desc}
                    </div>

                    {/* Progress Bar */}
                    <div
                      className="h-3.5 w-full rounded-[1px] p-0.5 overflow-hidden"
                      style={{
                        backgroundColor: "#373737",
                        borderTop: "1px solid #222222",
                        borderBottom: "1px solid #555555",
                      }}
                    >
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: complete ? "#5be65b" : "#e6b800",
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="font-mono text-[10.5px] text-white font-bold tabular-nums">
                        {quest.current} / {quest.target} ({pct}%)
                      </span>
                      {quest.claimed ? (
                        <span className="font-lilita text-[11px] text-[#222222] uppercase">
                          CLAIMED
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!complete}
                          onClick={() => handleClaimQuest(quest.id)}
                          className="px-2.5 py-0.5 font-lilita text-[11px] text-[#111111] uppercase active:scale-95 transition disabled:opacity-40"
                          style={{
                            backgroundColor: complete ? "#dfdfdf" : "#c6c6c6",
                            borderTop: "2px solid #ffffff",
                            borderLeft: "2px solid #ffffff",
                            borderBottom: "2px solid #555555",
                            borderRight: "2px solid #555555",
                          }}
                        >
                          CLAIM {quest.reward} C
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer feedback toast */}
        {toast && (
          <div className="mt-2 py-1 px-2 bg-[#222222] text-[#5be65b] text-center font-mono text-[11px] font-bold rounded-[2px] border border-[#444444]">
            {toast}
          </div>
        )}
      </section>
    </div>
  );
}
