import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[] | string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
}

export function MultiSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select options',
  label 
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convert string array to option objects if needed
  const optionObjects: MultiSelectOption[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optionValue));
  };



  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between ${
            value.length === 0 ? 'text-gray-400' : 'text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {value.length > 0 && (
              <div className="flex flex-wrap gap-1 flex-1">
                {value.slice(0, 2).map(val => {
                  const option = optionObjects.find(opt => opt.value === val);
                  return (
                    <span
                      key={val}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {option?.label || val}
                      <button
                        type="button"
                        onClick={(e) => removeOption(val, e)}
                        className="hover:bg-blue-200 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                {value.length > 2 && (
                  <span className="text-xs text-gray-600">+{value.length - 2}</span>
                )}
              </div>
            )}
            {value.length === 0 && <span>{placeholder}</span>}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {optionObjects.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                    isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

