package com.xiruo.repository;

import com.xiruo.entity.Favorite;
import com.xiruo.entity.FavoriteFolder;
import com.xiruo.entity.User;
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
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    
    Optional<Favorite> findByUserAndComic(User user, Comic comic);
    
    boolean existsByUserAndComic(User user, Comic comic);
    
    List<Favorite> findByUserOrderByCreatedAtDesc(User user);
    
    Page<Favorite> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
    
    List<Favorite> findByFolderOrderByCreatedAtDesc(FavoriteFolder folder);
    
    Page<Favorite> findByFolderOrderByCreatedAtDesc(FavoriteFolder folder, Pageable pageable);
    
    @Query("SELECT f FROM Favorite f WHERE f.user.id = :userId ORDER BY f.createdAt DESC")
    Page<Favorite> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId, Pageable pageable);
    
    @Query("SELECT f FROM Favorite f WHERE f.user.id = :userId AND f.folder.id = :folderId ORDER BY f.createdAt DESC")
    Page<Favorite> findByUserIdAndFolderIdOrderByCreatedAtDesc(@Param("userId") Long userId, @Param("folderId") Long folderId, Pageable pageable);
    
    @Query("SELECT COUNT(f) FROM Favorite f WHERE f.user = :user")
    Long countByUser(@Param("user") User user);
    
    @Query("SELECT COUNT(f) FROM Favorite f WHERE f.comic = :comic")
    Long countByComic(@Param("comic") Comic comic);
    
    void deleteByUserAndComic(User user, Comic comic);
}