"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "tw-flex tw-items-center tw-gap-2 tw-text-sm tw-leading-none tw-font-medium tw-select-none group-data-[disabled=true]:tw-pointer-events-none group-data-[disabled=true]:tw-opacity-50 peer-disabled:tw-cursor-not-allowed peer-disabled:tw-opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
