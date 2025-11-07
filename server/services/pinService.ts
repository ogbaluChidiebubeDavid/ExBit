import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export class PINService {
  async hashPIN(pin: string): Promise<string> {
    if (!this.isValidPIN(pin)) {
      throw new Error("PIN must be exactly 4 digits");
    }
    
    return bcrypt.hash(pin, SALT_ROUNDS);
  }

  async verifyPIN(pin: string, hashedPIN: string): Promise<boolean> {
    if (!this.isValidPIN(pin)) {
      return false;
    }
    
    return bcrypt.compare(pin, hashedPIN);
  }

  async hashSecurityAnswer(answer: string): Promise<string> {
    const normalizedAnswer = answer.toLowerCase().trim();
    return bcrypt.hash(normalizedAnswer, SALT_ROUNDS);
  }

  async verifySecurityAnswer(answer: string, hashedAnswer: string): Promise<boolean> {
    const normalizedAnswer = answer.toLowerCase().trim();
    return bcrypt.compare(normalizedAnswer, hashedAnswer);
  }

  isValidPIN(pin: string): boolean {
    return /^\d{4}$/.test(pin);
  }

  isValidSecurityQuestion(question: string): boolean {
    return question.length >= 10 && question.length <= 200;
  }

  isValidSecurityAnswer(answer: string): boolean {
    return answer.trim().length >= 2 && answer.trim().length <= 100;
  }
}

export const pinService = new PINService();
