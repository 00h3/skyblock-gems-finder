import { WelcomeScreen } from '@/components/ui/onboarding-welcome-screen';
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
        imageUrl="https://cdn.21st.dev/assets/mirror/40/40f15003fc3dd37a91023fe2649e7a0602bc689f6cfc68c08b52fb37077c6c93.jpg"
        title={
          <>
            Welcome To <span className="text-orange-500">QBLOCK</span>
          </>
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
