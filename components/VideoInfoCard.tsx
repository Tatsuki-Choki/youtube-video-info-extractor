import React, { useState } from 'react';
import { VideoData } from '../types';
import { formatDate, formatNumber } from '../utils/formatters';
import { DownloadIcon, CopyIcon, CheckIcon } from './icons';

interface VideoInfoCardProps {
  video: VideoData;
  onThumbnailClick: (thumbnailUrl: string) => void;
  onCopy: () => void; // For toast notification
}

export const VideoInfoCard: React.FC<VideoInfoCardProps> = ({ video, onThumbnailClick, onCopy }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(video.thumbnailUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${video.videoId}_thumbnail.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading thumbnail:', error);
      alert('サムネイルのダウンロードに失敗しました。');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const response = await fetch(video.thumbnailUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setIsCopied(true);
      onCopy(); // Trigger toast
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error copying thumbnail to clipboard:', error);
      alert('サムネイルのクリップボードへのコピーに失敗しました。');
    }
  };

  return (
    <tr className="bg-white hover:bg-gray-50 border-b">
      <td className="px-4 py-2 align-top">
        <div className="w-32">
            <div className="relative group flex-shrink-0 w-full aspect-video">
                <img
                src={video.thumbnailUrl.replace('hqdefault.jpg', 'maxresdefault.jpg')}
                alt={`Thumbnail for ${video.title}`}
                className="w-full h-full object-cover rounded-md cursor-pointer"
                onClick={() => onThumbnailClick(video.thumbnailUrl.replace('hqdefault.jpg', 'maxresdefault.jpg'))}
                />
            </div>
            <div className="flex items-center space-x-2 mt-2">
                <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center space-x-1.5 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                aria-label="Download thumbnail"
                >
                <DownloadIcon className="w-4 h-4" />
                <span>DL</span>
                </button>
                <button
                onClick={handleCopyToClipboard}
                className="flex-1 flex items-center justify-center space-x-1.5 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors whitespace-nowrap"
                aria-label="Copy thumbnail image"
                >
                {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                <span>{isCopied ? 'コピー済' : 'コピー'}</span>
                </button>
            </div>
        </div>
      </td>
      <td className="px-4 py-2 align-top">
        <a
          href={video.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-900 hover:text-youtube-red block break-words"
          title={video.title}
        >
          {video.title}
        </a>
      </td>
      <td className="px-4 py-2 text-sm text-gray-600 align-top whitespace-nowrap">{formatDate(video.publishedAt)}</td>
      <td className="px-4 py-2 text-sm text-gray-600 text-right align-top whitespace-nowrap">{formatNumber(video.viewCount)}</td>
      <td className="px-4 py-2 text-sm text-gray-600 text-right align-top whitespace-nowrap">{formatNumber(video.subscriberCount)}</td>
      <td className="px-4 py-2 text-sm text-gray-600 text-right align-top whitespace-nowrap">{video.diffusionRate.toFixed(2)}</td>
    </tr>
  );
};