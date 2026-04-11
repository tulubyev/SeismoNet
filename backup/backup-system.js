#!/usr/bin/env node

/**
 * System Backup Script
 * Creates a backup of the seismic network database
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create backup directory if it doesn't exist
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Generate backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `seismic-backup-${timestamp}.sql`);

console.log('🔄 Starting system backup...');
console.log(`📁 Backup directory: ${backupDir}`);
console.log(`📄 Backup file: ${backupFile}`);

try {
  // Check if DATABASE_URL exists
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not found');
    process.exit(1);
  }

  console.log('🗄️  Creating database backup...');
  
  // Create PostgreSQL backup using pg_dump
  const command = `pg_dump "${dbUrl}" > "${backupFile}"`;
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ Database backup completed successfully!');
  
  // Get backup file size
  const stats = fs.statSync(backupFile);
  const fileSizeInBytes = stats.size;
  const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
  
  console.log(`📊 Backup size: ${fileSizeInMB} MB`);
  console.log(`💾 Backup saved to: ${backupFile}`);
  
  // Create backup metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    filename: path.basename(backupFile),
    size: fileSizeInBytes,
    sizeMB: fileSizeInMB,
    database: 'seismonet_db'
  };
  
  const metadataFile = path.join(backupDir, `metadata-${timestamp}.json`);
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  
  console.log('📋 Backup metadata saved');
  console.log('🎉 System backup completed successfully!');
  
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
}