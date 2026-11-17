USE fullstack_db;

ALTER TABLE sellers
  MODIFY COLUMN approval_status ENUM('Pending', 'Approved', 'Rejected', 'Suspended') NOT NULL DEFAULT 'Pending',
  ADD COLUMN suspension_reason VARCHAR(500) NULL;

ALTER TABLE riders
  MODIFY COLUMN approval_status ENUM('Pending', 'Approved', 'Rejected', 'Suspended') NOT NULL DEFAULT 'Approved',
  ADD COLUMN suspension_reason VARCHAR(500) NULL;
