const { AuditLog } = require('../models');

// Audit middleware to log user actions
const audit = (options = {}) => {
  return async (req, res, next) => {
    // Store original json and end methods
    const originalJson = res.json.bind(res);
    const originalEnd = res.end.bind(res);

    let responseBody = null;
    let statusCode = null;

    // Override res.json to capture response
    res.json = function(body) {
      responseBody = body;
      statusCode = res.statusCode;
      return originalJson(body);
    };

    // Override res.end to capture response for non-JSON responses
    res.end = function(chunk) {
      statusCode = res.statusCode;
      return originalEnd(chunk);
    };

    // Continue with the request
    next();

    // Log after response is sent (in background, don't block)
    setImmediate(async () => {
      try {
        // Skip if logging is disabled for this route
        if (options.skip && options.skip(req)) {
          return;
        }

        // Determine action type
        const action = options.action || 
                      `${req.method} ${req.route?.path || req.path}` ||
                      req.method;

        // Determine resource from route or options
        const resource = options.resource || 
                        req.route?.path?.split('/')[1] || 
                        req.path.split('/')[2] || 
                        null;

        // Get resource ID from params
        const resourceId = options.resourceId || 
                          req.params.id || 
                          req.params.userId ||
                          null;

        // Extract IP address - check multiple sources and convert to IPv4 only
        let ipAddress = null;
        
        // Helper function to check if IP is IPv4 format
        const isIPv4 = (ip) => {
          if (!ip) return false;
          // IPv4 regex: 4 groups of 1-3 digits separated by dots
          const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
          return ipv4Regex.test(ip.split(':')[0]); // Check before port number
        };
        
        // Helper function to convert IPv6 to IPv4 when possible
        const convertToIPv4 = (ip) => {
          if (!ip) return null;
          
          // Handle IPv6 loopback first (before any processing)
          if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('::1')) {
            return '127.0.0.1';
          }
          
          // Remove brackets if present (e.g., [::1] or [2001:db8::1])
          let ipOnly = ip.replace(/^\[|\]$/g, '');
          
          // Handle IPv4-mapped IPv6 (::ffff:x.x.x.x) - check before port removal
          if (ipOnly.startsWith('::ffff:') && ipOnly.includes('.')) {
            const mappedMatch = ipOnly.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (mappedMatch) {
              return mappedMatch[1];
            }
            // Try simple replacement
            if (ipOnly.match(/::ffff:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
              return ipOnly.replace('::ffff:', '');
            }
          }
          
          // Remove port number if present at the end (format: 127.0.0.1:3000 or [::1]:3000)
          // For IPv4: check for pattern like "127.0.0.1:8080"
          if (ipOnly.includes('.') && ipOnly.includes(':')) {
            const parts = ipOnly.split(':');
            // If last part is all digits and there are 2 parts, it's likely port on IPv4
            if (parts.length === 2 && /^\d+$/.test(parts[1])) {
              ipOnly = parts[0];
            }
          }
          
          // If already IPv4, return it
          if (isIPv4(ipOnly)) {
            return ipOnly;
          }
          
          // For pure IPv6 addresses that can't be converted, return null
          // We only want IPv4 addresses
          return null;
        };
        
        // Collect all possible IP sources
        const possibleIps = [];
        
        // 1. X-Forwarded-For header (if behind proxy/load balancer)
        if (req.headers['x-forwarded-for']) {
          const forwardedIps = req.headers['x-forwarded-for'].split(',');
          possibleIps.push(...forwardedIps.map(ip => ip.trim()));
        }
        
        // 2. X-Real-IP header (Nginx proxy)
        if (req.headers['x-real-ip']) {
          possibleIps.push(req.headers['x-real-ip'].trim());
        }
        
        // 3. CF-Connecting-IP header (Cloudflare)
        if (req.headers['cf-connecting-ip']) {
          possibleIps.push(req.headers['cf-connecting-ip'].trim());
        }
        
        // 4. req.ip (Express trusted proxy)
        if (req.ip) {
          possibleIps.push(req.ip);
        }
        
        // 5. req.socket.remoteAddress (most reliable direct connection)
        if (req.socket?.remoteAddress) {
          possibleIps.push(req.socket.remoteAddress);
        }
        
        // 6. req.connection.remoteAddress (legacy)
        if (req.connection?.remoteAddress) {
          possibleIps.push(req.connection.remoteAddress);
        }
        
        // Find first valid IPv4 address
        for (const ip of possibleIps) {
          const ipv4 = convertToIPv4(ip);
          if (ipv4) {
            ipAddress = ipv4;
            break;
          }
        }
        
        // If no IP found but we have possible IPs, check if any are localhost-related
        // and default to 127.0.0.1 for localhost connections
        if (!ipAddress && possibleIps.length > 0) {
          const hasLocalhost = possibleIps.some(ip => 
            ip === '::1' || 
            ip === '::ffff:127.0.0.1' || 
            ip.includes('::1') ||
            ip === '127.0.0.1' ||
            ip.includes('localhost') ||
            ip.startsWith('::ffff:127')
          );
          if (hasLocalhost) {
            ipAddress = '127.0.0.1';
          }
        }
        
        // Final fallback: if still no IP and no possible IPs were found,
        // assume localhost in development (this shouldn't happen, but just in case)
        if (!ipAddress && possibleIps.length === 0 && process.env.NODE_ENV !== 'production') {
          ipAddress = '127.0.0.1';
        }

        // Prepare request body (exclude sensitive fields)
        let requestBody = null;
        if (req.body && Object.keys(req.body).length > 0) {
          const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token'];
          requestBody = { ...req.body };
          sensitiveFields.forEach(field => {
            if (requestBody[field]) {
              requestBody[field] = '[REDACTED]';
            }
          });
        }

        // Get final status code - use captured one or fallback to res.statusCode
        // res.statusCode defaults to 200 in Express if not explicitly set
        const finalStatusCode = statusCode !== null ? statusCode : (res.statusCode || 200);

        // Create audit log entry
        await AuditLog.create({
          userId: req.user?.id || null,
          action: action,
          resource: resource,
          resourceId: resourceId ? parseInt(resourceId) : null,
          method: req.method,
          endpoint: req.path,
          ipAddress: ipAddress,
          userAgent: req.headers['user-agent'] || null,
          requestBody: requestBody,
          responseStatus: finalStatusCode,
          errorMessage: responseBody?.success === false ? responseBody.message : null,
          metadata: options.metadata || null
        });
      } catch (error) {
        // Don't let audit logging break the application
        console.error('Error creating audit log:', error);
      }
    });
  };
};

module.exports = audit;

