package com.xiruo.repository;

import com.xiruo.entity.DownloadTask;
import com.xiruo.entity.Comic;
import com.xiruo.entity.Chapter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DownloadTaskRepository extends JpaRepository<DownloadTask, Long> {
    
    Optional<DownloadTask> findByComicAndChapter(Comic comic, Chapter chapter);
    
    boolean existsByComicAndChapter(Comic comic, Chapter chapter);
    
    List<DownloadTask> findByStatus(DownloadTask.Status status);
    
    Page<DownloadTask> findByStatusOrderByCreatedAtDesc(DownloadTask.Status status, Pageable pageable);
    
    List<DownloadTask> findByComicOrderByCreatedAtDesc(Comic comic);
    
    @Query("SELECT dt FROM DownloadTask dt WHERE dt.status IN :statuses ORDER BY dt.createdAt DESC")
    List<DownloadTask> findByStatusInOrderByCreatedAtDesc(@Param("statuses") List<DownloadTask.Status> statuses);
    
    @Query("SELECT dt FROM DownloadTask dt ORDER BY dt.createdAt DESC")
    Page<DownloadTask> findAllOrderByCreatedAtDesc(Pageable pageable);
    
    @Query("SELECT COUNT(dt) FROM DownloadTask dt WHERE dt.status = :status")
    Long countByStatus(@Param("status") DownloadTask.Status status);
    
    @Query("SELECT dt FROM DownloadTask dt WHERE dt.status = 'PENDING' ORDER BY dt.createdAt ASC")
    List<DownloadTask> findPendingTasksOrderByCreatedAt();
}