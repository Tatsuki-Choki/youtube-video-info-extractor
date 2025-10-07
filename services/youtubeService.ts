import type { VideoData, YouTubeVideoDetailsResponse, YouTubeChannelDetailsResponse, YouTubeSearchResponse } from '../types';

/**
 * Extracts the YouTube video ID from various URL formats.
 * @param url The YouTube video URL.
 * @returns The video ID or null if not found.
 */
export function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Extracts a channel ID or handle from a YouTube channel URL.
 * @param url The YouTube channel URL.
 * @returns An object with identifier type and value, or null.
 */
export function extractChannelIdentifier(url: string): { type: 'id' | 'handle'; value: string } | null {
  // Matches youtube.com/channel/CHANNEL_ID
  const channelIdRegex = /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/;
  const channelIdMatch = url.match(channelIdRegex);
  if (channelIdMatch && channelIdMatch[1]) {
    return { type: 'id', value: channelIdMatch[1] };
  }

  // Matches youtube.com/@HANDLE
  const handleRegex = /youtube\.com\/@([a-zA-Z0-9_.-]+)/;
  const handleMatch = url.match(handleRegex);
  if (handleMatch && handleMatch[1]) {
    return { type: 'handle', value: handleMatch[1] };
  }

  return null;
}

/**
 * Finds a channel ID from a channel handle using the Search API.
 * @param handle The channel's handle (without the '@').
 * @param apiKey The user's YouTube Data API key.
 * @returns The channel ID or null if not found.
 */
async function getChannelIdFromHandle(handle: string, apiKey: string): Promise<string | null> {
  const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
  // Searching with the @ symbol can sometimes yield better results.
  const searchUrl = `${API_BASE_URL}/search?part=snippet&q=${encodeURIComponent('@' + handle)}&type=channel&key=${apiKey}`;
  const response = await fetch(searchUrl);
  if (!response.ok) {
    console.error('Failed to search for channel handle');
    const errorData = await response.json();
    throw new Error(errorData.error.message || 'チャンネルハンドルの検索に失敗しました。');
  }
  const data = await response.json();
  if (data.items && data.items.length > 0) {
    // The first result is the most likely match for a specific handle.
    return data.items[0].id.channelId;
  }
  return null;
}


/**
 * Fetches the latest video IDs from a given channel identifier.
 * @param identifier An object containing the channel ID or handle.
 * @param apiKey The user's YouTube Data API key.
 * @param maxResults The maximum number of video IDs to return.
 * @returns A promise that resolves to an array of the latest video IDs.
 */
export async function getLatestVideoIdsFromChannel(
  identifier: { type: 'id' | 'handle'; value: string },
  apiKey: string,
  maxResults: number
): Promise<string[]> {
  const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
  let channelId: string | null = null;

  if (identifier.type === 'id') {
    channelId = identifier.value;
  } else if (identifier.type === 'handle') {
    channelId = await getChannelIdFromHandle(identifier.value, apiKey);
  }

  if (!channelId) {
    throw new Error('チャンネルIDが見つかりませんでした。ハンドル名またはURLが正しいか確認してください。');
  }

  const channelUrl = `${API_BASE_URL}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
  const channelResponse = await fetch(channelUrl);
   if (!channelResponse.ok) {
    const errorData = await channelResponse.json();
    throw new Error(errorData.error.message || 'チャンネルデータの取得に失敗しました。');
  }
  const channelData = await channelResponse.json();
  
  if (!channelData.items || channelData.items.length === 0) {
    throw new Error('チャンネル情報が見つかりませんでした。');
  }

  const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error('このチャンネルにはアップロードされた動画のリストがありません。');
  }

  const playlistItemsUrl = `${API_BASE_URL}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`;
  const playlistItemsResponse = await fetch(playlistItemsUrl);
   if (!playlistItemsResponse.ok) {
    const errorData = await playlistItemsResponse.json();
    throw new Error(errorData.error.message || 'プレイリストの動画取得に失敗しました。');
  }
  const playlistItemsData = await playlistItemsResponse.json();

  if (!playlistItemsData.items || playlistItemsData.items.length === 0) {
    throw new Error('チャンネルに動画が見つかりませんでした。');
  }

  return playlistItemsData.items.map((item: any) => item.snippet.resourceId.videoId);
}

/**
 * Searches for videos by keyword using the YouTube Search API.
 * @param keyword The search term.
 * @param apiKey The user's YouTube Data API key.
 * @param maxResults The maximum number of video IDs to return.
 * @returns A promise that resolves to an array of video IDs.
 */
export async function searchVideosByKeyword(
  keyword: string,
  apiKey: string,
  maxResults: number
): Promise<string[]> {
  const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
  const searchUrl = `${API_BASE_URL}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&key=${apiKey}&maxResults=${maxResults}`;
  
  const response = await fetch(searchUrl);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error.message || 'キーワードによる動画検索に失敗しました。');
  }

  const data: YouTubeSearchResponse = await response.json();
  
  if (!data.items || data.items.length === 0) {
    return [];
  }

  return data.items.map(item => item.id.videoId).filter(id => id); // Ensure id is not null/undefined
}

/**
 * Parses an ISO 8601 duration string into seconds.
 * @param duration The ISO 8601 duration string (e.g., "PT2M3S").
 * @returns The total duration in seconds.
 */
function parseISO8601Duration(duration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);

  if (!matches) {
    return 0;
  }

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  return (hours * 3600) + (minutes * 60) + seconds;
}


/**
 * Fetches details for multiple videos and their channels from the YouTube Data API.
 * @param videoIds An array of YouTube video IDs.
 * @param apiKey The user's YouTube Data API key.
 * @returns A promise that resolves to an array of VideoData objects.
 */
export async function fetchYouTubeVideosData(videoIds: string[], apiKey: string): Promise<VideoData[]> {
  if (videoIds.length === 0) {
    return [];
  }
  const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

  // Fetch Video Details for all videos in one call, including contentDetails for duration
  const videoDetailsUrl = `${API_BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`;
  const videoResponse = await fetch(videoDetailsUrl);
  if (!videoResponse.ok) {
    const errorData = await videoResponse.json();
    throw new Error(errorData.error.message || 'ビデオデータの取得に失敗しました。APIキーが正しいか確認してください。');
  }
  const videoDetails: YouTubeVideoDetailsResponse = await videoResponse.json();

  if (!videoDetails.items || videoDetails.items.length === 0) {
    throw new Error('指定されたIDの動画が見つかりませんでした。');
  }
  
  // Filter videos that are 2 minutes (120 seconds) or longer
  const filteredVideoItems = videoDetails.items.filter(item => {
    const durationInSeconds = parseISO8601Duration(item.contentDetails.duration);
    return durationInSeconds >= 120;
  });
  
  if (filteredVideoItems.length === 0) {
    // If all videos are shorter than 2 minutes, return empty or a specific message
    return [];
  }


  // Group videos by channel to fetch subscriber counts efficiently
  const videosByChannel: { [key: string]: any[] } = {};
  filteredVideoItems.forEach(video => {
    const channelId = video.snippet.channelId;
    if (!videosByChannel[channelId]) {
      videosByChannel[channelId] = [];
    }
    videosByChannel[channelId].push(video);
  });

  const channelIds = Object.keys(videosByChannel);
  
  // Fetch subscriber counts for all unique channels in one call
  const channelDetailsUrl = `${API_BASE_URL}/channels?part=statistics&id=${channelIds.join(',')}&key=${apiKey}`;
  const channelResponse = await fetch(channelDetailsUrl);
   if (!channelResponse.ok) {
    const errorData = await channelResponse.json();
    throw new Error(errorData.error.message || 'チャンネルデータの取得に失敗しました。');
  }
  const channelDetails: YouTubeChannelDetailsResponse = await channelResponse.json();

  const subscriberCounts: { [key: string]: number } = {};
  channelDetails.items.forEach(channel => {
    subscriberCounts[channel.id] = parseInt(channel.statistics.subscriberCount, 10);
  });

  // Map video details to our VideoData structure
  const processedVideos: VideoData[] = filteredVideoItems.map(videoItem => {
    const viewCount = parseInt(videoItem.statistics.viewCount, 10) || 0;
    const subscriberCount = subscriberCounts[videoItem.snippet.channelId] || 0;
    const diffusionRate = subscriberCount > 0 ? viewCount / subscriberCount : 0;

    return {
      videoId: videoItem.id,
      title: videoItem.snippet.title,
      thumbnailUrl: videoItem.snippet.thumbnails.high?.url || videoItem.snippet.thumbnails.default.url,
      viewCount,
      subscriberCount,
      diffusionRate,
      publishedAt: videoItem.snippet.publishedAt,
      videoUrl: `https://www.youtube.com/watch?v=${videoItem.id}`,
    };
  });
  
  return processedVideos;
}