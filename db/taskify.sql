-- Taskify Database Setup
-- Run this in Coolify's MySQL terminal or any MySQL client

USE `default`;

CREATE TABLE IF NOT EXISTS tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    priority    ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    status      ENUM('To Do', 'In Progress', 'Done') NOT NULL DEFAULT 'To Do',
    due_date    DATE NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample tasks (optional — delete if not needed)
INSERT INTO tasks (title, description, priority, status, due_date) VALUES
('Review weekly goals', 'Check progress, remove blockers, and reset priorities for the next sprint.', 'High', 'In Progress', CURDATE()),
('Prepare tomorrow agenda', 'Outline meetings, focus blocks, and follow-ups before the day ends.', 'Medium', 'To Do', DATE_ADD(CURDATE(), INTERVAL 1 DAY));
