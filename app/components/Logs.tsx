import { LayoutGroup, motion } from 'framer-motion';
import { cn } from "~/utils/cn";
import { useLogStore } from "~/utils/store";

export function Logs() {
  const logs = useLogStore((state) => state.logs);

  if (!logs.length) {
    return <div className="mt-3 opacity-0 h-[200px] pointer-events-none" />
  }

  return (
    <LayoutGroup>
    <motion.ul className={cn(
      !logs.length && "hidden",
      "w-full",
      "bg-black/90 dark:bg-black/60 text-white/70 dark:text-white/30",
      "font-mono text-xs",
      "mt-4 p-4",
      "rounded-md",
      "h-[200px] overflow-y-scroll",
      "flex flex-col-reverse",
      "leading-5"
    )}>
        {logs.map((log, i) => (
          <motion.li 
            key={i}>
            {log}
          </motion.li>
        ))}
    </motion.ul>
    </LayoutGroup>
  )
}
