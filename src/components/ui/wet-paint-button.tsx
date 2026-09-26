import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type WetPaintButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  children: React.ReactNode;
};

const WetPaintButton = ({ children, className, type = "button", ...rest }: WetPaintButtonProps) => {
  return (
    <button
      type={type}
      className={cn(
        "group relative rounded bg-indigo-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300",
        className,
      )}
      {...rest}
    >
      {children}
      <Drip left="10%" height={24} delay={0.5} />
      <Drip left="30%" height={20} delay={3} />
      <Drip left="57%" height={10} delay={4.25} />
      <Drip left="85%" height={16} delay={1.5} />
    </button>
  );
};

type DripProps = {
  left: string;
  height: number;
  delay: number;
};

const DripCurve = ({ className }: { className: string }) => (
  <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.4 0H0V5.4C0 2.41765 2.41766 0 5.4 0Z"
      className="fill-indigo-500 transition-colors group-hover:fill-indigo-600"
    />
  </svg>
);

const Drip: React.FC<DripProps> = ({ left, height, delay }) => {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute top-[99%] origin-top"
      style={{ left }}
      initial={{ scaleY: 0.75 }}
      animate={{ scaleY: [0.75, 1, 0.75] }}
      transition={{
        duration: 2,
        times: [0, 0.25, 1],
        delay,
        ease: "easeIn",
        repeat: Infinity,
        repeatDelay: 2,
      }}
    >
      <div style={{ height }} className="w-2 rounded-b-full bg-indigo-500 transition-colors group-hover:bg-indigo-600" />
      <DripCurve className="absolute left-full top-0" />
      <DripCurve className="absolute right-full top-0 rotate-90" />
      <motion.div
        initial={{ y: -8, opacity: 1 }}
        animate={{ y: [-8, 50], opacity: [1, 0] }}
        transition={{
          duration: 2,
          times: [0, 1],
          delay,
          ease: "easeIn",
          repeat: Infinity,
          repeatDelay: 2,
        }}
        className="absolute top-full h-2 w-2 rounded-full bg-indigo-500 transition-colors group-hover:bg-indigo-600"
      />
    </motion.div>
  );
};

export default WetPaintButton;
