import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Zap, Shield, Smartphone, ArrowRight, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import exbitLogo from "@assets/exbit logo (1)_1762622679267.png";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Landing() {
  const handleMessengerClick = () => {
    // Replace with actual Messenger bot link
    window.open("https://m.me/YOUR_PAGE_ID", "_blank");
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <img 
            src={exbitLogo} 
            alt="ExBit Logo" 
            className="h-10"
            data-testid="img-logo"
          />
          <Button
            onClick={handleMessengerClick}
            variant="default"
            className="gap-2"
            data-testid="button-header-cta"
          >
            <MessageCircle className="h-4 w-4" />
            Get Started
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-4 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-6xl">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
              variants={fadeInUp}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium">Turn Your Chats into Cashouts</span>
            </motion.div>

            <motion.h1 
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              Convert Crypto to Naira
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Instantly
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed"
              variants={fadeInUp}
            >
              Buy and sell crypto with ExBit AI Agent on Messenger. No wallets, no hassle—just simple conversations.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              variants={fadeInUp}
            >
              <Button
                size="lg"
                onClick={handleMessengerClick}
                className="gap-2 w-full sm:w-auto text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                data-testid="button-messenger-hero"
              >
                <MessageCircle className="h-5 w-5" />
                Start Chatting
                <ArrowRight className="h-5 w-5" />
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="gap-2 w-full sm:w-auto text-lg px-8 py-6 rounded-full"
                onClick={() => window.location.href = "/chat"}
                data-testid="button-web-agent-hero"
              >
                <Zap className="h-5 w-5" />
                Web Agent
              </Button>
            </motion.div>

            <motion.p 
              className="text-sm text-muted-foreground mt-8"
              variants={fadeInUp}
            >
              <CheckCircle className="inline h-4 w-4 text-primary mr-1" />
              Join 1,000+ Nigerians swapping crypto the easy way
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-20 md:py-32 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple process
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Start a Conversation",
                description: "Click the button to chat with ExBit on Messenger. We'll create a secure wallet for you automatically.",
                icon: MessageCircle
              },
              {
                step: "2",
                title: "Deposit Crypto",
                description: "Send your crypto (USDT, ETH, BNB) from any wallet. We support Ethereum, BSC, Polygon, Arbitrum, and Base.",
                icon: Smartphone
              },
              {
                step: "3",
                title: "Swap to Naira",
                description: "Tell ExBit how much you want to swap. Enter your bank details and confirm with your PIN.",
                icon: Zap
              },
              {
                step: "4",
                title: "Receive Naira",
                description: "Get your money sent directly to your bank account in minutes. Simple, fast, and reliable.",
                icon: CheckCircle
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                data-testid={`step-${item.step}`}
              >
                <Card className="h-full border-2 hover-elevate">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                        {item.step}
                      </div>
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Why Choose ExBit?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to swap crypto to Naira seamlessly
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: "Simple Messaging Interface",
                description: "Chat with ExBit on Messenger like you're texting a friend. No complicated apps or technical knowledge needed."
              },
              {
                icon: Shield,
                title: "Secure & Reliable",
                description: "Your funds are protected with enterprise-grade security. We handle all the technical stuff so you don't have to worry."
              },
              {
                icon: Smartphone,
                title: "Instant Bank Transfers",
                description: "Get your Naira sent directly to any Nigerian bank account in minutes. Fast, easy, and hassle-free."
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                data-testid={`card-feature-${index}`}
              >
                <Card className="h-full hover-elevate">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <feature.icon className="h-7 w-7 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <motion.div
          className="relative mx-auto max-w-4xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of Nigerians converting crypto to Naira instantly on Messenger
          </p>
          <Button
            size="lg"
            onClick={handleMessengerClick}
            className="gap-2 text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            data-testid="button-messenger-cta"
          >
            <MessageCircle className="h-5 w-5" />
            Start on Messenger
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 border-t bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <img 
                src={exbitLogo} 
                alt="ExBit Logo" 
                className="h-8"
              />
              <div className="text-sm text-muted-foreground">
                Making crypto accessible for all Nigerians
              </div>
            </div>
            
            <div className="flex gap-8 text-sm">
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
          
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 ExBit. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
