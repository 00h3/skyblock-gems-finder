// Fragment tag registry — the single source of truth for everything a fragment
// can be spent on. Adding a reward = adding an entry here (API-style registry),
// no UI changes required. Every surface (page, global popup, profile panel)
// renders from this list.

export type FragmentTagId =
  "in-game" | "customization" | "currency" | "wearables" | "emotes" | "worlds" | "boosts";

export type FragmentTagKind = "face-trial" | "coming-soon";

export type FragmentTag = {
  id: FragmentTagId;
  label: string;
  /** Short eyebrow shown above the reward title. */
  eyebrow: string;
  /** Rewards attached to this tag. */
  rewards: FragmentReward[];
};

export type FragmentReward = {
  id: string;
  title: string;
  description: string;
  /** Fragment cost. 0 = not spendable yet. */
  cost: number;
  kind: FragmentTagKind;
  /** Public path or imported asset URL. */
  image?: string;
};

export const FRAGMENT_TAGS: FragmentTag[] = [
  {
    id: "customization",
    label: "Customization",
    eyebrow: "Customization",
    rewards: [
      {
        id: "face-dollar",
        title: "$$$ Face",
        description: "Use 1 fragment to unlock it for 1 day.",
        cost: 1,
        kind: "face-trial",
      },
    ],
  },
  {
    id: "in-game",
    label: "In game",
    eyebrow: "Game drops",
    rewards: [
      {
        id: "game-drops",
        title: "World drops",
        description: "Game drops appear here as new worlds add fragment rewards.",
        cost: 0,
        kind: "coming-soon",
      },
    ],
  },
  {
    id: "currency",
    label: "Currency",
    eyebrow: "Currency",
    rewards: [
      {
        id: "coin-pouch",
        title: "Coin pouch",
        description:
          "Currency drops are coming soon. Fragments are account-bound and saved safely.",
        cost: 0,
        kind: "coming-soon",
      },
    ],
  },
  {
    id: "wearables",
    label: "Wearables",
    eyebrow: "Wearables",
    rewards: [
      {
        id: "scarlet-set",
        title: "Scarlet drops coming soon",
        description: "A limited wearable set unlockable with fragments.",
        cost: 0,
        kind: "coming-soon",
      },
    ],
  },
  {
    id: "emotes",
    label: "Emotes",
    eyebrow: "Emotes",
    rewards: [
      {
        id: "emote-pack",
        title: "Party emote pack",
        description: "Trade fragments for seasonal emotes once the pack drops.",
        cost: 0,
        kind: "coming-soon",
      },
    ],
  },
  {
    id: "worlds",
    label: "Worlds",
    eyebrow: "Worlds",
    rewards: [
      {
        id: "private-world",
        title: "Private world slot",
        description: "Spend fragments on an extra private world slot.",
        cost: 0,
        kind: "coming-soon",
      },
    ],
  },
  {
    id: "boosts",
    label: "Boosts",
    eyebrow: "Boosts",
    rewards: [
      {
        id: "xp-boost",
        title: "XP boost",
        description: "Double XP for an hour, paid with fragments.",
        cost: 0,
        kind: "coming-soon",
      },
    ],
  },
];

export function getFragmentTag(id: FragmentTagId | null | undefined) {
  return FRAGMENT_TAGS.find((tag) => tag.id === id) ?? FRAGMENT_TAGS[0];
}
