import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    data: Record<string, unknown>;
  };
}

// Map notification types to user_settings columns
const notificationSettingsMap: Record<string, string> = {
  challenge_invite: 'notification_new_invites',
  challenge_started: 'notification_new_invites',
  challenge_completed: 'notification_goals',
  rank_change: 'notification_leaderboard',
  friend_request: 'notification_cheers',
  friend_accepted: 'notification_cheers',
  nudge: 'notification_cheers',
  badge_earned: 'notification_goals',
  goal_reached: 'notification_goals',
  announcement: 'notification_announcements',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth check - verify request comes from authorized source
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('x-cron-secret');
  const authorizationHeader = req.headers.get('Authorization');

  // Allow service role key OR cron secret
  const isServiceRole = authorizationHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const isCronSecret = cronSecret && authHeader === cronSecret;

  if (!isServiceRole && !isCronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = (await req.json()) as NotificationPayload;
    const { record } = payload;

    if (!record?.user_id || !record?.title) {
      return new Response(
        JSON.stringify({ error: 'Invalid notification payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Check user notification preferences
    const settingsColumn = notificationSettingsMap[record.type];
    if (settingsColumn) {
      const { data: settings } = await supabaseAdmin
        .from('user_settings')
        .select(settingsColumn)
        .eq('user_id', record.user_id)
        .single();

      if (settings && settings[settingsColumn] === false) {
        return new Response(
          JSON.stringify({ skipped: true, reason: 'User disabled this notification type' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Get user's push tokens
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('user_id', record.user_id);

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'No push tokens found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Send via Expo Push API
    const messages = tokens.map((t) => ({
      to: t.token,
      title: record.title,
      body: record.body ?? undefined,
      data: {
        type: record.type,
        ...record.data,
      },
      sound: 'default',
      priority: 'high',
    }));

    const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const accessToken = Deno.env.get('EXPO_PUSH_ACCESS_TOKEN');
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const pushResponse = await fetch(expoPushUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });

    const pushResult = await pushResponse.json();

    return new Response(
      JSON.stringify({ success: true, result: pushResult }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
