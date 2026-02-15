/**
 * Shadcn Datetime Picker with support for timezone, date and time selection, minimum and maximum date limits.
 * Check out the live demo at https://shadcn-datetime-picker-pro.vercel.app/
 * Find the latest source code at https://github.com/huybuidac/shadcn-datetime-picker
 */
'use client';

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarIcon } from '@radix-ui/react-icons';
import {
    endOfHour,
    endOfMinute,
    format,
    getMonth,
    getYear,
    setHours,
    setMinutes,
    setMonth as setMonthFns,
    setSeconds,
    setYear,
    startOfHour,
    startOfMinute,
    startOfYear,
    startOfMonth,
    endOfMonth,
    endOfYear,
    addMonths,
    subMonths,
    setMilliseconds,
} from 'date-fns';
import {
    CheckIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    Clock,
    XCircle,
} from 'lucide-react';
import { DayPicker, Matcher, TZDate } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export type CalendarProps = Omit<React.ComponentProps<typeof DayPicker>, 'mode'>;

export type DateTimePickerProps = {
    /**
     * The modality of the popover. When set to true, interaction with outside elements will be disabled and only popover content will be visible to screen readers.
     * If you want to use the datetime picker inside a dialog, you should set this to true.
     * @default false
     */
    modal?: boolean;
    /**
     * The datetime value to display and control.
     */
    value: Date | undefined;
    /**
     * Callback function to handle datetime changes.
     */
    onChange: (date: Date | undefined) => void;
    /**
     * The minimum datetime value allowed.
     * @default undefined
     */
    min?: Date;
    /**
     * The maximum datetime value allowed.
     */
    max?: Date;
    /**
     * The timezone to display the datetime in, based on the date-fns.
     * For a complete list of valid time zone identifiers, refer to:
     * https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
     * @default undefined
     */
    timezone?: string;
    /**
     * Whether the datetime picker is disabled.
     * @default false
     */
    disabled?: boolean;
    /**
     * Whether to show the time picker.
     * @default false
     */
    hideTime?: boolean;
    /**
     * Whether to show the clear button.
     * @default false
     */
    clearable?: boolean;
    /**
     * Custom class names for the component.
     */
    classNames?: {
        /**
         * Custom class names for the trigger (the button that opens the picker).
         */
        trigger?: string;
    };
    timePicker?: {
        hour?: boolean;
        minute?: boolean;
        second?: boolean;
    };
    /**
     * Custom render function for the trigger.
     */
    renderTrigger?: (props: DateTimeRenderTriggerProps) => React.ReactNode;
};

export type DateTimeRenderTriggerProps = {
    value: Date | undefined;
    open: boolean;
    timezone?: string;
    disabled?: boolean;
    setOpen: (open: boolean) => void;
};

export function DateTimePicker({
    value,
    onChange,
    renderTrigger,
    min,
    max,
    timezone,
    hideTime,
    disabled,
    clearable,
    classNames,
    timePicker,
    modal = false,
    ...props
}: DateTimePickerProps & CalendarProps) {
    const [open, setOpenRaw] = useState(false);
    const [monthYearPicker, setMonthYearPicker] = useState<'month' | 'year' | false>(false);
    const initDate = useMemo(() => {
        if (value) return new TZDate(value, timezone);
        // Default to today at 18:00:00 when no value is set
        const now = new Date();
        now.setHours(18, 0, 0, 0);
        return new TZDate(now, timezone);
    }, [value, timezone]);

    const [month, setMonth] = useState<Date>(initDate);
    const [date, setDate] = useState<Date>(initDate);

    // Reset picker state when opening
    const setOpen = useCallback((nextOpen: boolean) => {
        if (nextOpen) {
            setDate(initDate);
            setMonth(initDate);
            setMonthYearPicker(false);
        }
        setOpenRaw(nextOpen);
    }, [initDate]);

    const endMonth = useMemo(() => {
        return setYear(month, getYear(month) + 1);
    }, [month]);
    const minDate = useMemo(() => (min ? new TZDate(min, timezone) : undefined), [min, timezone]);
    const maxDate = useMemo(() => (max ? new TZDate(max, timezone) : undefined), [max, timezone]);

    const onDayChanged = useCallback(
        (d: Date) => {
            d.setHours(date.getHours(), date.getMinutes(), date.getSeconds());
            if (min && d < min) {
                d.setHours(min.getHours(), min.getMinutes(), min.getSeconds());
            }
            if (max && d > max) {
                d.setHours(max.getHours(), max.getMinutes(), max.getSeconds());
            }
            setDate(d);
        },
        [date, min, max]
    );

    const onSubmit = useCallback(() => {
        onChange(new Date(date));
        setOpen(false);
    }, [date, onChange, setOpen]);

    const onMonthYearChanged = useCallback(
        (d: Date, mode: 'month' | 'year') => {
            setMonth(d);
            if (mode === 'year') {
                setMonthYearPicker('month');
            } else {
                setMonthYearPicker(false);
            }
        },
        [setMonth, setMonthYearPicker]
    );
    const onNextMonth = useCallback(() => {
        setMonth(addMonths(month, 1));
    }, [month]);
    const onPrevMonth = useCallback(() => {
        setMonth(subMonths(month, 1));
    }, [month]);

    const displayValue = useMemo(() => {
        if (!open && !value) return value;
        return open ? date : initDate;
    }, [date, value, open, initDate]);

    const dislayFormat = useMemo(() => {
        if (!displayValue) return 'Pick a date';
        return format(
            displayValue,
            `${!hideTime ? 'MMM' : 'MMMM'} d, yyyy${!hideTime ? ' HH:mm' : ''}`
        );
    }, [displayValue, hideTime]);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={modal}>
            <PopoverTrigger asChild>
                {renderTrigger ? (
                    renderTrigger({ value: displayValue, open, timezone, disabled, setOpen })
                ) : (
                    <div
                        className={cn(
                            'flex w-full cursor-pointer items-center h-9 ps-3 pe-1 font-normal border border-input rounded-md text-sm shadow-sm',
                            !displayValue && 'text-muted-foreground',
                            (!clearable || !value) && 'pe-3',
                            disabled && 'opacity-50 cursor-not-allowed',
                            classNames?.trigger
                        )}
                        tabIndex={0}
                    >
                        <div className="flex-grow flex items-center">
                            <CalendarIcon className="mr-2 size-4" />
                            {dislayFormat}
                        </div>
                        {clearable && value && (
                            <Button
                                disabled={disabled}
                                variant="ghost"
                                size="sm"
                                role="button"
                                aria-label="Clear date"
                                className="size-6 p-1 ms-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onChange(undefined);
                                    setOpen(false);
                                }}
                            >
                                <XCircle className="size-4" />
                            </Button>
                        )}
                    </div>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
                <div className="flex items-center justify-between">
                    <div className="text-md font-bold ms-2 flex items-center cursor-pointer">
                        <div>
                            <span onClick={() => setMonthYearPicker(monthYearPicker === 'month' ? false : 'month')}>
                                {format(month, 'MMMM')}
                            </span>
                            <span className="ms-1" onClick={() => setMonthYearPicker(monthYearPicker === 'year' ? false : 'year')}>
                                {format(month, 'yyyy')}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setMonthYearPicker(monthYearPicker ? false : 'year')}>
                            {monthYearPicker ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </Button>
                    </div>
                    <div className={cn('flex space-x-2', monthYearPicker ? 'hidden' : '')}>
                        <Button variant="ghost" size="icon" onClick={onPrevMonth}>
                            <ChevronLeftIcon />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onNextMonth}>
                            <ChevronRightIcon />
                        </Button>
                    </div>
                </div>
                <div className="relative overflow-hidden">
                    <DayPicker
                        timeZone={timezone}
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && onDayChanged(d)}
                        month={month}
                        endMonth={endMonth}
                        disabled={[max ? { after: max } : null, min ? { before: min } : null].filter(Boolean) as Matcher[]}
                        onMonthChange={setMonth}
                        classNames={{
                            dropdowns: 'flex w-full gap-2',
                            months: 'flex w-full h-fit',
                            month: 'flex flex-col w-full',
                            month_caption: 'hidden',
                            button_previous: 'hidden',
                            button_next: 'hidden',
                            month_grid: 'w-full border-collapse',
                            weekdays: 'flex justify-between mt-2',
                            weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                            week: 'flex w-full justify-between mt-2',
                            day: 'h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 rounded-1',
                            day_button: cn(
                                buttonVariants({ variant: 'ghost' }),
                                'size-9 rounded-md p-0 font-normal aria-selected:opacity-100'
                            ),
                            range_end: 'day-range-end',
                            selected:
                                'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-l-md rounded-r-md',
                            today: 'bg-accent text-accent-foreground',
                            outside:
                                'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
                            disabled: 'text-muted-foreground opacity-50',
                            range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
                            hidden: 'invisible',
                        }}
                        showOutsideDays={true}
                        {...props}
                    />
                    <div
                        className={cn('absolute top-0 left-0 bottom-0 right-0', monthYearPicker ? 'bg-popover' : 'hidden')}
                    ></div>
                    <MonthYearPicker
                        value={month}
                        mode={monthYearPicker || 'month'}
                        onChange={onMonthYearChanged}
                        minDate={minDate}
                        maxDate={maxDate}
                        className={cn('absolute top-0 left-0 bottom-0 right-0', monthYearPicker ? '' : 'hidden')}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    {!hideTime && (
                        <TimePicker
                            timePicker={timePicker}
                            value={date}
                            onChange={setDate}
                            min={minDate}
                            max={maxDate}
                        />
                    )}
                    <div className="flex flex-row-reverse items-center justify-between">
                        <Button className="ms-2 h-7 px-2" onClick={onSubmit}>
                            Done
                        </Button>
                        {timezone && (
                            <div className="text-sm">
                                <span>Timezone:</span>
                                <span className="font-semibold ms-1">{timezone}</span>
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function MonthYearPicker({
    value,
    minDate,
    maxDate,
    mode = 'month',
    onChange,
    className,
}: {
    value: Date;
    mode: 'month' | 'year';
    minDate?: Date;
    maxDate?: Date;
    onChange: (value: Date, mode: 'month' | 'year') => void;
    className?: string;
}) {
    const yearRef = useRef<HTMLDivElement>(null);
    const years = useMemo(() => {
        const years: TimeOption[] = [];
        for (let i = 1912; i < 2100; i++) {
            let disabled = false;
            const startY = startOfYear(setYear(value, i));
            const endY = endOfYear(setYear(value, i));
            if (minDate && endY < minDate) disabled = true;
            if (maxDate && startY > maxDate) disabled = true;
            years.push({ value: i, label: i.toString(), disabled });
        }
        return years;
    }, [value, minDate, maxDate]);
    const months = useMemo(() => {
        const months: TimeOption[] = [];
        for (let i = 0; i < 12; i++) {
            let disabled = false;
            const startM = startOfMonth(setMonthFns(value, i));
            const endM = endOfMonth(setMonthFns(value, i));
            if (minDate && endM < minDate) disabled = true;
            if (maxDate && startM > maxDate) disabled = true;
            months.push({ value: i, label: format(new Date(0, i), 'MMM'), disabled });
        }
        return months;
    }, [value, minDate, maxDate]);

    const onYearChange = useCallback(
        (v: TimeOption) => {
            let newDate = setYear(value, v.value);
            if (minDate && newDate < minDate) {
                newDate = setMonthFns(newDate, getMonth(minDate));
            }
            if (maxDate && newDate > maxDate) {
                newDate = setMonthFns(newDate, getMonth(maxDate));
            }
            onChange(newDate, 'year');
        },
        [onChange, value, minDate, maxDate]
    );

    useEffect(() => {
        if (mode === 'year') {
            yearRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
    }, [mode, value]);
    return (
        <div className={cn(className)}>
            <ScrollArea className="h-full">
                {mode === 'year' && (
                    <div className="grid grid-cols-4">
                        {years.map((year) => (
                            <div key={year.value} ref={year.value === getYear(value) ? yearRef : undefined}>
                                <Button
                                    disabled={year.disabled}
                                    variant={getYear(value) === year.value ? 'default' : 'ghost'}
                                    className="rounded-full"
                                    onClick={() => onYearChange(year)}
                                >
                                    {year.label}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
                {mode === 'month' && (
                    <div className="grid grid-cols-3 gap-4">
                        {months.map((month) => (
                            <Button
                                key={month.value}
                                size="lg"
                                disabled={month.disabled}
                                variant={getMonth(value) === month.value ? 'default' : 'ghost'}
                                className="rounded-full"
                                onClick={() => onChange(setMonthFns(value, month.value), 'month')}
                            >
                                {month.label}
                            </Button>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

interface TimeOption {
    value: number;
    label: string;
    disabled: boolean;
}

function TimePicker({
    value,
    onChange,
    min,
    max,
    timePicker,
}: {
    value: Date;
    onChange: (date: Date) => void;
    min?: Date;
    max?: Date;
    timePicker?: DateTimePickerProps['timePicker'];
}) {
    const [hour, setHour] = useState(value.getHours());
    const [minute, setMinute] = useState(value.getMinutes());
    const [second, setSecond] = useState(value.getSeconds());

    const onChangeRef = useRef(onChange);
    const valueRef = useRef(value);
    useEffect(() => {
        onChangeRef.current = onChange;
        valueRef.current = value;
    }, [onChange, value]);

    useEffect(() => {
        onChangeRef.current(setHours(setMinutes(setSeconds(valueRef.current, second), minute), hour));
    }, [hour, minute, second]);

    const hours: TimeOption[] = useMemo(
        () =>
            Array.from({ length: 24 }, (_, i) => {
                let disabled = false;
                const hDate = setHours(value, i);
                const hStart = startOfHour(hDate);
                const hEnd = endOfHour(hDate);
                if (min && hEnd < min) disabled = true;
                if (max && hStart > max) disabled = true;
                return {
                    value: i,
                    label: i.toString().padStart(2, '0'),
                    disabled,
                };
            }),
        [value, min, max]
    );
    const minutes: TimeOption[] = useMemo(() => {
        const anchorDate = setHours(value, hour);
        return Array.from({ length: 60 }, (_, i) => {
            let disabled = false;
            const mDate = setMinutes(anchorDate, i);
            const mStart = startOfMinute(mDate);
            const mEnd = endOfMinute(mDate);
            if (min && mEnd < min) disabled = true;
            if (max && mStart > max) disabled = true;
            return {
                value: i,
                label: i.toString().padStart(2, '0'),
                disabled,
            };
        });
    }, [value, min, max, hour]);
    const seconds: TimeOption[] = useMemo(() => {
        const anchorDate = setMilliseconds(setMinutes(setHours(value, hour), minute), 0);
        const _min = min ? setMilliseconds(min, 0) : undefined;
        const _max = max ? setMilliseconds(max, 0) : undefined;
        return Array.from({ length: 60 }, (_, i) => {
            let disabled = false;
            const sDate = setSeconds(anchorDate, i);
            if (_min && sDate < _min) disabled = true;
            if (_max && sDate > _max) disabled = true;
            return {
                value: i,
                label: i.toString().padStart(2, '0'),
                disabled,
            };
        });
    }, [value, minute, min, max, hour]);
    const onHourChange = useCallback(
        (v: TimeOption) => {
            if (min) {
                const newTime = setHours(setMinutes(setSeconds(value, second), minute), v.value);
                if (newTime < min) {
                    setMinute(min.getMinutes());
                    setSecond(min.getSeconds());
                }
            }
            if (max) {
                const newTime = setHours(setMinutes(setSeconds(value, second), minute), v.value);
                if (newTime > max) {
                    setMinute(max.getMinutes());
                    setSecond(max.getSeconds());
                }
            }
            setHour(v.value);
        },
        [setHour, value, minute, second, min, max]
    );

    const onMinuteChange = useCallback(
        (v: TimeOption) => {
            if (min) {
                const newTime = setHours(setMinutes(setSeconds(value, second), v.value), hour);
                if (newTime < min) {
                    setSecond(min.getSeconds());
                }
            }
            if (max) {
                const newTime = setHours(setMinutes(setSeconds(value, second), v.value), hour);
                if (newTime > max) {
                    setSecond(max.getSeconds());
                }
            }
            setMinute(v.value);
        },
        [setMinute, value, hour, second, min, max]
    );

    const display = useMemo(() => {
        const arr = [];
        for (const element of ['hour', 'minute', 'second']) {
            if (!timePicker || timePicker[element as keyof typeof timePicker]) {
                if (element === 'hour') {
                    arr.push('HH');
                } else {
                    arr.push(element === 'minute' ? 'mm' : 'ss');
                }
            }
        }
        return format(value, arr.join(':'));
    }, [value, timePicker]);

    const [open, setOpen] = useState(false);

    const hourRef = useRef<HTMLDivElement>(null);
    const minuteRef = useRef<HTMLDivElement>(null);
    const secondRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (open) {
                hourRef.current?.scrollIntoView({ behavior: 'auto' });
                minuteRef.current?.scrollIntoView({ behavior: 'auto' });
                secondRef.current?.scrollIntoView({ behavior: 'auto' });
            }
        }, 1);
        return () => clearTimeout(timeoutId);
    }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="justify-between">
                    <Clock className="mr-2 size-4" />
                    {display}
                    <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" side="top">
                <div className="flex-col gap-2 p-2">
                    <div className="flex h-48 grow">
                        {(!timePicker || timePicker.hour) && (
                            <ScrollArea className="h-full flex-grow">
                                <div className="flex grow flex-col items-stretch overflow-y-auto pe-1 pb-40">
                                    {hours.map((v) => (
                                        <div key={v.value} ref={v.value === hour ? hourRef : undefined}>
                                            <TimeItem
                                                option={v}
                                                selected={v.value === hour}
                                                onSelect={onHourChange}
                                                className="h-8"
                                                disabled={v.disabled}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                        {(!timePicker || timePicker.minute) && (
                            <ScrollArea className="h-full flex-grow">
                                <div className="flex grow flex-col items-stretch overflow-y-auto pe-1 pb-40">
                                    {minutes.map((v) => (
                                        <div key={v.value} ref={v.value === minute ? minuteRef : undefined}>
                                            <TimeItem
                                                option={v}
                                                selected={v.value === minute}
                                                onSelect={onMinuteChange}
                                                className="h-8"
                                                disabled={v.disabled}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                        {(!timePicker || timePicker.second) && (
                            <ScrollArea className="h-full flex-grow">
                                <div className="flex grow flex-col items-stretch overflow-y-auto pe-1 pb-40">
                                    {seconds.map((v) => (
                                        <div key={v.value} ref={v.value === second ? secondRef : undefined}>
                                            <TimeItem
                                                option={v}
                                                selected={v.value === second}
                                                onSelect={(v) => setSecond(v.value)}
                                                className="h-8"
                                                disabled={v.disabled}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

const TimeItem = ({
    option,
    selected,
    onSelect,
    className,
    disabled,
}: {
    option: TimeOption;
    selected: boolean;
    onSelect: (option: TimeOption) => void;
    className?: string;
    disabled?: boolean;
}) => {
    return (
        <Button
            variant="ghost"
            className={cn('flex justify-center px-1 pe-1 ps-1 text-sm', className)}
            onClick={() => onSelect(option)}
            disabled={disabled}
        >
            <div className="w-3">{selected && <CheckIcon className="my-auto size-3" />}</div>
            <span className="ms-1.5">{option.label}</span>
        </Button>
    );
};

