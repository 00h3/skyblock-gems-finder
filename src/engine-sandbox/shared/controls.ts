/**
 * Pointer-lock look + keyboard input, with a public state object the game
 * loop reads each frame. Touch input is driven by the React UI which writes
 * into `touch` directly.
 */

export type ControlsState = {
  forward: number;
  strafe: number;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  yaw: number;
  pitch: number;
  locked: boolean;
};

export class Controls {
  state: ControlsState = {
    forward: 0,
    strafe: 0,
    jump: false,
    sprint: false,
    crouch: false,
    yaw: 0,
    pitch: 0,
    locked: false,
  };
  touch = { x: 0, y: 0, jump: false, sprint: false, crouch: false };
  sensitivity = 0.0022;
  onSlot?: (index: number) => void;
  onDrop?: () => void;
  onLockChange?: (locked: boolean) => void;
  onAction?: (kind: "break" | "place") => void;
  /** Held-button state: hold left = mine, hold right = place (with cooldown). */
  holding = { break: false, place: false };

  private keys = new Set<string>();
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("mousemove", this.onMouseMove);
    el.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("blur", this.onBlur);
  }

  requestLock() {
    this.el.requestPointerLock?.();
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private onBlur = () => {
    this.keys.clear();
    this.holding.break = false;
    this.holding.place = false;
  };

  private onPointerLockChange = () => {
    this.state.locked = document.pointerLockElement === this.el;
    this.onLockChange?.(this.state.locked);
    if (!this.state.locked) {
      this.keys.clear();
      this.holding.break = false;
      this.holding.place = false;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.state.locked) return;
    this.state.yaw -= e.movementX * this.sensitivity;
    this.state.pitch -= e.movementY * this.sensitivity;
    const lim = Math.PI / 2 - 0.001;
    this.state.pitch = Math.max(-lim, Math.min(lim, this.state.pitch));
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.state.locked) return;
    if (e.button === 0) this.holding.break = true;
    else if (e.button === 2) this.holding.place = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.holding.break = false;
    else if (e.button === 2) this.holding.place = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") return;
    this.keys.add(e.code);
    if (e.code.startsWith("Digit")) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 9) this.onSlot?.(n - 1);
    }
    if (e.code === "KeyQ" && !e.repeat) {
      this.onDrop?.();
    }
    if (e.code === "Space") e.preventDefault();
    this.sync();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    this.sync();
  };

  private sync() {
    const k = this.keys;
    let f = 0;
    let s = 0;
    if (k.has("KeyW") || k.has("ArrowUp")) f += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) f -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) s += 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) s -= 1;
    this.state.forward = f;
    this.state.strafe = s;
    this.state.jump = k.has("Space");
    this.state.sprint = k.has("KeyR");
    this.state.crouch = k.has("ShiftLeft") || k.has("ShiftRight") || k.has("KeyC");
  }

  /** Merge keyboard + touch each frame. */
  read(): ControlsState {
    const st = this.state;
    return {
      ...st,
      forward: Math.max(-1, Math.min(1, st.forward + this.touch.y)),
      strafe: Math.max(-1, Math.min(1, st.strafe + this.touch.x)),
      jump: st.jump || this.touch.jump,
      sprint: st.sprint || this.touch.sprint,
      crouch: st.crouch || this.touch.crouch,
    };
  }

  /** Touch look (dragging on the right half of the screen). */
  look(dx: number, dy: number) {
    this.state.yaw -= dx * 0.0045;
    this.state.pitch -= dy * 0.0045;
    const lim = Math.PI / 2 - 0.001;
    this.state.pitch = Math.max(-lim, Math.min(lim, this.state.pitch));
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    document.removeEventListener("mousemove", this.onMouseMove);
    this.el.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("blur", this.onBlur);
  }
}
