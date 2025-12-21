/**
 * Test cases for the text formatter utility
 * Run this file to verify the formatting behavior
 */

import { hasExcessiveCapitalization, toSentenceCase, formatTextForReadability } from './textFormatter';

// Test cases
const testCases = [
    {
        name: "Normal text (no excessive caps)",
        input: "This is a normal description with proper capitalization.",
        expectedFormatted: false,
    },
    {
        name: "More than 50% uppercase",
        input: "PRIME LOCATION CORNER PLOT NEAR MAIN ROAD URGENT SALE",
        expectedFormatted: true,
    },
    {
        name: "Exactly 50% uppercase (should not format)",
        input: "HALF half",
        expectedFormatted: false,
    },
    {
        name: "Mixed case but mostly uppercase",
        input: "BEAUTIFUL PROPERTY WITH MODERN AMENITIES and facilities",
        expectedFormatted: true,
    },
    {
        name: "Multiple sentences with excessive caps",
        input: "CORNER PLOT AVAILABLE. PRIME LOCATION. URGENT SALE!",
        expectedFormatted: true,
    },
    {
        name: "Empty string",
        input: "",
        expectedFormatted: false,
    },
    {
        name: "Only numbers and symbols",
        input: "123 456 @@@",
        expectedFormatted: false,
    }
];

console.log("=== Text Formatter Test Results ===\n");

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);

    const hasExcessiveCaps = hasExcessiveCapitalization(testCase.input);
    console.log(`Has excessive caps (>50%): ${hasExcessiveCaps}`);
    console.log(`Expected to format: ${testCase.expectedFormatted}`);

    const formatted = formatTextForReadability(testCase.input);
    console.log(`Output: "${formatted}"`);

    if (hasExcessiveCaps) {
        const sentenceCase = toSentenceCase(testCase.input);
        console.log(`Sentence case: "${sentenceCase}"`);
    }

    console.log("---\n");
});

console.log("=== Example Usage ===");
const exampleDescription = "CORNER PLOT AVAILABLE IN PRIME LOCATION. VERY URGENT SALE. CONTACT IMMEDIATELY!";
console.log(`Original: "${exampleDescription}"`);
console.log(`Formatted: "${formatTextForReadability(exampleDescription)}"`);
