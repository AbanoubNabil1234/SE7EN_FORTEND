export interface PasswordRequirements {
  minLength: boolean;
  digit: boolean;
  lowercase: boolean;
}

export function hasMeaningfulText(value: string): boolean {
  return value.trim().length > 0;
}

export function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 6,
    digit: /\d/.test(password),
    lowercase: /[a-z]/.test(password)
  };
}

export function isPhoneNumberValid(phone: string): boolean {
  return phone.length === 0 || /^[0-9+\-\s()]{7,20}$/.test(phone);
}
