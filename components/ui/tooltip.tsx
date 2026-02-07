"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

// Internal context to pass touch handler from Tooltip → TooltipTrigger
const TouchCtx = React.createContext<(() => void) | null>(null)

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

/**
 * Touch-aware Tooltip wrapper.
 *
 * Radix Tooltip relies on hover/focus pointer events that don't fire on touch
 * devices. This wrapper detects touch interaction and manages open state so a
 * tap toggles the tooltip, and tapping outside or after a timeout closes it.
 */
function Tooltip({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isTouchRef = React.useRef(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>(null)

  // Support both controlled and uncontrolled usage
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (isControlled) {
        controlledOnOpenChange?.(nextOpen)
      } else {
        setUncontrolledOpen(nextOpen)
      }
    },
    [isControlled, controlledOnOpenChange],
  )

  // Auto-dismiss after 2.5 s on touch so the tooltip doesn't stick around
  React.useEffect(() => {
    if (open && isTouchRef.current) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setOpen(false), 2500)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [open, setOpen])

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      // When the change originates from Radix (hover / focus) and we're on a
      // touch device, ignore it – we manage state ourselves via onTouchStart.
      if (isTouchRef.current) return
      setOpen(nextOpen)
    },
    [setOpen],
  )

  const handleTouchStart = React.useCallback(() => {
    isTouchRef.current = true
    setOpen(!open)
  }, [open, setOpen])

  // Close on any touch outside the trigger while tooltip is open
  React.useEffect(() => {
    if (!open || !isTouchRef.current) return

    const handleTouchOutside = () => {
      setOpen(false)
    }

    // Delay listener registration so the opening tap doesn't immediately close
    const id = setTimeout(() => {
      document.addEventListener("touchstart", handleTouchOutside, { once: true })
    }, 0)

    return () => {
      clearTimeout(id)
      document.removeEventListener("touchstart", handleTouchOutside)
    }
  }, [open, setOpen])

  return (
    <TooltipProvider>
      <TooltipPrimitive.Root
        data-slot="tooltip"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      >
        <TouchCtx value={handleTouchStart}>
          {children}
        </TouchCtx>
      </TooltipPrimitive.Root>
    </TooltipProvider>
  )
}

function TooltipTrigger({
  onTouchStart,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const handleTouch = React.useContext(TouchCtx)

  const composedTouchStart = React.useCallback(
    (e: React.TouchEvent<HTMLButtonElement>) => {
      handleTouch?.()
      onTouchStart?.(e)
    },
    [handleTouch, onTouchStart],
  )

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onTouchStart={composedTouchStart}
      {...props}
    />
  )
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
