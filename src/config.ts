import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
    PORT: process.env.PORT || 3015,
    JWT_SECRET: process.env.JWT_SECRET || 'devsecret',
    ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'adminkey123',
    DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db'
};
