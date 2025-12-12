package com.xiruo.config;

import com.xiruo.entity.*;
import com.xiruo.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DatabaseConfigurationTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComicSourceRepository comicSourceRepository;

    @Autowired
    private ComicRepository comicRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private FavoriteFolderRepository favoriteFolderRepository;

    @Autowired
    private ReadingHistoryRepository readingHistoryRepository;

    @Autowired
    private DownloadTaskRepository downloadTaskRepository;

    @Autowired
    private ComicFileRepository comicFileRepository;

    @Test
    void testDataSourceConfiguration() {
        assertThat(dataSource).isNotNull();
    }

    @Test
    void testAllRepositoriesAreInjected() {
        assertThat(userRepository).isNotNull();
        assertThat(comicSourceRepository).isNotNull();
        assertThat(comicRepository).isNotNull();
        assertThat(chapterRepository).isNotNull();
        assertThat(favoriteRepository).isNotNull();
        assertThat(favoriteFolderRepository).isNotNull();
        assertThat(readingHistoryRepository).isNotNull();
        assertThat(downloadTaskRepository).isNotNull();
        assertThat(comicFileRepository).isNotNull();
    }

    @Test
    void testCompleteWorkflow() {
        // Create user
        User user = new User("testuser", "test@example.com", "hashedpassword");
        user = userRepository.save(user);
        assertThat(user.getId()).isNotNull();

        // Create comic source
        ComicSource source = new ComicSource("Test Source", "test_source", "test script");
        source = comicSourceRepository.save(source);
        assertThat(source.getId()).isNotNull();

        // Create comic
        Comic comic = new Comic(source.getId(), "comic123", "Test Comic");
        comic.setAuthor("Test Author");
        comic.setViewCount(100L);
        comic = comicRepository.save(comic);
        assertThat(comic.getId()).isNotNull();

        // Create chapter
        Chapter chapter = new Chapter(comic, "chapter1", "Chapter 1");
        chapter.setChapterNumber(new BigDecimal("1.0"));
        chapter.setPageCount(20);
        chapter = chapterRepository.save(chapter);
        assertThat(chapter.getId()).isNotNull();

        // Create favorite folder
        FavoriteFolder folder = new FavoriteFolder(user, "My Favorites");
        folder = favoriteFolderRepository.save(folder);
        assertThat(folder.getId()).isNotNull();

        // Create favorite
        Favorite favorite = new Favorite(user, comic, folder);
        favorite = favoriteRepository.save(favorite);
        assertThat(favorite.getId()).isNotNull();

        // Create reading history
        ReadingHistory history = new ReadingHistory(user, comic, chapter, 5);
        history = readingHistoryRepository.save(history);
        assertThat(history.getId()).isNotNull();

        // Create download task
        DownloadTask task = new DownloadTask(comic, chapter);
        task.setStatus(DownloadTask.Status.PENDING);
        task.setTotalPages(20);
        task = downloadTaskRepository.save(task);
        assertThat(task.getId()).isNotNull();

        // Create comic file
        ComicFile file = new ComicFile(comic, chapter, 1, "/path/to/page1.jpg");
        file.setFileSize(1024L);
        file.setMimeType("image/jpeg");
        file = comicFileRepository.save(file);
        assertThat(file.getId()).isNotNull();

        // Verify relationships work
        var foundUser = userRepository.findByUsername("testuser");
        assertThat(foundUser).isPresent();

        var foundComic = comicRepository.findBySourceIdAndSourceComicId(source.getId(), "comic123");
        assertThat(foundComic).isPresent();

        var chapters = chapterRepository.findByComicOrderByChapterNumberAsc(comic);
        assertThat(chapters).hasSize(1);

        var userFavorites = favoriteRepository.findByUserOrderByCreatedAtDesc(user);
        assertThat(userFavorites).hasSize(1);

        var userHistory = readingHistoryRepository.findByUserOrderByLastReadAtDesc(user);
        assertThat(userHistory).hasSize(1);

        var pendingTasks = downloadTaskRepository.findByStatus(DownloadTask.Status.PENDING);
        assertThat(pendingTasks).hasSize(1);

        var chapterFiles = comicFileRepository.findByChapterOrderByPageNumberAsc(chapter);
        assertThat(chapterFiles).hasSize(1);
    }

    @Test
    void testUniqueConstraints() {
        // Test user unique constraints
        User user1 = new User("testuser", "test1@example.com", "password1");
        userRepository.save(user1);

        // This should work - different username and email
        User user2 = new User("testuser2", "test2@example.com", "password2");
        userRepository.save(user2);

        // Verify both users exist
        assertThat(userRepository.count()).isEqualTo(2);

        // Test comic source unique constraint
        ComicSource source1 = new ComicSource("Source 1", "source1", "script1");
        comicSourceRepository.save(source1);

        ComicSource source2 = new ComicSource("Source 2", "source2", "script2");
        comicSourceRepository.save(source2);

        assertThat(comicSourceRepository.count()).isEqualTo(2);
    }
}