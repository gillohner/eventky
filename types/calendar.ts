/**
 * Calendar-related types
 */

/**
 * Form data structure for calendar creation/editing
 */
export interface CalendarFormData {
    // Required fields
    name: string;
    timezone: string;

    // Optional fields
    color?: string;
    image_uri?: string;
    description?: string;
    url?: string;
    x_pubky_admins?: string[];
}
