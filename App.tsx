import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VideoData } from './types';
import {
  extractVideoId,
  extractChannelIdentifier,
  getLatestVideoIdsFromChannel,
  fetchYouTubeVideosData,
  searchVideosByKeyword,
} from './services/youtubeService';
import { InputField } from './components/InputField';
import { Button } from './components/Button';
import { VideoInfoCard } from './components/VideoInfoCard';
import { LoadingSpinner, CloseIcon, SortIcon, SortUpIcon, SortDownIcon, HistoryIcon, ExportIcon } from './components/icons';
import { formatDate } from './utils/formatters';

type SortKey = 'publishedAt' | 'viewCount' | 'subscriberCount' | 'diffusionRate' | 'title';
type SearchType = 'url' | 'keyword';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [searchType, setSearchType] = useState<SearchType>('url');
  
  const [videoData, setVideoData] = useState<VideoData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [videoCount, setVideoCount] = useState<string>('30');
  
  const [magnifiedThumbnail, setMagnifiedThumbnail] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('publishedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load API Key and History from localStorage on initial render
  useEffect(() => {
    const savedApiKey = localStorage.getItem('youtubeApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    const savedHistory = localStorage.getItem('youtubeSearchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save API Key to localStorage whenever it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('youtubeApiKey', apiKey);
    }
  }, [apiKey]);
  
  // Save History to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('youtubeSearchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const addToHistory = (newUrl: string) => {
    if (!newUrl) return;
    setSearchHistory(prevHistory => {
      const updatedHistory = [newUrl, ...prevHistory.filter(item => item !== newUrl)];
      return updatedHistory.slice(0, 10); // Keep only the last 10 searches
    });
  };

  const handleFetchData = async () => {
    if (!apiKey) {
      setError('YouTube APIキーを入力してください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideoData([]);

    try {
      let videoIds: string[] = [];
      const count = Math.max(1, Math.min(50, parseInt(videoCount, 10) || 30));

      if (searchType === 'url') {
        if (!url.trim()) {
          throw new Error('YouTubeの動画またはチャンネルURLを入力してください。');
        }
        addToHistory(url);
        const videoId = extractVideoId(url);
        const channelIdentifier = extractChannelIdentifier(url);
        
        if (videoId) {
          videoIds = [videoId];
        } else if (channelIdentifier) {
          videoIds = await getLatestVideoIdsFromChannel(channelIdentifier, apiKey, count);
        } else {
          throw new Error('無効なYouTube動画またはチャンネルURLです。正しいURLを入力してください。');
        }
      } else { // searchType === 'keyword'
        if (!keyword.trim()) {
          throw new Error('検索キーワードを入力してください。');
        }
        videoIds = await searchVideosByKeyword(keyword, apiKey, count);
      }
      
      if (videoIds.length > 0) {
        const data = await fetchYouTubeVideosData(videoIds, apiKey);
        setVideoData(data);
      } else {
        setError('動画が見つかりませんでした。');
      }

    } catch (err: any) {
      setError(err.message || 'データの取得中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThumbnailClick = (thumbnailUrl: string) => {
    setMagnifiedThumbnail(thumbnailUrl);
  };
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedVideos = useMemo(() => {
    const sorted = [...videoData].sort((a, b) => {
      if (sortKey === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortKey === 'publishedAt') {
        return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      }
      return a[sortKey] < b[sortKey] ? -1 : 1;
    });

    if (sortDirection === 'desc') {
      return sorted.reverse();
    }
    return sorted;
  }, [videoData, sortKey, sortDirection]);

  const handleHistoryClick = (historyUrl: string) => {
    setUrl(historyUrl);
    setShowHistory(false);
  };

  const showCopiedToast = useCallback(() => {
    setToastMessage('画像をクリップボードにコピーしました');
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const exportToCsv = () => {
    if (sortedVideos.length === 0) return;

    const headers = ['タイトル', '公開日', '再生数', '登録者数', '拡散率', '動画URL'];
    const rows = sortedVideos.map(video => [
      `"${video.title.replace(/"/g, '""')}"`,
      formatDate(video.publishedAt),
      video.viewCount,
      video.subscriberCount,
      video.diffusionRate.toFixed(2),
      video.videoUrl
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "youtube_video_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">YouTube動画情報抽出アプリ</h1>
          <p className="text-gray-600 mt-1">動画やチャンネルのURL、またはキーワードから各種データを抽出します。</p>
        </header>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-1">
              <InputField
                label="YouTube APIキー"
                id="api-key"
                type="password"
                placeholder="APIキーを入力"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="lg:col-span-2">
               <div className="mb-2">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                      <button
                        onClick={() => setSearchType('url')}
                        className={`${
                          searchType === 'url'
                            ? 'border-youtube-red text-youtube-red'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm focus:outline-none`}
                      >
                        URLで検索
                      </button>
                      <button
                        onClick={() => setSearchType('keyword')}
                        className={`${
                          searchType === 'keyword'
                            ? 'border-youtube-red text-youtube-red'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm focus:outline-none`}
                      >
                        キーワードで検索
                      </button>
                    </nav>
                  </div>
                </div>

              {searchType === 'url' ? (
                <div className="relative">
                  <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-1">
                    動画・チャンネルURL
                  </label>
                  <div className="flex">
                      <input
                        id="video-url"
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
                        onBlur={() => setTimeout(() => setShowHistory(false), 200)} // delay to allow click on history item
                        className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-youtube-red focus:border-youtube-red sm:text-sm"
                      />
                      <button onClick={() => setShowHistory(!showHistory)} className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100" aria-label="検索履歴を表示">
                        <HistoryIcon className="w-5 h-5 text-gray-600"/>
                      </button>
                  </div>

                  {showHistory && searchHistory.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                      {searchHistory.map((item, index) => (
                        <li key={index} onMouseDown={() => handleHistoryClick(item)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer truncate">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                 <InputField
                    id="keyword-search"
                    label="検索キーワード"
                    type="text"
                    placeholder="例: React チュートリアル"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
              )}
            </div>
            <div>
               <InputField
                id="video-count"
                label="取得件数 (最大50)"
                type="number"
                min="1"
                max="50"
                value={videoCount}
                onChange={(e) => setVideoCount(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
             <Button onClick={handleFetchData} disabled={isLoading}>
                {isLoading ? <><LoadingSpinner className="w-5 h-5 mr-2" /> 取得中...</> : '情報取得'}
              </Button>
          </div>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">{error}</div>}

        <main className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">抽出結果</h2>
            <button
              onClick={exportToCsv}
              disabled={sortedVideos.length === 0}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <ExportIcon className="w-4 h-4"/>
              <span>CSVエクスポート</span>
            </button>
          </div>
          <div className="space-y-4">
            {/* Results Table */}
            {sortedVideos.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full bg-white divide-y divide-gray-200" style={{tableLayout: 'fixed'}}>
                  <colgroup>
                    <col style={{width: '20%'}} />
                    <col style={{width: '30%'}} />
                    <col style={{width: '12%'}} />
                    <col style={{width: '13%'}} />
                    <col style={{width: '13%'}} />
                    <col style={{width: '12%'}} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                        サムネイル
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-[30%]" onClick={() => handleSort('title')}>
                        <div className="flex items-center">
                          <span>タイトル</span>
                          {sortKey === 'title' ? (sortDirection === 'asc' ? <SortUpIcon className="w-4 h-4 ml-1" /> : <SortDownIcon className="w-4 h-4 ml-1" />) : <SortIcon className="w-4 h-4 ml-1" />}
                        </div>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-[12%]" onClick={() => handleSort('publishedAt')}>
                        <div className="flex items-center">
                          <span>公開日</span>
                          {sortKey === 'publishedAt' ? (sortDirection === 'asc' ? <SortUpIcon className="w-4 h-4 ml-1" /> : <SortDownIcon className="w-4 h-4 ml-1" />) : <SortIcon className="w-4 h-4 ml-1" />}
                        </div>
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-[13%]" onClick={() => handleSort('viewCount')}>
                        <div className="flex items-center justify-end">
                          <span>再生数</span>
                          {sortKey === 'viewCount' ? (sortDirection === 'asc' ? <SortUpIcon className="w-4 h-4 ml-1" /> : <SortDownIcon className="w-4 h-4 ml-1" />) : <SortIcon className="w-4 h-4 ml-1" />}
                        </div>
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-[13%]" onClick={() => handleSort('subscriberCount')}>
                        <div className="flex items-center justify-end">
                          <span>登録者数</span>
                          {sortKey === 'subscriberCount' ? (sortDirection === 'asc' ? <SortUpIcon className="w-4 h-4 ml-1" /> : <SortDownIcon className="w-4 h-4 ml-1" />) : <SortIcon className="w-4 h-4 ml-1" />}
                        </div>
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-[12%]" onClick={() => handleSort('diffusionRate')}>
                        <div className="flex items-center justify-end">
                          <span>拡散率</span>
                          {sortKey === 'diffusionRate' ? (sortDirection === 'asc' ? <SortUpIcon className="w-4 h-4 ml-1" /> : <SortDownIcon className="w-4 h-4 ml-1" />) : <SortIcon className="w-4 h-4 ml-1" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedVideos.map((video) => (
                      <VideoInfoCard 
                        key={video.videoId} 
                        video={video} 
                        onThumbnailClick={handleThumbnailClick}
                        onCopy={showCopiedToast}
                       />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!isLoading && videoData.length === 0 && (
              <div className="text-center py-10">
                 {searchHistory.length > 0 && !error && searchType === 'url' ? (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">最近の検索</h3>
                    <ul className="mt-4 space-y-2">
                      {searchHistory.slice(0, 5).map((item, index) => (
                        <li key={index}>
                          <button onClick={() => setUrl(item)} className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-full">
                            {item}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    {error ? 'エラーが発生しました。' : 'URLまたはキーワードを入力して「情報取得」ボタンを押してください。'}
                  </p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

       {magnifiedThumbnail && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setMagnifiedThumbnail(null)}
        >
          <img 
            src={magnifiedThumbnail} 
            alt="Magnified Thumbnail"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image
          />
          <button 
            onClick={() => setMagnifiedThumbnail(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            aria-label="Close"
          >
            <CloseIcon className="w-8 h-8" />
          </button>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-gray-900 text-white py-2 px-4 rounded-lg shadow-lg animate-slide-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;