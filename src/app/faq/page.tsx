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
      {/* Hero Section - Simplified to match main page */}
      <section className="relative h-[40vh] flex items-center justify-center bg-green-gradient-radial">
        <div className="relative text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gradient-green">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about Greenhouse 2025
          </p>
        </div>
      </section>

      {/* FAQ Section - Improved styling */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-8">
              {/* Category Title - Styled like feature cards */}
              <button
                onClick={() => toggleCategory(categoryIndex)}
                className="w-full text-left flex justify-between items-center p-5 bg-white rounded-xl shadow-md border-green-subtle card-hover-effect"
              >
                <span className="font-semibold text-lg">{category.title}</span>
                <span className="text-primary">
                  {openCategoryIndex === categoryIndex ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </span>
              </button>

              {/* Questions (only shown if category is open) */}
              {openCategoryIndex === categoryIndex && (
                <div className="mt-4 space-y-3">
                  {category.questions.map((faq, index) => (
                    <div key={index} className="border-green-subtle rounded-lg overflow-hidden bg-white shadow-sm">
                      <button
                        onClick={() => toggleQuestion(`${categoryIndex}-${index}`)}
                        className="w-full text-left flex justify-between items-center p-4 hover:bg-green-gradient hover:text-black"
                      >
                        <span className="font-medium text-white">{faq.question}</span>
                        <span className="text-primary">
                          {openQuestionIndex === `${categoryIndex}-${index}` ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      </button>
                      
                      {openQuestionIndex === `${categoryIndex}-${index}` && (
                        <div className="p-4 bg-secondary/20 border-t text border-green-subtle">
                          <p className="text-muted-foreground">
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

      {/* CTA Section - Styled like main page */}
      <section className="py-16 bg-green-pattern-light">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold text-gradient-green">
            Still Have Questions?
          </h2>
          <p className="text-xl text-muted-foreground">
            Use our Q&A system to get personalized answers
          </p>
          
          <Link 
            href="/" 
            className="inline-flex items-center justify-center h-12 px-6 text-lg bg-primary text-white hover:bg-primary/90 rounded-md font-medium transition-colors card-hover-effect"
          >
            Go to Q&A
          </Link>
        </div>
      </section>

      {/* Footer - Same as main page */}
      <footer className="bg-primary/10 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Dunamis Greenhouse. All rights reserved.</p>
          <p className="mt-2">Via SS 113 Settentrionale Sicula, 90047 Partinico PA, Italy</p>
        </div>
      </footer>
    </div>
  );
}