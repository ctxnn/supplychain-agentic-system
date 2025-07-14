import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export class BaseAgent {
  constructor(name, llm = null) {
    this.name = name;
    this.llm = llm || new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  }

  async process(state) {
    throw new Error('process method must be implemented by subclass');
  }

  async invokeLLM(prompt, variables = {}) {
    try {
      const formattedPrompt = ChatPromptTemplate.fromMessages([
        ['system', prompt.system || 'You are a helpful AI assistant.'],
        ['human', prompt.human || '{input}']
      ]);

      const response = await this.llm.invoke(
        formattedPrompt.formatMessages(variables)
      );

      return response.content;
    } catch (error) {
      console.error(`[${this.name}] LLM Error:`, error);
      throw error;
    }
  }

  async invokeLLMWithJSON(prompt, variables = {}) {
    try {
      const response = await this.invokeLLM(prompt, variables);
      
      // Try to parse JSON response
      try {
        return JSON.parse(response);
      } catch (parseError) {
        console.warn(`[${this.name}] Failed to parse JSON response:`, response);
        return { error: 'Invalid JSON response', raw: response };
      }
    } catch (error) {
      console.error(`[${this.name}] LLM JSON Error:`, error);
      throw error;
    }
  }

  logAction(action, data = null) {
    console.log(`[${this.name}] ${action}`, data ? JSON.stringify(data, null, 2) : '');
  }

  createErrorState(state, message) {
    state.markError(message);
    state.addMessage(this.name, 'error', { message });
    return state;
  }

  createSuccessState(state, action, data = null) {
    state.addMessage(this.name, action, data);
    return state;
  }
} 