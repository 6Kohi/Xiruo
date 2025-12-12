package com.xiruo.service;

import com.xiruo.dto.*;
import com.xiruo.entity.PasswordResetToken;
import com.xiruo.entity.User;
import com.xiruo.repository.PasswordResetTokenRepository;
import com.xiruo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Transactional
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private EmailService emailService;

    public UserDto register(RegisterRequest request) {
        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("邮箱已被注册");
        }

        // Create new user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setIsActive(true);
        user.setFailedLoginAttempts(0);

        User savedUser = userRepository.save(user);
        return new UserDto(savedUser);
    }

    public LoginResponse login(LoginRequest request) {
        // Find user by username
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("用户名或密码错误"));

        // Check if account is locked
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("账户已被锁定，请稍后再试");
        }

        // Check if account is active
        if (!user.getIsActive()) {
            throw new RuntimeException("账户已被禁用");
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            // Increment failed login attempts
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            
            // Lock account if too many failed attempts
            if (user.getFailedLoginAttempts() >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(30));
            }
            
            userRepository.save(user);
            throw new RuntimeException("用户名或密码错误");
        }

        // Reset failed login attempts and update last login time
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // Generate JWT token
        String token = jwtService.generateToken(user.getUsername());

        return new LoginResponse(token, new UserDto(user));
    }

    public LoginResponse refreshToken(String token) {
        try {
            // Extract username from token
            String username = jwtService.extractUsername(token.replace("Bearer ", ""));
            
            // Verify user still exists and is active
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("用户不存在"));

            if (!user.getIsActive()) {
                throw new RuntimeException("账户已被禁用");
            }

            // Generate new token
            String newToken = jwtService.generateToken(username);
            return new LoginResponse(newToken, new UserDto(user));
        } catch (Exception e) {
            throw new RuntimeException("令牌刷新失败: " + e.getMessage());
        }
    }

    public void requestPasswordReset(PasswordResetRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("邮箱不存在"));

        // Delete any existing reset tokens for this user
        passwordResetTokenRepository.deleteByUser(user);

        // Generate new reset token
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(30);

        PasswordResetToken resetToken = new PasswordResetToken(token, user, expiresAt);
        passwordResetTokenRepository.save(resetToken);

        // Send reset email
        emailService.sendPasswordResetEmail(user.getEmail(), token);
    }

    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenAndUsedFalse(request.getToken())
                .orElseThrow(() -> new RuntimeException("无效的重置令牌"));

        if (resetToken.isExpired()) {
            throw new RuntimeException("重置令牌已过期");
        }

        // Update user password
        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }

    @Transactional
    public void cleanupExpiredTokens() {
        passwordResetTokenRepository.deleteExpiredTokens(LocalDateTime.now());
    }
}