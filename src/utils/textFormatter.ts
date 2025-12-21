/**
 * Checks if more than 50% of the letters in a text are uppercase
 * @param text - The text to analyze
 * @returns true if more than 50% of letters are uppercase
 */
export function hasExcessiveCapitalization(text: string): boolean {
    if (!text) return false;

    // Extract only letters (ignore numbers, spaces, punctuation)
    const letters = text.match(/[a-zA-Z]/g);
    if (!letters || letters.length === 0) return false;

    const uppercaseLetters = text.match(/[A-Z]/g);
    const uppercaseCount = uppercaseLetters ? uppercaseLetters.length : 0;
    const totalLetters = letters.length;

    // Check if more than 50% are uppercase
    return (uppercaseCount / totalLetters) > 0.5;
}

/**
 * Converts text to sentence case (first letter uppercase, rest lowercase)
 * @param text - The text to convert
 * @returns Text in sentence case
 */
export function toSentenceCase(text: string): string {
    if (!text) return text;

    // Split into sentences (by ., !, ?)
    const sentences = text.split(/([.!?]\s+)/);

    return sentences.map((sentence, index) => {
        // Skip the separator parts (., !, ? with spaces)
        if (index % 2 === 1) return sentence;

        const trimmed = sentence.trim();
        if (!trimmed) return sentence;

        // Capitalize first letter, lowercase the rest
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    }).join('');
}

/**
 * Improves readability of text with excessive capitalization
 * @param text - The text to improve
 * @returns Formatted text with improved readability
 */
export function formatTextForReadability(text: string): string {
    if (!text) return text;

    // Check if text has excessive capitalization
    if (hasExcessiveCapitalization(text)) {
        return toSentenceCase(text);
    }

    // Return original text if it's already readable
    return text;
}
