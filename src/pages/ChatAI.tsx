// ChatAI page with Gemini AI integration
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, RefreshCw, TrendingUp, Users, Package, Clock, Calendar, BarChart3, DollarSign, Trophy, ShoppingCart, TrendingDown, Zap, Target, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { sendChatMessage, ChatMessage } from '@/services/geminiService';
import { fetchBusinessDataForAI } from '@/services/chatDataService';

interface Suggestion {
  title: string;
  prompt: string;
  icon: React.ReactNode;
  color: string;
}

const ChatAI: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [businessContext, setBusinessContext] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions: Suggestion[] = [
    {
      title: 'Revenue Analysis',
      prompt: 'Show me today\'s revenue breakdown and compare it with yesterday',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Top Customers',
      prompt: 'Who are my top 10 customers by total spending?',
      icon: <Users className="h-5 w-5" />,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Product Performance',
      prompt: 'Analyze product sales and identify best-selling items',
      icon: <Package className="h-5 w-5" />,
      color: 'from-purple-500 to-pink-600'
    },
    {
      title: 'Station Utilization',
      prompt: 'Show me station occupancy rates and most popular station types',
      icon: <Clock className="h-5 w-5" />,
      color: 'from-orange-500 to-red-600'
    },
    {
      title: 'Booking Insights',
      prompt: 'Analyze booking patterns and predict demand for next week',
      icon: <Calendar className="h-5 w-5" />,
      color: 'from-indigo-500 to-blue-600'
    },
    {
      title: 'Tournament Stats',
      prompt: 'Show tournament history and most popular game types',
      icon: <Trophy className="h-5 w-5" />,
      color: 'from-yellow-500 to-orange-600'
    },
    {
      title: 'Profit Margin',
      prompt: 'Calculate overall profit margins and identify areas for improvement',
      icon: <DollarSign className="h-5 w-5" />,
      color: 'from-teal-500 to-green-600'
    },
    {
      title: 'Sales Report',
      prompt: 'Generate a comprehensive sales report for this month',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'from-violet-500 to-purple-600'
    },
    {
      title: 'Inventory Check',
      prompt: 'Check stock levels and identify items that need restocking',
      icon: <ShoppingCart className="h-5 w-5" />,
      color: 'from-pink-500 to-rose-600'
    },
    {
      title: 'Customer Trends',
      prompt: 'Analyze customer behavior patterns and membership trends',
      icon: <Target className="h-5 w-5" />,
      color: 'from-cyan-500 to-teal-600'
    },
    {
      title: 'Expense Tracking',
      prompt: 'Show me monthly expenses breakdown by category',
      icon: <TrendingDown className="h-5 w-5" />,
      color: 'from-red-500 to-pink-600'
    },
    {
      title: 'Quick Tips',
      prompt: 'Give me operational suggestions to improve business efficiency',
      icon: <Zap className="h-5 w-5" />,
      color: 'from-amber-500 to-yellow-600'
    },
  ];

  // Load business context on mount
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        setIsInitializing(true);
        console.log('Loading business data...');
        const context = await fetchBusinessDataForAI();
        setBusinessContext(context);
        console.log('Business data loaded successfully');
        
        // Don't add welcome message automatically - show suggestions instead
      } catch (err) {
        console.error('Error loading business data:', err);
        setError('Failed to load business data. Please refresh the page.');
      } finally {
        setIsInitializing(false);
      }
    };

    loadBusinessData();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (promptText?: string) => {
    const messageToSend = promptText || input.trim();
    if (!messageToSend || isLoading || isInitializing) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Refresh business context before each message to get latest data
      const freshContext = await fetchBusinessDataForAI();
      
      const response = await sendChatMessage(messageToSend, freshContext, messages);
      
      if (response.error) {
        setError(response.error);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I encountered an error: ' + response.error,
            timestamp: new Date(),
          },
        ]);
      } else {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSend(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRefresh = async () => {
    setIsInitializing(true);
    setMessages([]);
    setError(null);
    
    try {
      const context = await fetchBusinessDataForAI();
      setBusinessContext(context);
    } catch (err) {
      setError('Failed to refresh business data.');
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0F1419] via-[#1A1F2C] to-[#1A1F2C]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cuephoria-purple mx-auto mb-4" />
          <p className="text-gray-300 font-medium">Loading business data...</p>
          <p className="text-sm text-gray-500 mt-2">Preparing AI insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#0F1419] via-[#1A1F2C] to-[#1A1F2C]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1F2C] to-[#1F2532] border-b border-cuephoria-purple/30 p-4 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cuephoria-purple/30 blur-xl rounded-full" />
              <Bot className="h-10 w-10 text-cuephoria-lightpurple relative z-10 animate-pulse-soft" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                Cuephoria AI
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  Active
                </span>
              </h1>
              <p className="text-sm text-gray-400 flex items-center gap-1">
                Powered by Gemini AI
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-cuephoria-lightpurple hover:bg-cuephoria-dark hover:text-white"
            title="Refresh business data"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive" className="max-w-7xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-7xl mx-auto">
          {messages.length === 0 ? (
            // Show suggestions when no messages
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple mb-6 shadow-lg shadow-cuephoria-purple/50">
                  <Bot className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Welcome to Cuephoria AI</h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  Your intelligent business assistant powered by Gemini AI. Get insights, analyze data, and make better decisions.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {suggestions.map((suggestion, index) => (
                  <Card
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.prompt)}
                    className="group cursor-pointer bg-gradient-to-br from-cuephoria-dark to-cuephoria-darker border border-cuephoria-purple/20 hover:border-cuephoria-purple/60 transition-all duration-300 hover:shadow-lg hover:shadow-cuephoria-purple/20 hover:-translate-y-1"
                  >
                    <CardContent className="p-4">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${suggestion.color} mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <div className="text-white">
                          {suggestion.icon}
                        </div>
                      </div>
                      <h3 className="font-semibold text-white mb-2 group-hover:text-cuephoria-lightpurple transition-colors">
                        {suggestion.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {suggestion.prompt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            // Show chat messages
            <div className="space-y-4 pb-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple flex items-center justify-center shadow-lg">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 shadow-lg transition-all duration-300 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple text-white'
                        : 'bg-gradient-to-br from-cuephoria-dark to-cuephoria-darker text-gray-100 border border-cuephoria-purple/30'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p className="text-xs mt-2 opacity-60">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-cuephoria-blue to-cyan-500 flex items-center justify-center shadow-lg">
                      <span className="text-sm font-bold text-white">You</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple flex items-center justify-center shadow-lg">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-gradient-to-br from-cuephoria-dark to-cuephoria-darker rounded-2xl p-4 border border-cuephoria-purple/30">
                    <Loader2 className="h-5 w-5 animate-spin text-cuephoria-lightpurple" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-gradient-to-r from-[#1A1F2C] to-[#1F2532] border-t border-cuephoria-purple/30 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your business... (or try a suggestion above)"
              className="bg-cuephoria-dark border-cuephoria-purple/30 text-white placeholder:text-gray-500 resize-none min-h-[60px] max-h-[200px] rounded-xl focus:border-cuephoria-purple focus:ring-2 focus:ring-cuephoria-purple/20"
              disabled={isLoading || isInitializing}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || isInitializing}
              className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/80 hover:to-cuephoria-lightpurple/80 text-white px-6 shadow-lg shadow-cuephoria-purple/50 rounded-xl h-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAI;