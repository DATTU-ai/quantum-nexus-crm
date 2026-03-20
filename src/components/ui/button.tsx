import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-[background,box-shadow,border-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary/30 bg-[linear-gradient(135deg,#6366F1,#8B5CF6)] text-primary-foreground shadow-[0_10px_24px_rgba(99,102,241,0.26)] hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(99,102,241,0.4)]",
        destructive:
          "border border-destructive/30 bg-destructive text-destructive-foreground shadow-[0_10px_24px_rgba(239,68,68,0.2)] hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(239,68,68,0.35)]",
        outline:
          "border border-border bg-card text-foreground shadow-[0_8px_20px_rgba(2,6,23,0.18)] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary hover:text-foreground hover:shadow-[0_0_12px_rgba(99,102,241,0.22)]",
        secondary:
          "border border-border bg-secondary text-secondary-foreground shadow-[0_8px_20px_rgba(2,6,23,0.18)] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card hover:shadow-[0_0_12px_rgba(99,102,241,0.18)]",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground hover:shadow-[0_0_12px_rgba(99,102,241,0.14)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-xl px-4",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
