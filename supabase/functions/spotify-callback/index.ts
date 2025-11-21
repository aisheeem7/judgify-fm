import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Spotify auth error:', error);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=${encodeURIComponent(error)}`,
        },
      });
    }

    if (!code) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=no_code`,
        },
      });
    }

    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=token_exchange_failed`,
        },
      });
    }

    const tokens = await tokenResponse.json();
    console.log('Successfully obtained Spotify tokens');

    // Get Spotify user info to create/link account
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const spotifyUser = await userResponse.json();
    console.log('Spotify user email:', spotifyUser.email);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user exists by querying auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Failed to list users:', listError);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=user_lookup_failed`,
        },
      });
    }

    const existingUser = users.find(u => u.email === spotifyUser.email);
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log('Existing user found:', userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: spotifyUser.email,
        email_confirm: true,
        user_metadata: {
          spotify_id: spotifyUser.id,
          display_name: spotifyUser.display_name,
        },
      });

      if (createError) {
        console.error('Failed to create user:', createError);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `${url.origin}/?error=user_creation_failed`,
          },
        });
      }

      userId = newUser.user.id;
      console.log('New user created:', userId);
    }

    // Store Spotify tokens
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    
    const { error: tokenError } = await supabase
      .from('spotify_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (tokenError) {
      console.error('Failed to store tokens:', tokenError);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=token_storage_failed`,
        },
      });
    }

    console.log('Tokens stored successfully');

    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createUser({
      email: spotifyUser.email,
      email_confirm: true,
      user_metadata: {
        spotify_id: spotifyUser.id,
        display_name: spotifyUser.display_name,
      },
    });

    if (sessionError && sessionError.message !== 'User already registered') {
      console.error('Failed to ensure user exists:', sessionError);
    }

    // Generate an auth link that will automatically sign the user in
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: spotifyUser.email,
      options: {
        redirectTo: `${url.origin}/results`,
      },
    });

    if (linkError) {
      console.error('Failed to generate auth link:', linkError);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=auth_link_failed`,
        },
      });
    }

    console.log('Redirecting to results page with auth');

    // Redirect using the proper auth link
    return new Response(null, {
      status: 302,
      headers: {
        'Location': linkData.properties.action_link,
      },
    });
  } catch (error) {
    console.error('Error in spotify-callback:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${new URL(req.url).origin}/?error=callback_failed`,
      },
    });
  }
});
