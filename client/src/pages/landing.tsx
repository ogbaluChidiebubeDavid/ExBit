import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Zap, Shield, Smartphone } from "lucide-react";

export default function Landing() {
  const handleMessengerClick = () => {
    // Replace with actual Messenger bot link
    window.open("https://m.me/YOUR_PAGE_ID", "_blank");
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary/10 via-background to-background px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl mb-6">
            Convert Crypto to Naira
            <br />
            <span className="text-primary">In Seconds</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            ExBit makes cryptocurrency simple for Nigerians. Swap your crypto to Naira and get paid directly to your bank account—no wallets, no hassle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={handleMessengerClick}
              className="gap-2 w-full sm:w-auto"
              data-testid="button-messenger"
            >
              <MessageCircle className="h-5 w-5" />
              Chat on Messenger
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              data-testid="button-web-agent"
              disabled
            >
              <Zap className="h-5 w-5" />
              Web Agent (Coming Soon)
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Join 1,000+ Nigerians swapping crypto the easy way
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
            Why Choose ExBit?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card data-testid="card-feature-simple">
              <CardContent className="p-6">
                <div className="mb-4">
                  <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Simple Messaging Interface</h3>
                <p className="text-muted-foreground">
                  Chat with ExBit on Messenger like you're texting a friend. No complicated apps or technical knowledge needed.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-secure">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Secure & Reliable</h3>
                <p className="text-muted-foreground">
                  Your funds are protected with enterprise-grade security. We handle all the technical stuff so you don't have to worry.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-instant">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Smartphone className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Instant Bank Transfers</h3>
                <p className="text-muted-foreground">
                  Get your Naira sent directly to any Nigerian bank account in minutes. Fast, easy, and hassle-free.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-16 md:py-24 bg-muted/30">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
            How It Works
          </h2>

          <div className="space-y-8">
            <div className="flex gap-4" data-testid="step-1">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Start a conversation</h3>
                <p className="text-muted-foreground">
                  Click the button above to chat with ExBit on Messenger. We'll create a secure wallet for you automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-4" data-testid="step-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Deposit crypto</h3>
                <p className="text-muted-foreground">
                  Send your crypto (USDT, ETH, BNB) from any wallet. ExBit supports Ethereum, BSC, Polygon, Arbitrum, and Base.
                </p>
              </div>
            </div>

            <div className="flex gap-4" data-testid="step-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Swap to Naira</h3>
                <p className="text-muted-foreground">
                  Tell ExBit how much you want to swap. Enter your bank details and confirm with your PIN.
                </p>
              </div>
            </div>

            <div className="flex gap-4" data-testid="step-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                4
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Receive Naira</h3>
                <p className="text-muted-foreground">
                  Get your money sent directly to your bank account in minutes. Simple, fast, and reliable.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button
              size="lg"
              onClick={handleMessengerClick}
              className="gap-2"
              data-testid="button-messenger-cta"
            >
              <MessageCircle className="h-5 w-5" />
              Get Started Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2025 ExBit. Making crypto accessible for all Nigerians.
            </div>
            
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Support
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
