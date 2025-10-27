// ChatAI page with Gemini AI integration
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sendChatMessage, ChatMessage } from '@/services/geminiService';
import { fetchBusinessDataForAI } from '@/services/chatDataService';

const ChatAI: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [businessContext, setBusinessContext] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load business context on mount
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        setIsInitializing(true);
        console.log('Loading business data...');
        const context = await fetchBusinessDataForAI();
        setBusinessContext(context);
        console.log('Business data loaded successfully');
        
        // Add welcome message
        setMessages([
          {
            role: 'assistant',
            content: 'Welcome to Cuephoria AI! I can help you with:\n\n• Business analytics and insights\n• Customer data queries\n• Product and inventory information\n• Station and booking management\n• Tournament management\n• Financial reports\n• Operational recommendations\n\nHow can I assist you today?',
            timestamp: new Date(),
          },
        ]);
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

  const handleSend = async () => {
    if (!input.trim() || isLoading || isInitializing) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Refresh business context before each message to get latest data
      const freshContext = await fetchBusinessDataForAI();
      
      const response = await sendChatMessage(input.trim(), freshContext, messages);
      
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
      
      setMessages([
        {
          role: 'assistant',
          content: 'Business data refreshed! How can I help you today?',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError('Failed to refresh business data.');
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cuephoria-purple mx-auto mb-4" />
          <p className="text-gray-500">Loading business data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#0F1419] via-[#1A1F2C] to-[#1A1F2C]">
      {/* Header */}
      <div className="bg-[#1A1F2C] border-b border-cuephoria-purple/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="h-8 w-8 text-cuephoria-lightpurple animate-pulse-soft" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Cuephoria AI</h1>
            <p className="text-sm text-gray-400">Powered by Gemini AI</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-cuephoria-lightpurple hover:bg-cuephoria-dark"
          title="Refresh business data"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Card className="bg-cuephoria-dark border-cuephoria-purple/30 w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="text-cuephoria-lightpurple">Welcome to Cuephoria AI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  I'm your AI assistant for Cuephoria gaming cafe. I have access to all your business data and can help with:
                </p>
                <ul className="mt-4 space-y-2 text-gray-300">
                  <li>• Business analytics and insights</li>
                  <li>• Customer information</li>
                  <li>• Product and inventory queries</li>
                  <li>• Station and booking management</li>
                  <li>• Tournament management</li>
                  <li>• Financial reports and recommendations</li>
                </ul>
                <p className="mt-4 text-sm text-gray-400">
                  Ask me anything about your business!
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-cuephoria-lightpurple" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-cuephoria-purple text-white'
                      : 'bg-cuephoria-dark text-gray-100 border border-cuephoria-purple/30'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className="text-xs mt-2 opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cuephoria-blue/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-cuephoria-blue">U</span>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-cuephoria-lightpurple" />
                </div>
                <div className="bg-cuephoria-dark rounded-lg p-4 border border-cuephoria-purple/30">
                  <Loader2 className="h-5 w-5 animate-spin text-cuephoria-lightpurple" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-[#1A1F2C] border-t border-cuephoria-purple/30 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your business..."
            className="bg-cuephoria-dark border-cuephoria-purple/30 text-white placeholder:text-gray-500 resize-none min-h-[60px] max-h-[200px]"
            disabled={isLoading || isInitializing}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isInitializing}
            className="bg-cuephoria-purple hover:bg-cuephoria-purple/80 text-white px-6"
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
  );
};

export default ChatAI;
