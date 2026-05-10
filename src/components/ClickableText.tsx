import { detectLinksAndPhones, formatUrlForOpening, formatPhoneForDialing } from '../utils/linkDetector';

interface ClickableTextProps {
    text: string;
    className?: string;
}

export function ClickableText({ text, className = '' }: ClickableTextProps) {
    const segments = detectLinksAndPhones(text);

    // Helper to render text with line breaks
    const renderWithLineBreaks = (content: string, baseKey: number) => {
        const lines = content.split('\n');
        return lines.map((line, lineIndex) => (
            <span key={`${baseKey}-line-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
            </span>
        ));
    };

    return (
        <>
            <span className={className}>
                {segments.map((segment, index) => {
                    if (segment.type === 'text') {
                        return (
                            <span key={index}>
                                {renderWithLineBreaks(segment.content, index)}
                            </span>
                        );
                    }

                    return (
                        <a
                            key={index}
                            href={segment.type === 'phone' ? formatPhoneForDialing(segment.content) : formatUrlForOpening(segment.content)}
                            target={segment.type === 'link' ? "_blank" : undefined}
                            rel={segment.type === 'link' ? "noopener noreferrer" : undefined}
                            onClick={(e) => e.stopPropagation()}
                            className="underline underline-offset-2 decoration-1 font-semibold cursor-pointer hover:text-blue-600 transition-colors break-all"
                            style={{ textDecorationThickness: '1px' }}
                        >
                            {renderWithLineBreaks(segment.originalText || segment.content, index)}
                        </a>
                    );
                })}
            </span>
        </>
    );
}
