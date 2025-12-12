package com.xiruo.repository;

import com.xiruo.entity.Chapter;
import com.xiruo.entity.Comic;
import com.xiruo.entity.ComicSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class ChapterRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ChapterRepository chapterRepository;

    private Comic testComic;

    @BeforeEach
    void setUp() {
        ComicSource testSource = new ComicSource("Test Source", "test_source", "test script");
        entityManager.persistAndFlush(testSource);
        
        testComic = new Comic(testSource.getId(), "comic123", "Test Comic");
        entityManager.persistAndFlush(testComic);
    }

    @Test
    void testFindByComicAndSourceChapterId() {
        // Given
        Chapter chapter = new Chapter(testComic, "chapter1", "Chapter 1");
        chapter.setChapterNumber(new BigDecimal("1.0"));
        chapter.setPageCount(20);
        entityManager.persistAndFlush(chapter);

        // When
        var foundChapter = chapterRepository.findByComicAndSourceChapterId(testComic, "chapter1");

        // Then
        assertThat(foundChapter).isPresent();
        assertThat(foundChapter.get().getTitle()).isEqualTo("Chapter 1");
        assertThat(foundChapter.get().getPageCount()).isEqualTo(20);
    }

    @Test
    void testFindByComicOrderByChapterNumberAsc() {
        // Given
        Chapter chapter1 = new Chapter(testComic, "chapter1", "Chapter 1");
        chapter1.setChapterNumber(new BigDecimal("1.0"));
        
        Chapter chapter3 = new Chapter(testComic, "chapter3", "Chapter 3");
        chapter3.setChapterNumber(new BigDecimal("3.0"));
        
        Chapter chapter2 = new Chapter(testComic, "chapter2", "Chapter 2");
        chapter2.setChapterNumber(new BigDecimal("2.0"));
        
        entityManager.persistAndFlush(chapter1);
        entityManager.persistAndFlush(chapter3);
        entityManager.persistAndFlush(chapter2);

        // When
        var chapters = chapterRepository.findByComicOrderByChapterNumberAsc(testComic);

        // Then
        assertThat(chapters).hasSize(3);
        assertThat(chapters.get(0).getTitle()).isEqualTo("Chapter 1");
        assertThat(chapters.get(1).getTitle()).isEqualTo("Chapter 2");
        assertThat(chapters.get(2).getTitle()).isEqualTo("Chapter 3");
    }

    @Test
    void testCountByComic() {
        // Given
        Chapter chapter1 = new Chapter(testComic, "chapter1", "Chapter 1");
        Chapter chapter2 = new Chapter(testComic, "chapter2", "Chapter 2");
        
        entityManager.persistAndFlush(chapter1);
        entityManager.persistAndFlush(chapter2);

        // When
        Long count = chapterRepository.countByComic(testComic);

        // Then
        assertThat(count).isEqualTo(2L);
    }

    @Test
    void testFindNextChapter() {
        // Given
        Chapter chapter1 = new Chapter(testComic, "chapter1", "Chapter 1");
        chapter1.setChapterNumber(new BigDecimal("1.0"));
        
        Chapter chapter2 = new Chapter(testComic, "chapter2", "Chapter 2");
        chapter2.setChapterNumber(new BigDecimal("2.0"));
        
        Chapter chapter3 = new Chapter(testComic, "chapter3", "Chapter 3");
        chapter3.setChapterNumber(new BigDecimal("3.0"));
        
        entityManager.persistAndFlush(chapter1);
        entityManager.persistAndFlush(chapter2);
        entityManager.persistAndFlush(chapter3);

        // When
        var nextChapter = chapterRepository.findNextChapter(testComic, new BigDecimal("1.0"));

        // Then
        assertThat(nextChapter).isPresent();
        assertThat(nextChapter.get().getTitle()).isEqualTo("Chapter 2");
    }

    @Test
    void testFindPreviousChapter() {
        // Given
        Chapter chapter1 = new Chapter(testComic, "chapter1", "Chapter 1");
        chapter1.setChapterNumber(new BigDecimal("1.0"));
        
        Chapter chapter2 = new Chapter(testComic, "chapter2", "Chapter 2");
        chapter2.setChapterNumber(new BigDecimal("2.0"));
        
        entityManager.persistAndFlush(chapter1);
        entityManager.persistAndFlush(chapter2);

        // When
        var previousChapter = chapterRepository.findPreviousChapter(testComic, new BigDecimal("2.0"));

        // Then
        assertThat(previousChapter).isPresent();
        assertThat(previousChapter.get().getTitle()).isEqualTo("Chapter 1");
    }
}