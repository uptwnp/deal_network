import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptCardProps {
  onDismiss?: () => void;
}

export function InstallPromptCard({ onDismiss }: InstallPromptCardProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if iOS
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(checkIOS);

    // Check if app is already installed (standalone mode)
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isStandaloneMode = isStandalone || isIOSStandalone;
      
      setIsInstalled(isStandaloneMode);
      
      // Check localStorage for dismissed state with timestamp
      const dismissedTimestamp = localStorage.getItem('pwa-install-dismissed');
      if (dismissedTimestamp) {
        const dismissedTime = parseInt(dismissedTimestamp, 10);
        const currentTime = Date.now();
        const twoMinutesInMs = 2 * 60 * 1000;
        
        if (currentTime - dismissedTime < twoMinutesInMs) {
          setIsDismissed(true);
        } else {
          localStorage.removeItem('pwa-install-dismissed');
          setIsDismissed(false);
        }
      }
    };

    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show prompt after a short delay
      const autoPromptShown = sessionStorage.getItem('pwa-auto-prompt-shown');
      if (!autoPromptShown) {
        setTimeout(async () => {
          try {
            await promptEvent.prompt();
            sessionStorage.setItem('pwa-auto-prompt-shown', 'true');
            const choiceResult = await promptEvent.userChoice;
            if (choiceResult.outcome === 'accepted') {
              setDeferredPrompt(null);
            }
          } catch (error) {
            console.error('Error showing install prompt:', error);
            sessionStorage.removeItem('pwa-auto-prompt-shown');
          }
        }, 3000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsDismissed(false);
      localStorage.removeItem('pwa-install-dismissed');
      sessionStorage.removeItem('pwa-auto-prompt-shown');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Re-check on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkIfInstalled();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up interval to re-check dismissal status
    const checkInterval = setInterval(() => {
      const dismissedTimestamp = localStorage.getItem('pwa-install-dismissed');
      if (dismissedTimestamp) {
        const dismissedTime = parseInt(dismissedTimestamp, 10);
        const currentTime = Date.now();
        const twoMinutesInMs = 2 * 60 * 1000;
        
        if (currentTime - dismissedTime >= twoMinutesInMs) {
          localStorage.removeItem('pwa-install-dismissed');
          setIsDismissed(false);
        }
      }
    }, 30000);

    // Animate in after mount
    setTimeout(() => setIsVisible(true), 100);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        alert('To install Dealer Network:\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right');
      } else if (isAndroid) {
        alert('To install Dealer Network:\n1. Tap the menu (⋮) in your browser\n2. Tap "Install app" or "Add to Home screen"');
      } else {
        alert('Look for the install icon in your browser\'s address bar, or check the browser menu for "Install" option.');
      }
      return;
    }

    const autoPromptShown = sessionStorage.getItem('pwa-auto-prompt-shown');
    if (autoPromptShown) {
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isAndroid) {
        alert('To install Dealer Network:\n1. Tap the menu (⋮) in your browser\n2. Tap "Install app" or "Add to Home screen"');
      } else {
        alert('Look for the install icon in your browser\'s address bar, or check the browser menu for "Install" option.');
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      sessionStorage.setItem('pwa-auto-prompt-shown', 'true');
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
      sessionStorage.removeItem('pwa-auto-prompt-shown');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setDeferredPrompt(null);
    if (onDismiss) {
      onDismiss();
    }
  };

  // Don't show if installed or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  // Show prompt if we have a deferredPrompt or we're on iOS
  const shouldShow = deferredPrompt || (isIOS && !isInstalled);

  if (!shouldShow) {
    return null;
  }

  return (
    <div 
      className={`w-full relative overflow-hidden rounded-lg transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Main card - double header height (h-28 = 7rem, sm:h-32 = 8rem) */}
      <div className="relative bg-white border border-gray-200 rounded-lg shadow-md h-28 sm:h-32">
        <div className="h-full flex items-center px-4 sm:px-6 relative">
          {/* Close button - positioned at top right */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all z-10"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content section */}
          <div className="flex items-center justify-between w-full pr-8">
            {/* Left side - Title and description */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                Install Dealer Network
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Get faster access and a better experience on your device
              </p>
            </div>

            {/* Right side - Install button */}
            <div className="flex-shrink-0 ml-4">
              <button
                onClick={handleInstall}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Legacy component name for backward compatibility
export function InstallPrompt() {
  return <InstallPromptCard />;
}
