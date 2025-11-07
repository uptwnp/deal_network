import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Globe } from 'lucide-react';

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

  useEffect(() => {
    // Check if iOS
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(checkIOS);

    // Check if app is already installed (standalone mode)
    const checkIfInstalled = () => {
      // Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check for iOS standalone
      const isIOSStandalone = (window.navigator as any).standalone === true;
      // Check if running from home screen
      const isStandaloneMode = isStandalone || isIOSStandalone;
      
      setIsInstalled(isStandaloneMode);
      
      // Check localStorage for dismissed state with timestamp
      const dismissedTimestamp = localStorage.getItem('pwa-install-dismissed');
      if (dismissedTimestamp) {
        const dismissedTime = parseInt(dismissedTimestamp, 10);
        const currentTime = Date.now();
        const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes in milliseconds
        
        // If dismissed less than 2 minutes ago, consider it dismissed
        if (currentTime - dismissedTime < twoMinutesInMs) {
          setIsDismissed(true);
        } else {
          // More than 2 minutes have passed, clear the dismissal
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
      
      // Automatically show browser prompt after a short delay (3 seconds)
      // This gives users time to see the page before the prompt appears
      // Note: prompt() can only be called once per event, so we save a flag
      const autoPromptShown = sessionStorage.getItem('pwa-auto-prompt-shown');
      if (!autoPromptShown) {
        setTimeout(async () => {
          try {
            await promptEvent.prompt();
            sessionStorage.setItem('pwa-auto-prompt-shown', 'true');
            const choiceResult = await promptEvent.userChoice;
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted the install prompt');
              setDeferredPrompt(null); // Clear since user accepted
            } else {
              console.log('User dismissed the install prompt');
              // Keep the deferred prompt so users can still use the card to install
            }
          } catch (error) {
            console.error('Error showing install prompt:', error);
            // If prompt fails, remove flag so we can try again
            sessionStorage.removeItem('pwa-auto-prompt-shown');
          }
        }, 3000); // Show after 3 seconds
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

    // Re-check on visibility change (user might install app in another tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkIfInstalled();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up interval to re-check dismissal status every 30 seconds
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
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS or browsers without install prompt
      // Show instructions based on platform
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

    // Check if automatic prompt was already shown (prompt can only be called once per event)
    const autoPromptShown = sessionStorage.getItem('pwa-auto-prompt-shown');
    if (autoPromptShown) {
      // Browser prompt was already shown, provide manual instructions
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isAndroid) {
        alert('To install Dealer Network:\n1. Tap the menu (⋮) in your browser\n2. Tap "Install app" or "Add to Home screen"');
      } else {
        alert('Look for the install icon in your browser\'s address bar, or check the browser menu for "Install" option.');
      }
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      sessionStorage.setItem('pwa-auto-prompt-shown', 'true');
      
      // Wait for user response
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setDeferredPrompt(null);
      } else {
        console.log('User dismissed the install prompt');
        // Keep the deferred prompt available but mark as shown
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
      sessionStorage.removeItem('pwa-auto-prompt-shown');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store current timestamp instead of just 'true'
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setDeferredPrompt(null);
    if (onDismiss) {
      onDismiss();
    }
  };

  // Don't show if installed, dismissed, or no prompt available (unless iOS)
  if (isInstalled || isDismissed) {
    return null;
  }

  // Show prompt if:
  // 1. We have a deferredPrompt (Android/Desktop Chrome), OR
  // 2. We're on iOS and not in standalone mode (iOS doesn't support beforeinstallprompt)
  const shouldShow = deferredPrompt || (isIOS && !isInstalled);

  if (!shouldShow) {
    return null;
  }

  // Styled like PropertyCard with blue/orange accent
  return (
    <div className="w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-3 sm:p-4 border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 text-left hover:border-l-blue-600 relative">
      <div className="flex items-start gap-2 sm:gap-3 mb-1 sm:mb-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight mb-1">
            Install Dealer Network App
          </h3>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
      
      <div className="flex items-start gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed flex-1">
          Install our app for quick access, offline support, and a better experience. Get instant notifications and faster loading.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-blue-100 text-blue-700 rounded flex items-center gap-1">
          <Globe className="w-3 h-3" />
          Offline Support
        </span>
        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-blue-100 text-blue-700 rounded flex items-center gap-1">
          <Download className="w-3 h-3" />
          Quick Access
        </span>
        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-blue-100 text-blue-700 rounded flex items-center gap-1">
          <Smartphone className="w-3 h-3" />
          App-like Experience
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 flex-1"
        >
          <Download className="w-4 h-4" />
          Install App
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-gray-600 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

// Legacy component name for backward compatibility
export function InstallPrompt() {
  return <InstallPromptCard />;
}
