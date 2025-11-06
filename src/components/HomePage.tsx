import { Home, Search, Share2, Smartphone, ArrowRight } from 'lucide-react';

interface HomePageProps {
  onGetStarted: () => void;
  isAuthenticated?: boolean;
  onGoToLogin?: () => void;
  onGoToApp?: () => void;
}

export function HomePage({ onGetStarted, isAuthenticated = false, onGoToLogin, onGoToApp }: HomePageProps) {
  const features = [
    {
      icon: Home,
      title: 'Manage your listing easily',
      description: 'Add, edit, and organize your property listings with an intuitive interface designed for efficiency.',
    },
    {
      icon: Search,
      title: 'Find Properties listed by other fellows',
      description: 'Discover properties from other dealers in the network. Search and filter to find exactly what you need.',
    },
    {
      icon: Share2,
      title: 'Broadcast Properties to Whole Network',
      description: 'Share your properties with the entire dealer network instantly. Reach more potential buyers and partners.',
    },
    {
      icon: Smartphone,
      title: 'Access from Anywhere Quickly and easily',
      description: 'Access your listings and the network from any device, anywhere. Responsive design for desktop, tablet, and mobile.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-8 sm:pt-12 md:pt-16 lg:pt-24 pb-6 sm:pb-8 md:pb-12">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 leading-tight">
            Dealer Network
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 md:mb-12 px-2 sm:px-0 leading-relaxed">
            Connect with fellow dealers, manage your listings, and grow your property business
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 md:px-10 py-2.5 sm:py-3 md:py-4 bg-blue-600 text-white text-base sm:text-lg md:text-xl font-semibold rounded-lg shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-xl touch-manipulation min-h-[44px] sm:min-h-[48px]"
          >
            <span>Start Using</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12 md:py-16 lg:py-24">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight px-2 sm:px-0">
            Powerful Features
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-2 sm:px-0">
            Everything you need to manage and grow your property business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200"
              >
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 md:gap-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-blue-100 rounded-lg flex items-center justify-center self-start">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12 md:py-16 lg:py-24">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 lg:p-16 text-center shadow-xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight px-2 sm:px-0">
            Ready to Get Started?
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-blue-100 mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto px-2 sm:px-0 leading-relaxed">
            Join the Dealer Network today and start managing your properties more efficiently
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 md:px-10 py-2.5 sm:py-3 md:py-4 bg-white text-blue-600 text-base sm:text-lg md:text-xl font-semibold rounded-lg shadow-lg hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-xl touch-manipulation min-h-[44px] sm:min-h-[48px]"
          >
            <span>Start Using</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>

    </div>
  );
}

