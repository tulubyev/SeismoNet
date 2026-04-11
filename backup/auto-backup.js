#!/usr/bin/env node

/**
 * Automated Backup Script
 * Runs periodic backups and manages backup retention
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { scheduleJob } = require('node-schedule');

const backupDir = path.join(__dirname, 'backups');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Configuration
const config = {
  // Backup schedule (cron format)
  schedule: '0 2 * * *', // Daily at 2 AM
  
  // Retention policy
  retention: {
    daily: 7,   // Keep 7 daily backups
    weekly: 4,  // Keep 4 weekly backups  
    monthly: 12 // Keep 12 monthly backups
  }
};

function createBackup() {
  console.log('🔄 Starting automated backup...');
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `seismic-auto-backup-${timestamp}.sql`);
    
    // Check if DATABASE_URL exists
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL environment variable not found');
      return false;
    }
    
    // Create PostgreSQL backup
    const command = `pg_dump "${dbUrl}" > "${backupFile}"`;
    execSync(command, { stdio: 'inherit' });
    
    // Get backup file size
    const stats = fs.statSync(backupFile);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Automated backup completed: ${fileSizeInMB} MB`);
    console.log(`📄 Backup saved: ${path.basename(backupFile)}`);
    
    // Create backup metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      filename: path.basename(backupFile),
      size: stats.size,
      sizeMB: fileSizeInMB,
      type: 'automated',
      database: 'seismonet_db'
    };
    
    const metadataFile = path.join(backupDir, `auto-metadata-${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    
    // Clean up old backups
    cleanupOldBackups();
    
    return true;
    
  } catch (error) {
    console.error('❌ Automated backup failed:', error.message);
    return false;
  }
}

function cleanupOldBackups() {
  console.log('🧹 Cleaning up old backups...');
  
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('seismic-auto-backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        stats: fs.statSync(path.join(backupDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime); // Sort by modification time, newest first
    
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    
    let dailyCount = 0;
    let weeklyCount = 0;
    let monthlyCount = 0;
    
    files.forEach(file => {
      const age = now - file.stats.mtime;
      let shouldKeep = false;
      
      if (age < oneDay * config.retention.daily) {
        // Keep daily backups
        dailyCount++;
        shouldKeep = true;
      } else if (age < oneWeek * config.retention.weekly && dailyCount <= config.retention.daily) {
        // Keep weekly backups
        weeklyCount++;
        shouldKeep = true;
      } else if (age < oneMonth * config.retention.monthly && weeklyCount <= config.retention.weekly) {
        // Keep monthly backups
        monthlyCount++;
        shouldKeep = true;
      }
      
      if (!shouldKeep) {
        // Remove old backup file
        fs.unlinkSync(file.path);
        
        // Remove corresponding metadata file
        const metadataFile = file.path.replace('.sql', '.json').replace('seismic-auto-backup-', 'auto-metadata-');
        if (fs.existsSync(metadataFile)) {
          fs.unlinkSync(metadataFile);
        }
        
        console.log(`🗑️  Removed old backup: ${file.name}`);
      }
    });
    
    console.log(`📊 Backup retention: ${dailyCount} daily, ${weeklyCount} weekly, ${monthlyCount} monthly`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

function listBackups() {
  console.log('📁 Available backups:');
  
  if (!fs.existsSync(backupDir)) {
    console.log('  No backups found');
    return;
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .reverse();
  
  files.forEach(file => {
    const stats = fs.statSync(path.join(backupDir, file));
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const date = stats.mtime.toISOString().split('T')[0];
    const type = file.includes('auto-backup') ? 'AUTO' : 'MANUAL';
    console.log(`  - ${file} (${sizeMB} MB, ${date}, ${type})`);
  });
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'backup':
    createBackup();
    break;
    
  case 'cleanup':
    cleanupOldBackups();
    break;
    
  case 'list':
    listBackups();
    break;
    
  case 'start':
    console.log('🚀 Starting automated backup scheduler...');
    console.log(`📅 Schedule: ${config.schedule} (Daily at 2 AM)`);
    
    // Schedule automated backups
    scheduleJob(config.schedule, () => {
      console.log('⏰ Scheduled backup starting...');
      createBackup();
    });
    
    // Keep the process running
    console.log('✅ Automated backup scheduler is running');
    break;
    
  default:
    console.log('Seismic Network Backup Management');
    console.log('');
    console.log('Usage:');
    console.log('  node auto-backup.js backup  - Create immediate backup');
    console.log('  node auto-backup.js cleanup - Clean up old backups');
    console.log('  node auto-backup.js list    - List all backups');
    console.log('  node auto-backup.js start   - Start automated backup scheduler');
    console.log('');
    console.log('Automated backups run daily at 2 AM');
    break;
}