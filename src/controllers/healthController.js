const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { sequelize } = require('../config/database');
const { User, Listing, News, Advertisement, LostFound } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get server health status (Superadmin only)
// @route   GET /api/admin/health
// @access  Private/Superadmin
exports.getServerHealth = asyncHandler(async (req, res) => {
  // Test database connection
  let dbStatus = 'unknown';
  let dbLatency = null;
  
  try {
    const startTime = Date.now();
    await sequelize.authenticate();
    dbLatency = Date.now() - startTime;
    dbStatus = 'healthy';
  } catch (error) {
    dbStatus = 'unhealthy';
  }

  // Get system information
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);

  // Get CPU information
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || 'Unknown';
  const cpuCount = cpus.length;

  // Get uptime
  const uptime = process.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(uptime % 60);

  // Get process memory
  const processMemory = process.memoryUsage();
  const processMemoryMB = {
    rss: (processMemory.rss / 1024 / 1024).toFixed(2),
    heapTotal: (processMemory.heapTotal / 1024 / 1024).toFixed(2),
    heapUsed: (processMemory.heapUsed / 1024 / 1024).toFixed(2),
    external: (processMemory.external / 1024 / 1024).toFixed(2)
  };

  // Get user statistics
  const totalUsers = await User.count();
  const activeUsers = await User.count({ where: { status: 'active' } });
  const inactiveUsers = await User.count({ where: { status: 'inactive' } });
  const superadmins = await User.count({ where: { role: 'superadmin' } });
  const regularUsers = await User.count({ where: { role: 'user' } });

  // Determine overall health status
  const overallHealth = dbStatus === 'healthy' && 
                        parseFloat(memoryUsagePercent) < 90 ? 'healthy' : 'degraded';

  // Get database size
  let dbSize = null;
  let dbSizeBytes = 0;
  try {
    const [results] = await sequelize.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as size_bytes
    `);
    if (results && results[0]) {
      dbSize = results[0].size;
      dbSizeBytes = parseInt(results[0].size_bytes);
    }
  } catch (error) {
    console.error('Error getting database size:', error);
  }

  // Get table sizes
  let tableSizes = [];
  try {
    const [tableResults] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `);
    tableSizes = tableResults || [];
  } catch (error) {
    console.error('Error getting table sizes:', error);
  }

  // Calculate file storage
  let storageInfo = null;
  try {
    storageInfo = await calculateFileStorage();
  } catch (error) {
    console.error('Error calculating file storage:', error);
    storageInfo = {
      total: { size: '0 B', bytes: 0 },
      byCategory: {},
      fileCount: 0
    };
  }

  // Calculate total system storage (database + files)
  const totalSystemStorage = dbSizeBytes + storageInfo.total.bytes;
  const totalSystemStorageFormatted = formatBytes(totalSystemStorage);

  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      status: overallHealth,
      services: {
        database: {
          status: dbStatus,
          latency: dbLatency ? `${dbLatency}ms` : null
        }
      },
      server: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: {
          total: uptime,
          formatted: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`
        }
      },
      memory: {
        total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usagePercent: `${memoryUsagePercent}%`
      },
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        memory: {
          ...processMemoryMB,
          unit: 'MB'
        }
      },
      cpu: {
        model: cpuModel,
        cores: cpuCount
      },
      storage: {
        database: {
          size: dbSize || 'Unknown',
          sizeBytes: dbSizeBytes,
          tableSizes: tableSizes
        },
        files: storageInfo,
        total: {
          size: totalSystemStorageFormatted,
          sizeBytes: totalSystemStorage
        }
      },
      statistics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          superadmins: superadmins,
          regularUsers: regularUsers
        }
      },
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// @desc    Get server performance metrics (Superadmin only)
// @route   GET /api/admin/performance
// @access  Private/Superadmin
exports.getPerformanceMetrics = asyncHandler(async (req, res) => {
  const { duration = 60 } = req.query; // Duration in seconds, default 60

  // Get memory metrics
  const processMemory = process.memoryUsage();
  
  // Get CPU load average (if available)
  const loadAverage = os.loadavg();

  // Calculate response time (current request)
  const requestStartTime = req.startTime || Date.now();
  const responseTime = Date.now() - requestStartTime;

  // Get event loop delay (if available)
  const eventLoopUtilization = process.eventLoopUtilization 
    ? process.eventLoopUtilization() 
    : null;

  // Calculate CPU usage percentage
  let cpuUsage = 0;
  try {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    cpuUsage = 100 - ~~(100 * idle / total);
  } catch (error) {
    console.error('Error calculating CPU usage:', error);
  }

  // Get memory usage percentage
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);

  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      responseTime: parseInt(responseTime),
      cpu: parseFloat(cpuUsage.toFixed(2)),
      memory: parseFloat(memoryUsagePercent),
      memoryDetails: {
        heapUsed: `${(processMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(processMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(processMemory.rss / 1024 / 1024).toFixed(2)} MB`,
        external: `${(processMemory.external / 1024 / 1024).toFixed(2)} MB`
      },
      cpuDetails: {
        loadAverage: loadAverage.map(load => load.toFixed(2)),
        cores: os.cpus().length
      },
      eventLoop: eventLoopUtilization ? {
        idle: `${(eventLoopUtilization.idle / 1000000).toFixed(2)}ms`,
        active: `${(eventLoopUtilization.active / 1000000).toFixed(2)}ms`,
        utilization: `${(eventLoopUtilization.utilization * 100).toFixed(2)}%`
      } : null
    },
    recommendations: generateRecommendations(processMemory, loadAverage)
  });
});

// Helper function to calculate file storage
async function calculateFileStorage() {
  const uploadsPath = path.join(__dirname, '../../uploads');
  const storage = {
    total: { size: '0 B', bytes: 0 },
    byCategory: {},
    fileCount: 0
  };

  try {
    // Check if uploads directory exists
    try {
      await fs.access(uploadsPath);
    } catch {
      return storage; // Directory doesn't exist yet
    }

    // Categories to check
    const categories = [
      'profile-pictures',
      'listings',
      'lost-found',
      'news',
      'advertisements'
    ];

    // Calculate storage for each category
    for (const category of categories) {
      const categoryPath = path.join(uploadsPath, category);
      try {
        await fs.access(categoryPath);
        
        const { size, count } = await getDirectorySize(categoryPath);
        storage.byCategory[category] = {
          size: formatBytes(size),
          bytes: size,
          fileCount: count
        };
        storage.total.bytes += size;
        storage.fileCount += count;
      } catch (error) {
        // Category directory doesn't exist
        storage.byCategory[category] = {
          size: '0 B',
          bytes: 0,
          fileCount: 0
        };
      }
    }

    storage.total.size = formatBytes(storage.total.bytes);
  } catch (error) {
    console.error('Error calculating file storage:', error);
  }

  return storage;
}

// Helper function to recursively calculate directory size
async function getDirectorySize(dirPath) {
  let totalSize = 0;
  let fileCount = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        const { size, count } = await getDirectorySize(fullPath);
        totalSize += size;
        fileCount += count;
      } else {
        try {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
          fileCount += 1;
        } catch (error) {
          // File might have been deleted, skip it
          console.warn(`Could not stat file: ${fullPath}`, error.message);
        }
      }
    }
  } catch (error) {
    // Directory might not exist or no permission
    console.warn(`Could not read directory: ${dirPath}`, error.message);
  }

  return { size: totalSize, count: fileCount };
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to generate performance recommendations
function generateRecommendations(processMemory, loadAverage) {
  const recommendations = [];
  const heapUsedMB = processMemory.heapUsed / 1024 / 1024;
  const heapTotalMB = processMemory.heapTotal / 1024 / 1024;
  const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

  if (heapUsagePercent > 80) {
    recommendations.push({
      type: 'warning',
      message: 'High heap memory usage detected. Consider optimizing memory usage or increasing heap size.'
    });
  }

  if (loadAverage[0] > os.cpus().length * 0.8) {
    recommendations.push({
      type: 'warning',
      message: 'High CPU load detected. Consider scaling or optimizing CPU-intensive operations.'
    });
  }

  if (heapUsedMB > 512) {
    recommendations.push({
      type: 'info',
      message: 'Heap memory usage is above 512MB. Monitor for potential memory leaks.'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'Performance metrics are within normal ranges.'
    });
  }

  return recommendations;
}

