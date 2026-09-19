export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>QBlock — Connecting</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        background: #ffffff;
        color: #17181b;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 1.5rem;
      }
      .card {
        max-width: 380px;
        width: 100%;
        text-align: center;
        padding: 2.5rem 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        background: #ffffff;
        border-radius: 20px;
      }
      .logo {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.8px;
        color: #141414;
      }
      .desc {
        font-size: 13.5px;
        color: #64748b;
        line-height: 1.5;
      }
      .spinner {
        width: 36px;
        height: 36px;
        animation: spin 0.85s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        width: 100%;
        margin-top: 0.5rem;
      }
      button, a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 46px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        transition: transform 0.1s ease, opacity 0.15s ease;
      }
      button:active, a:active { transform: scale(0.98); }
      .primary {
        background: #f4b400;
        color: #171717;
        box-shadow: 0 2px 0 #c48f00, 0 4px 12px rgba(244, 180, 0, 0.25);
      }
      .secondary {
        background: #f1f5f9;
        color: #334155;
        border-color: #e2e8f0;
      }
      .ghost {
        background: transparent;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 600;
        height: 36px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <svg class="spinner" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#e2e8f0" stroke-width="3" />
        <path d="M12 3a9 9 0 0 1 9 9" stroke="#f4b400" stroke-width="3" stroke-linecap="round" />
      </svg>
      <div>
        <div class="logo">QBlock</div>
        <p class="desc" id="status-msg">Connecting to world servers…</p>
      </div>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try Again</button>
        <a class="secondary" href="/">Go Home</a>
        <button class="ghost" onclick="clearAndReset()">Clear Cache & Restart</button>
      </div>
    </div>
    <script>
      (function() {
        var key = "qb_ssr_auto_retry";
        var count = parseInt(sessionStorage.getItem(key) || "0", 10);
        if (count < 2) {
          sessionStorage.setItem(key, String(count + 1));
          setTimeout(function() {
            window.location.reload();
          }, 800);
        } else {
          sessionStorage.removeItem(key);
          var el = document.getElementById("status-msg");
          if (el) el.textContent = "Server response was interrupted. Click below to reconnect.";
        }
      })();
      function clearAndReset() {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch(e) {}
        window.location.href = "/";
      }
    </script>
  </body>
</html>`;
}
