import { supabase } from './supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

type PresenceStatus = 'online' | 'offline' | 'away'

interface RealtimeManagerState {
  channels: Map<string, RealtimeChannel>
  presenceChannel: RealtimeChannel | null
  userId: string | null
}

/**
 * Centralized manager for real-time subscriptions and user presence
 * Prevents duplicate connections and provides efficient cleanup
 */
class RealtimeManager {
  private state: RealtimeManagerState = {
    channels: new Map(),
    presenceChannel: null,
    userId: null,
  }

  /**
   * Subscribe to a channel with deduplication
   */
  subscribe(channelName: string, config: {
    table: string
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
    filter?: string
    callback: (payload: any) => void
  }): RealtimeChannel {
    // Return existing channel if already subscribed
    const existing = this.state.channels.get(channelName)
    if (existing) {
      return existing
    }

    const channel = supabase.channel(channelName)
    
    // Build the subscription config
    const subscriptionConfig: {
      event: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
      schema: string
      table: string
      filter?: string
    } = {
      event: config.event || '*',
      schema: 'public',
      table: config.table,
    }
    
    if (config.filter) {
      subscriptionConfig.filter = config.filter
    }

    const subscribedChannel = channel
      .on('postgres_changes' as any, subscriptionConfig, config.callback)
      .subscribe()

    this.state.channels.set(channelName, subscribedChannel)
    return subscribedChannel
  }

  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string): void {
    const channel = this.state.channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      this.state.channels.delete(channelName)
    }
  }

  /**
   * Set user presence status
   */
  async setUserPresence(userId: string, status: PresenceStatus): Promise<void> {
    this.state.userId = userId

    try {
      await supabase.from('user_presence').upsert({
        user_id: userId,
        status,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
    } catch (err) {
      // Silently fail - presence is not critical
      console.warn('Failed to update presence:', err)
    }
  }

  /**
   * Subscribe to presence changes for specific users
   */
  subscribeToPresence(userIds: string[], callback: (userId: string, status: PresenceStatus) => void): void {
    if (this.state.presenceChannel) {
      supabase.removeChannel(this.state.presenceChannel)
    }

    const channel = supabase.channel('presence-updates')
    
    this.state.presenceChannel = channel
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'user_presence',
      }, (payload: any) => {
        const record = (payload.new || payload.old) as any
        if (record && userIds.includes(record.user_id)) {
          callback(record.user_id, record.status || 'offline')
        }
      })
      .subscribe()
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    // Unsubscribe from all channels
    for (const [name, channel] of this.state.channels) {
      supabase.removeChannel(channel)
    }
    this.state.channels.clear()

    // Cleanup presence channel
    if (this.state.presenceChannel) {
      supabase.removeChannel(this.state.presenceChannel)
      this.state.presenceChannel = null
    }

    // Set user offline
    if (this.state.userId) {
      this.setUserPresence(this.state.userId, 'offline').catch(() => {})
    }
  }

  /**
   * Get count of active channels (for debugging)
   */
  getActiveChannelCount(): number {
    return this.state.channels.size
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager()

export default realtimeManager
