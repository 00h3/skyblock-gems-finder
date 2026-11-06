import { WelcomeScreen } from '@/components/ui/onboarding-welcome-screen';
import { WarpText } from '@/components/ui/WarpText';
import { toast } from 'sonner';

export const WelcomeScreenDemo = () => {
  // Handlers for button clicks
  const handleGetStarted = () => {
    toast.success('Get Started button clicked!');
  };

  const handleLogin = () => {
    toast.info('Login link clicked!');
  };

  return (
    <div className="relative mx-auto my-12 h-[812px] w-[975px] max-w-sm overflow-hidden rounded-3xl border border-slate-200 shadow-xl bg-white">
      <WelcomeScreen
        imageUrl="https://maxwell.z3ki.dev/bot/_files/floating-islands/floating-islands.png"
        title={
          <WarpText
            text="Welcome to QBLOCK"
            warpStrength={0.08}
            warpScale={1.7}
            speed={0.55}
            lens="bulge"
            pointerInfluence={0.42}
            pointerStrength={0.38}
            refraction={0.018}
            chromatic={0.32}
            idleDrift={0.25}
            ripple
            clickRipple
            intro
            fontSize="clamp(1.75rem, 5.5vw, 2.5rem)"
            fontWeight={900}
            letterSpacing="-0.04em"
            color="#0f172a"
            style={{ height: '64px', width: '100%', maxWidth: '340px', margin: '0 auto' }}
          />
        }
        description="Discover, build, and explore voxel worlds and minigames effortlessly with QBLOCK."
        buttonText="Let's get started"
        onButtonClick={handleGetStarted}
        secondaryActionText={
          <>
            Already have an account? <span className="font-semibold text-orange-500">Login Now</span>
          </>
        }
        onSecondaryActionClick={handleLogin}
      />
    </div>
  );
};

export default WelcomeScreenDemo;
