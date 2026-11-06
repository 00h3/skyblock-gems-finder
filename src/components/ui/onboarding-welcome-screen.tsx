import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
 * It uses framer-motion for animations and is styled with shadcn/ui theme variables.
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
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
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
    hidden: { y: -50, opacity: 0 },
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
        'flex h-full w-full flex-col items-center justify-between bg-white text-slate-900',
        className
      )}
    >
      {/* Top Image Section with a curved clip-path */}
      <motion.div 
        className="relative w-full overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={imageVariants}
      >
        <img
          src={imageUrl}
          alt="Welcome"
          className="h-auto max-h-[380px] w-full object-cover"
          style={{ clipPath: 'ellipse(100% 60% at 50% 40%)' }}
        />
        {/* Subtle orange gradient light at the bottom curve */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none" />
      </motion.div>

      {/* Content Section */}
      <motion.div
        className="flex flex-1 flex-col items-center justify-center space-y-4 px-8 py-4 text-center z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Title */}
        <motion.h1
          className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl"
          variants={itemVariants}
        >
          {title}
        </motion.h1>

        {/* Description */}
        <motion.p
          className="max-w-md text-[14.5px] font-medium text-slate-600 leading-relaxed"
          variants={itemVariants}
        >
          {description}
        </motion.p>

        {children}
      </motion.div>
      
      {/* Actions Section */}
      <motion.div 
        className="w-full space-y-3.5 px-8 pb-8 pt-2 z-10 max-w-sm mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Primary Button with Uiverse glossiness */}
        <motion.div variants={itemVariants}>
          <Button
            onClick={onButtonClick}
            className="w-full h-[52px] rounded-[14px] font-black uppercase tracking-wider text-[14.5px] shadow-[0_6px_20px_rgba(234,88,12,0.35)] active:scale-[0.98] transition-all bg-gradient-to-b from-[#ff8533] via-[#ea580c] to-[#c2410c] text-white border border-[#ffedd5]/50 relative overflow-hidden"
            size="lg"
          >
            {/* Glossy top specular reflection */}
            <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-[14px]" />
            <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
              {buttonText}
            </span>
          </Button>
        </motion.div>

        {/* Secondary Action Link / Button */}
        {secondaryActionText && onSecondaryActionClick && (
          <motion.div variants={itemVariants} className="text-center pt-1">
            <Button
              variant="link"
              onClick={onSecondaryActionClick}
              className="text-sm font-semibold text-slate-600 hover:text-orange-600 cursor-pointer transition-colors"
            >
              {secondaryActionText}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
