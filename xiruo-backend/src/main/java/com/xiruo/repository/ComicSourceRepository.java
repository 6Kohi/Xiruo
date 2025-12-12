package com.xiruo.repository;

import com.xiruo.entity.ComicSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComicSourceRepository extends JpaRepository<ComicSource, Long> {
    
    Optional<ComicSource> findByKey(String key);
    
    boolean existsByKey(String key);
    
    boolean existsByName(String name);
    
    List<ComicSource> findByIsActiveTrue();
    
    @Query("SELECT cs FROM ComicSource cs WHERE cs.isActive = true ORDER BY cs.name ASC")
    List<ComicSource> findActiveSourcesOrderByName();
    
    @Query("SELECT cs FROM ComicSource cs ORDER BY cs.createdAt DESC")
    List<ComicSource> findAllOrderByCreatedAtDesc();
}