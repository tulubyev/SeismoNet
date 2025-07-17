#!/usr/bin/env node

/**
 * System Restore Script
 * Restores the seismic network database from backup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get backup file from command line argument
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Usage: node restore-system.js <backup-file>');
  console.log('📁 Available backups:');
  
  const backupDir = path.join(__dirname, 'backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse();
    
    files.forEach(file => {
      const stats = fs.statSync(path.join(backupDir, file));
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  - ${file} (${sizeMB} MB)`);
    });
  } else {
    console.log('  No backups found');
  }
  
  process.exit(1);
}

// Check if backup file exists
const backupPath = path.isAbsolute(backupFile) ? backupFile : path.join(__dirname, 'backups', backupFile);

if (!fs.existsSync(backupPath)) {
  console.error(`❌ Backup file not found: ${backupPath}`);
  process.exit(1);
}

console.log('🔄 Starting system restore...');
console.log(`📄 Backup file: ${backupPath}`);

try {
  // Check if DATABASE_URL exists
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not found');
    process.exit(1);
  }

  console.log('⚠️  WARNING: This will overwrite the current database!');
  console.log('🗄️  Restoring database from backup...');
  
  // Restore PostgreSQL database using psql
  const command = `psql "${dbUrl}" < "${backupPath}"`;
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ Database restore completed successfully!');
  
  // Get backup file size
  const stats = fs.statSync(backupPath);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`📊 Restored from: ${fileSizeInMB} MB backup`);
  console.log('🎉 System restore completed successfully!');
  
} catch (error) {
  console.error('❌ Restore failed:', error.message);
  process.exit(1);
}