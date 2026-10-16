export type MultiplayerRoom = "sandbox" | "bedwars" | "skyblock" | "blockfall" | "golden-days";

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

type ConnectionStatus = "connecting" | "connected" | "disconnected";
type ServerMessage =
  | { type: "joined"; room: string; uid: string }
  | { type: "error"; message: string }
  | { type: "players"; players: PlayerUpdate[] }
  | { type: "player_joined" | "join"; player: PlayerUpdate }
  | { type: "position" | "player_update" | "avatar_update"; player: PlayerUpdate }
  | { type: "player_left"; uid: string }
  | { type: "block_update" | "block"; block: BlockUpdate }
  | { type: "chat"; message: ChatMessage }
  | { type: "init_world"; blocks: BlockUpdate[] };

const POSITION_SEND_INTERVAL_MS = 50;
const MAX_PENDING_BLOCKS = 2000;

export class SandboxSocket {
  private ws: WebSocket | null = null;
  private roomId: MultiplayerRoom | null = null;
  private myUid = "";
  private myData: PlayerUpdate | null = null;
  private shouldReconnect = false;
  private isJoined = false;
  private reconnectTimer: number | null = null;
  private reconnectDelay = 500;
  private lastSentTime = 0;
  private lastSentPos = { x: 0, y: 0, z: 0, rotY: 0 };
  private pendingBlocks = new Map<string, BlockUpdate>();
  private localPlayers = new Map<string, PlayerUpdate>();
  private playerCallbacks = new Set<(players: PlayerUpdate[]) => void>();
  private blockCallbacks = new Set<(block: BlockUpdate) => void>();
  private chatCallbacks = new Set<(message: ChatMessage) => void>();
  private statusCallbacks = new Set<(status: ConnectionStatus) => void>();
  private errorCallbacks = new Set<(error: Error) => void>();

  connect(roomId: MultiplayerRoom, player: PlayerUpdate) {
    this.stopConnection();
    this.roomId = roomId;
    this.myUid = player.uid;
    this.myData = { ...player };
    this.localPlayers.clear();
    this.pendingBlocks.clear();
    this.reconnectDelay = 500;
    this.shouldReconnect = true;
    this.notifyPlayers();
    this.initSocket();
  }

  private initSocket() {
    if (typeof window === "undefined" || !this.shouldReconnect || !this.roomId || !this.myUid) {
      return;
    }

    this.notifyStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(this.roomId)}`;

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket || !this.shouldReconnect || !this.myData) {
          socket.close();
          return;
        }
        socket.send(JSON.stringify({ type: "join", room: this.roomId, player: this.myData }));
      };

      socket.onmessage = (event) => {
        try {
          this.handleMessage(JSON.parse(event.data) as ServerMessage);
        } catch {
          this.notifyError(new Error("The multiplayer server sent an invalid message."));
        }
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.ws = null;
        this.isJoined = false;
        this.notifyStatus("disconnected");
        this.scheduleReconnect();
      };

      socket.onerror = () => {
        this.notifyError(new Error("Could not reach the multiplayer WebSocket server."));
      };
    } catch {
      this.notifyError(new Error("Could not open the multiplayer WebSocket connection."));
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null || !this.shouldReconnect || typeof window === "undefined") return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(15_000, this.reconnectDelay * 2);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.initSocket();
    }, delay);
  }

  private handleMessage(message: ServerMessage) {
    switch (message.type) {
      case "joined":
        this.isJoined = true;
        this.reconnectDelay = 500;
        this.notifyStatus("connected");
        for (const block of this.pendingBlocks.values()) {
          this.send({ type: "block_update", block });
        }
        this.pendingBlocks.clear();
        break;
      case "error":
        this.notifyError(new Error(message.message));
        break;
      case "players":
        this.localPlayers.clear();
        for (const player of message.players) {
          if (player.uid && player.uid !== this.myUid) this.localPlayers.set(player.uid, player);
        }
        this.notifyPlayers();
        break;
      case "player_joined":
      case "join":
        if (message.player?.uid && message.player.uid !== this.myUid) {
          this.localPlayers.set(message.player.uid, {
            ...this.localPlayers.get(message.player.uid),
            ...message.player,
          });
          this.notifyPlayers();
        }
        break;
      case "position":
      case "player_update":
      case "avatar_update":
        if (message.player?.uid && message.player.uid !== this.myUid) {
          this.localPlayers.set(message.player.uid, {
            ...this.localPlayers.get(message.player.uid),
            ...message.player,
          });
          this.notifyPlayers();
        }
        break;
      case "player_left":
        this.localPlayers.delete(message.uid);
        this.notifyPlayers();
        break;
      case "init_world":
        if (Array.isArray(message.blocks)) {
          for (const block of message.blocks) this.notifyBlock(block);
        }
        break;
      case "block_update":
      case "block":
        this.notifyBlock(message.block);
        break;
      case "chat":
        this.chatCallbacks.forEach((callback) => callback(message.message));
        break;
    }
  }

  private notifyPlayers() {
    const players = Array.from(this.localPlayers.values());
    this.playerCallbacks.forEach((callback) => callback(players));
  }

  private notifyBlock(block: BlockUpdate) {
    this.blockCallbacks.forEach((callback) => callback(block));
  }

  private notifyStatus(status: ConnectionStatus) {
    this.statusCallbacks.forEach((callback) => callback(status));
  }

  private notifyError(error: Error) {
    this.errorCallbacks.forEach((callback) => callback(error));
  }

  updatePresence(position: { x: number; y: number; z: number; rotY: number; anim?: string }) {
    if (!this.myData) return;
    this.myData = { ...this.myData, ...position };

    const now = performance.now();
    const movedEnough =
      Math.abs(position.x - this.lastSentPos.x) > 0.25 ||
      Math.abs(position.y - this.lastSentPos.y) > 0.25 ||
      Math.abs(position.z - this.lastSentPos.z) > 0.25 ||
      Math.abs(position.rotY - this.lastSentPos.rotY) > 0.25;
    if (now - this.lastSentTime < POSITION_SEND_INTERVAL_MS && !movedEnough) return;
    if (!this.isJoined) return;

    this.lastSentTime = now;
    this.lastSentPos = {
      x: position.x,
      y: position.y,
      z: position.z,
      rotY: position.rotY,
    };
    this.send({ type: "position", player: this.myData });
  }

  updateAvatar(avatar: { photo?: string; frame?: string; badges?: string[] }) {
    if (!this.myData) return;
    this.myData = { ...this.myData, ...avatar };
    this.send({ type: "avatar_update", player: this.myData });
  }

  sendBlockUpdate(change: Omit<BlockUpdate, "updatedBy">) {
    const block: BlockUpdate = { ...change, updatedBy: this.myUid };
    this.notifyBlock(block);

    if (!this.isJoined || !this.send({ type: "block_update", block })) {
      this.pendingBlocks.set(`${block.x},${block.y},${block.z}`, block);
      while (this.pendingBlocks.size > MAX_PENDING_BLOCKS) {
        this.pendingBlocks.delete(this.pendingBlocks.keys().next().value!);
      }
    }
  }

  sendChatMessage(text: string) {
    if (!this.myData) return;
    const message: ChatMessage = {
      uid: this.myUid,
      name: this.myData.name,
      text: text.slice(0, 300),
      at: Date.now(),
    };
    this.send({ type: "chat", message });
    this.chatCallbacks.forEach((callback) => callback(message));
  }

  private send(message: unknown) {
    if (!this.isJoined || !this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  onPlayers(callback: (players: PlayerUpdate[]) => void) {
    this.playerCallbacks.add(callback);
    callback(Array.from(this.localPlayers.values()));
    return () => this.playerCallbacks.delete(callback);
  }

  onBlock(callback: (block: BlockUpdate) => void) {
    this.blockCallbacks.add(callback);
    return () => this.blockCallbacks.delete(callback);
  }

  onChat(callback: (message: ChatMessage) => void) {
    this.chatCallbacks.add(callback);
    return () => this.chatCallbacks.delete(callback);
  }

  onStatus(callback: (status: ConnectionStatus) => void) {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  onError(callback: (error: Error) => void) {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopConnection();
    this.roomId = null;
    this.myUid = "";
    this.myData = null;
    this.pendingBlocks.clear();
    this.localPlayers.clear();
    this.notifyPlayers();
    this.notifyStatus("disconnected");
  }

  private stopConnection() {
    if (this.reconnectTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = null;
    const socket = this.ws;
    this.ws = null;
    this.isJoined = false;
    if (socket) socket.close(1000, "Leaving multiplayer room");
  }
}
