package com.xiruo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "reading_history", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "comic_id"})
})
@EntityListeners(AuditingEntityListener.class)
public class ReadingHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comic_id", nullable = false)
    private Comic comic;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id")
    private Chapter chapter;
    
    @Column(name = "page_number")
    private Integer pageNumber = 1;
    
    @LastModifiedDate
    @Column(name = "last_read_at", nullable = false)
    private LocalDateTime lastReadAt;
    
    // Constructors
    public ReadingHistory() {}
    
    public ReadingHistory(User user, Comic comic) {
        this.user = user;
        this.comic = comic;
        this.lastReadAt = LocalDateTime.now();
    }
    
    public ReadingHistory(User user, Comic comic, Chapter chapter, Integer pageNumber) {
        this.user = user;
        this.comic = comic;
        this.chapter = chapter;
        this.pageNumber = pageNumber;
        this.lastReadAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    
    public Comic getComic() { return comic; }
    public void setComic(Comic comic) { this.comic = comic; }
    
    public Chapter getChapter() { return chapter; }
    public void setChapter(Chapter chapter) { this.chapter = chapter; }
    
    public Integer getPageNumber() { return pageNumber; }
    public void setPageNumber(Integer pageNumber) { this.pageNumber = pageNumber; }
    
    public LocalDateTime getLastReadAt() { return lastReadAt; }
    public void setLastReadAt(LocalDateTime lastReadAt) { this.lastReadAt = lastReadAt; }
}