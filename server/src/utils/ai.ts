interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  success: boolean;
  message: string;
}

const SYSTEM_PROMPT = `You are an AI assistant integrated into a social network platform called SocialHub ("Connect & Share"). Be friendly, concise, and helpful. You can help users with:
- Writing posts and comments
- Getting platform tips and feature explanations
- Creative writing and brainstorming
- General knowledge and conversation
- Platform moderation guidelines

Keep responses under 200 words. Be conversational but professional.`;

const mockResponses = [
  "That's a great question! Here are some tips for getting the most out of SocialHub: use hashtags to reach a wider audience, engage with others' content by commenting thoughtfully, and customize your profile to reflect your personality.",
  "I'd be happy to help with that! SocialHub offers features like Stories (24-hour content), Reels (short-form videos), Live Streaming, and Group Chats. What would you like to know more about?",
  "Great post idea! When creating content, try to be authentic and engaging. Use eye-catching visuals, ask questions to encourage comments, and don't forget to use relevant hashtags to increase discoverability.",
  "Interesting topic! Here on SocialHub, you can share your thoughts through posts, connect with friends through direct messages, join group conversations, and discover new content through the Explore page.",
  "Thanks for reaching out! Remember that building a community takes time. Follow people who inspire you, engage genuinely with their content, and share your unique perspective. Consistency is key!",
  "That's a thoughtful question. In social media, authenticity resonates most with audiences. Share your real experiences, celebrate others' successes, and contribute positively to conversations. SocialHub is built around meaningful connections.",
  "Great to chat with you! Did you know you can customize your privacy settings on SocialHub? You can control who sees your posts, who can message you, and manage your close friends list for stories.",
  "I'd recommend checking out the Explore page on SocialHub to discover new content and people. You can search by hashtags, find trending topics, and connect with users who share your interests.",
];

function getMockResponse(): string {
  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

export async function processAIMessage(
  messages: ChatMessage[],
  apiKey?: string,
  baseUrl?: string,
  model?: string
): Promise<AIResponse> {
  if (apiKey) {
    const endpoint = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions';
    const modelName = model || 'gpt-3.5-turbo';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'SocialHub',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.slice(-10),
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${errText || response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('No response from AI');

      return { success: true, message: content.trim() };
    } catch (error: any) {
      console.error('AI API call failed:', error.message);
      return { success: true, message: getMockResponse() };
    }
  }

  return { success: true, message: getMockResponse() };
}