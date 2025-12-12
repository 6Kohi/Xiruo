package com.xiruo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "comics", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"source_id", "source_comic_id"})
})
@EntityListeners(AuditingEntityListener.class)
public class Comic {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @Column(name = "source_id", nullable = false)
    private Long sourceId;
    
    @NotBlank
    @Column(name = "source_comic_id", nullable = false)
    private String sourceComicId;
    
    @NotBlank
    @Column(nullable = false, length = 500)
    private String title;
    
    private String author;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "cover_url", length = 500)
    private String coverUrl;
    
    private String status;
    
    @ElementCollection
    @CollectionTable(name = "comic_categories", joinColumns = @JoinColumn(name = "comic_id"))
    @Column(name = "category")
    private List<String> categories = new ArrayList<>();
    
    @ElementCollection
    @CollectionTable(name = "comic_tags", joinColumns = @JoinColumn(name = "comic_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();
    
    @Column(precision = 3, scale = 2)
    private BigDecimal rating;
    
    @Column(name = "view_count", nullable = false)
    private Long viewCount = 0L;
    
    @Column(name = "favorite_count", nullable = false)
    private Long favoriteCount = 0L;
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public Comic() {}
    
    public Comic(Long sourceId, String sourceComicId, String title) {
        this.sourceId = sourceId;
        this.sourceComicId = sourceComicId;
        this.title = title;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getSourceId() { return sourceId; }
    public void setSourceId(Long sourceId) { this.sourceId = sourceId; }
    
    public String getSourceComicId() { return sourceComicId; }
    public void setSourceComicId(String sourceComicId) { this.sourceComicId = sourceComicId; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public List<String> getCategories() { return categories; }
    public void setCategories(List<String> categories) { this.categories = categories; }
    
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    
    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }
    
    public Long getViewCount() { return viewCount; }
    public void setViewCount(Long viewCount) { this.viewCount = viewCount; }
    
    public Long getFavoriteCount() { return favoriteCount; }
    public void setFavoriteCount(Long favoriteCount) { this.favoriteCount = favoriteCount; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}