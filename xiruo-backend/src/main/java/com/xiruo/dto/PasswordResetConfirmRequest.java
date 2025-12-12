package com.xiruo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PasswordResetConfirmRequest {
    
    @NotBlank(message = "重置令牌不能为空")
    private String token;
    
    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, message = "密码长度至少6个字符")
    private String newPassword;
    
    // Constructors
    public PasswordResetConfirmRequest() {}
    
    public PasswordResetConfirmRequest(String token, String newPassword) {
        this.token = token;
        this.newPassword = newPassword;
    }
    
    // Getters and Setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    
    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}