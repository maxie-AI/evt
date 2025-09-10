import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Upload, Clock, FileText, Zap, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

const Home: React.FC = () => {
  const [url, setUrl] = useState('');
  const { user, extractVideo, isLoading } = useStore();
  const navigate = useNavigate();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to extract transcripts');
      navigate('/login');
      return;
    }

    if (!url.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    if (!validateUrl(url)) {
      toast.error('Please enter a valid YouTube, Bilibili, or Red Book URL');
      return;
    }

    try {
      const result = await extractVideo(url);
      if (result) {
        toast.success('Video processed successfully!');
        navigate(`/transcript/${result.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process video');
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
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste your video URL here..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !url.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        Extract
                      </>
                    )}
                  </button>
                </div>
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