import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatbotLogger {
  log(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chatbot] ${message}`, data || '');
    }
  }

  error(message: string, error?: any) {
    console.error(`[Chatbot Error] ${message}`, error || '');
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chatbot Debug] ${message}`, data || '');
    }
  }
}
