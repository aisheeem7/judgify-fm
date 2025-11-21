import { useNavigate } from "react-router-dom";
import { Music2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Results = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [musicData, setMusicData] = useState<any>(null);

  useEffect(() => {
    const fetchSpotifyData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase.functions.invoke('spotify-data', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;

        setMusicData(data);
      } catch (error: any) {
        console.error('Error fetching Spotify data:', error);
        toast({
          title: "Error",
          description: "Failed to load your music data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSpotifyData();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">analyzing your weird taste 😵‍💫</div>
      </div>
    );
  }

  if (!musicData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">No data available</div>
      </div>
    );
  }

  // Generate summary based on audio features
  const generateSummary = () => {
    const { audioFeatures } = musicData;
    let mood = "";
    
    if (audioFeatures.energy > 0.7) mood = "high-energy and dynamic";
    else if (audioFeatures.energy > 0.4) mood = "balanced and versatile";
    else mood = "calm and introspective";
    
    return `Your music taste is ${mood} with a ${audioFeatures.danceability > 0.6 ? "strong rhythmic" : "laid-back"} feel. You enjoy ${audioFeatures.valence > 0.5 ? "uplifting and positive" : "thoughtful and emotional"} vibes.`;
  };

  const generateAesthetic = () => {
    const { audioFeatures } = musicData;
    if (audioFeatures.energy > 0.7 && audioFeatures.valence > 0.6) return "Party Starter - Energetic, upbeat, and vibrant";
    if (audioFeatures.acousticness > 0.5) return "Acoustic Soul - Raw, organic, and intimate";
    if (audioFeatures.energy < 0.4 && audioFeatures.valence < 0.5) return "Night Thinker - Introspective, moody, and deep";
    return "Eclectic Explorer - Diverse, adventurous, and unique";
  };

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold gradient-text pb-1">judgify.fm</h1>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="glass-card"
            >
              Sign Out
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="glass-card"
            >
              Refresh Analysis
            </Button>
          </div>
        </header>

        {/* Title */}
        <div className="text-center space-y-4">
          <h2 className="text-5xl font-bold gradient-text">Your Music Vibe Check</h2>
          <p className="text-muted-foreground text-lg">Based on your Spotify listening history</p>
        </div>

        {/* Main Summary Card */}
        <Card className="glass-card p-8 space-y-4 animate-scale-in">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">The Verdict</h2>
          </div>
          <p className="text-lg leading-relaxed">{generateSummary()}</p>
          <div className="pt-4 border-t border-border">
            <span className="text-sm font-semibold text-muted-foreground">Your Aesthetic: </span>
            <span className="text-lg font-bold gradient-text">{generateAesthetic()}</span>
          </div>
        </Card>

        {/* Top Artists */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center">Your Top Artists</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {musicData.topArtists?.map((artist: any, idx: number) => (
              <Card 
                key={idx} 
                className="glass-card p-4 text-center space-y-3 hover:scale-105 transition-transform duration-300"
              >
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden shadow-lg">
                  {artist.image && (
                    <img 
                      src={artist.image} 
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <p className="font-semibold text-sm">{artist.name}</p>
                {artist.genres && artist.genres.length > 0 && (
                  <p className="text-xs text-muted-foreground">{artist.genres[0]}</p>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Genre Profile */}
        <Card className="glass-card p-6">
          <h3 className="text-xl font-bold mb-4">
            Genre Profile
          </h3>
          <div className="flex flex-wrap gap-2">
            {musicData.genres?.map((genre: any, idx: number) => (
              <span 
                key={idx}
                className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm capitalize"
              >
                {genre.name}
              </span>
            ))}
          </div>
        </Card>

        {/* Recommendations */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Songs You'll Vibe With</h2>
            <p className="text-muted-foreground">
              Based on your listening patterns, we found some tracks you might love
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {musicData.recommendations?.map((song: any, idx: number) => (
              <Card 
                key={idx}
                className="glass-card p-6 space-y-4 hover:shadow-xl transition-shadow duration-300"
              >
                {song.image && (
                  <div className="aspect-square rounded-lg overflow-hidden shadow-md">
                    <img 
                      src={song.image}
                      alt={song.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h4 className="font-bold">{song.name}</h4>
                  <p className="text-sm text-muted-foreground">{song.artist}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
