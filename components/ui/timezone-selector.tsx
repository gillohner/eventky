"use client";

import { Control, Controller, FieldError, FieldPath, FieldValues } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { TIMEZONES, getUTCOffset } from "@/lib/timezones";

interface TimezoneSelectorProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    error?: FieldError;
    disabled?: boolean;
}

export function TimezoneSelector<T extends FieldValues>({
    control,
    name,
    label,
    error,
    disabled,
}: TimezoneSelectorProps<T>) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [focusedIndex, setFocusedIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Generate timezones with dynamic offsets
    const timezones = TIMEZONES.map((tz) => ({
        ...tz,
        offset: getUTCOffset(tz.value),
    }));

    const filteredTimezones = timezones.filter(
        (tz) =>
            tz.label.toLowerCase().includes(search.toLowerCase()) ||
            tz.value.toLowerCase().includes(search.toLowerCase()) ||
            tz.offset.toLowerCase().includes(search.toLowerCase()) ||
            tz.region.toLowerCase().includes(search.toLowerCase())
    );

    // Reset focused index when search changes
    useEffect(() => {
        Promise.resolve().then(() => setFocusedIndex(0));
    }, [search]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (open && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 0);
        }
    }, [open]);

    // Scroll focused item into view
    useEffect(() => {
        if (open && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [focusedIndex, open]);

    const handleKeyDown = (e: React.KeyboardEvent, onSelect: (value: string) => void) => {
        if (!open) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                e.stopPropagation();
                setFocusedIndex((prev) =>
                    prev < filteredTimezones.length - 1 ? prev + 1 : 0
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                e.stopPropagation();
                setFocusedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredTimezones.length - 1
                );
                break;
            case "Enter":
                e.preventDefault();
                e.stopPropagation();
                if (filteredTimezones[focusedIndex]) {
                    onSelect(filteredTimezones[focusedIndex].value);
                    setOpen(false);
                    setSearch("");
                }
                break;
            case "Escape":
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                setSearch("");
                break;
            case "Tab":
                setOpen(false);
                setSearch("");
                break;
        }
    };

    return (
        <div className="space-y-2">
            {label && <Label htmlFor={name as string}>{label}</Label>}
            <Controller
                name={name}
                control={control}
                render={({ field }) => {
                    const selectedTimezone = timezones.find(
                        (tz) => tz.value === field.value
                    );

                    return (
                        <div className="relative">
                            <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                disabled={disabled}
                                onClick={() => setOpen(!open)}
                                onKeyDown={(e) => handleKeyDown(e, field.onChange)}
                                className={cn(
                                    "w-auto min-w-[200px] justify-between",
                                    error && "border-destructive focus-visible:ring-destructive",
                                    !field.value && "text-muted-foreground"
                                )}
                            >
                                {selectedTimezone
                                    ? `${selectedTimezone.label} (${selectedTimezone.offset})`
                                    : "Select timezone..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            {open && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => {
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                    />
                                    <div
                                        className="absolute z-50 mt-1 w-[320px] rounded-md border bg-popover p-0 shadow-md"
                                        onKeyDown={(e) => handleKeyDown(e, field.onChange)}
                                    >
                                        <div className="p-2 border-b">
                                            <Input
                                                ref={searchInputRef}
                                                placeholder="Search timezone..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, field.onChange)}
                                                className="h-8"
                                            />
                                        </div>
                                        <div
                                            ref={listRef}
                                            className="max-h-[300px] overflow-y-auto p-1"
                                        >
                                            {filteredTimezones.length === 0 && (
                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                    No timezone found.
                                                </div>
                                            )}
                                            {filteredTimezones.map((tz, index) => (
                                                <button
                                                    key={tz.value}
                                                    ref={(el) => {
                                                        itemRefs.current[index] = el;
                                                    }}
                                                    type="button"
                                                    className={cn(
                                                        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                                        field.value === tz.value && "bg-accent",
                                                        focusedIndex === index && "bg-accent/50"
                                                    )}
                                                    onClick={() => {
                                                        field.onChange(tz.value);
                                                        setOpen(false);
                                                        setSearch("");
                                                    }}
                                                    onMouseEnter={() => setFocusedIndex(index)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            field.value === tz.value
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col items-start flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{tz.label}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {tz.offset}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {tz.value}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                }}
            />
        </div>
    );
}
