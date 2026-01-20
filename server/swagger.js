import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RayDrop API',
      version: '2.0.0',
      description: 'API for importing test cases to Xray Cloud',
    },
    servers: [
      {
        url: '/api',
        description: 'API server',
      },
    ],
    components: {
      schemas: {
        Config: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              example: 'PROJ',
            },
            xrayClientId: {
              type: 'string',
              example: 'client-id',
            },
            xrayClientSecret: {
              type: 'string',
              example: '********',
            },
            jiraBaseUrl: {
              type: 'string',
              example: 'https://company.atlassian.net',
            },
          },
        },
        Step: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              example: 'Click login button',
            },
            data: {
              type: 'string',
              example: 'username: admin',
            },
            result: {
              type: 'string',
              example: 'Login form appears',
            },
          },
          required: ['action', 'result'],
        },
        Draft: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'uuid-123',
            },
            summary: {
              type: 'string',
              example: 'User Management | UI | Verify login',
            },
            description: {
              type: 'string',
              example: 'Test case description',
            },
            testType: {
              type: 'string',
              enum: ['Manual'],
              example: 'Manual',
            },
            priority: {
              type: 'string',
              enum: ['Medium'],
              example: 'Medium',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              example: ['smoke', 'regression'],
            },
            collectionId: {
              type: 'string',
              nullable: true,
              example: 'col-123',
            },
            steps: {
              type: 'array',
              items: { $ref: '#/components/schemas/Step' },
            },
            status: {
              type: 'string',
              enum: ['draft', 'imported'],
              example: 'draft',
            },
            isComplete: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'integer',
              example: 1705700000000,
            },
            updatedAt: {
              type: 'integer',
              example: 1705700000000,
            },
          },
        },
        Collection: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'col-123',
            },
            name: {
              type: 'string',
              example: 'Sprint 1',
            },
            color: {
              type: 'string',
              example: '#6366f1',
            },
          },
          required: ['id', 'name', 'color'],
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./server/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
