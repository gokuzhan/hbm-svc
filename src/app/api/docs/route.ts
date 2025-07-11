import { logger } from '@/lib/api/logger';
import { withApiHandler } from '@/lib/api/middleware';
import { NextRequest, NextResponse } from 'next/server';

async function handler(request: NextRequest) {
  logger.info('API documentation page requested');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HBM Service API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 2rem;
            background-color: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            font-weight: 700;
        }
        .header p {
            margin: 1rem 0 0;
            font-size: 1.1rem;
            opacity: 0.9;
        }
        .content {
            padding: 2rem;
        }
        .section {
            margin-bottom: 3rem;
        }
        .section h2 {
            color: #1e293b;
            font-size: 1.8rem;
            margin-bottom: 1rem;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.5rem;
        }
        .endpoint {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        .method {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-right: 1rem;
            color: white;
        }
        .method.get { background-color: #059669; }
        .method.post { background-color: #dc2626; }
        .method.put { background-color: #d97706; }
        .method.delete { background-color: #7c2d12; }
        .path {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 1rem;
            color: #374151;
        }
        .description {
            margin-top: 0.5rem;
            color: #6b7280;
        }
        .links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 2rem;
        }
        .link-card {
            background: #f8fafc;
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-decoration: none;
            color: inherit;
            transition: all 0.2s;
        }
        .link-card:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
        }
        .link-card h3 {
            margin: 0 0 0.5rem;
            color: #1e293b;
        }
        .link-card p {
            margin: 0;
            color: #64748b;
            font-size: 0.9rem;
        }
        .feature-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .feature {
            background: #f0f9ff;
            padding: 1rem;
            border-radius: 6px;
            border-left: 4px solid #0ea5e9;
        }
        .feature h3 {
            margin: 0 0 0.5rem;
            color: #0369a1;
            font-size: 1rem;
        }
        .feature p {
            margin: 0;
            color: #374151;
            font-size: 0.9rem;
        }
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: #10b981;
            border-radius: 50%;
            margin-right: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>HBM Service API</h1>
            <p>Modern REST API with standardized responses, validation, and comprehensive error handling</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>🚀 Features</h2>
                <div class="feature-list">
                    <div class="feature">
                        <h3>Standardized Responses</h3>
                        <p>Consistent JSON response format across all endpoints</p>
                    </div>
                    <div class="feature">
                        <h3>Input Validation</h3>
                        <p>Zod-based schema validation with detailed error messages</p>
                    </div>
                    <div class="feature">
                        <h3>Rate Limiting</h3>
                        <p>Built-in rate limiting with configurable limits per endpoint</p>
                    </div>
                    <div class="feature">
                        <h3>Error Handling</h3>
                        <p>Global error handling middleware with request tracking</p>
                    </div>
                    <div class="feature">
                        <h3>Logging</h3>
                        <p>Structured logging with Winston for all API operations</p>
                    </div>
                    <div class="feature">
                        <h3>Health Checks</h3>
                        <p>Service and database health monitoring endpoints</p>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📡 Available Endpoints</h2>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/health</span>
                    <div class="description">General service health check with system metrics</div>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/health/db</span>
                    <div class="description">Database connectivity and performance check</div>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/users</span>
                    <div class="description">Get paginated list of users with optional search</div>
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <span class="path">/api/users</span>
                    <div class="description">Create a new user with validation</div>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/users/{id}</span>
                    <div class="description">Get a specific user by UUID</div>
                </div>
            </div>

            <div class="section">
                <h2>📖 Documentation & Tools</h2>
                <div class="links">
                    <a href="/api/docs/openapi.json" class="link-card">
                        <h3>📋 OpenAPI Spec</h3>
                        <p>Download the complete OpenAPI 3.0 specification</p>
                    </a>
                    <a href="/api/health" class="link-card">
                        <h3><span class="status-indicator"></span>Service Status</h3>
                        <p>Check the current health and status of the API</p>
                    </a>
                    <a href="/api/health/db" class="link-card">
                        <h3><span class="status-indicator"></span>Database Status</h3>
                        <p>Verify database connectivity and performance</p>
                    </a>
                    <a href="/api/users?page=1&limit=5" class="link-card">
                        <h3>👥 Example Request</h3>
                        <p>Try the users endpoint with sample parameters</p>
                    </a>
                </div>
            </div>

            <div class="section">
                <h2>🔧 Quick Start</h2>
                <p>Here are some example requests you can try:</p>
                
                <div style="background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 6px; margin: 1rem 0; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem;">
                    <div style="color: #94a3b8; margin-bottom: 0.5rem;"># Check service health</div>
                    <div>curl -X GET "${request.url.replace('/docs', '/health')}"</div>
                    <br>
                    <div style="color: #94a3b8; margin-bottom: 0.5rem;"># Get users with pagination</div>
                    <div>curl -X GET "${request.url.replace('/docs', '/users')}?page=1&limit=10"</div>
                    <br>
                    <div style="color: #94a3b8; margin-bottom: 0.5rem;"># Create a new user</div>
                    <div>curl -X POST "${request.url.replace('/docs', '/users')}" \\<br>
                    &nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
                    &nbsp;&nbsp;-d '{"name":"John Doe","email":"john@example.com","age":30}'</div>
                </div>
            </div>

            <div class="section">
                <h2>⚙️ Response Format</h2>
                <p>All API responses follow a standardized format:</p>
                
                <div style="background: #f1f5f9; padding: 1rem; border-radius: 6px; margin: 1rem 0; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem;">
                    <div style="color: #059669; font-weight: 600;">✅ Success Response:</div>
                    <pre style="margin: 0.5rem 0; color: #374151;">{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "timestamp": "2024-01-01T00:00:00Z"
}</pre>
                    
                    <div style="color: #dc2626; font-weight: 600; margin-top: 1rem;">❌ Error Response:</div>
                    <pre style="margin: 0.5rem 0; color: #374151;">{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": { /* error details */ }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}</pre>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

// Apply the error handling middleware
export const GET = withApiHandler(handler);
