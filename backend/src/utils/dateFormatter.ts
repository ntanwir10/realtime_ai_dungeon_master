import { format, formatDistanceToNow, formatRelative } from 'date-fns';

/**
 * Date formatting utilities for API responses
 * Provides consistent, readable date formats across the application
 */

export interface FormattedDate {
  iso: string;           // ISO 8601 format for machine consumption
  readable: string;      // Human-readable format (e.g., "January 15, 2024 at 2:30 PM")
  relative: string;      // Relative time (e.g., "2 hours ago", "yesterday")
  short: string;         // Short format (e.g., "Jan 15, 2024")
  timestamp: number;     // Unix timestamp for backward compatibility
}

/**
 * Format a date into multiple standardized formats
 * @param date - Date to format (Date object, timestamp, or ISO string)
 * @returns Object containing different date formats
 */
export function formatDate(date: Date | number | string): FormattedDate {
  const dateObj = typeof date === 'number' ? new Date(date) : 
                  typeof date === 'string' ? new Date(date) : date;
  
  const timestamp = dateObj.getTime();
  
  return {
    iso: dateObj.toISOString(),
    readable: format(dateObj, 'MMMM d, yyyy \'at\' h:mm a'),
    relative: formatDistanceToNow(dateObj, { addSuffix: true }),
    short: format(dateObj, 'MMM d, yyyy'),
    timestamp
  };
}

/**
 * Format current date/time
 * @returns Formatted current date
 */
export function formatCurrentDate(): FormattedDate {
  return formatDate(new Date());
}

/**
 * Format a timestamp for API responses
 * @param timestamp - Unix timestamp
 * @returns Formatted date object
 */
export function formatTimestamp(timestamp: number): FormattedDate {
  return formatDate(timestamp);
}

/**
 * Format date for health check responses
 * @returns ISO string for health checks
 */
export function formatHealthCheckDate(): string {
  return new Date().toISOString();
}

/**
 * Format date for error responses
 * @returns Formatted date for error logging
 */
export function formatErrorDate(): FormattedDate {
  return formatCurrentDate();
}

/**
 * Format date for game events
 * @param timestamp - Event timestamp
 * @returns Formatted date for game events
 */
export function formatGameEventDate(timestamp: number): FormattedDate {
  return formatDate(timestamp);
}

/**
 * Format date for session data
 * @param timestamp - Session timestamp
 * @returns Formatted date for session information
 */
export function formatSessionDate(timestamp: number): FormattedDate {
  return formatDate(timestamp);
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param date - Date to get relative time for
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | number | string): string {
  const dateObj = typeof date === 'number' ? new Date(date) : 
                  typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Get readable date string (e.g., "January 15, 2024 at 2:30 PM")
 * @param date - Date to format
 * @returns Readable date string
 */
export function getReadableDate(date: Date | number | string): string {
  const dateObj = typeof date === 'number' ? new Date(date) : 
                  typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMMM d, yyyy \'at\' h:mm a');
}

/**
 * Get short date string (e.g., "Jan 15, 2024")
 * @param date - Date to format
 * @returns Short date string
 */
export function getShortDate(date: Date | number | string): string {
  const dateObj = typeof date === 'number' ? new Date(date) : 
                  typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM d, yyyy');
}
