"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardWidgetProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    viewAllHref?: string;
    viewAllLabel?: string;
    children: ReactNode;
    className?: string;
    isEmpty?: boolean;
    emptyMessage?: string;
    emptyIcon?: LucideIcon;
    emptyAction?: {
        label: string;
        href: string;
    };
}

/**
 * Reusable dashboard widget container
 * Provides consistent styling and optional "View All" link
 */
export function DashboardWidget({
    title,
    description,
    icon: Icon,
    viewAllHref,
    viewAllLabel = "View all",
    children,
    className,
    isEmpty = false,
    emptyMessage,
    emptyIcon: EmptyIcon,
    emptyAction,
}: DashboardWidgetProps) {
    return (
        <Card className={cn("flex flex-col", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                        <CardTitle className="text-xl">{title}</CardTitle>
                    </div>
                    {description && (
                        <CardDescription>{description}</CardDescription>
                    )}
                </div>
                {viewAllHref && !isEmpty && (
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={viewAllHref} className="gap-1">
                            {viewAllLabel}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-1">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        {EmptyIcon && <EmptyIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />}
                        <p className="text-sm text-muted-foreground mb-4">
                            {emptyMessage || "No items to display"}
                        </p>
                        {emptyAction && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={emptyAction.href}>{emptyAction.label}</Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    children
                )}
            </CardContent>
        </Card>
    );
}
