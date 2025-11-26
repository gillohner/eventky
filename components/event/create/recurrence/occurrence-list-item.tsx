"use client";

import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";

interface OccurrenceListItemProps {
    formattedDate: string;
    isExcluded: boolean;
    isAdditional: boolean;
    onToggle: () => void;
}

export function OccurrenceListItem({
    formattedDate,
    isExcluded,
    isAdditional,
    onToggle,
}: OccurrenceListItemProps) {
    return (
        <div
            className={`
                group relative flex items-center justify-between gap-3 
                px-3 py-2.5 rounded-md transition-all
                ${isExcluded
                    ? "bg-destructive/5 hover:bg-destructive/10"
                    : isAdditional
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-accent"
                }
            `}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`
                    flex-shrink-0 w-1.5 h-1.5 rounded-full
                    ${isExcluded
                        ? "bg-destructive"
                        : isAdditional
                            ? "bg-primary"
                            : "bg-primary"
                    }
                `} />
                <div className="flex-1 min-w-0">
                    <span className={`
                        text-sm flex items-center gap-2 truncate
                        ${isExcluded ? "line-through text-muted-foreground" : ""}
                    `}>
                        {formattedDate}
                        {isAdditional && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary flex-shrink-0">
                                Added
                            </span>
                        )}
                    </span>
                </div>
            </div>

            <Button
                type="button"
                variant={isExcluded ? "outline" : "ghost"}
                size="sm"
                className={`
                    flex-shrink-0 h-7 w-7 p-0
                    ${isExcluded
                        ? "text-muted-foreground hover:text-foreground hover:bg-accent"
                        : "opacity-0 group-hover:opacity-100 text-foreground hover:text-destructive hover:bg-destructive/10 dark:text-foreground dark:hover:text-destructive"
                    }
                `}
                onClick={onToggle}
                title={isExcluded ? "Include this occurrence" : "Exclude this occurrence"}
            >
                {isExcluded ? (
                    <Check className="h-4 w-4" />
                ) : (
                    <X className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
}
