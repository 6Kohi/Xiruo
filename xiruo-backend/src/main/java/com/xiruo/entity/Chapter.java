package com.xiruo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "chapters", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"comic_id", "source_chapter_id"})
})
@EntityListeners(AuditingEntityListener.class)
public class Chapter {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comic_id", nullable = false)
    private Comic comic;
    
    @NotBlank
    @Column(name = "source_chapter_id", nullable = false)
    private String sourceChapterId;
    
    @NotBlank
    @Column(nullable = false, length = 500)
    private String title;
    
    @Column(name = "chapter_number", precision = 10, scale = 2)
    private BigDecimal chapterNumber;
    
    @Column(name = "page_count")
    private Integer pageCount;
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    // Constructors
    public Chapter() {}
    
    public Chapter(Comic comic, String sourceChapterId, String title) {
        this.comic = comic;
        this.sourceChapterId = sourceChapterId;
        this.title = title;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Comic getComic() { return comic; }
    public void setComic(Comic comic) { this.comic = comic; }
    
    public String getSourceChapterId() { return sourceChapterId; }
    public void setSourceChapterId(String sourceChapterId) { this.sourceChapterId = sourceChapterId; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public BigDecimal getChapterNumber() { return chapterNumber; }
    public void setChapterNumber(BigDecimal chapterNumber) { this.chapterNumber = chapterNumber; }
    
    public Integer getPageCount() { return pageCount; }
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}