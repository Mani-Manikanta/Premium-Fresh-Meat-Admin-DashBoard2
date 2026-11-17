USE fullstack_db;

INSERT INTO users (name, email, password_hash, role)
VALUES
  ('Admin User', 'admin@example.com',
   '$2a$10$S1EGh6uUKDcpKIs6SCnsF.57Kgmfy2KgGa.4ED3rT/SPFfNnEPzmi', 'admin'),

  ('Jane Doe', 'jane@example.com',
   '$2a$10$4.q78AkhD92jrytXvtXqNunUnCpnhKK.i7car1I74chO6GCAjrYBq', 'user'),

  ('John Smith', 'john@example.com',
   '$2a$10$4.q78AkhD92jrytXvtXqNunUnCpnhKK.i7car1I74chO6GCAjrYBq', 'user')

ON DUPLICATE KEY UPDATE email = VALUES(email);