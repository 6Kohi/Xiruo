package com.xiruo.repository;

import com.xiruo.entity.ReadingHistory;
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
public interface ReadingHistoryRepository extends JpaRepository<ReadingHistory, Long> {
    
    Optional<ReadingHistory> findByUserAndComic(User user, Comic comic);
    
    boolean existsByUserAndComic(User user, Comic comic);
    
    List<ReadingHistory> findByUserOrderByLastReadAtDesc(User user);
    
    Page<ReadingHistory> findByUserOrderByLastReadAtDesc(User user, Pageable pageable);
    
    @Query("SELECT rh FROM ReadingHistory rh WHERE rh.user.id = :userId ORDER BY rh.lastReadAt DESC")
    Page<ReadingHistory> findByUserIdOrderByLastReadAtDesc(@Param("userId") Long userId, Pageable pageable);
    
    @Query("SELECT COUNT(rh) FROM ReadingHistory rh WHERE rh.user = :user")
    Long countByUser(@Param("user") User user);
    
    void deleteByUserAndComic(User user, Comic comic);
}