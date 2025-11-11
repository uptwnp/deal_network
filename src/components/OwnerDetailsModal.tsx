import { X, Phone, MessageCircle } from 'lucide-react';
import { Property } from '../types/property';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { formatPriceWithLabel } from '../utils/priceFormatter';
import { formatSize } from '../utils/sizeFormatter';
import { useEffect } from 'react';

interface OwnerDetailsModalProps {
  property: Property;
  onClose: () => void;
}

export function OwnerDetailsModal({
  property,
  onClose,
}: OwnerDetailsModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, []);

  const handleCall = () => {
    if (property.owner_phone) {
      window.location.href = `tel:${property.owner_phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (property.owner_phone) {
      // Remove any non-digit characters except + for international format
      const phoneNumber = property.owner_phone.replace(/[^\d+]/g, '');
      
      // Create property link
      const propertyLink = `${window.location.origin}/property/${property.id}`;
      
      // Create message with property details and link
      const sizeText = formatSize(property.size_min, property.size_max, property.size_unit);
      const priceText = formatPriceWithLabel(property.price_min, property.price_max);
      
      const message = `Hi, I'm interested in this property:\n\n${property.type} in ${property.area}, ${property.city}\n${property.description ? property.description + '\n' : ''}Size: ${sizeText}\nPrice: ${priceText}\n\nView property: ${propertyLink}`;
      
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md mobile-modal-content sm:max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Owner Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {property.owner_firm_name && (
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Firm Name</p>
              <p className="text-sm sm:text-base font-semibold text-gray-900">
                {property.owner_firm_name}
              </p>
            </div>
          )}

          {property.owner_name && (
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Owner Name</p>
              <p className="text-sm sm:text-base font-semibold text-gray-900">
                {property.owner_name}
              </p>
            </div>
          )}

          {property.owner_phone && (
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Phone</p>
              <p className="text-sm sm:text-base font-semibold text-gray-900">
                {property.owner_phone}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 space-y-3">
            {property.owner_phone && (
              <>
                <button
                  onClick={handleCall}
                  className="w-full px-4 py-3 flex items-center justify-center gap-2 bg-green-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  Call
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="w-full px-4 py-3 flex items-center justify-center gap-2 bg-[#25D366] text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-[#20BA5A] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

