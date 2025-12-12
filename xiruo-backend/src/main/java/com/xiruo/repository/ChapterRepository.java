package com.xiruo.repository;

import com.xiruo.entity.Chapter;
import com.xiruo.entity.Comic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    
    Optional<Chapter> findByComicAndSourceChapterId(Comic comic, String sourceChapterId);
    
    boolean existsByComicAndSourceChapterId(Comic comic, String sourceChapterId);
    
    List<Chapter> findByComicOrderByChapterNumberAsc(Comic comic);
    
    Page<Chapter> findByComicOrderByChapterNumberAsc(Comic comic, Pageable pageable);
    
    @Query("SELECT ch FROM Chapter ch WHERE ch.comic.id = :comicId ORDER BY ch.chapterNumber ASC")
    List<Chapter> findByComicIdOrderByChapterNumberAsc(@Param("comicId") Long comicId);
    
    @Query("SELECT COUNT(ch) FROM Chapter ch WHERE ch.comic = :comic")
    Long countByComic(@Param("comic") Comic comic);
    
    @Query("SELECT ch FROM Chapter ch WHERE ch.comic = :comic AND ch.chapterNumber > :chapterNumber ORDER BY ch.chapterNumber ASC")
    Optional<Chapter> findNextChapter(@Param("comic") Comic comic, @Param("chapterNumber") java.math.BigDecimal chapterNumber);
    
    @Query("SELECT ch FROM Chapter ch WHERE ch.comic = :comic AND ch.chapterNumber < :chapterNumber ORDER BY ch.chapterNumber DESC")
    Optional<Chapter> findPreviousChapter(@Param("comic") Comic comic, @Param("chapterNumber") java.math.BigDecimal chapterNumber);
}