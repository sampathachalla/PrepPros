/** Sample records shaped like real Bright Data and YouTube Data API responses. */
export const reelRecord = {
  url: 'https://www.instagram.com/reel/C5Rdyj_q7YN/',
  post_id: '3337579816830088717',
  user_posted: 'fitchef',
  user_profile_url: 'https://www.instagram.com/fitchef',
  profile_image_link: 'https://cdn.instagram.test/avatar.jpg',
  followers: 220234,
  is_verified: false,
  description: 'High protein overnight oats 🥣 #mealprep #protein\n\nIngredients:\n- oats\n- yogurt',
  hashtags: ['#MealPrep', '#protein'],
  thumbnail: 'https://cdn.instagram.test/thumb.jpg',
  video_url: 'https://cdn.instagram.test/video.mp4',
  length: '46.79999923706055',
  likes: 3470337,
  num_comments: 7859,
  views: null,
  video_play_count: 9000000,
  date_posted: '2024-04-02T20:44:39.000Z',
};

export const youtubeVideo = {
  id: 'abcdefghijk',
  snippet: {
    title: 'Air Fryer Chicken Fajita Bowls #cooking',
    description: 'Easy meal prep #mealprep #highprotein',
    channelId: 'UC123',
    channelTitle: 'Chef Sam',
    publishedAt: '2026-05-01T10:00:00Z',
    defaultAudioLanguage: 'en-US',
    thumbnails: {
      high: { url: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg' },
      maxres: { url: 'https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg' },
    },
  },
  contentDetails: { duration: 'PT1M16S' },
  statistics: { viewCount: '1832712355', likeCount: '1000', commentCount: '25' },
};
