import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Home, ArrowLeft, Search, MapPin, Calendar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-32 h-32 border border-cyan-500/20 rounded-full"></div>
        <div className="absolute top-40 right-32 w-24 h-24 border border-blue-500/20 rounded-full"></div>
        <div className="absolute bottom-32 left-40 w-28 h-28 border border-purple-500/20 rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-20 h-20 border border-cyan-500/20 rounded-full"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
        {/* Creative 404 Design */}
        <div className="mb-8 sm:mb-12">
          <div className="relative">
            {/* Main Circle */}
            <div className="w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center backdrop-blur-sm relative">
              {/* Inner Design */}
              <div className="w-40 h-40 sm:w-52 sm:h-52 bg-gradient-to-br from-gray-900/80 to-gray-950/80 border border-gray-700/50 rounded-full flex items-center justify-center backdrop-blur-md">
                <div className="text-center">
                  <div className="text-6xl sm:text-8xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
                    404
                  </div>
                  <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full"></div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-cyan-500/20 border border-cyan-500/30 rounded-full flex items-center justify-center">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-400" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-purple-500/20 border border-purple-500/30 rounded-full flex items-center justify-center">
                <Calendar className="w-4 h-4 text-purple-400" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
                <Home className="w-4 h-4 text-green-400" />
              </div>
            </div>

            {/* Orbiting Elements */}
            <div className="absolute inset-0 animate-spin-slow">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50"></div>
            </div>
            <div className="absolute inset-0 animate-spin-slow-reverse" style={{ animationDuration: '8s' }}>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50"></div>
            </div>
            <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '12s' }}>
              <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50"></div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl mb-6 leading-relaxed">
            Oops! It looks like you've ventured into uncharted territory. 
            The page you're looking for seems to have wandered off into the digital void.
          </p>
          <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm max-w-md mx-auto">
            <p className="text-sm text-gray-500 mb-3">Don't worry, here are some things you can try:</p>
            <ul className="text-sm text-gray-400 space-y-2 text-left">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                Check the URL for typos
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                Go back to the previous page
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                Visit our homepage
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <Button
            asChild
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="border-gray-600 hover:bg-gray-700/50 bg-gray-800/50 text-gray-300 hover:text-white transition-colors duration-200 px-8 py-3 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Additional Links */}
        <div className="mt-8 sm:mt-12 text-center">
          <p className="text-gray-500 text-sm mb-4">Or explore our popular sections:</p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link 
              to="/dashboard/events" 
              className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-sm"
            >
              Discover Events
            </Link>
            <Link 
              to="/dashboard/events/new" 
              className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-sm"
            >
              Create Event
            </Link>
            <Link 
              to="/dashboard/profile" 
              className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-sm"
            >
              Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes spin-slow-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
