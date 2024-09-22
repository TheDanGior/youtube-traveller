export interface VideoDetails {
  order: number;
  id: string;
  title: string;
  kind?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  channelId?: string;
  description?: string;
  channelTitle?: string;
  categoryId?: number;
  liveBroadcastContent?: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
  viewCount?: number;
  likeCount?: number;
  favoriteCount?: number;
  commentCount?: number;
  licensedContent?: boolean;
  topicCategories?: string[];
}
