package com.xiruo.repository;

import com.xiruo.entity.Comic;
import com.xiruo.entity.ComicSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class ComicRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ComicRepository comicRepository;

    private ComicSource testSource;

    @BeforeEach
    void setUp() {
        testSource = new ComicSource("Test Source", "test_source", "test script");
        entityManager.persistAndFlush(testSource);
    }

    @Test
    void testFindBySourceIdAndSourceComicId() {
        // Given
        Comic comic = new Comic(testSource.getId(), "comic123", "Test Comic");
        comic.setAuthor("Test Author");
        entityManager.persistAndFlush(comic);

        // When
        var foundComic = comicRepository.findBySourceIdAndSourceComicId(testSource.getId(), "comic123");

        // Then
        assertThat(foundComic).isPresent();
        assertThat(foundComic.get().getTitle()).isEqualTo("Test Comic");
        assertThat(foundComic.get().getAuthor()).isEqualTo("Test Author");
    }

    @Test
    void testSearchByKeyword() {
        // Given
        Comic comic1 = new Comic(testSource.getId(), "comic1", "Dragon Ball");
        comic1.setAuthor("Akira Toriyama");
        comic1.setDescription("A manga about martial arts");
        
        Comic comic2 = new Comic(testSource.getId(), "comic2", "One Piece");
        comic2.setAuthor("Eiichiro Oda");
        comic2.setDescription("A pirate adventure manga");
        
        entityManager.persistAndFlush(comic1);
        entityManager.persistAndFlush(comic2);

        // When
        var results = comicRepository.searchByKeyword("dragon", PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getTitle()).isEqualTo("Dragon Ball");
    }

    @Test
    void testFindByCategory() {
        // Given
        Comic comic1 = new Comic(testSource.getId(), "comic1", "Action Comic");
        comic1.setCategories(Arrays.asList("Action", "Adventure"));
        
        Comic comic2 = new Comic(testSource.getId(), "comic2", "Romance Comic");
        comic2.setCategories(Arrays.asList("Romance", "Drama"));
        
        entityManager.persistAndFlush(comic1);
        entityManager.persistAndFlush(comic2);

        // When
        var results = comicRepository.findByCategory("Action", PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getTitle()).isEqualTo("Action Comic");
    }

    @Test
    void testFindTrendingComics() {
        // Given
        Comic comic1 = new Comic(testSource.getId(), "comic1", "Popular Comic");
        comic1.setViewCount(1000L);
        
        Comic comic2 = new Comic(testSource.getId(), "comic2", "Less Popular Comic");
        comic2.setViewCount(500L);
        
        entityManager.persistAndFlush(comic1);
        entityManager.persistAndFlush(comic2);

        // When
        var results = comicRepository.findTrendingComics(PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).hasSize(2);
        assertThat(results.getContent().get(0).getTitle()).isEqualTo("Popular Comic");
        assertThat(results.getContent().get(1).getTitle()).isEqualTo("Less Popular Comic");
    }

    @Test
    void testFindAllCategories() {
        // Given
        Comic comic1 = new Comic(testSource.getId(), "comic1", "Comic 1");
        comic1.setCategories(Arrays.asList("Action", "Adventure"));
        
        Comic comic2 = new Comic(testSource.getId(), "comic2", "Comic 2");
        comic2.setCategories(Arrays.asList("Romance", "Action"));
        
        entityManager.persistAndFlush(comic1);
        entityManager.persistAndFlush(comic2);

        // When
        var categories = comicRepository.findAllCategories();

        // Then
        assertThat(categories).containsExactlyInAnyOrder("Action", "Adventure", "Romance");
    }
}