"use client";

import { useState } from 'react';
import faqData from '@/data/faqData.json';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQPage() {
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(0); // Open first category by default
  const [openQuestionIndex, setOpenQuestionIndex] = useState<string | null>(null);

  const toggleCategory = (index: number) => {
    setOpenCategoryIndex(openCategoryIndex === index ? null : index);
    setOpenQuestionIndex(null);
  };

  const toggleQuestion = (index: string) => {
    setOpenQuestionIndex(openQuestionIndex === index ? null : index);
  };

  // Function to render clickable links in the answer text
  const renderAnswerWithLinks = (answer: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return answer.split(urlRegex).map((part, index) =>
      urlRegex.test(part) ? (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {part}
        </a>
      ) : (
        part
      )
    );
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
              backgroundImage: "url('/images/greenhouse/image (32).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4" 
                style={{ 
                  textShadow: "0 4px 8px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.8)" 
                }}>
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6" 
                style={{ 
                  textShadow: "0 4px 8px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.8)" 
                }}>
              Find answers to common questions about Greenhouse 2025
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-4 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"></div>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full -ml-32 -mb-32"></div>
        
        <div className="relative z-10 max-w-3xl mx-auto space-y-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Browse Topics</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
          </div>
          
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-10">
              {/* Category Title */}
              <button
                onClick={() => toggleCategory(categoryIndex)}
                className="w-full text-left flex justify-between items-center p-6 bg-white rounded-xl shadow-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group"
              >
                <span className="font-bold text-xl text-primary">{category.title}</span>
                <span className="text-primary bg-primary/10 p-2 rounded-full group-hover:bg-primary/20 transition-colors duration-300">
                  {openCategoryIndex === categoryIndex ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </span>
              </button>

              {/* Questions (only shown if category is open) */}
              {openCategoryIndex === categoryIndex && (
                <div className="mt-6 space-y-4">
                  {category.questions.map((faq, index) => (
                    <div key={index} className="border border-primary/10 rounded-lg overflow-hidden bg-white shadow-md hover:border-primary/20 transition-all duration-300">
                      <button
                        onClick={() => toggleQuestion(`${categoryIndex}-${index}`)}
                        className={`w-full text-left flex justify-between items-center p-5 transition-colors duration-300 ${
                          openQuestionIndex === `${categoryIndex}-${index}` 
                            ? 'bg-gradient-to-r from-primary/20 to-emerald-500/20 text-primary font-medium' 
                            : 'hover:bg-primary/5'
                        }`}
                      >
                        <span className="font-medium text-slate-800">{faq.question}</span>
                        <span className={`p-1.5 rounded-full ${
                          openQuestionIndex === `${categoryIndex}-${index}` 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {openQuestionIndex === `${categoryIndex}-${index}` ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      </button>
                      
                      {openQuestionIndex === `${categoryIndex}-${index}` && (
                        <div className="p-6 bg-gradient-to-r from-primary/5 to-emerald-500/5 border-t border-primary/10">
                          <p className="text-slate-700 leading-relaxed">
                            {renderAnswerWithLinks(faq.answer)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="h-4 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"></div>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-white to-primary/5"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="mb-8">
            <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Still Have Questions?</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
          </div>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Use our Q&A system to get personalized answers to your specific questions
          </p>
          
          <div className="mt-10">
            <Link 
              href="/" 
              className="inline-flex items-center justify-center h-14 px-8 text-lg bg-primary text-white hover:bg-primary/90 rounded-md font-medium transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 shadow-lg hover:shadow-xl"
            >
              Go to Q&A System
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-5 w-5"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-4 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"></div>

      {/* Footer */}
      <footer className="bg-primary/10 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-primary mb-4">Dunamis Greenhouse</h3>
            <p className="text-slate-600">Transforming lives through spiritual leadership development</p>
          </div>
          <div className="text-sm text-slate-500">
            <p>© 2025 Dunamis Greenhouse. All rights reserved.</p>
            <p className="mt-2">Via SS 113 Settentrionale Sicula, 90047 Partinico PA, Italy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}