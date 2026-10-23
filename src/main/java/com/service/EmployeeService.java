
package com.shivam.employee_management.service;

import com.shivam.employee_management.entity.Employee;
import com.shivam.employee_management.repository.EmployeeRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    public EmployeeService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    // Sabhi employees ki list
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    // ID se employee find karna
    public Employee getEmployeeById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Employee not found with id: " + id
                        )
                );
    }

    // Naya employee create karna
    public Employee createEmployee(Employee employee) {
        // Naya record create karte waqt ID database generate karega
        employee.setId(null);
        return employeeRepository.save(employee);
    }

    // Existing employee update karna
    public Employee updateEmployee(Long id, Employee employeeDetails) {

        Employee existingEmployee = getEmployeeById(id);

        existingEmployee.setFirstName(employeeDetails.getFirstName());
        existingEmployee.setLastName(employeeDetails.getLastName());
        existingEmployee.setEmail(employeeDetails.getEmail());
        existingEmployee.setDepartment(employeeDetails.getDepartment());
        existingEmployee.setSalary(employeeDetails.getSalary());

        return employeeRepository.save(existingEmployee);
    }

    // Employee delete karna
    public void deleteEmployee(Long id) {
        Employee employee = getEmployeeById(id);
        employeeRepository.delete(employee);
    }
}
