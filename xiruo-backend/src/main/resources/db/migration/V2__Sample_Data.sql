-- Sample data for development and testing
-- This script inserts initial data for comic sources and sample comics

-- Insert sample comic sources
INSERT INTO comic_sources (name, key, url, version, script_content, is_active) VALUES
('Sample Comic Source', 'sample_source', 'https://example.com', '1.0.0', 
'// Sample JavaScript source
function getComicList(page) {
    return {
        comics: [],
        hasNext: false
    };
}

function getComicDetail(comicId) {
    return {
        id: comicId,
        title: "Sample Comic",
        author: "Sample Author",
        description: "Sample Description",
        chapters: []
    };
}

function getChapterPages(comicId, chapterId) {
    return {
        pages: []
    };
}', true)
ON CONFLICT (key) DO NOTHING;

-- Note: Additional sample data can be added here for development
-- For production, this migration should be empty or contain only essential reference data