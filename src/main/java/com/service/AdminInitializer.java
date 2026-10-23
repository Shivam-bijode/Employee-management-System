
package com.shivam.employee_management.service;

import com.shivam.employee_management.entity.Role;
import com.shivam.employee_management.entity.User;
import com.shivam.employee_management.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminInitializer {

    @Bean
    CommandLineRunner createAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        return args -> {
            String adminUsername = "emsadmin";
            String adminEmail = "emsadmin@example.com";

            if (userRepository.findByUsername(adminUsername).isEmpty()
                    && userRepository.findByEmail(adminEmail).isEmpty()) {

                User admin = new User(
                        adminUsername,
                        adminEmail,
                        passwordEncoder.encode("ChangeThisAdmin123!"),
                        Role.ADMIN
                );

                userRepository.save(admin);
                System.out.println("EMS admin account created.");
            }
        };
    }
}
