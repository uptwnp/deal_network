import { useState, useEffect, useRef, useCallback } from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
  label?: string;
}

export function RangeSlider({ 
  min, 
  max, 
  step = 1, 
  value, 
  onChange, 
  formatValue = (v) => v.toString(),
  label 
}: RangeSliderProps) {
  const [minVal, setMinVal] = useState(value[0]);
  const [maxVal, setMaxVal] = useState(value[1]);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<'min' | 'max' | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const minHandleRef = useRef<HTMLDivElement>(null);
  const maxHandleRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  const dragStartPos = useRef<{ x: number; value: number } | null>(null);
  const isDraggingRef = useRef<'min' | 'max' | null>(null);
  const minValRef = useRef(minVal);
  const maxValRef = useRef(maxVal);
  
  // Keep refs in sync with state
  useEffect(() => {
    minValRef.current = minVal;
    maxValRef.current = maxVal;
  }, [minVal, maxVal]);
  
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Sync with external value changes
  useEffect(() => {
    setMinVal(value[0]);
    setMaxVal(value[1]);
  }, [value]);

  // Convert value to percentage
  const valueToPercent = useCallback((val: number) => {
    return ((val - min) / (max - min)) * 100;
  }, [min, max]);

  // Convert percentage to value
  const percentToValue = useCallback((percent: number) => {
    const rawValue = min + (percent / 100) * (max - min);
    return Math.round(rawValue / step) * step;
  }, [min, max, step]);

  // Update range visual (only when not dragging - during drag we update directly via DOM)
  useEffect(() => {
    if (rangeRef.current && !isDragging) {
      const minPercent = valueToPercent(minVal);
      const maxPercent = valueToPercent(maxVal);
      rangeRef.current.style.left = `${minPercent}%`;
      rangeRef.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [minVal, maxVal, valueToPercent, isDragging]);

  // Disable transitions during drag for smooth interaction
  useEffect(() => {
    if (isDragging) {
      if (minHandleRef.current) {
        minHandleRef.current.style.transition = 'none';
      }
      if (maxHandleRef.current) {
        maxHandleRef.current.style.transition = 'none';
      }
    } else {
      // Re-enable transitions when not dragging
      if (minHandleRef.current) {
        minHandleRef.current.style.transition = '';
      }
      if (maxHandleRef.current) {
        maxHandleRef.current.style.transition = '';
      }
    }
  }, [isDragging]);

  // Handle mouse move during drag - use requestAnimationFrame for smooth updates
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !dragStartPos.current || !containerRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newValue = Math.max(min, Math.min(max, percentToValue(percent)));
      const activeHandle = isDraggingRef.current;

      if (activeHandle === 'min') {
        const currentMax = maxValRef.current;
        const clampedValue = Math.min(newValue, currentMax - step);
        
        // Update refs immediately for smooth visual updates
        minValRef.current = clampedValue;
        
        // Update visual position directly via DOM for smoothness
        if (minHandleRef.current) {
          const minPercent = valueToPercent(clampedValue);
          minHandleRef.current.style.left = `${minPercent}%`;
        }
        if (rangeRef.current) {
          const minPercent = valueToPercent(clampedValue);
          const maxPercent = valueToPercent(currentMax);
          rangeRef.current.style.left = `${minPercent}%`;
          rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
        
        // Update state (but don't call onChange during drag - only on release)
        setMinVal(clampedValue);
      } else if (activeHandle === 'max') {
        const currentMin = minValRef.current;
        const clampedValue = Math.max(newValue, currentMin + step);
        
        // Update refs immediately for smooth visual updates
        maxValRef.current = clampedValue;
        
        // Update visual position directly via DOM for smoothness
        if (maxHandleRef.current) {
          const maxPercent = valueToPercent(clampedValue);
          maxHandleRef.current.style.left = `${maxPercent}%`;
        }
        if (rangeRef.current) {
          const minPercent = valueToPercent(currentMin);
          const maxPercent = valueToPercent(clampedValue);
          rangeRef.current.style.left = `${minPercent}%`;
          rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
        
        // Update state (but don't call onChange during drag - only on release)
        setMaxVal(clampedValue);
      }
    });
  }, [min, max, step, percentToValue, valueToPercent]);

  // Handle mouse up - call onChange with final values
  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      const activeHandle = isDraggingRef.current;
      // Call onChange with final values when drag ends
      if (activeHandle === 'min') {
        onChange([minValRef.current, maxValRef.current]);
      } else if (activeHandle === 'max') {
        onChange([minValRef.current, maxValRef.current]);
      }
      
      setIsDragging(null);
      isDraggingRef.current = null;
      dragStartPos.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [handleMouseMove, onChange]);

  // Handle touch move during drag - use requestAnimationFrame for smooth updates
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingRef.current || !dragStartPos.current || !containerRef.current) {
      return;
    }

    e.preventDefault();
    
    requestAnimationFrame(() => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newValue = Math.max(min, Math.min(max, percentToValue(percent)));
      const activeHandle = isDraggingRef.current;

      if (activeHandle === 'min') {
        const currentMax = maxValRef.current;
        const clampedValue = Math.min(newValue, currentMax - step);
        
        // Update refs immediately for smooth visual updates
        minValRef.current = clampedValue;
        
        // Update visual position directly via DOM for smoothness
        if (minHandleRef.current) {
          const minPercent = valueToPercent(clampedValue);
          minHandleRef.current.style.left = `${minPercent}%`;
        }
        if (rangeRef.current) {
          const minPercent = valueToPercent(clampedValue);
          const maxPercent = valueToPercent(currentMax);
          rangeRef.current.style.left = `${minPercent}%`;
          rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
        
        // Update state (but don't call onChange during drag - only on release)
        setMinVal(clampedValue);
      } else if (activeHandle === 'max') {
        const currentMin = minValRef.current;
        const clampedValue = Math.max(newValue, currentMin + step);
        
        // Update refs immediately for smooth visual updates
        maxValRef.current = clampedValue;
        
        // Update visual position directly via DOM for smoothness
        if (maxHandleRef.current) {
          const maxPercent = valueToPercent(clampedValue);
          maxHandleRef.current.style.left = `${maxPercent}%`;
        }
        if (rangeRef.current) {
          const minPercent = valueToPercent(currentMin);
          const maxPercent = valueToPercent(clampedValue);
          rangeRef.current.style.left = `${minPercent}%`;
          rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
        
        // Update state (but don't call onChange during drag - only on release)
        setMaxVal(clampedValue);
      }
    });
  }, [min, max, step, percentToValue, valueToPercent]);

  const handleTouchEnd = useCallback(() => {
    if (isDraggingRef.current) {
      const activeHandle = isDraggingRef.current;
      // Call onChange with final values when drag ends
      if (activeHandle === 'min') {
        onChange([minValRef.current, maxValRef.current]);
      } else if (activeHandle === 'max') {
        onChange([minValRef.current, maxValRef.current]);
      }
      
      setIsDragging(null);
      isDraggingRef.current = null;
      dragStartPos.current = null;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    }
  }, [handleTouchMove, onChange]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, handle: 'min' | 'max') => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(handle);
    isDraggingRef.current = handle;
    const touch = e.touches[0];
    
    if (containerRef.current) {
      dragStartPos.current = {
        x: touch.clientX,
        value: handle === 'min' ? minValRef.current : maxValRef.current
      };
    }
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove, handleTouchEnd]);

  // Handle mouse down on handle
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, handle: 'min' | 'max') => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(handle);
    isDraggingRef.current = handle;
    dragStartPos.current = {
      x: e.clientX,
      value: handle === 'min' ? minValRef.current : maxValRef.current
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Prevent track clicks
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const isMinAtStart = minVal === min;
  const isMaxAtEnd = maxVal === max;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
        </label>
      )}
      
      {/* Slider Container */}
      <div className="relative py-4">
        {/* Track Background */}
        <div
          ref={trackRef}
          className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-200 rounded-full -translate-y-1/2 cursor-not-allowed"
          onClick={handleTrackClick}
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Active Range */}
        <div
          ref={rangeRef}
          className="absolute top-1/2 h-1.5 bg-blue-600 rounded-full -translate-y-1/2 pointer-events-none"
          style={{
            transition: isDragging ? 'none' : 'left 0.1s ease-out, width 0.1s ease-out',
          }}
        />
        
        {/* Container for drag calculations - must be behind handles */}
        <div
          ref={containerRef}
          className="absolute top-0 left-0 right-0 h-full"
          style={{ pointerEvents: 'none', zIndex: 0 }}
        />
        
        {/* Min Handle */}
        <div
          ref={minHandleRef}
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none ${
            isDragging === 'min' 
              ? 'scale-125 z-50' 
              : hoveredHandle === 'min' 
              ? 'scale-110 z-40 transition-all duration-150 ease-out' 
              : 'scale-100 z-30 transition-all duration-150 ease-out'
          }`}
          style={{
            left: `${valueToPercent(minVal)}%`,
            cursor: isDragging === 'min' ? 'grabbing' : 'grab',
            pointerEvents: 'all',
            transition: isDragging === 'min' ? 'none' : 'left 0.1s ease-out, transform 0.15s ease-out',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'min')}
          onTouchStart={(e) => handleTouchStart(e, 'min')}
          onMouseEnter={() => setHoveredHandle('min')}
          onMouseLeave={() => {
            if (isDragging !== 'min') {
              setHoveredHandle(null);
            }
          }}
        >
          {/* Larger hit area for easier interaction */}
          <div className="absolute inset-0 -m-2" style={{ pointerEvents: 'none' }} />
          <div className="w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-150 flex items-center justify-center relative z-10">
            <div className="w-2 h-2 bg-blue-600 rounded-full" />
          </div>
        </div>
        
        {/* Max Handle */}
        <div
          ref={maxHandleRef}
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none ${
            isDragging === 'max' 
              ? 'scale-125 z-50' 
              : hoveredHandle === 'max' 
              ? 'scale-110 z-40 transition-all duration-150 ease-out' 
              : 'scale-100 z-30 transition-all duration-150 ease-out'
          }`}
          style={{
            left: `${valueToPercent(maxVal)}%`,
            cursor: isDragging === 'max' ? 'grabbing' : 'grab',
            pointerEvents: 'all',
            transition: isDragging === 'max' ? 'none' : 'left 0.1s ease-out, transform 0.15s ease-out',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'max')}
          onTouchStart={(e) => handleTouchStart(e, 'max')}
          onMouseEnter={() => setHoveredHandle('max')}
          onMouseLeave={() => {
            if (isDragging !== 'max') {
              setHoveredHandle(null);
            }
          }}
        >
          {/* Larger hit area for easier interaction */}
          <div className="absolute inset-0 -m-2" style={{ pointerEvents: 'none' }} />
          <div className="w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-150 flex items-center justify-center relative z-10">
            <div className="w-2 h-2 bg-blue-600 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Value Labels */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500 mb-0.5">Min</span>
          <span className={`text-sm font-semibold transition-colors duration-150 ${
            isMinAtStart ? 'text-gray-400' : 'text-gray-900'
          }`}>
            {isMinAtStart ? 'Min' : formatValue(minVal)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500 mb-0.5">Max</span>
          <span className={`text-sm font-semibold transition-colors duration-150 ${
            isMaxAtEnd ? 'text-gray-400' : 'text-gray-900'
          }`}>
            {isMaxAtEnd ? 'Max' : formatValue(maxVal)}
          </span>
        </div>
      </div>
    </div>
  );
}