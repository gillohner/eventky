"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
    Calendar,
    CalendarDays,
    Home,
    LogIn,
    LogOut,
    User,
    ExternalLink,
    Plus,
    Bug,
    Clock,
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
import { useAuth } from "@/components/providers/auth-provider"
import { useProfile } from "@/hooks/use-profile"
import { useDebugStore } from "@/stores/debug-store"
import { usePreferencesStore } from "@/stores/preferences-store"
import { getPubkyAvatarUrl, getInitials, truncatePublicKey } from "@/lib/pubky/utils"
import { config } from "@/lib/config"
import { toast } from "sonner"

// Navigation items
const navItems = [
    {
        title: "Dashboard",
        url: "/",
        icon: Home,
    },
    {
        title: "Calendars",
        url: "/calendars",
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
    const pathname = usePathname()
    const { isAuthenticated, auth, logout } = useAuth()
    const { profile } = useProfile()
    const { enabled: debugEnabled, toggle: toggleDebug } = useDebugStore()
    const { timeFormat, toggleTimeFormat } = usePreferencesStore()
    const [isHydrated, setIsHydrated] = useState(false)

    useEffect(() => {
        // Use a microtask to avoid synchronous setState within effect
        Promise.resolve().then(() => {
            setIsHydrated(true)
        })
    }, [])

    const handleLogout = () => {
        logout()
        toast.success("Logged out successfully")
        router.push("/login")
    }

    const handleLogin = () => {
        // Pass current path as returnPath so user returns here after login
        const returnPath = pathname && pathname !== "/" ? `?returnPath=${encodeURIComponent(pathname)}` : ""
        router.push(`/login${returnPath}`)
    }

    const avatarUrl = profile?.image && auth?.publicKey ? getPubkyAvatarUrl(auth.publicKey) : null;
    const initials = getInitials(profile?.name)
    const displayName = profile?.name || truncatePublicKey(auth.publicKey, 6)

    return (
        <Sidebar variant="floating" collapsible="offcanvas">
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

                {/* Action Buttons */}
                <SidebarGroup>
                    <SidebarGroupContent className="px-2 space-y-2">
                        <Button
                            onClick={() => router.push("/event/create")}
                            className="w-full justify-start"
                            size="lg"
                        >
                            <Plus />
                            New Event
                        </Button>
                        <Button
                            onClick={() => router.push("/calendar/create")}
                            className="w-full justify-start"
                            size="lg"
                            variant="outline"
                        >
                            <Plus />
                            New Calendar
                        </Button>

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
                {/* Time Format Toggle */}
                {isHydrated && (
                    <div className="px-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleTimeFormat}
                            className="w-full justify-start gap-2"
                        >
                            <Clock className="h-4 w-4" />
                            Time: {timeFormat === "12h" ? "12h (AM/PM)" : "24h"}
                        </Button>
                    </div>
                )}

                {/* Debug Mode Toggle */}
                {config.debug.available && isHydrated && (
                    <div className="px-4">
                        <Button
                            variant={debugEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={toggleDebug}
                            className="w-full justify-start gap-2"
                        >
                            <Bug className="h-4 w-4" />
                            {debugEnabled ? "Debug: ON" : "Enable Debug"}
                        </Button>
                    </div>
                )}

                <div className="px-4 py-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{config.app.name} v{config.app.version}</span>
                        {config.app.githubRepo && (
                            <>
                                <span>•</span>
                                <a
                                    href={config.app.githubRepo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-foreground transition-colors flex items-center gap-1 group"
                                >
                                    Source code
                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
