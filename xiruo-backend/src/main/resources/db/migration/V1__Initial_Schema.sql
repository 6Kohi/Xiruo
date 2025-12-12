-- Initial database schema for Xiruo Backend
-- This script creates all the necessary tables for the comic reading platform

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP
);

-- Comic sources table
CREATE TABLE IF NOT EXISTS comic_sources (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    key VARCHAR(50) UNIQUE NOT NULL,
    url VARCHAR(500),
    version VARCHAR(20),
    script_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comics table
CREATE TABLE IF NOT EXISTS comics (
    id BIGSERIAL PRIMARY KEY,
    source_id BIGINT NOT NULL REFERENCES comic_sources(id),
    source_comic_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255),
    description TEXT,
    cover_url VARCHAR(500),
    status VARCHAR(50),
    rating DECIMAL(3,2),
    view_count BIGINT DEFAULT 0,
    favorite_count BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_id, source_comic_id)
);

-- Comic categories table (for ElementCollection)
CREATE TABLE IF NOT EXISTS comic_categories (
    comic_id BIGINT NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    category VARCHAR(255) NOT NULL,
    PRIMARY KEY (comic_id, category)
);

-- Comic tags table (for ElementCollection)
CREATE TABLE IF NOT EXISTS comic_tags (
    comic_id BIGINT NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    tag VARCHAR(255) NOT NULL,
    PRIMARY KEY (comic_id, tag)
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
    id BIGSERIAL PRIMARY KEY,
    comic_id BIGINT NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    source_chapter_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    chapter_number DECIMAL(10,2),
    page_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comic_id, source_chapter_id)
);

-- Favorite folders table
CREATE TABLE IF NOT EXISTS favorite_folders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comic_id BIGINT NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    folder_id BIGINT REFERENCES favorite_folders(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, comic_id)
);

-- Reading history table
CREATE TABLE IF NOT EXISTS reading_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comic_id BIGINT NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    chapter_id BIGINT REFERENCES chapters(id) ON DELETE SET NULL,
    page_number INTEGER DEFAULT 1,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, comic_id)
);

-- Download tasks table
CREATE TABLE IF NOT EXISTS download_tasks (
    id BIGSERIAL PRIMARY KEY,
    comic_id BIGINT NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    chapter_id BIGINT REFERENCES chapters(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    progress INTEGER DEFAULT 0,
    total_pages INTEGER,
    downloaded_pages INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Comic files table
CREATE TABLE IF NOT EXISTS comic_files (
    id BIGSERIAL PRIMARY KEY,
    comic_id BIGINT NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    chapter_id BIGINT REFERENCES chapters(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    file_hash VARCHAR(64),
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, page_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comics_source_id ON comics(source_id);
CREATE INDEX IF NOT EXISTS idx_comics_title ON comics(title);
CREATE INDEX IF NOT EXISTS idx_comics_author ON comics(author);
CREATE INDEX IF NOT EXISTS idx_comics_view_count ON comics(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_comics_created_at ON comics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chapters_comic_id ON chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_chapters_chapter_number ON chapters(chapter_number);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_comic_id ON favorites(comic_id);
CREATE INDEX IF NOT EXISTS idx_favorites_folder_id ON favorites(folder_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_last_read_at ON reading_history(last_read_at DESC);

CREATE INDEX IF NOT EXISTS idx_download_tasks_status ON download_tasks(status);
CREATE INDEX IF NOT EXISTS idx_download_tasks_comic_id ON download_tasks(comic_id);
CREATE INDEX IF NOT EXISTS idx_download_tasks_created_at ON download_tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_comic_files_chapter_id ON comic_files(chapter_id);
CREATE INDEX IF NOT EXISTS idx_comic_files_comic_id ON comic_files(comic_id);
CREATE INDEX IF NOT EXISTS idx_comic_files_page_number ON comic_files(page_number);