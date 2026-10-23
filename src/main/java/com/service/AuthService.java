
package com.shivam.employee_management.service;

import com.shivam.employee_management.dto.LoginRequest;
import com.shivam.employee_management.dto.RegisterRequest;
import com.shivam.employee_management.dto.ChangeUsernameRequest;
import com.shivam.employee_management.dto.ChangePasswordRequest;
import com.shivam.employee_management.entity.Role;
import com.shivam.employee_management.entity.User;
import com.shivam.employee_management.repository.UserRepository;
import com.shivam.employee_management.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public String register(RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = new User(
                request.getUsername(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                Role.EMPLOYEE
        );

        userRepository.save(user);
        return "Employee registered successfully";
    }

    public String login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        var user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        return jwtService.generateToken(
                org.springframework.security.core.userdetails.User
                        .withUsername(user.getUsername())
                        .password(user.getPassword())
                        .roles(user.getRole().name())
                        .build()
        );
    }

    public String changeUsername(
            String currentUsername,
            ChangeUsernameRequest request) {

        if (request.getNewUsername() == null
                || request.getNewUsername().isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }

        String newUsername = request.getNewUsername().trim();

        if (newUsername.length() < 3 || newUsername.length() > 50) {
            throw new IllegalArgumentException(
                    "Username must be between 3 and 50 characters");
        }

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        if (!newUsername.equals(currentUsername)
                && userRepository.findByUsername(newUsername).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }

        user.setUsername(newUsername);
        userRepository.save(user);

        return "Username changed successfully. Please log in again.";
    }

    public String changePassword(
            String currentUsername,
            ChangePasswordRequest request) {

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        if (request.getCurrentPassword() == null
                || !passwordEncoder.matches(
                request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException(
                    "Current password is incorrect");
        }

        String newPassword = request.getNewPassword();

        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException(
                    "New password must contain at least 8 characters");
        }

        if (!newPassword.equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException(
                    "New password must differ from current password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return "Password changed successfully. Please log in again.";
    }
}
