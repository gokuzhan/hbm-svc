#!/usr/bin/env node

/**
 * Database seeding utilities
 * Usage: npm run db:seed
 */

import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '@/lib/rbac/permissions';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { isProd } from '../env';
import { testConnection } from './connection';
import { db } from './index';
import { permissions, rolePermissions, roles, users } from './schema';

/**
 * Seed permissions into the database
 */
async function seedPermissions() {
  console.log('📊 Seeding permissions...');

  // Create permission records from ALL_PERMISSIONS
  const permissionData = ALL_PERMISSIONS.map((permission) => {
    const [resource, action] = permission.split(':');
    return {
      name: permission,
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
      resource,
      action,
    };
  });

  // Insert permissions (ignore duplicates)
  for (const permissionRecord of permissionData) {
    try {
      await db.insert(permissions).values(permissionRecord).onConflictDoNothing();
    } catch {
      // Permission might already exist, continue
      console.log(`Permission ${permissionRecord.name} already exists or failed to insert`);
    }
  }

  console.log(`✅ Seeded ${permissionData.length} permissions`);
}

/**
 * Seed default roles into the database
 */
async function seedRoles() {
  console.log('📊 Seeding default roles...');

  // First, ensure permissions are seeded
  await seedPermissions();

  // Get all permissions from database
  const allPermissions = await db.select().from(permissions);
  const permissionMap = new Map(allPermissions.map((p) => [p.name, p.id]));

  // Create default roles
  const defaultRoles = [
    {
      name: 'superadmin',
      description: 'Super Administrator with all permissions',
      isBuiltIn: true,
      permissions: DEFAULT_ROLE_PERMISSIONS.superadmin,
    },
  ];

  for (const roleData of defaultRoles) {
    try {
      // Check if role already exists
      const existingRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, roleData.name))
        .limit(1);

      let roleId: string;

      if (existingRole.length === 0) {
        // Create new role
        const newRole = await db
          .insert(roles)
          .values({
            name: roleData.name,
            description: roleData.description,
            isBuiltIn: roleData.isBuiltIn,
          })
          .returning();

        roleId = newRole[0].id;
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        roleId = existingRole[0].id;
        console.log(`📋 Role already exists: ${roleData.name}`);
      }

      // Clear existing permissions for this role
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

      // Add permissions to role
      const rolePermissionData = roleData.permissions
        .map((permissionName) => {
          const permissionId = permissionMap.get(permissionName);
          if (!permissionId) {
            console.warn(`⚠️ Permission not found: ${permissionName}`);
            return null;
          }
          return {
            roleId,
            permissionId,
          };
        })
        .filter(Boolean) as { roleId: string; permissionId: string }[];

      if (rolePermissionData.length > 0) {
        await db.insert(rolePermissions).values(rolePermissionData);
        console.log(`✅ Assigned ${rolePermissionData.length} permissions to ${roleData.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to seed role ${roleData.name}:`, error);
    }
  }

  console.log('✅ Default roles seeding completed');
}

/**
 * Seed default superadmin user
 */
async function seedSuperadmin() {
  console.log('📊 Seeding default superadmin user...');

  try {
    // Check if superadmin role exists
    const [superadminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'superadmin'))
      .limit(1);

    if (!superadminRole) {
      console.error('❌ Superadmin role not found. Please run role seeding first.');
      return;
    }

    // Check if default admin user already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@huezo.in'))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('📋 Default superadmin user already exists: admin@huezo.in');
      return;
    }

    // Hash the default password
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Create the default superadmin user
    const newUser = await db
      .insert(users)
      .values({
        email: 'admin@huezo.in',
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        phone: null,
        isActive: true,
        roleId: superadminRole.id,
      })
      .returning();

    console.log(`✅ Created default superadmin user: ${newUser[0].email}`);
    console.log(`   Default credentials: admin@huezo.in / admin123`);
    console.log(`   ⚠️  Please change the default password after first login!`);
  } catch (error) {
    console.error('❌ Failed to seed default superadmin user:', error);
    throw error;
  }
}

/**
 * Seed initial data into the database
 */
async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  // First test the connection
  const isConnected = await testConnection();
  if (!isConnected) {
    throw new Error('Cannot connect to database');
  }

  try {
    // Seed roles and permissions
    await seedRoles();

    // Seed default superadmin user
    await seedSuperadmin();

    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

/**
 * Reset database (development only)
 */
async function resetDatabase() {
  if (isProd) {
    throw new Error('Cannot reset database in production');
  }

  console.log('🔄 Resetting database...');

  try {
    // Clear existing data (in correct order due to foreign key constraints)
    console.log('�️ Clearing existing data...');
    await db.delete(rolePermissions);
    await db.delete(roles);
    await db.delete(permissions);

    console.log('✅ Database reset completed successfully');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      seedDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'reset':
      resetDatabase()
        .then(() => seedDatabase())
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    default:
      console.log('Usage: npm run db:seed [seed|reset]');
      process.exit(1);
  }
}

export { resetDatabase, seedDatabase, seedPermissions, seedRoles };
