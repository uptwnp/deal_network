import React, { useRef, useState, useEffect, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
    disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
    onRefresh,
    children,
    disabled = false
}) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const touchStartY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const PULL_THRESHOLD = 80; // Distance needed to trigger refresh
    const MAX_PULL = 120; // Maximum pull distance

    useEffect(() => {
        const container = containerRef.current;
        if (!container || disabled) return;

        let startY = 0;
        let currentY = 0;
        let scrollTop = 0;

        const handleTouchStart = (e: TouchEvent) => {
            // Only allow pull-to-refresh when scrolled to the top
            scrollTop = container.scrollTop;
            if (scrollTop === 0 && !isRefreshing) {
                startY = e.touches[0].clientY;
                touchStartY.current = startY;
                setIsPulling(false);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isRefreshing) return;

            scrollTop = container.scrollTop;
            currentY = e.touches[0].clientY;
            const distance = currentY - startY;

            // Only allow pulling down when at the top and pulling down
            if (scrollTop === 0 && distance > 0) {
                // Prevent default scroll behavior when pulling
                e.preventDefault();

                setIsPulling(true);

                // Apply diminishing returns for a more natural feel
                const adjustedDistance = Math.min(
                    distance * 0.5, // Slow down the pull
                    MAX_PULL
                );

                setPullDistance(adjustedDistance);
            }
        };

        const handleTouchEnd = async () => {
            if (isRefreshing) return;

            setIsPulling(false);

            // Trigger refresh if pulled past threshold
            if (pullDistance >= PULL_THRESHOLD) {
                setIsRefreshing(true);
                setPullDistance(PULL_THRESHOLD); // Lock at threshold during refresh

                try {
                    await onRefresh();
                } catch (error) {
                    console.error('Refresh failed:', error);
                } finally {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }
            } else {
                // Spring back if not pulled enough
                setPullDistance(0);
            }
        };

        // Use passive: false to allow preventDefault
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [disabled, isRefreshing, pullDistance, onRefresh]);

    const getRefreshIconRotation = () => {
        if (isRefreshing) {
            return 'rotate-0'; // Will be animated with spin
        }
        // Rotate based on pull distance (0 to 360 degrees)
        const rotation = Math.min((pullDistance / PULL_THRESHOLD) * 360, 360);
        return `rotate-[${rotation}deg]`;
    };

    const getRefreshIndicatorOpacity = () => {
        return Math.min(pullDistance / PULL_THRESHOLD, 1);
    };

    return (
        <div
            ref={containerRef}
            className="relative h-full overflow-y-auto"
            style={{
                overscrollBehavior: 'none',
                WebkitOverflowScrolling: 'touch',
            }}
        >
            {/* Pull-to-refresh indicator */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out"
                style={{
                    height: `${pullDistance}px`,
                    opacity: getRefreshIndicatorOpacity(),
                    pointerEvents: 'none',
                }}
            >
                <div className="flex flex-col items-center gap-1">
                    <div className="relative">
                        <RefreshCw
                            className={`w-6 h-6 text-blue-600 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''
                                }`}
                            style={{
                                transform: isRefreshing ? undefined : `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)`,
                            }}
                        />
                    </div>
                    {pullDistance >= PULL_THRESHOLD && !isRefreshing && (
                        <span className="text-xs font-medium text-blue-600">Release to refresh</span>
                    )}
                    {isRefreshing && (
                        <span className="text-xs font-medium text-blue-600">Refreshing...</span>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div
                className="transition-transform duration-200 ease-out"
                style={{
                    transform: `translateY(${pullDistance}px)`,
                }}
            >
                {children}
            </div>
        </div>
    );
};
