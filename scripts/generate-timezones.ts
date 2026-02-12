/**
 * Generate comprehensive timezone list from all IANA timezones
 * Run with: npx tsx scripts/generate-timezones.ts
 */

interface TimezoneData {
    value: string;
    label: string;
    region: string;
}

// Get all supported timezones from Intl API
const allTimezones = Intl.supportedValuesOf('timeZone');

// Extract region from IANA timezone identifier
function getRegion(timezone: string): string {
    if (timezone === 'UTC') return 'Global';

    const parts = timezone.split('/');
    if (parts.length < 2) return 'Other';

    const continent = parts[0];

    // Map continent codes to friendly region names
    const regionMap: Record<string, string> = {
        'Africa': 'Africa',
        'America': parts[1]?.includes('Argentina') || parts[1]?.includes('Sao_Paulo') ||
                   parts[1]?.includes('Buenos_Aires') || parts[1]?.includes('Lima') ||
                   parts[1]?.includes('Santiago') || parts[1]?.includes('Bogota') ||
                   parts[1]?.includes('Caracas') || parts[1]?.includes('Montevideo') ||
                   parts[1]?.includes('La_Paz') || parts[1]?.includes('Asuncion') ||
                   parts[1]?.includes('Cayenne') || parts[1]?.includes('Fortaleza') ||
                   parts[1]?.includes('Recife') || parts[1]?.includes('Manaus') ||
                   parts[1]?.includes('Belem') || parts[1]?.includes('Santarem') ||
                   parts[1]?.includes('Cuiaba') || parts[1]?.includes('Campo_Grande') ||
                   parts[1]?.includes('Boa_Vista') || parts[1]?.includes('Porto_Velho') ||
                   parts[1]?.includes('Rio_Branco') || parts[1]?.includes('Araguaina') ||
                   parts[1]?.includes('Maceio') || parts[1]?.includes('Bahia') ||
                   parts[1]?.includes('Noronha') || parts[1]?.includes('Paramaribo') ||
                   parts[1]?.includes('Guyana')
                   ? 'South America'
                   : parts[1]?.includes('Mexico') || parts[1]?.includes('Guatemala') ||
                     parts[1]?.includes('Belize') || parts[1]?.includes('Costa_Rica') ||
                     parts[1]?.includes('El_Salvador') || parts[1]?.includes('Honduras') ||
                     parts[1]?.includes('Nicaragua') || parts[1]?.includes('Panama') ||
                     parts[1]?.includes('Tegucigalpa') || parts[1]?.includes('Managua')
                   ? 'Central America'
                   : parts[1]?.includes('Havana') || parts[1]?.includes('Jamaica') ||
                     parts[1]?.includes('Port-au-Prince') || parts[1]?.includes('Santo_Domingo') ||
                     parts[1]?.includes('Puerto_Rico') || parts[1]?.includes('Barbados') ||
                     parts[1]?.includes('Martinique') || parts[1]?.includes('Guadeloupe') ||
                     parts[1]?.includes('Curacao') || parts[1]?.includes('Aruba') ||
                     parts[1]?.includes('Nassau') || parts[1]?.includes('Cayman') ||
                     parts[1]?.includes('Port_of_Spain') || parts[1]?.includes('Antigua')
                   ? 'Caribbean'
                   : 'North America',
        'Antarctica': 'Antarctica',
        'Arctic': 'Arctic',
        'Asia': parts[1]?.includes('Dubai') || parts[1]?.includes('Riyadh') ||
                parts[1]?.includes('Qatar') || parts[1]?.includes('Kuwait') ||
                parts[1]?.includes('Bahrain') || parts[1]?.includes('Muscat') ||
                parts[1]?.includes('Jerusalem') || parts[1]?.includes('Beirut') ||
                parts[1]?.includes('Damascus') || parts[1]?.includes('Amman') ||
                parts[1]?.includes('Baghdad') || parts[1]?.includes('Tehran') ||
                parts[1]?.includes('Aden') || parts[1]?.includes('Gaza') ||
                parts[1]?.includes('Hebron')
                ? 'Middle East'
                : 'Asia',
        'Atlantic': 'Atlantic',
        'Australia': 'Australia',
        'Europe': 'Europe',
        'Indian': 'Indian Ocean',
        'Pacific': 'Pacific',
    };

    return regionMap[continent] || continent;
}

// Generate friendly label from timezone identifier
function generateLabel(timezone: string): string {
    if (timezone === 'UTC') return 'UTC';

    const parts = timezone.split('/');
    const city = parts[parts.length - 1];

    // Convert underscores to spaces and handle special cases
    return city
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        // Fix common abbreviations
        .replace(/^St /g, 'St. ')
        .replace(/Dt /g, 'DT ');
}

// Generate timezone data
const timezoneData: TimezoneData[] = allTimezones
    .map(tz => ({
        value: tz,
        label: generateLabel(tz),
        region: getRegion(tz),
    }))
    .sort((a, b) => {
        // Sort by region first, then by label
        if (a.region !== b.region) {
            return a.region.localeCompare(b.region);
        }
        return a.label.localeCompare(b.label);
    });

// Add UTC at the front (not in Intl.supportedValuesOf but important)
timezoneData.unshift({
    value: 'UTC',
    label: 'UTC',
    region: 'Global'
});

// Generate TypeScript code
const output = `/**
 * Comprehensive IANA timezone list
 * Auto-generated from Intl.supportedValuesOf('timeZone')
 * Generated: ${new Date().toISOString()}
 * Total timezones: ${timezoneData.length}
 */

export interface TimezoneData {
    value: string;
    label: string;
    region: string;
}

/**
 * Comprehensive timezone list organized by region
 * Values are IANA timezone identifiers
 */
export const TIMEZONES: TimezoneData[] = ${JSON.stringify(timezoneData, null, 4)};

/**
 * Get all unique regions
 */
export function getTimezoneRegions(): string[] {
    const regions = new Set(TIMEZONES.map(tz => tz.region));
    return Array.from(regions).sort();
}

/**
 * Get timezones for a specific region
 */
export function getTimezonesByRegion(region: string): TimezoneData[] {
    return TIMEZONES.filter(tz => tz.region === region);
}

/**
 * Calculate UTC offset for a timezone
 */
export function getUTCOffset(timezone: string): string {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'shortOffset'
        });
        const parts = formatter.formatToParts(now);
        const offset = parts.find(part => part.type === 'timeZoneName')?.value || 'UTC';
        return offset;
    } catch {
        return "UTC";
    }
}

/**
 * Get timezone display text with offset
 */
export function getTimezoneDisplayText(timezone: string): string {
    const tz = TIMEZONES.find(t => t.value === timezone);
    if (!tz) return timezone;

    const offset = getUTCOffset(timezone);
    return \`\${tz.label} (\${offset})\`;
}

/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return "UTC";
    }
}

/**
 * Check if a timezone is in our supported list
 */
export function isSupportedTimezone(timezone: string): boolean {
    return TIMEZONES.some(tz => tz.value === timezone);
}
`;

// Output only the TypeScript code (for piping to file)
console.log(output);

// Log summary to stderr so it doesn't pollute the output file
console.error(`Generated ${timezoneData.length} timezones across ${new Set(timezoneData.map(t => t.region)).size} regions`);
