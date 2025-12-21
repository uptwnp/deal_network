import { useState, useRef, useEffect } from 'react';
import { Copy, ExternalLink, Phone } from 'lucide-react';
import { detectLinksAndPhones, formatUrlForOpening, formatPhoneForDialing, TextSegment } from '../utils/linkDetector';

interface ClickableTextProps {
    text: string;
    className?: string;
}

interface ContextMenuProps {
    segment: TextSegment;
    position: { x: number; y: number };
    onClose: () => void;
}

function ContextMenu({ segment, position, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleCopy = () => {
        navigator.clipboard.writeText(segment.content);
        onClose();
    };

    const handleOpen = () => {
        if (segment.type === 'phone') {
            window.location.href = formatPhoneForDialing(segment.content);
        } else if (segment.type === 'link') {
            window.open(formatUrlForOpening(segment.content), '_blank');
        }
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px]"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            <button
                onClick={handleCopy}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
                <Copy className="w-4 h-4" />
                Copy
            </button>
            <button
                onClick={handleOpen}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
                {segment.type === 'phone' ? (
                    <>
                        <Phone className="w-4 h-4" />
                        Call
                    </>
                ) : (
                    <>
                        <ExternalLink className="w-4 h-4" />
                        Open Link
                    </>
                )}
            </button>
        </div>
    );
}

export function ClickableText({ text, className = '' }: ClickableTextProps) {
    const [contextMenu, setContextMenu] = useState<{
        segment: TextSegment;
        position: { x: number; y: number };
    } | null>(null);

    const segments = detectLinksAndPhones(text);

    const handleSegmentClick = (segment: TextSegment, event: React.MouseEvent) => {
        if (segment.type === 'text') return;

        event.preventDefault();
        event.stopPropagation();

        // Calculate position for context menu
        const x = event.clientX;
        const y = event.clientY;

        setContextMenu({ segment, position: { x, y } });
    };

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
                        <span
                            key={index}
                            onClick={(e) => handleSegmentClick(segment, e)}
                            className="underline underline-offset-2 decoration-1 font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                            style={{ textDecorationThickness: '1px' }}
                        >
                            {renderWithLineBreaks(segment.originalText || segment.content, index)}
                        </span>
                    );
                })}
            </span>

            {contextMenu && (
                <ContextMenu
                    segment={contextMenu.segment}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </>
    );
}
