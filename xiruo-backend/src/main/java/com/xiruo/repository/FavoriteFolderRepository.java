package com.xiruo.repository;

import com.xiruo.entity.FavoriteFolder;
import com.xiruo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteFolderRepository extends JpaRepository<FavoriteFolder, Long> {
    
    Optional<FavoriteFolder> findByUserAndName(User user, String name);
    
    boolean existsByUserAndName(User user, String name);
    
    List<FavoriteFolder> findByUserOrderByCreatedAtAsc(User user);
    
    @Query("SELECT ff FROM FavoriteFolder ff WHERE ff.user.id = :userId ORDER BY ff.createdAt ASC")
    List<FavoriteFolder> findByUserIdOrderByCreatedAtAsc(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(ff) FROM FavoriteFolder ff WHERE ff.user = :user")
    Long countByUser(@Param("user") User user);
}