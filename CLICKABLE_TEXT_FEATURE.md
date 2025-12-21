# Clickable Text Feature

## Overview
This feature detects phone numbers and links in property descriptions and notes, making them clickable with options to copy or open.

## Implementation

### Files Created:
1. **`src/utils/linkDetector.ts`** - Utility to detect and parse phone numbers and URLs
2. **`src/components/ClickableText.tsx`** - Component that renders text with clickable segments

### Files Modified:
1. **`src/components/PropertyDetailsContent.tsx`** - Updated to use ClickableText for:
   - Property description
   - Owner's private note (note_private)
   - User's note (user_note)

2. **`src/components/PropertyCard.tsx`** - Updated to use ClickableText for property descriptions

## Features

### Phone Number Detection
- Detects various Indian phone number formats:
  - `9876543210`
  - `+919876543210`
  - `91-9876543210`
  - `+91 98765 43210`
  - And more...

### URL Detection
- Detects both:
  - Full URLs: `https://example.com` or `http://example.com`
  - www URLs: `www.example.com`

### Styling
- Phone numbers and links are:
  - **Underlined** with a subtle 1px underline
  - **Semi-bold** (font-semibold)
  - NOT blue (uses default text color)
  - Hover effect changes color to blue

### Click Behavior
When clicking on a detected phone number or link:
1. A context menu appears near the click position
2. The menu offers two options:
   - **Copy** - Copies the phone number or URL to clipboard
   - **Call** (for phone numbers) - Opens the phone dialer
   - **Open Link** (for URLs) - Opens the URL in a new tab

## Usage Example

```tsx
import { ClickableText } from './components/ClickableText';

// In your component
<ClickableText text={property.description} />
```

## Testing
To test this feature:
1. Create or view a property with a phone number in the description (e.g., "Call me at 9876543210")
2. Create or view a property with a URL in the description (e.g., "Visit www.example.com")
3. Click on the detected phone number or link
4. Verify the context menu appears with Copy and Open/Call options
