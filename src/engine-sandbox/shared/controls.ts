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
  sensitivity = 0.0032;
  sensitivityX = 0.0032;
  sensitivityY = 0.0032;
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
    this.reloadSensitivity();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("mousemove", this.onMouseMove);
    el.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("bm-sensitivity", this.onSensEvent as any);
    window.addEventListener("bm-cam-sensitivity", this.onSensEvent as any);
    window.addEventListener("bm-cam-sens-x", this.onSensXEvent as any);
    window.addEventListener("bm-cam-sens-y", this.onSensYEvent as any);
  }

  reloadSensitivity() {
    try {
      const savedSens = localStorage.getItem("qb_cam_sensitivity") || localStorage.getItem("bm-cam-sensitivity");
      const savedSensX = localStorage.getItem("qb_cam_sens_x") || localStorage.getItem("bm-cam-sens-x");
      const savedSensY = localStorage.getItem("qb_cam_sens_y") || localStorage.getItem("bm-cam-sens-y");

      let base = 1.0;
      if (savedSens) {
        const parsed = Number(savedSens);
        if (Number.isFinite(parsed) && parsed > 0) base = parsed > 5 ? parsed / 50 : parsed;
      }
      this.sensitivity = 0.0032 * base;

      let multX = 1.0;
      if (savedSensX) {
        const parsedX = Number(savedSensX);
        if (Number.isFinite(parsedX) && parsedX > 0) multX = parsedX > 5 ? parsedX / 50 : parsedX;
      }
      this.sensitivityX = this.sensitivity * multX;

      let multY = 1.0;
      if (savedSensY) {
        const parsedY = Number(savedSensY);
        if (Number.isFinite(parsedY) && parsedY > 0) multY = parsedY > 5 ? parsedY / 50 : parsedY;
      }
      this.sensitivityY = this.sensitivity * multY;
    } catch {}
  }

  private onSensEvent = (e: CustomEvent) => {
    const val = typeof e.detail === "number" ? e.detail : Number(e.detail);
    if (Number.isFinite(val) && val > 0) {
      const base = val > 5 ? val / 50 : val;
      this.sensitivity = 0.0032 * base;
      this.sensitivityX = this.sensitivity;
      this.sensitivityY = this.sensitivity;
    }
  };

  private onSensXEvent = (e: CustomEvent) => {
    const val = typeof e.detail === "number" ? e.detail : Number(e.detail);
    if (Number.isFinite(val) && val > 0) {
      const multX = val > 5 ? val / 50 : val;
      this.sensitivityX = this.sensitivity * multX;
    }
  };

  private onSensYEvent = (e: CustomEvent) => {
    const val = typeof e.detail === "number" ? e.detail : Number(e.detail);
    if (Number.isFinite(val) && val > 0) {
      const multY = val > 5 ? val / 50 : val;
      this.sensitivityY = this.sensitivity * multY;
    }
  };

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
    this.state.yaw -= e.movementX * this.sensitivityX;
    this.state.pitch -= e.movementY * this.sensitivityY;
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

  /** Merge keyboard + touch each frame with 360° unit-circle vector normalization. */
  read(): ControlsState {
    const st = this.state;
    let f = st.forward;
    let s = st.strafe;

    if (this.touch.x !== 0 || this.touch.y !== 0) {
      const mag = Math.hypot(this.touch.x, this.touch.y);
      if (mag > 0.001) {
        const clampedMag = Math.min(1.0, mag);
        const scale = clampedMag / mag;
        f += this.touch.y * scale;
        s += this.touch.x * scale;
      }
    }

    const totalMag = Math.hypot(f, s);
    if (totalMag > 1.0) {
      f /= totalMag;
      s /= totalMag;
    }

    return {
      ...st,
      forward: f,
      strafe: s,
      jump: st.jump || this.touch.jump,
      sprint: st.sprint || this.touch.sprint,
      crouch: st.crouch || this.touch.crouch,
    };
  }

  /** Touch look (dragging on the right half of the screen). Highly responsive and agile for PvP. */
  look(dx: number, dy: number) {
    let invX = 1;
    let invY = 1;
    try {
      if (localStorage.getItem("bm-invert-joy-x") === "true") invX = -1;
      if (localStorage.getItem("bm-invert-joy-y") === "true") invY = -1;
    } catch {}
    const sensX = this.sensitivityX * 2.8;
    const sensY = this.sensitivityY * 2.8;
    this.state.yaw -= dx * sensX * invX;
    this.state.pitch -= dy * sensY * invY;
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
    window.removeEventListener("bm-sensitivity", this.onSensEvent as any);
    window.removeEventListener("bm-cam-sensitivity", this.onSensEvent as any);
    window.removeEventListener("bm-cam-sens-x", this.onSensXEvent as any);
    window.removeEventListener("bm-cam-sens-y", this.onSensYEvent as any);
  }
}
