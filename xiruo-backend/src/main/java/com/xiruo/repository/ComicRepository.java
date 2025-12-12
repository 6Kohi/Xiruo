package com.xiruo.repository;

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
public interface ComicRepository extends JpaRepository<Comic, Long> {
    
    Optional<Comic> findBySourceIdAndSourceComicId(Long sourceId, String sourceComicId);
    
    boolean existsBySourceIdAndSourceComicId(Long sourceId, String sourceComicId);
    
    @Query("SELECT c FROM Comic c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(c.author) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Comic> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT c FROM Comic c WHERE :category MEMBER OF c.categories")
    Page<Comic> findByCategory(@Param("category") String category, Pageable pageable);
    
    @Query("SELECT c FROM Comic c WHERE :tag MEMBER OF c.tags")
    Page<Comic> findByTag(@Param("tag") String tag, Pageable pageable);
    
    Page<Comic> findBySourceId(Long sourceId, Pageable pageable);
    
    @Query("SELECT c FROM Comic c ORDER BY c.viewCount DESC")
    Page<Comic> findTrendingComics(Pageable pageable);
    
    @Query("SELECT c FROM Comic c ORDER BY c.createdAt DESC")
    Page<Comic> findLatestComics(Pageable pageable);
    
    @Query("SELECT DISTINCT category FROM Comic c JOIN c.categories category")
    List<String> findAllCategories();
    
    @Query("SELECT DISTINCT tag FROM Comic c JOIN c.tags tag")
    List<String> findAllTags();
}