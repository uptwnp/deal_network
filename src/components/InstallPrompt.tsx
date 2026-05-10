import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

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
  const [showInstructions, setShowInstructions] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if iOS
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(checkIOS);

    // Check if app is already installed (standalone mode)
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isStandaloneMode = isStandalone || isIOSStandalone;
      
      setIsInstalled(isStandaloneMode);
      
      // Check if service worker is registered (indicates PWA is set up)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            setCanInstall(true);
          }
        });
      }
      
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
    
    // Check if deferredPrompt was already captured by the early script
    const checkStoredPrompt = () => {
      const storedPrompt = (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent | null }).deferredPrompt;
      if (storedPrompt) {
        setDeferredPrompt(storedPrompt);
        setCanInstall(true);
      }
    };
    
    // Check immediately
    checkStoredPrompt();
    
    // Also check after a delay to ensure service worker has time to register
    const delayedCheck = setTimeout(() => {
      checkIfInstalled();
      checkStoredPrompt();
    }, 2000);

    // Listen for beforeinstallprompt event (in case it fires after component mounts)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
      // Also store in window for persistence
      (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent | null }).deferredPrompt = promptEvent;
      (window as unknown as { pwaInstallPromptAvailable?: boolean }).pwaInstallPromptAvailable = true;
      // Don't auto-show prompt, wait for user to click install
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsDismissed(false);
      setCanInstall(false);
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
    
    // Set up interval to re-check dismissal status and installability
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
      
      // Re-check if service worker is registered
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration && !isInstalled) {
            setCanInstall(true);
          }
        });
      }
    }, 30000);

    // Animate in after mount
    setTimeout(() => setIsVisible(true), 100);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
      clearTimeout(delayedCheck);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    // First check if we have a deferred prompt in state
    let promptToUse = deferredPrompt;
    
    // If not in state, check if it's stored in window (captured by early script)
    if (!promptToUse) {
      promptToUse = (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent | null }).deferredPrompt || null;
      if (promptToUse) {
        setDeferredPrompt(promptToUse);
      }
    }
    
    // If browser prompt is available, use it directly
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        sessionStorage.setItem('pwa-auto-prompt-shown', 'true');
        const choiceResult = await promptToUse.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
          (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent | null }).deferredPrompt = null;
          (window as unknown as { pwaInstallPromptAvailable?: boolean }).pwaInstallPromptAvailable = false;
        }
      } catch (error) {
        console.error('Error showing install prompt:', error);
        sessionStorage.removeItem('pwa-auto-prompt-shown');
        // If prompt fails, show instructions as fallback
        setShowInstructions(true);
      }
      return;
    }
    
    // No browser prompt available, show instructions as fallback
    setShowInstructions(true);
  };

  const handleConfirmInstall = () => {
    // This is only called when instructions are shown (no deferredPrompt)
    // Instructions modal will be closed by the "Got it" button
    setShowInstructions(false);
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

  // Check if we have a stored prompt in window (captured by early script)
  const hasStoredPrompt = !!(window as unknown as { deferredPrompt?: BeforeInstallPromptEvent | null }).deferredPrompt;
  const hasPrompt = deferredPrompt || hasStoredPrompt;

  // Show prompt if:
  // 1. We have a deferredPrompt (browser supports install prompt), OR
  // 2. We're on iOS (always show instructions), OR
  // 3. Service worker is registered (PWA is set up) and we're not on iOS
  const shouldShow = hasPrompt || isIOS || (canInstall && !isIOS);

  if (!shouldShow) {
    return null;
  }

  const getInstructions = () => {
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      return {
        title: 'Install on iOS',
        steps: [
          'Tap the Share button (square with arrow) at the bottom',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" in the top right corner'
        ]
      };
    } else if (isAndroid) {
      return {
        title: 'Install on Android',
        steps: [
          'Tap the menu (⋮) in your browser',
          'Tap "Install app" or "Add to Home screen"',
          'Confirm the installation'
        ]
      };
    } else {
      return {
        title: 'Install on Desktop',
        steps: [
          'Look for the install icon in your browser\'s address bar',
          'Or check the browser menu for "Install" option',
          'Click to install and follow the prompts'
        ]
      };
    }
  };

  const instructions = getInstructions();

  return (
    <>
      <div 
        className={`w-full relative overflow-hidden rounded-lg transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Compact banner - reduced height */}
        <div className="relative bg-white border border-gray-200 rounded-lg shadow-sm h-16 sm:h-20">
          <div className="h-full flex items-center px-3 sm:px-4 relative">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-1.5 right-1.5 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all z-10"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Content section */}
            <div className="flex items-center justify-between w-full pr-7">
              {/* Left side - Compact title and description */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Download className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                    Install Dealer Network
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    Get faster access on your device
                  </p>
                </div>
              </div>

              {/* Right side - Install button */}
              <div className="flex-shrink-0 ml-3">
                <button
                  onClick={handleInstallClick}
                  className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow"
                >
                  Install
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowInstructions(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{instructions.title}</h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Follow these steps to install Dealer Network:
              </p>
              <ol className="space-y-3">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <button
              onClick={handleConfirmInstall}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-sm hover:shadow"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Legacy component name for backward compatibility
export function InstallPrompt() {
  return <InstallPromptCard />;
}
