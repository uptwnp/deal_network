import { useEffect } from 'react';
import { Property } from '../types/property';
import { PropertyDetailsContent } from './PropertyDetailsContent';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface PropertyDetailsModalProps {
  property: Property;
  isOwned: boolean;
  onClose: () => void;
  onEdit?: (property: Property) => void;
  onDelete?: (id: number) => void;
  onTogglePublic?: (id: number, isPublic: boolean) => void;
  onShare?: (property: Property) => void;
  onAskQuestion?: (property: Property) => void;
  onUpdateHighlightsAndTags?: (id: number, highlights: string, tags: string) => void;
  onUpdateLocation?: (id: number, location: string, locationAccuracy: string) => void;
  onUpdateLandmarkLocation?: (id: number, landmarkLocation: string, landmarkLocationDistance: string) => void;
  onFav?: (id: number, isFavourite: boolean, userNote: string) => void;
}

export function PropertyDetailsModal(props: PropertyDetailsModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl mobile-modal-content max-h-[90vh] sm:max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
        <PropertyDetailsContent {...props} className="h-full overflow-hidden" />
      </div>
    </div>
  );
}
