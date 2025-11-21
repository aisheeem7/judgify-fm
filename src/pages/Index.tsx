import { Music2, Sparkles, Heart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import spotifyLogo from "@/assets/spotify-logo.png";
const Index = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center space-y-8">
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            
            <h1 className="text-6xl md:text-7xl font-bold gradient-text py-[9px]">
              judgify.fm
            </h1>
          </div>
          <p className="text-2xl md:text-3xl text-foreground/80 max-w-3xl mx-auto leading-relaxed">
            Let AI roast your Spotify taste with{" "}
            <span className="gradient-text font-semibold">zero chill</span>
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Connect your Spotify and get a brutally honest summary of your music personality. Also, discover tracks you've been sleeping on.</p>
        </div>

        <div className="flex justify-center items-center pt-8 animate-scale-in">
          <Button size="lg" onClick={() => navigate("/login")} className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1DB954] text-white text-lg px-8 py-6 shadow-lg transition-all duration-300">
            <img src={spotifyLogo} alt="Spotify" className="mr-2 h-5 w-5" />
            Login with Spotify
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="glass-card p-8 text-center space-y-4 hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-[hsl(280_70%_70%)] flex items-center justify-center">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold">Taste Analysis</h3>
            <p className="text-muted-foreground">
              AI analyzes your top artists, tracks, and genres to give you the tea on your music taste.
            </p>
          </Card>

          <Card className="glass-card p-8 text-center space-y-4 hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-secondary to-[hsl(120_35%_75%)] flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold">Personality Roast</h3>
            <p className="text-muted-foreground">
              Get a hilarious Gen Z-style summary that tells you exactly what your playlist says about you.
            </p>
          </Card>

          <Card className="glass-card p-8 text-center space-y-4 hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-accent to-[hsl(40_80%_80%)] flex items-center justify-center">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold">Smart Recs</h3>
            <p className="text-muted-foreground">
              Discover new tracks that match your vibe but you've been criminally ignoring.
            </p>
          </Card>
        </div>
      </section>

      {/* Example Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 gradient-text">
            What to Expect
          </h2>
          <Card className="glass-card p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Example Output:</p>
              <p className="text-lg italic leading-relaxed">
                "You're giving 'soft sad girl hours' energy — listening to The Weeknd, Arctic Monkeys, 
                and Frank Ocean like your life's a montage. You radiate 'I'm not crying, it's just raining' vibes."
              </p>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-semibold text-muted-foreground mb-2">Your Aesthetic:</p>
              <p className="text-xl font-bold gradient-text">Late-night loner core</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        <p>Made with ❤️ by Ash        </p>
      </footer>
    </div>;
};
export default Index;