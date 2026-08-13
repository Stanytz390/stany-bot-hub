// components/ui/pink-button.tsx
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function PinkButton({ className, children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "bg-gradient-to-r from-[#FF2D8E] to-[#FF69B4] text-white hover:from-[#FF1493] hover:to-[#FF2D8E] border-0 shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all duration-300 hover:scale-[1.02] rounded-xl",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}