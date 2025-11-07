import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Send, Sparkles } from "lucide-react";

interface AIAgentInterfaceProps {
  onCommandParsed: (params: {
    amount: string;
    token: string;
    blockchain: string;
  }) => void;
  walletConnected: boolean;
}

interface Message {
  type: "user" | "agent";
  content: string;
  timestamp: Date;
}

export function AIAgentInterface({ onCommandParsed, walletConnected }: AIAgentInterfaceProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "agent",
      content: walletConnected 
        ? "Hi! I'm your ExBit AI agent. Tell me what you'd like to swap. For example: 'swap 100 USDT on BSC to naira' or 'convert 0.5 ETH on Ethereum to naira'" 
        : "Welcome to ExBit! Please connect your wallet first to get started.",
      timestamp: new Date(),
    },
  ]);

  const parseCommand = (text: string): { amount: string; token: string; blockchain: string } | null => {
    const normalizedText = text.toLowerCase().trim();
    
    // Extract amount (number with optional decimal)
    const amountMatch = normalizedText.match(/(\d+(?:\.\d+)?)/);
    if (!amountMatch) return null;
    const amount = amountMatch[1];

    // Extract token
    const tokens = ["usdt", "usdc", "dai", "busd", "eth", "bnb", "matic"];
    const foundToken = tokens.find(token => normalizedText.includes(token));
    if (!foundToken) return null;
    const token = foundToken.toUpperCase();

    // Extract blockchain
    const blockchainMap: Record<string, string> = {
      "ethereum": "ethereum",
      "eth": "ethereum",
      "bsc": "bsc",
      "binance": "bsc",
      "polygon": "polygon",
      "matic": "polygon",
      "arbitrum": "arbitrum",
      "arb": "arbitrum",
      "base": "base",
    };

    let blockchain = "ethereum"; // default
    for (const [key, value] of Object.entries(blockchainMap)) {
      if (normalizedText.includes(key)) {
        blockchain = value;
        break;
      }
    }

    return { amount, token, blockchain };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !walletConnected) return;

    const userMessage: Message = {
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    const parsed = parseCommand(input);
    
    if (parsed) {
      const agentResponse: Message = {
        type: "agent",
        content: `Great! I'll help you swap ${parsed.amount} ${parsed.token} on ${parsed.blockchain.charAt(0).toUpperCase() + parsed.blockchain.slice(1)} to Naira. Let me prepare that for you...`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentResponse]);
      
      setTimeout(() => {
        onCommandParsed(parsed);
      }, 800);
    } else {
      const errorResponse: Message = {
        type: "agent",
        content: "I didn't quite understand that. Please try something like: 'swap 100 USDT on BSC to naira' or 'convert 0.5 ETH on Ethereum to naira'",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    }

    setInput("");
  };

  const suggestions = [
    "swap 100 USDT on BSC to naira",
    "convert 0.5 ETH on Ethereum to naira",
    "exchange 50 USDC on Polygon to naira",
  ];

  return (
    <div className="space-y-4">
      <Card className="p-6">
        {/* Chat Messages */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.type === "agent" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.type === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Form */}
        {walletConnected && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your swap command..."
                className="flex-1"
                disabled={!walletConnected}
                data-testid="input-ai-command"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || !walletConnected}
                data-testid="button-send-command"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Suggestions */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Try:</span>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-2 py-1 rounded-full bg-muted hover-elevate active-elevate-2 transition-colors"
                  data-testid={`button-suggestion-${index}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </form>
        )}

        {!walletConnected && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to start chatting with the AI agent
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
