package com.xiruo.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class JwtServiceTest {

    @Autowired
    private JwtService jwtService;

    private String username;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        username = "testuser";
        userDetails = User.builder()
                .username(username)
                .password("password")
                .authorities(new ArrayList<>())
                .build();
    }

    @Test
    void testGenerateToken() {
        String token = jwtService.generateToken(username);
        
        assertNotNull(token);
        assertFalse(token.isEmpty());
        
        // Verify we can extract username from token
        String extractedUsername = jwtService.extractUsername(token);
        assertEquals(username, extractedUsername);
    }

    @Test
    void testGenerateTokenWithExtraClaims() {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", "USER");
        extraClaims.put("userId", 123L);
        
        String token = jwtService.generateToken(username, extraClaims);
        
        assertNotNull(token);
        assertFalse(token.isEmpty());
        
        String extractedUsername = jwtService.extractUsername(token);
        assertEquals(username, extractedUsername);
    }

    @Test
    void testExtractExpiration() {
        String token = jwtService.generateToken(username);
        
        Date expiration = jwtService.extractExpiration(token);
        
        assertNotNull(expiration);
        assertTrue(expiration.after(new Date()));
    }

    @Test
    void testValidateToken() {
        String token = jwtService.generateToken(username);
        
        Boolean isValid = jwtService.validateToken(token, userDetails);
        assertTrue(isValid);
        
        Boolean isValidWithUsername = jwtService.validateToken(token, username);
        assertTrue(isValidWithUsername);
    }

    @Test
    void testValidateTokenWithWrongUsername() {
        String token = jwtService.generateToken(username);
        
        UserDetails wrongUserDetails = User.builder()
                .username("wronguser")
                .password("password")
                .authorities(new ArrayList<>())
                .build();
        
        Boolean isValid = jwtService.validateToken(token, wrongUserDetails);
        assertFalse(isValid);
        
        Boolean isValidWithUsername = jwtService.validateToken(token, "wronguser");
        assertFalse(isValidWithUsername);
    }

    @Test
    void testRefreshToken() {
        String originalToken = jwtService.generateToken(username);
        
        String refreshedToken = jwtService.refreshToken(originalToken);
        
        assertNotNull(refreshedToken);
        assertFalse(refreshedToken.isEmpty());
        assertNotEquals(originalToken, refreshedToken);
        
        // Both tokens should have the same username
        String originalUsername = jwtService.extractUsername(originalToken);
        String refreshedUsername = jwtService.extractUsername(refreshedToken);
        assertEquals(originalUsername, refreshedUsername);
    }
}