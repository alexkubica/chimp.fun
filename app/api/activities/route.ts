import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { EditorActivityInsert } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '50')
    const sessionId = searchParams.get('sessionId')
    const wallet = searchParams.get('wallet')
    
    let query = supabase
      .from('editor_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }
    
    if (wallet) {
      query = query.eq('user_wallet', wallet)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ activities: data })
  } catch (error) {
    console.error('Error in activities API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()
    
    // Validate required fields
    if (!body.activity_type || !body.output_type || !body.session_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const activityData: EditorActivityInsert = {
      session_id: body.session_id,
      activity_type: body.activity_type,
      output_type: body.output_type,
      user_wallet: body.user_wallet || null,
      nft_collection: body.nft_collection || null,
      nft_token_id: body.nft_token_id || null,
      nft_image_url: body.nft_image_url || null,
      reaction_type: body.reaction_type || null,
      output_url: body.output_url || null,
      metadata: body.metadata || null,
    }
    
    const { data, error } = await supabase
      .from('editor_activities')
      .insert(activityData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating activity:', error)
      return NextResponse.json(
        { error: 'Failed to create activity' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ activity: data })
  } catch (error) {
    console.error('Error in activities API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}