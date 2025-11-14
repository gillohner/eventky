"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-center"
      className="toaster group"
      theme="dark"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toast]:bg-card group-[.toast]:text-card-foreground",
          error: "group-[.toast]:bg-card group-[.toast]:text-card-foreground",
          warning: "group-[.toast]:bg-card group-[.toast]:text-card-foreground",
          info: "group-[.toast]:bg-card group-[.toast]:text-card-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
