-- Create the user_role enum type
CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'top_expert', 'community_expert', 'user');

-- Add primaryRole column to users table
ALTER TABLE users
ADD COLUMN primary_role user_role NOT NULL DEFAULT 'user';

-- Create permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on permission name
CREATE INDEX permissions_name_idx ON permissions (name);

-- Create role_permissions table for role-based permissions
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT role_permission_unique_idx UNIQUE (role, permission_id)
);

-- Create user_roles table for many-to-many relationship
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  role user_role NOT NULL,
  assigned_by TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT user_roles_unique_idx UNIQUE (clerk_user_id, role)
);

-- Create index on user_roles.clerk_user_id
CREATE INDEX user_roles_clerk_user_id_idx ON user_roles (clerk_user_id);

-- Populate initial roles based on existing role field
-- Migrate existing admins
INSERT INTO user_roles (clerk_user_id, role, assigned_by)
SELECT clerkUserId, 'admin', clerkUserId
FROM users
WHERE role = 'admin';

-- Migrate existing experts as community experts
INSERT INTO user_roles (clerk_user_id, role, assigned_by)
SELECT clerkUserId, 'community_expert', clerkUserId
FROM users
WHERE role = 'expert';

-- Set primary_role based on existing role
UPDATE users SET primary_role = 'admin' WHERE role = 'admin';
UPDATE users SET primary_role = 'community_expert' WHERE role = 'expert';

-- Create default permissions
INSERT INTO permissions (name, description)
VALUES 
  ('manage:users', 'Create, read, update, and delete users'),
  ('manage:experts', 'Manage expert profiles and verification'),
  ('manage:content', 'Create, read, update, and delete content'),
  ('manage:payments', 'View and process payments'),
  ('manage:settings', 'Update application settings'),
  ('manage:roles', 'Assign and remove user roles'),
  ('view:analytics', 'View analytics data'),
  ('view:admin:dashboard', 'Access admin dashboard'),
  ('create:appointments', 'Create appointments'),
  ('manage:own:profile', 'Manage own profile'),
  ('view:marketplace', 'View the expert marketplace'),
  ('book:appointments', 'Book appointments with experts');

-- Assign default permissions to roles
-- Superadmin - all permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'superadmin', id FROM permissions;

-- Admin - most permissions except role management
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
WHERE name NOT IN ('manage:roles');

-- Top Expert permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'top_expert', id FROM permissions
WHERE name IN ('manage:own:profile', 'create:appointments', 'view:marketplace', 'view:analytics');

-- Community Expert permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'community_expert', id FROM permissions
WHERE name IN ('manage:own:profile', 'create:appointments', 'view:marketplace');

-- Regular User permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions
WHERE name IN ('manage:own:profile', 'view:marketplace', 'book:appointments'); 