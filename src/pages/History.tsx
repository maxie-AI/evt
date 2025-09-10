import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Download, Trash2, Search, Filter, Calendar, Clock, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import type { Extraction } from '../shared/types';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { user, extractions, exportTranscript, isLoading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return '🎥';
      case 'bilibili':
        return '📺';
      case 'red book':
      case 'xiaohongshu':
        return '📖';
      default:
        return '🎬';
    }
  };

  const filteredAndSortedExtractions = extractions
    .filter(extraction => {
      const matchesSearch = !searchTerm || 
        extraction.video_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        extraction.video_url?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || extraction.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || extraction.platform.toLowerCase() === platformFilter.toLowerCase();
      
      return matchesSearch && matchesStatus && matchesPlatform;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'title':
          comparison = (a.video_title || '').localeCompare(b.video_title || '');
          break;
        case 'duration':
          comparison = (a.video_duration || 0) - (b.video_duration || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleView = (extraction: Extraction) => {
    navigate(`/transcript/${extraction.id}`);
  };

  const handleExport = async (extraction: Extraction, format: 'txt' | 'srt' | 'vtt' | 'json') => {
    try {
      await exportTranscript(extraction.id, format);
      toast.success(`Transcript exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export transcript');
    }
  };

  const handleDelete = async (extraction: Extraction) => {
    if (window.confirm('Are you sure you want to delete this transcript? This action cannot be undone.')) {
      try {
        // In a real app, you'd call an API to delete
        toast.success('Transcript deleted successfully');
      } catch (error) {
        toast.error('Failed to delete transcript');
      }
    }
  };

  const uniquePlatforms = Array.from(new Set(extractions.map(e => e.platform)));

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transcript History</h1>
          <p className="text-gray-600">View and manage your extracted transcripts</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transcripts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Platform Filter */}
            <div>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Platforms</option>
                {uniquePlatforms.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white text-sm"
              >
                <option value="date">Date</option>
                <option value="title">Title</option>
                <option value="duration">Duration</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredAndSortedExtractions.length} of {extractions.length} transcripts
          </p>
        </div>

        {/* Extractions List */}
        {filteredAndSortedExtractions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Calendar className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transcripts found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' || platformFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Start by extracting your first video transcript.'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
            >
              Extract Transcript
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedExtractions.map((extraction) => (
              <div key={extraction.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getPlatformIcon(extraction.platform)}</span>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {extraction.video_title || 'Untitled Video'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(extraction.status)}`}>
                        {extraction.status}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(extraction.video_duration || 0)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(extraction.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Platform: {extraction.platform}</span>
                      </div>
                      {extraction.video_url && (
                        <a
                          href={extraction.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Original</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleView(extraction)}
                      className="flex items-center gap-2 px-4 py-2 text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    
                    <div className="relative group">
                      <button className="flex items-center gap-2 px-4 py-2 text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors">
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                      
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <button
                          onClick={() => handleExport(extraction, 'txt')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                        >
                          TXT
                        </button>
                        <button
                          onClick={() => handleExport(extraction, 'srt')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          SRT
                        </button>
                        <button
                          onClick={() => handleExport(extraction, 'vtt')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          VTT
                        </button>
                        <button
                          onClick={() => handleExport(extraction, 'json')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                        >
                          JSON
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(extraction)}
                      className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;