package com.xiruo.service;

import com.xiruo.dto.LoginRequest;
import com.xiruo.dto.LoginResponse;
import com.xiruo.dto.RegisterRequest;
import com.xiruo.dto.UserDto;
import com.xiruo.entity.User;
import com.xiruo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest("testuser", "test@example.com", "password123");
        loginRequest = new LoginRequest("testuser", "password123");
    }

    @Test
    void testUserRegistration() {
        // Test successful registration
        UserDto userDto = authService.register(registerRequest);
        
        assertNotNull(userDto);
        assertEquals("testuser", userDto.getUsername());
        assertEquals("test@example.com", userDto.getEmail());
        assertTrue(userDto.getIsActive());
        
        // Verify user exists in database
        User user = userRepository.findByUsername("testuser").orElse(null);
        assertNotNull(user);
        assertTrue(passwordEncoder.matches("password123", user.getPasswordHash()));
    }

    @Test
    void testDuplicateUsernameRegistration() {
        // Register first user
        authService.register(registerRequest);
        
        // Try to register with same username
        RegisterRequest duplicateRequest = new RegisterRequest("testuser", "different@example.com", "password123");
        
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.register(duplicateRequest);
        });
        
        assertEquals("用户名已存在", exception.getMessage());
    }

    @Test
    void testDuplicateEmailRegistration() {
        // Register first user
        authService.register(registerRequest);
        
        // Try to register with same email
        RegisterRequest duplicateRequest = new RegisterRequest("differentuser", "test@example.com", "password123");
        
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.register(duplicateRequest);
        });
        
        assertEquals("邮箱已被注册", exception.getMessage());
    }

    @Test
    void testSuccessfulLogin() {
        // Register user first
        authService.register(registerRequest);
        
        // Test login
        LoginResponse response = authService.login(loginRequest);
        
        assertNotNull(response);
        assertNotNull(response.getToken());
        assertNotNull(response.getUser());
        assertEquals("testuser", response.getUser().getUsername());
        
        // Verify last login time was updated
        User user = userRepository.findByUsername("testuser").orElse(null);
        assertNotNull(user);
        assertNotNull(user.getLastLoginAt());
        assertEquals(0, user.getFailedLoginAttempts());
    }

    @Test
    void testLoginWithWrongPassword() {
        // Register user first
        authService.register(registerRequest);
        
        // Try login with wrong password
        LoginRequest wrongPasswordRequest = new LoginRequest("testuser", "wrongpassword");
        
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login(wrongPasswordRequest);
        });
        
        assertEquals("用户名或密码错误", exception.getMessage());
        
        // Verify failed login attempts were incremented
        User user = userRepository.findByUsername("testuser").orElse(null);
        assertNotNull(user);
        assertEquals(1, user.getFailedLoginAttempts());
    }

    @Test
    void testLoginWithNonexistentUser() {
        LoginRequest nonexistentRequest = new LoginRequest("nonexistent", "password123");
        
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login(nonexistentRequest);
        });
        
        assertEquals("用户名或密码错误", exception.getMessage());
    }

    @Test
    void testAccountLockingAfterFailedAttempts() {
        // Register user first
        authService.register(registerRequest);
        
        // Make 5 failed login attempts
        LoginRequest wrongPasswordRequest = new LoginRequest("testuser", "wrongpassword");
        
        for (int i = 0; i < 5; i++) {
            try {
                authService.login(wrongPasswordRequest);
            } catch (RuntimeException e) {
                // Expected
            }
        }
        
        // Verify account is locked
        User user = userRepository.findByUsername("testuser").orElse(null);
        assertNotNull(user);
        assertEquals(5, user.getFailedLoginAttempts());
        assertNotNull(user.getLockedUntil());
        
        // Try to login with correct password - should still fail due to lock
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login(loginRequest);
        });
        
        assertEquals("账户已被锁定，请稍后再试", exception.getMessage());
    }
}