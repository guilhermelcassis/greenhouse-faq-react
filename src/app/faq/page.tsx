"use client";

import { useState } from 'react';
import faqData from '@/data/faqData.json';

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
      <section className="relative h-[40vh] flex items-center justify-center bg-gradient-to-b from-primary/20 to-background">
        <div className="absolute inset-0 bg-[url('/images/faq-hero.jpg')] bg-cover bg-center opacity-20 -z-10" />
        
        <div className="relative text-center space-y-6 px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#4A7F68]">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about Greenhouse 2025
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-8">
              {/* Category Title */}
              <button
                onClick={() => toggleCategory(categoryIndex)}
                className="w-full text-left flex justify-between items-center p-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <span className="font-semibold text-lg">{category.title}</span>
                <span className="text-xl">
                  {openCategoryIndex === categoryIndex ? "−" : "+"}
                </span>
              </button>

              {/* Questions (only shown if category is open) */}
              {openCategoryIndex === categoryIndex && (
                <div className="mt-4 space-y-4">
                  {category.questions.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleQuestion(`${categoryIndex}-${index}`)}
                        className="w-full text-left flex justify-between items-center p-4 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-800">{faq.question}</span>
                        <span className="text-primary">
                          {openQuestionIndex === `${categoryIndex}-${index}` ? "−" : "+"}
                        </span>
                      </button>
                      
                      {openQuestionIndex === `${categoryIndex}-${index}` && (
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-gray-700">
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

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-[#4A7F68] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Still Have Questions?
          </h2>
          <p className="text-xl text-white/90">
            Use our Q&A system to get personalized answers
          </p>
          
          <a 
            href="/"
            className="inline-flex items-center justify-center h-12 px-6 text-lg bg-white text-primary hover:bg-white/90 rounded-md font-medium transition-colors"
          >
            Go to Q&A
          </a>
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