"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch the answer');
      }
  
      const data = await response.json();
      setAnswer(data.answer || 'No relevant answer found.');
    } catch (error) {
      console.error('Error:', error);
      setAnswer('Failed to fetch the answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center bg-gradient-to-b from-primary/20 to-background">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/qa-hero.jpg"
            alt="Q&A Hero Background"
            fill
            className="object-cover opacity-20"
            priority
          />
        </div>
        
        <div className="relative text-center space-y-6 px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#4A7F68]">
            Greenhouse 2025 Q&A
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ask your questions about Dunamis Greenhouse and get instant answers from our AI assistant.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="question" className="text-sm font-medium text-gray-700">
                Your Question
              </label>
              <input
                ref={inputRef}
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about Greenhouse 2025..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className={`
                w-full p-3 bg-primary text-white font-medium rounded-lg 
                hover:bg-primary/90 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Submit Question'
              )}
            </button>
          </form>
          
          {answer && (
            <div className="mt-8 p-6 bg-gray-50 border-l-4 border-primary rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Answer:</h3>
              <p className="text-gray-700 whitespace-pre-line">{answer}</p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">Why Use Our Q&A System?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Instant Answers",
                description: "Get immediate responses to your questions about Greenhouse 2025.",
                icon: "⚡"
              },
              {
                title: "Accurate Information",
                description: "Our AI is trained on the latest information about the program.",
                icon: "✓"
              },
              {
                title: "Available 24/7",
                description: "Access information whenever you need it, day or night.",
                icon: "🕒"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary/10 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Dunamis Greenhouse. All rights reserved.</p>
          <p className="mt-2">Via SS 113 Settentrionale Sicula, 90047 Partinico PA, Italy</p>
        </div>
      </footer>
    </div>
  );
}