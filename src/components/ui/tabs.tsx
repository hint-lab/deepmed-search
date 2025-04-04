"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("tw-flex tw-flex-col tw-gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "tw-bg-muted tw-text-muted-foreground tw-inline-flex tw-h-9 tw-w-fit tw-items-center tw-justify-center tw-rounded-lg tw-p-[3px]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:tw-bg-background dark:data-[state=active]:tw-text-foreground focus-visible:tw-border-ring focus-visible:tw-ring-ring/50 focus-visible:tw-outline-ring dark:data-[state=active]:tw-border-input dark:data-[state=active]:tw-bg-input/30 tw-text-foreground dark:tw-text-muted-foreground tw-inline-flex tw-h-[calc(100%-1px)] tw-flex-1 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-md tw-border tw-border-transparent tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-whitespace-nowrap tw-transition-[color,box-shadow] focus-visible:tw-ring-[3px] focus-visible:tw-outline-1 disabled:tw-pointer-events-none disabled:tw-opacity-50 data-[state=active]:tw-shadow-sm [&_svg]:tw-pointer-events-none [&_svg]:tw-shrink-0 [&_svg:not([class*=size-])]:tw-size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("tw-flex-1 tw-outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
