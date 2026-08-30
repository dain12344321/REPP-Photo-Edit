import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-wider transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/50 disabled:pointer-events-none disabled:opacity-40 active:not-disabled:translate-y-px border-[1.5px]",
  {
    variants: {
      variant: {
        primary:
          "bg-cta text-paper border-cta hover:bg-cta-hover hover:border-cta-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgb(204_0_0_/_0.25)]",
        secondary:
          "bg-transparent text-ink border-ink hover:bg-ink hover:text-paper",
        ghost: "bg-transparent text-ink border-transparent hover:bg-paper-2",
        link: "bg-transparent text-steel border-transparent underline-offset-4 hover:underline px-0 h-auto tracking-wide",
      },
      size: {
        sm: "h-10 px-5 text-xs rounded-full",
        md: "h-11 px-8 text-sm rounded-full",
        lg: "h-12 px-10 text-sm rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
