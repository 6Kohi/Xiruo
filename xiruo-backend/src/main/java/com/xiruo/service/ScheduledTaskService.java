package com.xiruo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class ScheduledTaskService {

    @Autowired
    private AuthService authService;

    // Clean up expired password reset tokens every hour
    @Scheduled(fixedRate = 3600000) // 1 hour in milliseconds
    public void cleanupExpiredTokens() {
        authService.cleanupExpiredTokens();
    }
}