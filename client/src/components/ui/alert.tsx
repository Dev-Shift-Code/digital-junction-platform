import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3.5 text-sm shadow-[0_10px_24px_rgba(26,49,44,.06)] grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "border-[#428475]/28 bg-[#FFF4E1] text-[#1A312C] [&>svg]:text-[#428475]",
        info: "border-[#428475]/28 bg-[#89D7B7]/16 text-[#1A312C] [&>svg]:text-[#428475]",
        success: "border-[#428475]/30 bg-[#89D7B7]/24 text-[#1A312C] [&>svg]:text-[#428475]",
        warning: "border-[#9E7327]/30 bg-[#FFF4E1] text-[#58411C] [&>svg]:text-[#9E7327]",
        destructive: "border-[#A9483D]/32 bg-[#FFF4E1] text-[#6A2F28] [&>svg]:text-[#A9483D] *:data-[slot=alert-description]:text-[#6A2F28]/82",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm leading-6 text-current/72 [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
