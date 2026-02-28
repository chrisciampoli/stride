import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Client to verify the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userId = user.id;

    // Admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Cascade delete in FK-safe order
    await supabaseAdmin.from('push_tokens').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_badges').delete().eq('user_id', userId);
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId);
    await supabaseAdmin.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await supabaseAdmin.from('daily_steps').delete().eq('user_id', userId);
    await supabaseAdmin.from('prize_distributions').delete().eq('user_id', userId);
    await supabaseAdmin.from('challenge_participants').delete().eq('user_id', userId);
    await supabaseAdmin.from('wallet_transactions').delete().eq('user_id', userId);
    await supabaseAdmin.from('wallets').delete().eq('user_id', userId);
    await supabaseAdmin.from('stripe_connect_accounts').delete().eq('user_id', userId);
    await supabaseAdmin.from('friendships').delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    await supabaseAdmin.from('user_settings').delete().eq('user_id', userId);

    // Delete avatar from storage
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from('avatars')
      .list(userId);
    if (avatarFiles && avatarFiles.length > 0) {
      const filePaths = avatarFiles.map((f) => `${userId}/${f.name}`);
      await supabaseAdmin.storage.from('avatars').remove(filePaths);
    }

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
