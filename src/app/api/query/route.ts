import { NextResponse } from 'next/server';
import faqData from '@/data/faqData.json'; // Import your FAQ data
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Store your API key in .env
});

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { message: 'Question is required and must be a string' },
        { status: 400 }
      );
    }

    // Find the most relevant answer using OpenAI
    const relevantAnswer = await findRelevantAnswerWithOpenAI(question, faqData);

    if (!relevantAnswer) {
      return NextResponse.json(
        { message: 'No relevant answer found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ answer: relevantAnswer });
  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error processing question:', errorMessage);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to find the most relevant answer using OpenAI
async function findRelevantAnswerWithOpenAI(question: string, faqData: Array<{title: string, questions: Array<{question: string, answer: string}>}>) {
  // Flatten the FAQ data into a single array of questions and answers
  const allQuestions = faqData.flatMap((topic) =>
    topic.questions.map((faq) => ({
      question: faq.question,
      answer: faq.answer,
    }))
  );

  // Create a prompt for OpenAI
  const prompt = `You are a helpful assistant. Answer the user's question based on the following FAQ data:\n\n${JSON.stringify(
    allQuestions
  )}\n\nQuestion: ${question}\nAnswer:`;

  // Call the OpenAI API
  const response = await openai.completions.create({
    model: 'gpt-3.5-turbo-instruct', // Use a lightweight model
    prompt,
    max_tokens: 150, // Limit the response length
  });

  // The response is already a JavaScript object, no need to call .json()
  // Just extract the text from the first choice
  return response.choices[0].text.trim();
}