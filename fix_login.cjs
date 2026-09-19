const fs = require("fs");

const loginScreenContent = `
function LoginScreen({
  onBack,
  onForgot,
  onSignup,
}: {
  onBack: () => void;
  onForgot: () => void;
  onSignup: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please fill out all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await qbLogin(identifier.trim(), password);
      nav({ to: "/chat" as never });
    } catch (err: unknown) {
      const message = humanize(err, "Login failed.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-dvh overflow-y-auto ios-scroll">
      {/* Top Header with Back button */}
      <div className="px-5 pt-[max(36px,env(safe-area-inset-top))] pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="press w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 pb-[max(32px,env(safe-area-inset-bottom))]">
        <div className="mb-8">
          <BlurReveal
            delay={0.1}
            duration={0.7}
            className="text-[34px] font-inter-black text-[#17191d] leading-tight tracking-tight mb-2"
          >
            Welcome back
          </BlurReveal>
          <BlurReveal delay={0.2} duration={0.7} className="text-[15px] font-inter text-slate-500">
            Enter your credentials to access your account
          </BlurReveal>
        </div>
        {error && (
          <div className="mb-6 p-3 rounded-[12px] bg-red-50 border border-red-100 text-[13px] font-inter-bold text-red-600 animate-in fade-in zoom-in-95 duration-200">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Account Identifier
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <UserSpeakIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Username or email address"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Security Key
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <PasswordKeyIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter pr-10"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <SvgEyeClosed className="w-4 h-4" /> : <SvgEyeOpen className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onForgot}
              className="text-[12.5px] font-inter-bold text-[#ff7043] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="pt-4">
            <OrangeSignInButton type="submit" loading={loading} onClick={() => {}}>
              Login securely
            </OrangeSignInButton>
          </div>
        </form>
        <p className="mt-6 text-center text-[13.5px] text-slate-600">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSignup}
            className="font-inter-bold text-[#ff7043] hover:underline"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}

function SignupScreen({
  onBack,
  onLogin,
}: {
  onBack: () => void;
  onLogin: () => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function handleSignup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill out all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await qbSignup(email.trim(), password, username.trim());
      nav({ to: "/chat" as never });
    } catch (err: unknown) {
      const message = humanize(err, "Signup failed.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-dvh overflow-y-auto ios-scroll">
      <div className="px-5 pt-[max(36px,env(safe-area-inset-top))] pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="press w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 pb-[max(32px,env(safe-area-inset-bottom))]">
        <div className="mb-8">
          <BlurReveal
            delay={0.1}
            duration={0.7}
            className="text-[34px] font-inter-black text-[#17191d] leading-tight tracking-tight mb-2"
          >
            Join QBLOCK
          </BlurReveal>
          <BlurReveal delay={0.2} duration={0.7} className="text-[15px] font-inter text-slate-500">
            Create an account to start playing.
          </BlurReveal>
        </div>
        {error && (
          <div className="mb-6 p-3 rounded-[12px] bg-red-50 border border-red-100 text-[13px] font-inter-bold text-red-600 animate-in fade-in zoom-in-95 duration-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Username
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <UserSpeakIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Email Address
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <MailForwardIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter"
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Security Key
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <PasswordKeyIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter pr-10"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <SvgEyeClosed className="w-4 h-4" /> : <SvgEyeOpen className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="pt-4">
            <OrangeSignInButton type="submit" loading={loading} onClick={() => {}}>
              Create Account
            </OrangeSignInButton>
          </div>
        </form>
        <p className="mt-6 text-center text-[13.5px] text-slate-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onLogin}
            className="font-inter-bold text-[#ff7043] hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
`;

const file = fs.readFileSync("src/routes/login.tsx", "utf8");

// The file currently has function LoginScreen up to "Create one          </button>        </p>      </div>    </div>  );}" and then "function ForgotScreen"
// We need to replace everything from "function LoginScreen" down to just before "function ForgotScreen"

const startIndex = file.indexOf("function LoginScreen({");
const endIndex = file.indexOf("function ForgotScreen({");

if (startIndex !== -1 && endIndex !== -1) {
  const newFile =
    file.slice(0, startIndex) +
    loginScreenContent +
    "\n\n// ── Screen 4: Forgot Password ───────────────────────────────────────────────\n" +
    file.slice(endIndex);
  fs.writeFileSync("src/routes/login.tsx", newFile);
  console.log("Restored Login and Signup screens");
} else {
  console.log("Could not find boundaries");
}
