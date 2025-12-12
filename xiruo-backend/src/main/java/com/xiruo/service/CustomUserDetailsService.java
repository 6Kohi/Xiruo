package com.xiruo.service;

import com.xiruo.entity.User;
import com.xiruo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("用户不存在: " + username));

        // Check if account is locked
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("账户已被锁定，请稍后再试");
        }

        // Check if account is active
        if (!user.getIsActive()) {
            throw new RuntimeException("账户已被禁用");
        }

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(new ArrayList<>()) // No roles for now, can be extended later
                .accountExpired(false)
                .accountLocked(user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now()))
                .credentialsExpired(false)
                .disabled(!user.getIsActive())
                .build();
    }
}