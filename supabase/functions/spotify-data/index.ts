import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the Spotify access token from the database
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('spotify_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token fetch error:', tokenError);
      return new Response(JSON.stringify({ error: 'No Spotify token found. Please reconnect your Spotify account.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    let spotifyAccessToken = tokenData.access_token;

    if (now >= expiresAt) {
      console.log('Token expired, refreshing...');
      
      const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
      const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

      const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        console.error('Token refresh failed');
        return new Response(JSON.stringify({ error: 'Failed to refresh Spotify token. Please reconnect your account.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const refreshData = await refreshResponse.json();
      spotifyAccessToken = refreshData.access_token;

      // Update stored token
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
      await supabaseClient
        .from('spotify_tokens')
        .update({
          access_token: refreshData.access_token,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('user_id', user.id);

      console.log('Token refreshed successfully');
    }

    // Fetch user's top artists
    const topArtistsResponse = await fetch(
      'https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term',
      {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`,
        },
      }
    );

    if (!topArtistsResponse.ok) {
      console.error('Failed to fetch top artists:', topArtistsResponse.status, await topArtistsResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to fetch top artists from Spotify' }), {
        status: topArtistsResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's top tracks
    const topTracksResponse = await fetch(
      'https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term',
      {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`,
        },
      }
    );

    if (!topTracksResponse.ok) {
      console.error('Failed to fetch top tracks:', topTracksResponse.status, await topTracksResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to fetch top tracks from Spotify' }), {
        status: topTracksResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const topArtistsData = await topArtistsResponse.json();
    const topTracksData = await topTracksResponse.json();
    
    console.log('Top artists count:', topArtistsData.items?.length || 0);
    console.log('Top tracks count:', topTracksData.items?.length || 0);

    // Fetch audio features for top tracks
    const trackIds = topTracksData.items?.map((track: any) => track.id).join(',');
    
    if (!trackIds) {
      console.error('No track IDs found');
      return new Response(JSON.stringify({ error: 'No tracks found in your Spotify account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const audioFeaturesResponse = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${trackIds}`,
      {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`,
        },
      }
    );

    let audioFeaturesData = { audio_features: [] };
    
    if (!audioFeaturesResponse.ok) {
      console.error('Failed to fetch audio features:', audioFeaturesResponse.status, await audioFeaturesResponse.text());
      console.log('Continuing without audio features - will use default values');
      // Create default audio features based on track data
      audioFeaturesData = {
        audio_features: topTracksData.items?.map(() => ({
          energy: 0.6,
          danceability: 0.6,
          valence: 0.5,
          acousticness: 0.3,
        })) || []
      };
    } else {
      audioFeaturesData = await audioFeaturesResponse.json();
    }
    
    console.log('Audio features count:', audioFeaturesData.audio_features?.length || 0);

    // Extract genres from top artists
    const genres: { [key: string]: number } = {};
    topArtistsData.items?.forEach((artist: any) => {
      artist.genres?.forEach((genre: string) => {
        genres[genre] = (genres[genre] || 0) + 1;
      });
    });

    // Calculate average audio features
    const features = audioFeaturesData.audio_features || [];
    const avgFeatures = {
      energy: features.reduce((sum: number, f: any) => sum + (f?.energy || 0), 0) / features.length,
      danceability: features.reduce((sum: number, f: any) => sum + (f?.danceability || 0), 0) / features.length,
      valence: features.reduce((sum: number, f: any) => sum + (f?.valence || 0), 0) / features.length,
      acousticness: features.reduce((sum: number, f: any) => sum + (f?.acousticness || 0), 0) / features.length,
    };

    // Get recommendations based on top genre
    // First get the top genre
    const topGenre = Object.entries(genres)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0];
    
    let recommendationsData = { tracks: [] };
    
    if (topGenre) {
      // Search for tracks in the top genre
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(topGenre)}&type=track&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${spotifyAccessToken}`,
          },
        }
      );

      if (!searchResponse.ok) {
        console.error('Failed to search tracks by genre:', searchResponse.status, await searchResponse.text());
      } else {
        const searchData = await searchResponse.json();
        // Get random 3 tracks from the results
        const tracks = searchData.tracks?.items || [];
        const shuffled = tracks.sort(() => 0.5 - Math.random());
        recommendationsData = { tracks: shuffled.slice(0, 3) };
      }
    }
    
    console.log('Recommendations count:', recommendationsData.tracks?.length || 0);

    // Format the response
    const musicData = {
      topArtists: topArtistsData.items?.map((artist: any) => ({
        name: artist.name,
        image: artist.images?.[0]?.url,
        genres: artist.genres,
      })),
      topTracks: topTracksData.items?.map((track: any) => ({
        name: track.name,
        artist: track.artists?.[0]?.name,
        album: track.album?.name,
        image: track.album?.images?.[0]?.url,
      })),
      genres: Object.entries(genres)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genre, count]) => ({ name: genre, count })),
      audioFeatures: avgFeatures,
      recommendations: recommendationsData.tracks?.map((track: any) => ({
        name: track.name,
        artist: track.artists?.[0]?.name,
        image: track.album?.images?.[0]?.url,
        uri: track.uri,
      })),
    };

    return new Response(JSON.stringify(musicData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
