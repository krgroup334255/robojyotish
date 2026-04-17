import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-saffron-500 to-saffron-700 text-white shadow-lg shadow-saffron-500/30 hover:shadow-xl hover:shadow-saffron-500/50 hover:scale-[1.02]",
        cosmic:
          "bg-gradient-to-r from-cosmic-700 to-cosmic-950 text-white shadow-lg shadow-cosmic-700/30 hover:shadow-xl hover:shadow-cosmic-700/50",
        outline:
          "border-2 border-saffron-500 text-saffron-600 hover:bg-saffron-50",
        ghost: "hover:bg-white/10 text-white",
        secondary:
          "bg-white text-cosmic-900 hover:bg-white/90 shadow-md",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-14 px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
export { Button, buttonVariants };
