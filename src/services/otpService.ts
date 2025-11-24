export const generateOTP = (phone: string): string => {
    // Mock OTP for dev/test
    return '123456';
};

export const verifyOTP = (phone: string, otp: string): boolean => {
    return otp === '123456';
};
