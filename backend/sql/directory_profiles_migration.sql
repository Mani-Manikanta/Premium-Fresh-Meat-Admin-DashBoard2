USE fullstack_db;

ALTER TABLE sellers
  ADD COLUMN license_number VARCHAR(50) NULL,
  ADD COLUMN shop_image MEDIUMTEXT NULL,
  ADD COLUMN profile_image MEDIUMTEXT NULL,
  ADD COLUMN rating DECIMAL(2, 1) NOT NULL DEFAULT 0.0,
  ADD COLUMN approval_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending';

UPDATE sellers
SET approval_status = CASE
  WHEN status = 'Active' THEN 'Approved'
  WHEN status = 'Inactive' THEN 'Rejected'
  ELSE 'Pending'
END;

ALTER TABLE riders
  ADD COLUMN profile_image MEDIUMTEXT NULL,
  ADD COLUMN rating DECIMAL(2, 1) NOT NULL DEFAULT 0.0,
  ADD COLUMN approval_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Approved';

ALTER TABLE customers
  ADD COLUMN profile_image MEDIUMTEXT NULL,
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'New';
