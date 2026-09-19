/**
 * WebSockets real-time sync for QBlock Sandbox Engine.
 * Handles player presence (positions, movement, chat) and world block updates.
 */

import type { AvatarSnapshot } from "@/lib/avatar";

export type PlayerUpdate = {
  uid: string;
  name: string;
  photo?: string;
  frame?: string;
  badges?: string[];
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim?: string;
  avatarSnapshot?: Partial<AvatarSnapshot>;
  gender?: "male" | "female";
  modelUrl?: string;
};

export type BlockUpdate = {
  x: number;
  y: number;
  z: number;
  id: number;
  updatedBy: string;
};

export type ChatMessage = {
  uid: string;
  name: string;
  text: string;
  at: number;
};

type ServerMessage =
  | { type: "players"; players: PlayerUpdate[] }
  | { type: "player_joined"; player: PlayerUpdate }
  | { type: "join"; player: PlayerUpdate }
  | { type: "position"; player: PlayerUpdate }
  | { type: "avatar_update" | "player_update"; player: PlayerUpdate }
  | { type: "player_left"; uid: string }
  | { type: "block_update" | "block"; block: BlockUpdate }
  | { type: "chat"; message: ChatMessage }
  | { type: "init_world"; blocks: BlockUpdate[] };

class SandboxSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private myUid: string = "";
  private myData: PlayerUpdate | null = null;
  private playerCallbacks: Set<(players: PlayerUpdate[]) => void> = new Set();
  private blockCallbacks: Set<(block: BlockUpdate) => void> = new Set();
  private chatCallbacks: Set<(msg: ChatMessage) => void> = new Set();
  private errorCallbacks: Set<(err: Error) => void> = new Set();
  private localPlayers: Map<string, PlayerUpdate> = new Map();
  private isConnected: boolean = false;
  private lastSentTime: number = 0;
  private pendingThrottleTimer: number | null = null;
  private lastSentPos = { x: 0, y: 0, z: 0, rotY: 0, anim: "" };

  constructor() {
    // Initialized lazily when join is called
  }

  public connect(uid: string, initialData: Omit<PlayerUpdate, "x" | "y" | "z" | "rotY">) {
    this.myUid = uid;
    this.myData = {
      ...initialData,
      x: 0,
      y: 9,
      z: 0,
      rotY: 0,
    };
    this.initSocket();
  }

  private initSocket() {
    if (typeof window === "undefined") return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?uid=${encodeURIComponent(this.myUid)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimer) {
          window.clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        if (this.myData) {
          this.send({ type: "join", player: this.myData });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          this.handleMessage(msg);
        } catch (e) {
          console.error("Failed to parse WS message:", e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket connection notice:", err);
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.myUid) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.initSocket();
    }, 3000);
  }

  private handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case "players":
        this.localPlayers.clear();
        for (const p of msg.players) {
          if (p.uid && p.uid !== this.myUid) {
            this.localPlayers.set(p.uid, p);
          }
        }
        this.notifyPlayers();
        break;

      case "player_joined":
      case "join":
        if (msg.player?.uid && msg.player.uid !== this.myUid) {
          const existing = this.localPlayers.get(msg.player.uid);
          this.localPlayers.set(msg.player.uid, { ...existing, ...msg.player });
          this.notifyPlayers();
        }
        break;

      case "position":
        if (msg.player?.uid && msg.player.uid !== this.myUid) {
          const existing = this.localPlayers.get(msg.player.uid);
          if (existing) {
            existing.x = msg.player.x;
            existing.y = msg.player.y;
            existing.z = msg.player.z;
            existing.rotY = msg.player.rotY;
            if (msg.player.anim) existing.anim = msg.player.anim;
            this.notifyPlayers();
          } else {
            this.localPlayers.set(msg.player.uid, msg.player);
            this.notifyPlayers();
          }
        }
        break;

      case "avatar_update":
      case "player_update":
        if (msg.player?.uid && msg.player.uid !== this.myUid) {
          const existing = this.localPlayers.get(msg.player.uid);
          this.localPlayers.set(msg.player.uid, { ...existing, ...msg.player });
          this.notifyPlayers();
        }
        break;

      case "player_left":
        this.localPlayers.delete(msg.uid);
        this.notifyPlayers();
        break;

      case "init_world":
        if (Array.isArray(msg.blocks)) {
          msg.blocks.forEach((b) => this.blockCallbacks.forEach((cb) => cb(b)));
        }
        break;

      case "block_update":
      case "block":
        if (msg.block) {
          this.blockCallbacks.forEach((cb) => cb(msg.block));
        }
        break;

      case "chat":
        this.chatCallbacks.forEach((cb) => cb(msg.message));
        break;
    }
  }

  private notifyPlayers() {
    const list = Array.from(this.localPlayers.values());
    this.playerCallbacks.forEach((cb) => cb(list));
  }

  public updatePresence(pos: { x: number; y: number; z: number; rotY: number; anim?: string }) {
    if (!this.myData) return;
    this.myData.x = pos.x;
    this.myData.y = pos.y;
    this.myData.z = pos.z;
    this.myData.rotY = pos.rotY;
    if (pos.anim) this.myData.anim = pos.anim;

    const now = performance.now();
    const dx = Math.abs(pos.x - this.lastSentPos.x);
    const dy = Math.abs(pos.y - this.lastSentPos.y);
    const dz = Math.abs(pos.z - this.lastSentPos.z);
    const dRot = Math.abs(pos.rotY - this.lastSentPos.rotY);
    const animChanged = pos.anim !== this.lastSentPos.anim;

    // Send immediately if large delta, animation changed, or throttle window elapsed
    const elapsed = now - this.lastSentTime;
    const isSignificant = dx > 0.6 || dy > 0.6 || dz > 0.6 || dRot > 0.3 || animChanged;

    if (elapsed >= 45 || isSignificant) {
      if (this.pendingThrottleTimer) {
        window.clearTimeout(this.pendingThrottleTimer);
        this.pendingThrottleTimer = null;
      }
      this.flushPresence();
    } else if (!this.pendingThrottleTimer) {
      this.pendingThrottleTimer = window.setTimeout(() => {
        this.pendingThrottleTimer = null;
        this.flushPresence();
      }, 45 - elapsed);
    }
  }

  private flushPresence() {
    if (!this.myData) return;
    this.lastSentTime = performance.now();
    this.lastSentPos = {
      x: this.myData.x,
      y: this.myData.y,
      z: this.myData.z,
      rotY: this.myData.rotY,
      anim: this.myData.anim || "",
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: "position", player: this.myData });
    }
  }

  public updateAvatar(avatar: {
    avatarSnapshot?: Partial<AvatarSnapshot>;
    gender?: "male" | "female";
  }) {
    if (!this.myData) return;
    if (avatar.avatarSnapshot) this.myData.avatarSnapshot = avatar.avatarSnapshot;
    if (avatar.gender) this.myData.gender = avatar.gender;

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: "avatar_update", player: this.myData });
    }
  }

  public sendBlockUpdate(block: Omit<BlockUpdate, "updatedBy">) {
    const payload: BlockUpdate = { ...block, updatedBy: this.myUid };
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: "block_update", block: payload });
    }
    this.blockCallbacks.forEach((cb) => cb(payload));
  }

  public sendChatMessage(text: string) {
    if (!this.myData) return;
    const msg: ChatMessage = {
      uid: this.myUid,
      name: this.myData.name,
      text,
      at: Date.now(),
    };
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: "chat", message: msg });
    }
    this.chatCallbacks.forEach((cb) => cb(msg));
  }

  private send(data: unknown) {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(data));
      }
    } catch (e) {
      console.error("Error sending WS message:", e);
    }
  }

  public onPlayers(cb: (players: PlayerUpdate[]) => void): () => void {
    this.playerCallbacks.add(cb);
    return () => this.playerCallbacks.delete(cb);
  }

  public onBlock(cb: (block: BlockUpdate) => void): () => void {
    this.blockCallbacks.add(cb);
    return () => this.blockCallbacks.delete(cb);
  }

  public onChat(cb: (msg: ChatMessage) => void): () => void {
    this.chatCallbacks.add(cb);
    return () => this.chatCallbacks.delete(cb);
  }

  public disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const sandboxSocket = new SandboxSocket();
