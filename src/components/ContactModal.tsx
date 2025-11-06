import { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Property } from '../types/property';
import { formatPrice } from '../utils/priceFormatter';

interface ContactModalProps {
  property: Property;
  ownerPhone: string;
  senderId: number;
  onClose: () => void;
  onSubmit: (message: string, phone: string) => void;
}

const STORAGE_KEY = 'propnetwork_contact_question';

export function ContactModal({
  property,
  ownerPhone,
  senderId,
  onClose,
  onSubmit,
}: ContactModalProps) {
  // Load draft from localStorage
  const loadDraft = (): string => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  };

  const [question, setQuestion] = useState(loadDraft());
  const [loading, setLoading] = useState(false);

  // Save draft to localStorage as user types
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, question);
  }, [question]);

  const handleSendQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const message = `Hi, I'm interested in the ${property.type} at ${property.area}, ${property.city}.\n\nMy Question: ${question}\n\nProperty ID: ${property.id}\nSender ID: ${senderId}`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${ownerPhone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;

      window.open(whatsappUrl, '_blank');
      onSubmit(question, ownerPhone);
      // Clear draft on successful submit
      localStorage.removeItem(STORAGE_KEY);
      setQuestion('');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[98vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Ask a Question</h2>
          <button
            onClick={() => {
              // Clear draft when closed
              localStorage.removeItem(STORAGE_KEY);
              onClose();
            }}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-medium text-blue-900">
              {property.type} in {property.area}, {property.city}
            </p>
            <p className="text-xs text-blue-800 mt-1">
              {formatPrice(property.price_min, property.price_max, true)} • {property.size_unit}
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              Your Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know about this property?"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm sm:text-base"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Your message will be sent via WhatsApp to the property owner
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 sm:pt-4">
            <button
              onClick={() => {
                // Clear draft when cancelled
                localStorage.removeItem(STORAGE_KEY);
                onClose();
              }}
              className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendQuestion}
              disabled={!question.trim() || loading}
              className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:bg-gray-300 flex items-center justify-center gap-1.5 sm:gap-2"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
