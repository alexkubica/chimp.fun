import { supabase } from '@/lib/supabase'
import type { EditorActivity, EditorActivityInsert } from '@/types/database'

// Generate a session ID for tracking user activities
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Get or create session ID from localStorage
export function getSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId()
  
  let sessionId = localStorage.getItem('editor_session_id')
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem('editor_session_id', sessionId)
  }
  return sessionId
}

// Track a new activity
export async function trackActivity(activity: Omit<EditorActivityInsert, 'session_id'>) {
  try {
    const sessionId = getSessionId()
    
    const { data, error } = await supabase
      .from('editor_activities')
      .insert({
        ...activity,
        session_id: sessionId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error tracking activity:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error tracking activity:', error)
    return null
  }
}

// Get recent activities (for the activity page)
export async function getRecentActivities(limit = 50): Promise<EditorActivity[]> {
  try {
    const { data, error } = await supabase
      .from('editor_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching activities:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching activities:', error)
    return []
  }
}

// Get activities for a specific session
export async function getSessionActivities(sessionId?: string): Promise<EditorActivity[]> {
  try {
    const currentSessionId = sessionId || getSessionId()
    
    const { data, error } = await supabase
      .from('editor_activities')
      .select('*')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching session activities:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching session activities:', error)
    return []
  }
}

// Get activities for a specific wallet
export async function getWalletActivities(walletAddress: string): Promise<EditorActivity[]> {
  try {
    const { data, error } = await supabase
      .from('editor_activities')
      .select('*')
      .eq('user_wallet', walletAddress)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching wallet activities:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching wallet activities:', error)
    return []
  }
}

// Get activity statistics
export async function getActivityStats() {
  try {
    // Get total activities count
    const { count: totalActivities } = await supabase
      .from('editor_activities')
      .select('*', { count: 'exact', head: true })

    // Get activities by type
    const { data: activityTypeStats } = await supabase
      .from('editor_activities')
      .select('activity_type')
      .then(({ data }) => {
        const stats = data?.reduce((acc, item) => {
          acc[item.activity_type] = (acc[item.activity_type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        return { data: stats }
      })

    // Get activities by output type
    const { data: outputTypeStats } = await supabase
      .from('editor_activities')
      .select('output_type')
      .then(({ data }) => {
        const stats = data?.reduce((acc, item) => {
          acc[item.output_type] = (acc[item.output_type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        return { data: stats }
      })

    // Get activities in the last 24 hours
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { count: last24h } = await supabase
      .from('editor_activities')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())

    return {
      totalActivities: totalActivities || 0,
      last24h: last24h || 0,
      activityTypes: activityTypeStats || {},
      outputTypes: outputTypeStats || {},
    }
  } catch (error) {
    console.error('Error fetching activity stats:', error)
    return {
      totalActivities: 0,
      last24h: 0,
      activityTypes: {},
      outputTypes: {},
    }
  }
}

// Helper functions for tracking specific activities
export const trackGeneration = (params: {
  userWallet?: string
  nftCollection?: string
  nftTokenId?: string
  nftImageUrl?: string
  reactionType?: string
  outputType: 'gif' | 'mp4' | 'image'
  outputUrl?: string
  metadata?: Record<string, any>
}) => {
  return trackActivity({
    activity_type: 'generation',
    user_wallet: params.userWallet || null,
    nft_collection: params.nftCollection || null,
    nft_token_id: params.nftTokenId || null,
    nft_image_url: params.nftImageUrl || null,
    reaction_type: params.reactionType || null,
    output_type: params.outputType,
    output_url: params.outputUrl || null,
    metadata: params.metadata || null,
  })
}

export const trackDownload = (params: {
  userWallet?: string
  outputType: 'gif' | 'mp4' | 'image'
  outputUrl?: string
  metadata?: Record<string, any>
}) => {
  return trackActivity({
    activity_type: 'download',
    user_wallet: params.userWallet || null,
    output_type: params.outputType,
    output_url: params.outputUrl || null,
    metadata: params.metadata || null,
  })
}

export const trackCopy = (params: {
  userWallet?: string
  outputType: 'gif' | 'mp4' | 'image'
  outputUrl?: string
  metadata?: Record<string, any>
}) => {
  return trackActivity({
    activity_type: 'copy',
    user_wallet: params.userWallet || null,
    output_type: params.outputType,
    output_url: params.outputUrl || null,
    metadata: params.metadata || null,
  })
}

export const trackShare = (params: {
  userWallet?: string
  outputType: 'gif' | 'mp4' | 'image'
  outputUrl?: string
  platform?: string
  metadata?: Record<string, any>
}) => {
  return trackActivity({
    activity_type: 'share',
    user_wallet: params.userWallet || null,
    output_type: params.outputType,
    output_url: params.outputUrl || null,
    metadata: { platform: params.platform, ...params.metadata },
  })
}