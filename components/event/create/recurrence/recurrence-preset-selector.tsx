"use client";

import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

interface RecurrencePresetSelectorProps {
    value: "none" | "daily" | "weekly" | "monthly" | "custom";
    onChange: (value: "none" | "daily" | "weekly" | "monthly" | "custom") => void;
}

export function RecurrencePresetSelector({
    value,
    onChange
}: RecurrencePresetSelectorProps) {
    return (
        <div className="space-y-2">
            <Label>Does this event repeat?</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No, one-time event</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom pattern...</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
