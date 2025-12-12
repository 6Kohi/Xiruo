package com.xiruo.repository;

import com.xiruo.entity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class FavoriteRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private FavoriteRepository favoriteRepository;

    private User testUser;
    private Comic testComic1;
    private Comic testComic2;
    private FavoriteFolder testFolder;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new User("testuser", "test@example.com", "hashedpassword");
        entityManager.persistAndFlush(testUser);

        // Create test comic source
        ComicSource testSource = new ComicSource("Test Source", "test_source", "test script");
        entityManager.persistAndFlush(testSource);

        // Create test comics
        testComic1 = new Comic(testSource.getId(), "comic1", "Test Comic 1");
        testComic2 = new Comic(testSource.getId(), "comic2", "Test Comic 2");
        entityManager.persistAndFlush(testComic1);
        entityManager.persistAndFlush(testComic2);

        // Create test folder
        testFolder = new FavoriteFolder(testUser, "My Favorites");
        entityManager.persistAndFlush(testFolder);
    }

    @Test
    void testFindByUserAndComic() {
        // Given
        Favorite favorite = new Favorite(testUser, testComic1);
        entityManager.persistAndFlush(favorite);

        // When
        var foundFavorite = favoriteRepository.findByUserAndComic(testUser, testComic1);

        // Then
        assertThat(foundFavorite).isPresent();
        assertThat(foundFavorite.get().getUser().getUsername()).isEqualTo("testuser");
        assertThat(foundFavorite.get().getComic().getTitle()).isEqualTo("Test Comic 1");
    }

    @Test
    void testExistsByUserAndComic() {
        // Given
        Favorite favorite = new Favorite(testUser, testComic1);
        entityManager.persistAndFlush(favorite);

        // When
        boolean exists = favoriteRepository.existsByUserAndComic(testUser, testComic1);
        boolean notExists = favoriteRepository.existsByUserAndComic(testUser, testComic2);

        // Then
        assertThat(exists).isTrue();
        assertThat(notExists).isFalse();
    }

    @Test
    void testFindByUserOrderByCreatedAtDesc() {
        // Given
        Favorite favorite1 = new Favorite(testUser, testComic1);
        Favorite favorite2 = new Favorite(testUser, testComic2);
        
        entityManager.persistAndFlush(favorite1);
        // Small delay to ensure different timestamps
        try { Thread.sleep(10); } catch (InterruptedException e) {}
        entityManager.persistAndFlush(favorite2);

        // When
        var favorites = favoriteRepository.findByUserOrderByCreatedAtDesc(testUser);

        // Then
        assertThat(favorites).hasSize(2);
        // Most recent should be first
        assertThat(favorites.get(0).getComic().getTitle()).isEqualTo("Test Comic 2");
        assertThat(favorites.get(1).getComic().getTitle()).isEqualTo("Test Comic 1");
    }

    @Test
    void testFindByFolderOrderByCreatedAtDesc() {
        // Given
        Favorite favorite1 = new Favorite(testUser, testComic1, testFolder);
        Favorite favorite2 = new Favorite(testUser, testComic2, testFolder);
        
        entityManager.persistAndFlush(favorite1);
        entityManager.persistAndFlush(favorite2);

        // When
        var favorites = favoriteRepository.findByFolderOrderByCreatedAtDesc(testFolder);

        // Then
        assertThat(favorites).hasSize(2);
        assertThat(favorites.get(0).getFolder().getName()).isEqualTo("My Favorites");
        assertThat(favorites.get(1).getFolder().getName()).isEqualTo("My Favorites");
    }

    @Test
    void testCountByUser() {
        // Given
        Favorite favorite1 = new Favorite(testUser, testComic1);
        Favorite favorite2 = new Favorite(testUser, testComic2);
        
        entityManager.persistAndFlush(favorite1);
        entityManager.persistAndFlush(favorite2);

        // When
        Long count = favoriteRepository.countByUser(testUser);

        // Then
        assertThat(count).isEqualTo(2L);
    }

    @Test
    void testCountByComic() {
        // Given
        User anotherUser = new User("anotheruser", "another@example.com", "hashedpassword");
        entityManager.persistAndFlush(anotherUser);
        
        Favorite favorite1 = new Favorite(testUser, testComic1);
        Favorite favorite2 = new Favorite(anotherUser, testComic1);
        
        entityManager.persistAndFlush(favorite1);
        entityManager.persistAndFlush(favorite2);

        // When
        Long count = favoriteRepository.countByComic(testComic1);

        // Then
        assertThat(count).isEqualTo(2L);
    }

    @Test
    void testFindByUserIdOrderByCreatedAtDesc() {
        // Given
        Favorite favorite1 = new Favorite(testUser, testComic1);
        Favorite favorite2 = new Favorite(testUser, testComic2);
        
        entityManager.persistAndFlush(favorite1);
        entityManager.persistAndFlush(favorite2);

        // When
        var favoritesPage = favoriteRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId(), PageRequest.of(0, 10));

        // Then
        assertThat(favoritesPage.getContent()).hasSize(2);
        assertThat(favoritesPage.getTotalElements()).isEqualTo(2L);
    }
}