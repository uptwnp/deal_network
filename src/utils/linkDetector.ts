export interface TextSegment {
    type: 'text' | 'phone' | 'link';
    content: string;
    originalText?: string; // For phone numbers, this is the formatted version
}

/**
 * Detect phone numbers and links in text and return segments
 */
export function detectLinksAndPhones(text: string): TextSegment[] {
    if (!text) return [];

    const segments: TextSegment[] = [];

    // Regex patterns
    // Phone pattern: matches various Indian phone number formats
    // Examples: 9876543210, +919876543210, 91-9876543210, +91 98765 43210, etc.
    const phonePattern = /(\+?91[-\s]?)?[6-9]\d{9}|\+?\d{10,13}/g;

    // Combined pattern to process phone numbers and URLs in order
    const combinedPattern = /((\+?91[-\s]?)?[6-9]\d{9}|\+?\d{10,13})|(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

    let lastIndex = 0;
    let match;

    while ((match = combinedPattern.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: text.substring(lastIndex, match.index),
            });
        }

        // Determine if it's a phone number or URL
        const matchedText = match[0];

        if (phonePattern.test(matchedText)) {
            // It's a phone number
            segments.push({
                type: 'phone',
                content: cleanPhoneNumber(matchedText),
                originalText: matchedText,
            });
        } else {
            // It's a URL
            segments.push({
                type: 'link',
                content: matchedText,
            });
        }

        lastIndex = match.index + matchedText.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            content: text.substring(lastIndex),
        });
    }

    return segments.length === 0 ? [{ type: 'text', content: text }] : segments;
}

/**
 * Clean and normalize phone number
 */
function cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
}

/**
 * Format URL for opening (add https:// if needed)
 */
export function formatUrlForOpening(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `https://${url}`;
}

/**
 * Format phone number for tel: link
 */
export function formatPhoneForDialing(phone: string): string {
    return `tel:${cleanPhoneNumber(phone)}`;
}
