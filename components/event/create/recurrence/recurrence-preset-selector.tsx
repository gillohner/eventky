"use client";

import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import type { RecurrencePreset } from "@/types/recurrence";

interface RecurrencePresetSelectorProps {
    value: RecurrencePreset;
    onChange: (value: RecurrencePreset) => void;
}

export function RecurrencePresetSelector({
    value,
    onChange
}: RecurrencePresetSelectorProps) {
    return (
        <div className="space-y-2">
            <Label>Repeat</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
