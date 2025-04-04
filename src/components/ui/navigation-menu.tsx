import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "tw-group/navigation-menu tw-relative tw-flex tw-max-w-max tw-flex-1 tw-items-center tw-justify-center",
        className
      )}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn(
        "tw-group tw-flex tw-flex-1 tw-list-none tw-items-center tw-justify-center tw-gap-1",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("tw-relative", className)}
      {...props}
    />
  )
}

const navigationMenuTriggerStyle = cva(
  "tw-group tw-inline-flex tw-h-9 tw-w-max tw-items-center tw-justify-center tw-rounded-md tw-bg-background tw-px-4 tw-py-2 tw-text-sm tw-font-medium hover:tw-bg-accent hover:tw-text-accent-foreground focus:tw-bg-accent focus:tw-text-accent-foreground disabled:tw-pointer-events-none disabled:tw-opacity-50 data-[state=open]:hover:tw-bg-accent data-[state=open]:tw-text-accent-foreground data-[state=open]:focus:tw-bg-accent data-[state=open]:tw-bg-accent/50 focus-visible:tw-ring-ring/50 tw-outline-none tw-transition-[color,box-shadow] focus-visible:tw-ring-[3px] focus-visible:tw-outline-1"
)

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "tw-group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="tw-relative tw-top-[1px] tw-ml-1 tw-size-3 tw-transition tw-duration-300 group-data-[state=open]:tw-rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "data-[motion^=from-]:tw-animate-in data-[motion^=to-]:tw-animate-out data-[motion^=from-]:tw-fade-in data-[motion^=to-]:tw-fade-out data-[motion=from-end]:tw-slide-in-from-right-52 data-[motion=from-start]:tw-slide-in-from-left-52 data-[motion=to-end]:tw-slide-out-to-right-52 data-[motion=to-start]:tw-slide-out-to-left-52 tw-top-0 tw-left-0 tw-w-full tw-p-2 tw-pr-2.5 md:tw-absolute md:tw-w-auto",
        "tw-group-data-[viewport=false]/navigation-menu:bg-popover tw-group-data-[viewport=false]/navigation-menu:text-popover-foreground tw-group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in tw-group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out tw-group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 tw-group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 tw-group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 tw-group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 tw-group-data-[viewport=false]/navigation-menu:top-full tw-group-data-[viewport=false]/navigation-menu:mt-1.5 tw-group-data-[viewport=false]/navigation-menu:overflow-hidden tw-group-data-[viewport=false]/navigation-menu:rounded-md tw-group-data-[viewport=false]/navigation-menu:border tw-group-data-[viewport=false]/navigation-menu:shadow tw-group-data-[viewport=false]/navigation-menu:duration-200 **:data-[slot=navigation-menu-link]:focus:tw-ring-0 **:data-[slot=navigation-menu-link]:focus:tw-outline-none",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div
      className={cn(
        "tw-absolute tw-top-full tw-left-0 tw-isolate tw-z-50 tw-flex tw-justify-center"
      )}
    >
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "tw-origin-top-center tw-bg-popover tw-text-popover-foreground data-[state=open]:tw-animate-in data-[state=closed]:tw-animate-out data-[state=closed]:tw-zoom-out-95 data-[state=open]:tw-zoom-in-90 tw-relative tw-mt-1.5 tw-h-[var(--radix-navigation-menu-viewport-height)] tw-w-full tw-overflow-hidden tw-rounded-md tw-border tw-shadow md:tw-w-[var(--radix-navigation-menu-viewport-width)]",
          className
        )}
        {...props}
      />
    </div>
  )
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "data-[active=true]:focus:tw-bg-accent data-[active=true]:hover:tw-bg-accent data-[active=true]:tw-bg-accent/50 data-[active=true]:tw-text-accent-foreground hover:tw-bg-accent hover:tw-text-accent-foreground focus:tw-bg-accent focus:tw-text-accent-foreground focus-visible:tw-ring-ring/50 [&_svg:not([class*=text-])]:tw-text-muted-foreground tw-flex tw-flex-col tw-gap-1 tw-rounded-sm tw-p-2 tw-text-sm tw-transition-all tw-outline-none focus-visible:tw-ring-[3px] focus-visible:tw-outline-1 [&_svg:not([class*=size-])]:tw-size-4",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "data-[state=visible]:tw-animate-in data-[state=hidden]:tw-animate-out data-[state=hidden]:tw-fade-out data-[state=visible]:tw-fade-in tw-top-full tw-z-[1] tw-flex tw-h-1.5 tw-items-end tw-justify-center tw-overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="tw-bg-border tw-relative tw-top-[60%] tw-h-2 tw-w-2 tw-rotate-45 tw-rounded-tl-sm tw-shadow-md" />
    </NavigationMenuPrimitive.Indicator>
  )
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
