import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WarpText } from '@/components/ui/WarpText';

// Define the props for the WelcomeScreen component
export interface WelcomeScreenProps {
  imageUrl: string;
  title: React.ReactNode;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
  secondaryActionText?: React.ReactNode;
  onSecondaryActionClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A responsive and animated welcome screen component.
 * Features curved ellipse hero image and the glossy squircle button (unfriend-style with black text).
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  imageUrl,
  title,
  description,
  buttonText,
  onButtonClick,
  secondaryActionText,
  onSecondaryActionClick,
  className,
  children,
}) => {
  // Animation variants for the container and its children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.18,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 18, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };
  
  const imageVariants = {
    hidden: { y: -40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        duration: 0.8,
      },
    },
  };

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-between bg-transparent text-slate-900',
        className
      )}
    >
      {/* Top Image Section with signature curved ellipse clip-path — expanded larger for maximum visual presence */}
      <motion.div 
        className="relative w-full overflow-hidden shrink-0"
        initial="hidden"
        animate="visible"
        variants={imageVariants}
      >
        <img
          src={imageUrl}
          alt="Welcome"
          className="w-full h-[48dvh] min-h-[360px] max-h-[480px] object-cover object-center select-none"
          style={{ clipPath: 'ellipse(110% 72% at 50% 34%)' }}
        />
        {/* Subtle orange warm fade gradient at the bottom curve */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none" />
      </motion.div>

      {/* Content Section positioned more in the down */}
      <motion.div
        className="flex flex-1 flex-col items-center justify-end space-y-2.5 px-8 pt-4 pb-2 text-center z-10 max-w-sm mx-auto w-full"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Title */}
        <motion.div className="w-full flex items-center justify-center" variants={itemVariants}>
          {typeof title === 'string' ? (
            <WarpText
              text={title}
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
              fontSize="clamp(1.85rem, 6vw, 2.6rem)"
              fontWeight={900}
              letterSpacing="-0.04em"
              color="#0f172a"
              style={{ height: '64px', width: '100%', maxWidth: '340px', margin: '0 auto' }}
            />
          ) : (
            <div className="w-full flex items-center justify-center">{title}</div>
          )}
        </motion.div>

        {/* Description */}
        <motion.p
          className="max-w-md text-[13.5px] font-semibold text-slate-600 leading-relaxed"
          variants={itemVariants}
        >
          {description}
        </motion.p>

        {children}
      </motion.div>
      
      {/* Actions Section */}
      <motion.div 
        className="w-full space-y-3 px-8 pb-8 pt-2 z-10 max-w-sm mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Primary Button: unfriend-style glossy squircle with bold black text */}
        <motion.div variants={itemVariants}>
          <button
            type="button"
            onClick={onButtonClick}
            className="qb-squircle press relative w-full h-[52px] rounded-[14px] flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform overflow-hidden shadow-[0_6px_18px_rgba(23,24,27,0.08),inset_1px_1px_0_rgba(255,255,255,0.98)] border border-black/[0.12] bg-gradient-to-b from-white via-[#fafbfc] to-[#f0f3f6]"
          >
            {/* Top specular highlight reflection */}
            <span className="absolute inset-x-0 top-0 h-[48%] pointer-events-none rounded-t-[14px] bg-gradient-to-b from-white/90 via-white/30 to-transparent z-10" />
            <span className="absolute inset-0 rounded-[14px] pointer-events-none ring-1 ring-inset ring-white/80 z-10" />

            {/* Black text */}
            <span className="relative z-20 font-black uppercase tracking-wider text-[14.5px] text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
              {buttonText}
            </span>
          </button>
        </motion.div>

        {/* Secondary Action Link */}
        {secondaryActionText && onSecondaryActionClick && (
          <motion.div variants={itemVariants} className="text-center pt-1">
            <button
              type="button"
              onClick={onSecondaryActionClick}
              className="text-sm font-semibold text-slate-600 hover:text-[#fa4616] cursor-pointer transition-colors bg-transparent border-none p-0 outline-none"
            >
              {secondaryActionText}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
