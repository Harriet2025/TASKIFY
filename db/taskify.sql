-- ============================================================
--  TASKIFY — Full Database Backup
--  Import this via phpMyAdmin on InfinityFree:
--  cPanel → phpMyAdmin → select your DB → Import → choose this file
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop and recreate tasks table
DROP TABLE IF EXISTS `tasks`;

CREATE TABLE `tasks` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(255) NOT NULL,
  `description` TEXT         DEFAULT NULL,
  `priority`    ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  `status`      ENUM('To Do','In Progress','Done') NOT NULL DEFAULT 'To Do',
  `due_date`    DATE         NOT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Seed data — 10 realistic tasks
--  (Remove this block if you want a clean empty database)
-- ============================================================

INSERT INTO `tasks` (`title`, `description`, `priority`, `status`, `due_date`) VALUES

('Review weekly goals',
 'Check progress on all ongoing projects, remove blockers, and reset priorities for the next sprint.',
 'High', 'In Progress', CURDATE()),

('Prepare meeting agenda',
 'Outline key discussion points, assign time slots, and share agenda with the team before the meeting.',
 'Medium', 'To Do', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),

('Update project documentation',
 'Rewrite the onboarding guide, add API references, and fix outdated screenshots in the docs.',
 'Low', 'To Do', DATE_ADD(CURDATE(), INTERVAL 3 DAY)),

('Fix login page bug',
 'Users are being redirected to a blank page after password reset. Investigate and patch the auth flow.',
 'High', 'In Progress', CURDATE()),

('Design new dashboard layout',
 'Create wireframes for the redesigned analytics dashboard. Focus on mobile-first approach.',
 'Medium', 'To Do', DATE_ADD(CURDATE(), INTERVAL 5 DAY)),

('Send client progress report',
 'Compile weekly metrics, write summary, and email the report to the client by end of day.',
 'High', 'Done', DATE_ADD(CURDATE(), INTERVAL -1 DAY)),

('Code review - payment module',
 'Review pull requests for the new Stripe integration. Check for security issues and edge cases.',
 'High', 'To Do', DATE_ADD(CURDATE(), INTERVAL 2 DAY)),

('Set up staging environment',
 'Configure the staging server, deploy the latest build, and run smoke tests before client demo.',
 'Medium', 'Done', DATE_ADD(CURDATE(), INTERVAL -2 DAY)),

('Write unit tests for API',
 'Cover all endpoints in the tasks API with unit and integration tests. Aim for 80% coverage.',
 'Medium', 'In Progress', DATE_ADD(CURDATE(), INTERVAL 4 DAY)),

('Team retrospective',
 'Facilitate the end-of-sprint retrospective. Collect feedback and document action items for next sprint.',
 'Low', 'To Do', DATE_ADD(CURDATE(), INTERVAL 6 DAY));

SET FOREIGN_KEY_CHECKS = 1;
