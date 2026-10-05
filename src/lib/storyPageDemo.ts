import type { FeedItem } from '../types'

/** Fixed id for local design QA (mock data, no API). */
export const STORY_PAGE_DEMO_ID = 'design-preview'

const now = new Date().toISOString()

function demoItem(partial: Partial<FeedItem> & Pick<FeedItem, 'id' | 'title'>): FeedItem {
  return {
    source: 'youtube',
    source_id: null,
    source_name: 'Skill Leap AI',
    author: null,
    url: 'https://www.youtube.com/watch?v=demo',
    thumbnail: 'https://i4.ytimg.com/vi/gfh6l3DxHK0/hqdefault.jpg',
    published_at: now,
    engagement_score: 170000,
    summary: null,
    summary_model: null,
    summarized_at: null,
    tags: [],
    keywords: [],
    roles: [],
    try_this: null,
    key_points: null,
    hidden: false,
    story_group_id: null,
    is_story_lead: true,
    is_ai_related: true,
    headline: null,
    created_at: now,
    updated_at: now,
    ...partial,
  }
}

export function getStoryPageDemoPayload(): {
  item: FeedItem
  groupVideos: FeedItem[]
} {
  const item = demoItem({
    id: STORY_PAGE_DEMO_ID,
    headline: 'OpenAI launches Dots, an always-on ChatGPT assistant',
    title: 'The Biggest ChatGPT Update Yet: Meet dots',
    summary:
      'ChatGPT Dots is an always-on AI assistant that works independently, checks apps, finds issues, and messages you when action is needed, even when you are not using ChatGPT.',
    keywords: ['ChatGPT', 'AI Agents'],
    roles: ['Founder / Leadership', 'Operations'],
    key_points: [
      'ChatGPT Dots runs continuously and does not need constant user input to complete tasks.',
      'It can access Google Drive, email, and calendar to check progress and alert you when something needs attention.',
      'You can assign it real responsibilities, like managing a product launch, and it will follow rules and update documents automatically.',
      'Unlike regular ChatGPT, Dots takes initiative and messages you first when it finds useful information or problems.',
      'It is part of OpenAI’s new AI agent system designed to handle ongoing work without manual restarts.',
    ],
    try_this:
      'Open ChatGPT and create a Dot by giving it a specific goal, like tracking project tasks, and connect it to your calendar or email to see it work autonomously.',
    story_video_count: 5,
  })

  const groupVideos: FeedItem[] = [
    item,
    demoItem({
      id: 'demo-v2',
      title: 'OpenAI Just Revealed Dots… This Changes ChatGPT Forever',
      source_name: 'TheAIGRID',
      thumbnail: 'https://i1.ytimg.com/vi/o3YTzebEs18/hqdefault.jpg',
      engagement_score: 0,
    }),
    demoItem({
      id: 'demo-v3',
      title: 'ChatGPT Dots: How I Spent My First 24 Hours',
      source_name: 'The AI Advantage',
      thumbnail: 'https://i1.ytimg.com/vi/db1KRJQEt8w/hqdefault.jpg',
      engagement_score: 0,
    }),
    demoItem({
      id: 'demo-v4',
      title: 'How ChatGPT Dots Can Change Your Life in 4 Minutes',
      source_name: 'The AI Advantage',
      thumbnail: 'https://i1.ytimg.com/vi/E3xKmcHBOzY/hqdefault.jpg',
      engagement_score: 0,
    }),
    demoItem({
      id: 'demo-v5',
      title: 'AI News: Dots, GPT-6.1 Sol, Sonnet 5.5, Gemini 4, and everything you need to know',
      source_name: 'Matt Wolfe',
      thumbnail: 'https://i1.ytimg.com/vi/dDgncbBAA0c/hqdefault.jpg',
      engagement_score: 0,
    }),
  ]

  return { item, groupVideos }
}
