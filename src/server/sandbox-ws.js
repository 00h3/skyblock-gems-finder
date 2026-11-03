import { WebSocket, WebSocketServer } from "ws";

const VALID_ROOMS = new Set(["sandbox", "bedwars", "skyblock", "blockfall", "golden-days"]);
const MAX_MESSAGE_BYTES = 16 * 1024;
const MAX_CACHED_BLOCKS = 2000;
const PLAYER_TIMEOUT_MS = 30_000;
const HEARTBEAT_MS = 15_000;
const attachedServers = new WeakMap();

function send(socket, message) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function normalizePlayer(raw, uid, previous = {}) {
  if (!raw || typeof raw !== "object") return null;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const z = Number(raw.z);
  const rotY = Number(raw.rotY ?? 0);
  if (![x, y, z, rotY].every(Number.isFinite)) return null;

  return {
    ...previous,
    uid,
    name: typeof raw.name === "string" ? raw.name.slice(0, 48) : previous.name || "Player",
    photo: typeof raw.photo === "string" ? raw.photo.slice(0, 2048) : previous.photo || "",
    frame: typeof raw.frame === "string" ? raw.frame.slice(0, 96) : previous.frame || "none",
    badges: Array.isArray(raw.badges)
      ? raw.badges.filter((badge) => typeof badge === "string").slice(0, 16).map((badge) => badge.slice(0, 256))
      : previous.badges || [],
    x,
    y,
    z,
    rotY,
  };
}

function normalizeBlock(raw, uid) {
  if (!raw || typeof raw !== "object") return null;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const z = Number(raw.z);
  const id = Number(raw.id);
  if (![x, y, z, id].every(Number.isFinite) || ![x, y, z, id].every(Number.isInteger)) return null;
  if (Math.abs(x) > 100_000 || y < 0 || y > 512 || Math.abs(z) > 100_000 || id < 0 || id > 512) {
    return null;
  }
  return { x, y, z, id, updatedBy: uid };
}

function roomFor(rooms, roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = { players: new Map(), blocks: new Map() };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcast(room, except, message) {
  const payload = JSON.stringify(message);
  for (const { socket } of room.players.values()) {
    if (socket !== except && socket.readyState === WebSocket.OPEN) socket.send(payload);
  }
}

function removePlayer(socket, connections, rooms) {
  const state = connections.get(socket);
  if (!state) return;
  connections.delete(socket);

  const room = rooms.get(state.roomId);
  const current = room?.players.get(state.uid);
  if (current?.socket !== socket) return;

  room.players.delete(state.uid);
  broadcast(room, socket, { type: "player_left", uid: state.uid });
}

/**
 * Attach the same-room WebSocket protocol to a Node HTTP server. Used by both
 * Vite's development server and the production Node entry point.
 */
export function attachSandboxWebSocketServer(httpServer) {
  const attached = attachedServers.get(httpServer);
  if (attached) return attached;

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  const connections = new Map();
  const rooms = new Map();
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms) {
      for (const [uid, player] of room.players) {
        if (now - player.lastSeen > PLAYER_TIMEOUT_MS) {
          player.socket.terminate();
          room.players.delete(uid);
          broadcast(room, player.socket, { type: "player_left", uid });
        }
      }
    }

    for (const socket of wss.clients) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  const onUpgrade = (request, socket, head) => {
    let pathname = "";
    try {
      pathname = new URL(request.url || "/", "http://localhost").pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== "/ws") return;

    wss.handleUpgrade(request, socket, head, (webSocket) => {
      wss.emit("connection", webSocket, request);
    });
  };
  httpServer.on("upgrade", onUpgrade);

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });
    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (!message || typeof message.type !== "string") return;

function isValidRoomId(roomId) {
  if (typeof roomId !== "string") return false;
  if (VALID_ROOMS.has(roomId)) return true;
  return /^(sandbox|bedwars|skyblock|blockfall|golden-days)(_.*)?$/.test(roomId);
}

        if (message.type === "join") {
          const roomId = typeof message.room === "string" ? message.room : "";
          const rawPlayer = message.player;
          const uid = typeof rawPlayer?.uid === "string" ? rawPlayer.uid.slice(0, 128) : "";
          const player = normalizePlayer(rawPlayer, uid);
          if (!isValidRoomId(roomId) || !uid || !player) {
            send(socket, { type: "error", message: "Invalid multiplayer room or player data." });
            return;
          }

          const oldState = connections.get(socket);
          if (oldState) removePlayer(socket, connections, rooms);

          const room = roomFor(rooms, roomId);
          const replaced = room.players.get(uid);
          if (replaced && replaced.socket !== socket) {
            connections.delete(replaced.socket);
            replaced.socket.close(4001, "Player reconnected");
          }

          connections.set(socket, { roomId, uid });
          room.players.set(uid, { socket, player, lastSeen: Date.now() });
          send(socket, {
            type: "players",
            players: Array.from(room.players.values(), (entry) => entry.player),
          });
          if (room.blocks.size > 0) {
            send(socket, { type: "init_world", blocks: Array.from(room.blocks.values()) });
          }
          send(socket, { type: "joined", room: roomId, uid });
          broadcast(room, socket, { type: "player_joined", player });
          return;
        }

        const state = connections.get(socket);
        if (!state) return;
        const room = rooms.get(state.roomId);
        const entry = room?.players.get(state.uid);
        if (!room || !entry || entry.socket !== socket) return;
        entry.lastSeen = Date.now();

        if (message.type === "position" || message.type === "player_update" || message.type === "avatar_update") {
          const player = normalizePlayer(message.player, state.uid, entry.player);
          if (!player) return;
          entry.player = player;
          broadcast(room, socket, { type: message.type, player });
        } else if (message.type === "block_update" || message.type === "block") {
          const block = normalizeBlock(message.block, state.uid);
          if (!block) return;
          const key = `${block.x},${block.y},${block.z}`;
          room.blocks.delete(key);
          room.blocks.set(key, block);
          while (room.blocks.size > MAX_CACHED_BLOCKS) {
            room.blocks.delete(room.blocks.keys().next().value);
          }
          broadcast(room, socket, { type: "block_update", block });
        } else if (message.type === "chat") {
          const text = typeof message.message?.text === "string" ? message.message.text.trim().slice(0, 300) : "";
          if (!text) return;
          broadcast(room, socket, {
            type: "chat",
            message: {
              uid: state.uid,
              name: entry.player.name,
              text,
              at: Date.now(),
            },
          });
        }
      } catch {
        send(socket, { type: "error", message: "Invalid multiplayer message." });
      }
    });
    socket.on("close", () => removePlayer(socket, connections, rooms));
    socket.on("error", () => removePlayer(socket, connections, rooms));
  });

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(heartbeat);
    httpServer.off("upgrade", onUpgrade);
    for (const socket of wss.clients) socket.close(1001, "Server shutting down");
    wss.close();
    attachedServers.delete(httpServer);
  };
  attachedServers.set(httpServer, cleanup);
  httpServer.once("close", cleanup);
  return cleanup;
}
