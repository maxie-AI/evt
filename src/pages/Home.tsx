import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Upload, Clock, FileText, Zap, Shield, Users, UserCheck, Download, ArrowRight, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { api } from '../lib/supabase';

// VTX - Video Transcript eXtractor with example URL feature
const Home: React.FC = () => {
  const { 
    user, 
    extractVideo, 
    extractVideoAsGuest, 
    isExtracting,
    extractionError,
    clearExtractionError,
    guestInfo,
    setGuestInfo,
    progressStatus,
    progressStage,
    estimatedTimeRemaining,
    processingStartTime
  } = useStore();
  const [url, setUrl] = useState('');
  const [useGuestMode, setUseGuestMode] = useState(!user);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [useExample, setUseExample] = useState(false);
  const exampleUrl = 'https://www.youtube.com/watch?v=c0m6yaGlZh4';
  const navigate = useNavigate();

  // Initialize guest mode if user is not authenticated
  useEffect(() => {
    if (!user) {
      setUseGuestMode(true);
    }
  }, [user]);

  const supportedPlatforms = [
    { name: 'YouTube', icon: '🎥', example: 'https://www.youtube.com/watch?v=...' },
    { name: 'Bilibili', icon: '📺', example: 'https://www.bilibili.com/video/...' },
    { name: 'Red Book', icon: '📖', example: 'https://www.xiaohongshu.com/...' }
  ];

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Fast Processing',
      description: 'Extract transcripts in seconds with our optimized pipeline'
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: 'Multiple Formats',
      description: 'Export in TXT, SRT, VTT, and JSON formats'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Secure & Private',
      description: 'Your data is encrypted and never shared with third parties'
    }
  ];

  const validateUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?bilibili\.com\/video\/[a-zA-Z0-9]+/,
      /^https?:\/\/(www\.)?xiaohongshu\.com\/(explore\/|discovery\/item\/)?[a-zA-Z0-9]+/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  // Timer effect for processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExtracting && processingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - processingStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isExtracting, processingStartTime]);

  // Handle example checkbox
  const handleExampleChange = (checked: boolean) => {
    setUseExample(checked);
    if (checked) {
      setUrl(exampleUrl);
    } else {
      setUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      if (useGuestMode) {
        const result = await extractVideoAsGuest(url);
        navigate(`/transcript/${result.id}`);
      } else {
        const result = await extractVideo(url);
        navigate(`/transcript/${result.id}`);
      }
    } catch (error) {
      console.error('Extraction failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Extract Video
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                {' '}Transcripts
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your favorite videos into searchable, editable text. 
              Support for YouTube, Bilibili, and Red Book with AI-powered accuracy.
            </p>

            {/* URL Input Form */}
            <div className="max-w-2xl mx-auto">
              {/* Mode Toggle for authenticated users */}
              {user && (
                <div className="mb-6 flex justify-center">
                  <div className="bg-gray-100 p-1 rounded-lg flex">
                    <button
                       onClick={() => setUseGuestMode(false)}
                       className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                         !useGuestMode ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-800'
                       }`}
                     >
                       <UserCheck className="h-4 w-4" />
                       Premium Mode
                     </button>
                     <button
                       onClick={() => setUseGuestMode(true)}
                       className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                         useGuestMode ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-800'
                       }`}
                     >
                       <Users className="h-4 w-4" />
                       Guest Mode
                     </button>
                  </div>
                </div>
              )}

              {/* Guest Mode Info */}
              {(useGuestMode || !user) && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-yellow-800">Guest Mode Limits</h3>
                  </div>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <p>• 100 video extractions per day</p>
                    <p>• Videos up to 10 minutes (600 seconds)</p>
                    <p>• Full video transcription for supported length</p>
                    {guestInfo && (
                      <p className="font-medium">
                        Remaining extractions today: {guestInfo.remainingExtractions}
                        {guestInfo.resetTime && (
                          <span className="block text-xs">
                            Resets at: {new Date(guestInfo.resetTime).toLocaleString()}
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-xs mt-2">
                      <span className="font-medium">Want more?</span> Create an account for unlimited extractions and longer videos!
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (e.target.value !== exampleUrl) {
                          setUseExample(false);
                        }
                      }}
                      placeholder="Paste your video URL here..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                      disabled={isExtracting}
                    />
                    {/* Example URL Checkbox */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useExample"
                        checked={useExample}
                        onChange={(e) => handleExampleChange(e.target.checked)}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                        disabled={isExtracting}
                      />
                      <label htmlFor="useExample" className="text-sm text-gray-600 cursor-pointer flex items-center gap-1">
                        <span>Try example video</span>
                        <span className="text-xs text-purple-600 font-medium">(YouTube demo)</span>
                      </label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isExtracting || !url.trim() || (guestInfo && guestInfo.remainingExtractions <= 0)}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                  >
                    {isExtracting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">{progressStatus || 'Processing...'}</span>
                          <div className="flex items-center gap-2 text-sm opacity-90">
                            <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
                            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                              <span>• ~{estimatedTimeRemaining}s remaining</span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        {(useGuestMode || !user) ? 'Extract (Guest)' : 'Extract'}
                      </>
                    )}
                  </button>
                </div>
                {guestInfo && guestInfo.remainingExtractions <= 0 && (
                  <p className="text-red-600 text-sm mt-2 text-center">
                    Daily limit reached (100 videos). Resets at {new Date(guestInfo.resetTime).toLocaleTimeString()}.
                  </p>
                )}
              </form>

              {/* Supported Platforms */}
              <div className="text-center mb-12">
                <p className="text-sm text-gray-600 mb-4">Supported platforms:</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {supportedPlatforms.map((platform) => (
                    <div
                      key={platform.name}
                      className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200 flex items-center space-x-2"
                    >
                      <span className="text-lg">{platform.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Service?</h2>
            <p className="text-lg text-gray-600">Powerful features designed for content creators and researchers</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 text-purple-600 rounded-lg mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Simple steps to get your transcripts</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-full mb-4 font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Paste URL</h3>
              <p className="text-gray-600">Copy and paste your video URL from supported platforms</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-full mb-4 font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Processing</h3>
              <p className="text-gray-600">Our AI extracts and processes the audio content</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-full mb-4 font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Review &amp; Edit</h3>
              <p className="text-gray-600">Review the transcript and make any necessary edits</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-full mb-4 font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Export</h3>
              <p className="text-gray-600">Download in your preferred format (TXT, SRT, VTT, JSON)</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="py-16 bg-white">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Join thousands of content creators who trust our platform for accurate transcriptions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
              >
                Sign Up Free
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;