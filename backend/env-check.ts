/**
 * Environment variable validation utility
 * Call this at application startup to ensure all required environment variables are set
 */

interface EnvConfig {
    NODE_ENV?: string;
    JWT_SECRET: string;
    POSTMARK_SERVER_TOKEN?: string;
    FROM_EMAIL?: string;
    DATABASE_URL: string;
}

export function validateEnvironment(): EnvConfig {
    const missing: string[] = [];
    
    // Required variables
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    
    // Optional but recommended for production
    const warnings: string[] = [];
    if (!process.env.POSTMARK_SERVER_TOKEN) warnings.push('POSTMARK_SERVER_TOKEN (emails will be logged instead)');
    if (!process.env.FROM_EMAIL) warnings.push('FROM_EMAIL (required if using Postmark)');
    if (!process.env.NODE_ENV) warnings.push('NODE_ENV (defaulting to development mode)');
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(env => console.error(`  - ${env}`));
        process.exit(1);
    }
    
    if (warnings.length > 0) {
        console.warn('⚠️  Missing optional environment variables:');
        warnings.forEach(env => console.warn(`  - ${env}`));
    }
    
    // Log current configuration
    console.log('✅ Environment configuration:');
    console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  - DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - POSTMARK_SERVER_TOKEN: ${process.env.POSTMARK_SERVER_TOKEN ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - FROM_EMAIL: ${process.env.FROM_EMAIL || '✗ Missing'}`);
    
    return {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET!,
        POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
        FROM_EMAIL: process.env.FROM_EMAIL,
        DATABASE_URL: process.env.DATABASE_URL!,
    };
}
