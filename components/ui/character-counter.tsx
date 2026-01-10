import { cn } from "@/lib/utils";

interface CharacterCounterProps {
    current: number;
    max: number;
    className?: string;
    warning?: boolean;
}

/**
 * Displays character count with current/max format
 * Shows warning styling when approaching or exceeding limit
 */
export function CharacterCounter({
    current,
    max,
    className,
    warning = false,
}: CharacterCounterProps) {
    // Show warning when at 90% or exceeded
    const isNearLimit = current >= max * 0.9;
    const isOverLimit = current > max;

    return (
        <p
            className={cn(
                "text-xs text-muted-foreground",
                (isNearLimit || warning) && "text-amber-600 dark:text-amber-500",
                isOverLimit && "text-destructive font-medium",
                className
            )}
        >
            {current.toLocaleString()}/{max.toLocaleString()} characters
            {isOverLimit && " (exceeds limit)"}
        </p>
    );
}
