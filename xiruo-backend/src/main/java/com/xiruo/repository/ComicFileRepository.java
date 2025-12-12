package com.xiruo.repository;

import com.xiruo.entity.ComicFile;
import com.xiruo.entity.Comic;
import com.xiruo.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComicFileRepository extends JpaRepository<ComicFile, Long> {
    
    Optional<ComicFile> findByChapterAndPageNumber(Chapter chapter, Integer pageNumber);
    
    boolean existsByChapterAndPageNumber(Chapter chapter, Integer pageNumber);
    
    List<ComicFile> findByChapterOrderByPageNumberAsc(Chapter chapter);
    
    List<ComicFile> findByComicOrderByPageNumberAsc(Comic comic);
    
    @Query("SELECT cf FROM ComicFile cf WHERE cf.chapter.id = :chapterId ORDER BY cf.pageNumber ASC")
    List<ComicFile> findByChapterIdOrderByPageNumberAsc(@Param("chapterId") Long chapterId);
    
    @Query("SELECT COUNT(cf) FROM ComicFile cf WHERE cf.chapter = :chapter")
    Long countByChapter(@Param("chapter") Chapter chapter);
    
    @Query("SELECT COUNT(cf) FROM ComicFile cf WHERE cf.comic = :comic")
    Long countByComic(@Param("comic") Comic comic);
    
    @Query("SELECT SUM(cf.fileSize) FROM ComicFile cf WHERE cf.comic = :comic")
    Long getTotalFileSizeByComic(@Param("comic") Comic comic);
    
    @Query("SELECT SUM(cf.fileSize) FROM ComicFile cf")
    Long getTotalFileSize();
    
    void deleteByChapter(Chapter chapter);
    
    void deleteByComic(Comic comic);
}