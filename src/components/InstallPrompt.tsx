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

  // Modern, attractive design with gradient and better visual hierarchy
  return (
    <div className="w-full bg-gradient-to-br from-blue-50 via-white to-orange-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 sm:p-5 border border-blue-100/50 relative overflow-hidden group">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="relative z-10">
        {/* Header with icon and close button */}
        <div className="flex items-start gap-3 sm:gap-4 mb-3">
          <div className="flex-shrink-0 p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight mb-0.5">
              Install Dealer Network App
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Get the full experience
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        
        {/* Description */}
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4 pl-0.5">
          Install our app for quick access, offline support, and a better experience. Get instant notifications and faster loading.
        </p>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1.5 text-xs sm:text-sm bg-white/80 backdrop-blur-sm text-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm border border-blue-100 font-medium">
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
            Offline Support
          </span>
          <span className="px-3 py-1.5 text-xs sm:text-sm bg-white/80 backdrop-blur-sm text-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm border border-blue-100 font-medium">
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
            Quick Access
          </span>
          <span className="px-3 py-1.5 text-xs sm:text-sm bg-white/80 backdrop-blur-sm text-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm border border-blue-100 font-medium">
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
            App-like Experience
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleInstall}
            className="px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm sm:text-base font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 flex-1 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Install App</span>
          </button>
          <button
            onClick={handleDismiss}
            className="px-5 py-2.5 sm:py-3 text-gray-700 text-sm sm:text-base font-medium rounded-lg hover:bg-white/60 transition-all duration-200 border border-gray-200 bg-white/40 backdrop-blur-sm"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

// Legacy component name for backward compatibility
export function InstallPrompt() {
  return <InstallPromptCard />;
}
