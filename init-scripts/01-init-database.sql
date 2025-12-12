-- Create database if not exists
CREATE DATABASE xiruo_db;

-- Connect to the database
\c xiruo_db;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created by JPA, but we can add additional ones here if needed

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE xiruo_db TO xiruo_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO xiruo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO xiruo_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO xiruo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO xiruo_user;