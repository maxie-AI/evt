import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Edit3, Save, X, Copy, Search, Clock, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import type { Extraction } from '../../shared/types';

const TranscriptViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, extractions, currentExtraction, exportTranscript, isLoading, getExtraction } = useStore();
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'srt' | 'vtt' | 'json'>('txt');
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (id) {
      // First check if this is the current extraction (for both guest and authenticated users)
      if (currentExtraction && currentExtraction.id === id) {
        setExtraction(currentExtraction);
        setEditedContent(currentExtraction.transcript_text || '');
        setIsGuest(!user); // Mark as guest if no user
        return;
      }

      // For authenticated users, check extractions array
      if (user) {
        const found = extractions.find(e => e.id === id);
        if (found) {
          setExtraction(found);
          setEditedContent(found.transcript_text || '');
          setIsGuest(false);
        } else {
          // Try to fetch the extraction if not found locally
          getExtraction(id);
        }
      } else {
        // Guest user trying to access an extraction
        if (id.startsWith('guest_')) {
          setIsGuest(true);
          // For guest users, we need to check if this transcript is available
          // Guest transcripts are temporary and only available during the session
          // If it's not the current extraction, it means the session has expired
          if (currentExtraction && currentExtraction.id === id) {
            setExtraction(currentExtraction);
            setEditedContent(currentExtraction.transcript_text || '');
          } else {
            // Check if there's any stored guest transcript data in localStorage as fallback
            const storedGuestData = localStorage.getItem(`guest_transcript_${id}`);
            const expirationTime = localStorage.getItem(`guest_transcript_${id}_expires`);
            
            if (storedGuestData && expirationTime) {
              const now = Date.now();
              const expires = parseInt(expirationTime, 10);
              
              if (now < expires) {
                try {
                  const guestExtraction = JSON.parse(storedGuestData);
                  setExtraction(guestExtraction);
                  setEditedContent(guestExtraction.transcript_text || '');
                } catch (error) {
                  console.error('Failed to parse stored guest data:', error);
                  // Clean up invalid data
                  localStorage.removeItem(`guest_transcript_${id}`);
                  localStorage.removeItem(`guest_transcript_${id}_expires`);
                  setExtraction(null);
                }
              } else {
                // Expired - clean up and show not available message
                localStorage.removeItem(`guest_transcript_${id}`);
                localStorage.removeItem(`guest_transcript_${id}_expires`);
                setExtraction(null);
              }
            } else {
              // Guest transcript not available - set extraction to null to show proper message
              setExtraction(null);
            }
          }
        } else {
          toast.error('Transcript not found or expired');
          navigate('/');
        }
      }
    }
  }, [id, extractions, currentExtraction, user, navigate, getExtraction]);

  const handleSave = () => {
    if (extraction && !isGuest) {
      // In a real app, you'd save to the backend
      setExtraction({ ...extraction, transcript_text: editedContent });
      setIsEditing(false);
      toast.success('Transcript saved successfully');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      toast.success('Transcript copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy transcript');
    }
  };

  const handleExport = async () => {
    if (!extraction) return;

    if (isGuest) {
      toast.error('Please sign up or log in to export transcripts');
      return;
    }

    try {
      await exportTranscript(extraction.id, selectedFormat);
      toast.success(`Transcript exported as ${selectedFormat.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export transcript');
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term.trim()) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  const formatTextIntoParagraphs = (text: string) => {
    if (!text) return '';
    
    // Split text into sentences and group them into paragraphs
    const sentences = text.split(/(?<=[.!?])\s+/);
    const paragraphs = [];
    let currentParagraph = [];
    
    for (let i = 0; i < sentences.length; i++) {
      currentParagraph.push(sentences[i]);
      
      // Create a new paragraph every 3-4 sentences or at natural breaks
      if (currentParagraph.length >= 3 && (sentences[i].match(/[.!?]$/) || i === sentences.length - 1)) {
        paragraphs.push(currentParagraph.join(' ').trim());
        currentParagraph = [];
      }
    }
    
    // Add any remaining sentences as the last paragraph
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' ').trim());
    }
    
    return paragraphs.filter(p => p.length > 0).join('\n\n');
  };

  const getFilteredContent = (): string => {
    const content = isEditing ? editedContent : (extraction?.transcript_text || '');
    const formattedContent = formatTextIntoParagraphs(content);
    
    if (!searchTerm.trim()) return formattedContent;
    
    const paragraphs = formattedContent.split('\n\n');
    const filteredParagraphs = paragraphs.filter(paragraph => 
      paragraph.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return filteredParagraphs.join('\n\n');
  };

  if (!extraction) {
    // If it's a guest ID and no extraction, show expired message
    if (id && id.startsWith('guest_') && isGuest) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Guest Transcript Not Available</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Guest transcripts are temporary and only available during your session. 
                This transcript link has expired or is no longer accessible.
              </p>
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <p>• Guest transcripts are not saved permanently</p>
                <p>• Create an account to save and share your transcripts</p>
                <p>• Signed-in users can access their transcripts anytime</p>
              </div>
            </div>
            <div className="space-x-3">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create New Transcript
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign Up / Log In
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // Otherwise show loading
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transcript...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {extraction.video_title || 'Video Transcript'}
                </h1>
                {isGuest && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    Guest View
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Duration: {formatTime(extraction.video_duration || 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Platform: {extraction.platform}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Processed: {new Date(extraction.created_at).toLocaleDateString()}</span>
                </div>
                {extraction.video_url && (
                  <a
                    href={extraction.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View Original</span>
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              
              {!isGuest && (
                isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedContent(extraction.transcript_text || '');
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search in transcript..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Transcript Content */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm leading-relaxed resize-none"
                    placeholder="Enter transcript content..."
                  />
                ) : (
                  <div className="prose max-w-none">
                    {extraction.transcript_text ? (
                       <div
                         className="text-base leading-relaxed text-gray-800"
                         style={{ lineHeight: '1.8' }}
                         dangerouslySetInnerHTML={{
                           __html: `<p class="mb-4">${highlightSearchTerm(getFilteredContent(), searchTerm).replace(/\n\n/g, '</p><p class="mb-4">')}</p>`
                         }}
                       />
                     ) : (
                       <div className="text-center py-12">
                         <div className="mb-6">
                           <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                             <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                             </svg>
                           </div>
                           <h3 className="text-xl font-semibold text-gray-900 mb-2">Transcript Not Available</h3>
                           <p className="text-gray-600 mb-4 max-w-md mx-auto">
                             {isGuest 
                               ? "Guest transcripts are temporary and only available during your session. This transcript link has expired or is no longer accessible."
                               : "This transcript could not be loaded or does not exist."
                             }
                           </p>
                           {isGuest && (
                             <div className="space-y-2 text-sm text-gray-500 mb-6">
                               <p>• Guest transcripts are not saved permanently</p>
                               <p>• Create an account to save and share your transcripts</p>
                               <p>• Signed-in users can access their transcripts anytime</p>
                             </div>
                           )}
                         </div>
                         <div className="space-x-3">
                           <button
                             onClick={() => navigate('/')}
                             className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                           >
                             Create New Transcript
                           </button>
                           {isGuest && (
                             <button
                               onClick={() => navigate('/login')}
                               className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                             >
                               Sign Up / Log In
                             </button>
                           )}
                         </div>
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Export Options */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
              
              {isGuest ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Sign up or log in to export transcripts in various formats.
                  </p>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Sign Up / Log In
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="format"
                        value="txt"
                        checked={selectedFormat === 'txt'}
                        onChange={(e) => setSelectedFormat(e.target.value as any)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Plain Text (.txt)</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="format"
                        value="srt"
                        checked={selectedFormat === 'srt'}
                        onChange={(e) => setSelectedFormat(e.target.value as any)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">SubRip (.srt)</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="format"
                        value="vtt"
                        checked={selectedFormat === 'vtt'}
                        onChange={(e) => setSelectedFormat(e.target.value as any)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">WebVTT (.vtt)</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="format"
                        value="json"
                        checked={selectedFormat === 'json'}
                        onChange={(e) => setSelectedFormat(e.target.value as any)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">JSON (.json)</span>
                    </label>
                  </div>
                  
                  <button
                    onClick={handleExport}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    {isLoading ? 'Exporting...' : 'Export'}
                  </button>
                </>
              )}
            </div>

            {/* Video Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Information</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Platform:</span>
                  <span className="ml-2 text-gray-600">{extraction.platform}</span>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2 text-gray-600">{formatTime(extraction.video_duration || 0)}</span>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    extraction.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : extraction.status === 'processing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {extraction.status}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(extraction.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptViewer;