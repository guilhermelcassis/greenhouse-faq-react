"use client";

import { useState, useRef, useEffect } from 'react';
import { Footer } from '@/components/Footer';

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
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('images/greenhouse/image (24).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
              Greenhouse 2025 Q&A
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
              Ask your questions about Dunamis Greenhouse and get instant answers from our AI assistant.
            </p>
          </div>
        </div>
      </section>


      {/* Main Content */}
      <section className="py-20 px-4 bg-white relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full -ml-32 -mb-32"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Ask Your Question</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label htmlFor="question" className="text-lg font-medium text-slate-700">
                  Your Question
                </label>
                <input
                  id="question"
                  type="text"
                  value={question}
                  ref={inputRef}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about Greenhouse 2025..."
                  className="w-full p-4 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-lg"
                />
              </div>
              
              <button
                type="submit"
                disabled={!question.trim() || isLoading}
                className={`
                  w-full p-4 bg-primary text-white font-medium rounded-lg text-lg
                  hover:bg-primary/90 transition-colors duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transform hover:-translate-y-1 active:translate-y-0
                `}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Get Answer'
                )}
              </button>
            </form>
            
            {answer && (
              <div className="mt-10 p-8 bg-gradient-to-r from-primary/5 to-emerald-500/5 border-l-4 border-primary rounded-lg">
                <h3 className="font-semibold text-xl text-primary mb-4">Answer:</h3>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">{answer}</p>
              </div>
            )}
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className="py-20 px-4 bg-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-white to-primary/5"></div>
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="mb-16">
            <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Why Use Our Q&A System?</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
          </div>
          
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
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 group">
                <div className="text-5xl mb-6 text-primary  w-20 h-20 flex items-center justify-center rounded-full mx-auto group-hover:bg-primary/20 transition-colors duration-300">{feature.icon}</div>
                <h3 className="text-2xl font-semibold mb-4 text-primary">{feature.title}</h3>
                <p className="text-slate-600 text-lg">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>




      {/* Footer */}
      <Footer />
    </div>
  );
}