import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import spotifyLogo from "@/assets/spotify-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/results");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/results");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSpotifyLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call our custom Spotify auth edge function
      const { data, error } = await supabase.functions.invoke('spotify-auth');

      if (error) {
        const errorMessage = error.message || "Failed to connect to Spotify";
        setError(errorMessage);
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!data?.authUrl) {
        const errorMessage = "No authentication URL received";
        setError(errorMessage);
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Redirect to Spotify authorization
      window.location.href = data.authUrl;
      // Keep loading state true during redirect
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initiate Spotify login";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="glass-card p-8 w-full max-w-md space-y-8 animate-scale-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-bold gradient-text py-[7px]">
            judgify.fm
          </h1>
          <p className="text-muted-foreground text-center px-0">
            Connect your Spotify account to analyze your music taste
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Spotify Login Button */}
        <div className="space-y-4">
          <Button 
            onClick={handleSpotifyLogin}
            size="lg"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1DB954] text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting to Spotify...
              </>
            ) : (
              <>
                <img src={spotifyLogo} alt="Spotify" className="mr-2 h-5 w-5" />
                Login with Spotify
              </>
            )}
          </Button>
        </div>

        <Button 
          variant="outline" 
          onClick={() => navigate("/")}
          disabled={isLoading}
          className="w-full glass-card hover:bg-[hsl(280_70%_85%)] hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back to Home
        </Button>
      </Card>
    </div>
  );
};

export default Login;
