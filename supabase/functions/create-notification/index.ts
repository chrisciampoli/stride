import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_NOTIFICATION_TYPES = [
  'challenge_invite',
  'challenge_started',
  'challenge_completed',
  'rank_change',
  'friend_request',
  'friend_accepted',
  'nudge',
  'badge_earned',
  'goal_reached',
  'announcement',
] as const;

type NotificationType = (typeof ALLOWED_NOTIFICATION_TYPES)[number];

interface CreateNotificationBody {
  type: NotificationType;
  receiver_id: string;
  sender_id: string;
  challenge_id?: string;
  message?: string;
}

// Map notification types to default titles and bodies
const notificationDefaults: Record<NotificationType, { title: string; body: string }> = {
  challenge_invite: { title: 'Challenge Invite', body: "You've been invited to a challenge!" },
  challenge_started: { title: 'Challenge Started', body: 'A challenge you joined has started!' },
  challenge_completed: { title: 'Challenge Completed', body: 'A challenge you joined has ended!' },
  rank_change: { title: 'Rank Change', body: 'Your rank has changed on a leaderboard!' },
  friend_request: { title: 'Friend Request', body: 'You have a new friend request!' },
  friend_accepted: { title: 'Friend Accepted', body: 'Your friend request was accepted!' },
  nudge: { title: 'You got nudged!', body: 'Someone nudged you to keep moving!' },
  badge_earned: { title: 'Badge Earned', body: "You've earned a new badge!" },
  goal_reached: { title: 'Goal Reached', body: "You've reached your goal!" },
  announcement: { title: 'Announcement', body: 'You have a new announcement.' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Authenticate the user via their JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as CreateNotificationBody;
    const { type, receiver_id, sender_id, challenge_id, message } = body;

    // Validate required fields
    if (!type || !receiver_id || !sender_id) {
      return new Response(
        JSON.stringify({ error: 'type, receiver_id, and sender_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate sender_id matches authenticated user (prevent spoofing)
    if (sender_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'sender_id must match the authenticated user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate notification type
    if (!ALLOWED_NOTIFICATION_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid notification type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Use service role client for the insert (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const defaults = notificationDefaults[type];
    const notificationData: Record<string, unknown> = { sender_id };
    if (challenge_id) {
      notificationData.challenge_id = challenge_id;
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: receiver_id,
        type,
        title: defaults.title,
        body: message ?? defaults.body,
        data: notificationData,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, notification: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
