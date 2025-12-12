package com.xiruo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("密码重置 - Xiruo漫画平台");
        
        String resetUrl = "http://localhost:3000/reset-password?token=" + resetToken;
        String emailBody = String.format(
            "您好，\n\n" +
            "您请求重置Xiruo漫画平台的密码。请点击以下链接重置您的密码：\n\n" +
            "%s\n\n" +
            "此链接将在30分钟后失效。如果您没有请求重置密码，请忽略此邮件。\n\n" +
            "Xiruo漫画平台团队",
            resetUrl
        );
        
        message.setText(emailBody);
        
        try {
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("发送邮件失败: " + e.getMessage());
        }
    }
}