"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "tw-peer tw-border-input dark:tw-bg-input/30 data-[state=checked]:tw-bg-primary data-[state=checked]:tw-text-primary-foreground dark:data-[state=checked]:tw-bg-primary data-[state=checked]:tw-border-primary focus-visible:tw-border-ring focus-visible:tw-ring-ring/50 aria-invalid:tw-ring-destructive/20 dark:aria-invalid:tw-ring-destructive/40 aria-invalid:tw-border-destructive tw-size-4 tw-shrink-0 tw-rounded-[4px] tw-border tw-shadow-xs tw-transition-shadow tw-outline-none focus-visible:tw-ring-[3px] disabled:tw-cursor-not-allowed disabled:tw-opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="tw-flex tw-items-center tw-justify-center tw-text-current tw-transition-none"
      >
        <CheckIcon className="tw-size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
