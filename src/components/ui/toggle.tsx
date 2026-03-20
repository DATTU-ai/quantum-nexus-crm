import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium ring-offset-background transition-[background,border-color,box-shadow,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-primary/35 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground data-[state=on]:shadow-[0_0_12px_rgba(99,102,241,0.18)]",
  {
    variants: {
      variant: {
        default: "border border-transparent bg-transparent",
        outline: "border border-input bg-card/80 hover:border-primary/35 hover:bg-secondary hover:text-foreground",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-4",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
