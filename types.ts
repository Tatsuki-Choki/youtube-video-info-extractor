export interface VideoData {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  viewCount: number;
  subscriberCount: number;
  diffusionRate: number;
  publishedAt: string;
  videoUrl: string;
}

// Interfaces for raw YouTube API responses for better type safety

export interface YouTubeVideoDetailsResponse {
  items: {
    id: string;
    snippet: {
      publishedAt: string;
      channelId: string;
      title: string;
      description: string;
      thumbnails: {
        high: {
          url: string;
          width: number;
          height: number;
        };
      };
    };
    statistics: {
      viewCount: string;
      likeCount: string;
      commentCount: string;
    };
    contentDetails: {
      duration: string;
    };
  }[];
}

export interface YouTubeChannelDetailsResponse {
  items: {
    id: string;
    statistics: {
      subscriberCount: string;
    };
  }[];
}

export interface YouTubeSearchResponse {
  items: {
    id: {
      videoId: string;
    };
  }[];
}