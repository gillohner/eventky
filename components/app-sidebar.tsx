"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  CalendarDays,
  Home,
  LogIn,
  LogOut,
  User,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { useProfile } from "@/components/auth/profile-provider"
import { getPubkyImageUrl, getInitials, truncatePublicKey } from "@/lib/pubky/utils"
import { toast } from "sonner"

// Navigation items
const navItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Events",
    url: "/events",
    icon: CalendarDays,
  },
]

export function AppSidebar() {
  const router = useRouter()
  const { isAuthenticated, auth, logout } = useAuth()
  const { profile } = useProfile()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleLogout = () => {
    logout()
    toast.success("Logged out successfully")
    router.push("/login")
  }

  const handleLogin = () => {
    router.push("/login")
  }

  const avatarUrl = profile?.image ? getPubkyImageUrl(profile.image) : null;
  const initials = getInitials(profile?.name)
  const displayName = profile?.name || truncatePublicKey(auth.publicKey, 6)

  return (
    <Sidebar>
      <SidebarContent>
        {/* User Section at Top */}
        <SidebarGroup>
          <SidebarGroupContent className="px-2 py-4">
            {isHydrated && isAuthenticated ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                <Avatar className="h-10 w-10">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.name || "User"} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  {profile?.bio && (
                    <p className="text-xs text-muted-foreground truncate">{profile.bio}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-8 w-8"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : isHydrated ? (
              <Button
                onClick={handleLogin}
                className="w-full justify-start gap-2"
                variant="outline"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            ) : null}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12 text-base">
                    <a href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          Eventky v0.1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
